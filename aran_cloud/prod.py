"""aran_cloud/prod.py: the production base of Aran Cloud: the public status page and invoices.

  GET  /status                    public HTML page, no tenant data
  GET  /v1/status                 the same facts as JSON
  GET  /v1/billing/preview        this tenant's invoice so far (scope dashboard), ?period=YYYY-MM
  GET  /v1/billing/invoices       invoices already closed for this tenant
  POST /v1/billing/close-month    operator only (X-Admin-Token): closes a month, once per tenant and period

No payment provider is connected. An invoice here is a record of what would be charged, nothing more.
This module never imports main; main.py hands over a faas.Ctx with the extra fields set at the bottom of main.py
(plans, tenant_plan, require_admin).
"""

import datetime as dt
import html
import json
import secrets
import threading
import time
from typing import Optional

import requests
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

IST = dt.timezone(dt.timedelta(hours=5, minutes=30))
NO_PAYMENT = "No payment provider is connected. This is a record of what would be charged; nothing is collected."


def init_schema(conn):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS invoices (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            period TEXT NOT NULL,
            lines_json TEXT NOT NULL,
            total_paise INTEGER NOT NULL,
            created_at REAL NOT NULL,
            UNIQUE (tenant_id, period)
        );
    """)


# ---------------------------------------------------------------- billing
def period_bounds(period: str):
    """(start, end, label) of a 'YYYY-MM' month in India time, as epoch seconds."""
    try:
        y, m = int(period[:4]), int(period[5:7])
        if len(period) != 7 or period[4] != "-" or not 1 <= m <= 12 or y < 2000:
            raise ValueError
    except ValueError:
        raise HTTPException(422, "period must look like 2026-11")
    lo = dt.datetime(y, m, 1, tzinfo=IST)
    hi = dt.datetime(y + (m == 12), 1 if m == 12 else m + 1, 1, tzinfo=IST)
    return lo.timestamp(), hi.timestamp(), period


def current_period(now: Optional[float] = None) -> str:
    return dt.datetime.fromtimestamp(time.time() if now is None else now, IST).strftime("%Y-%m")


def build_invoice(conn, plans: dict, plan_key: str, tenant_id: str, period: str) -> dict:
    """Lines and total in paise from the plan's prices, usage_events (billed calls) and route_events (the part through routes)."""
    lo, hi, _ = period_bounds(period)
    plan = plans[plan_key]
    used = conn.execute("SELECT COUNT(*) FROM usage_events WHERE tenant_id=? AND at>=? AND at<? AND status != 'error'",
                        (tenant_id, lo, hi)).fetchone()[0]
    r = conn.execute("SELECT COUNT(*), COALESCE(SUM(protected_count), 0) FROM route_events WHERE tenant_id=? AND at>=? AND at<?",
                     (tenant_id, lo, hi)).fetchone()
    route_calls, route_protected = int(r[0]), int(r[1])
    limit = plan["monthly_limit"]
    over = max(0, used - limit)
    per_1000_paise = plan["overage_per_1000_inr"] * 100
    overage = (-(-over // 1000)) * per_1000_paise            # every started thousand is billed
    lines = [
        {"code": "plan", "label": f"{plan['label']} plan, {period}", "qty": 1, "unit": "month",
         "amount_paise": plan["price_inr"] * 100},
        {"code": "included", "label": "Calls included in the plan", "qty": min(used, limit), "unit": "calls",
         "of": limit, "amount_paise": 0},
        {"code": "overage", "label": "Calls over the plan limit", "qty": over, "unit": "calls",
         "rate_inr_per_million": plan["overage_per_1000_inr"] * 1000, "amount_paise": overage},
        {"code": "routes", "label": "Of the calls, made through firewall routes (already counted above)", "qty": route_calls,
         "unit": "calls", "values_protected": route_protected, "amount_paise": 0},
    ]
    return {"period": period, "currency": "INR", "plan": plan_key, "calls": used, "lines": lines,
            "total_paise": sum(l["amount_paise"] for l in lines)}


# ---------------------------------------------------------------- status
class _Cache:
    def __init__(self):
        self.lock = threading.Lock()
        self.at = 0.0
        self.value = None


_cache = _Cache()
STATUS_TTL_S = 5.0


def p95(values):
    if not values:
        return None
    v = sorted(values)
    return round(v[min(len(v) - 1, int(0.95 * len(v)))], 2)


def compute_status(ctx) -> dict:
    """Operational facts only: no tenant, route, key or customer is named."""
    out = {"time": time.time(), "service": "Aran Cloud"}
    try:
        resp = requests.get(f"{ctx.core_url}/api/health", timeout=2.0)
        out["core"] = {"reachable": resp.status_code == 200 and bool(resp.json().get("ready"))}
    except Exception:
        out["core"] = {"reachable": False}
    try:
        conn = ctx.get_db()
        try:
            conn.execute("SELECT 1").fetchone()
            since = time.time() - 86400
            outbox = conn.execute("SELECT COUNT(*) FROM route_outbox WHERE state='pending'").fetchone()[0]
            backlog = conn.execute("SELECT COUNT(*) FROM webhook_deliveries WHERE state IN ('pending','sending')").fetchone()[0]
            rows = conn.execute("SELECT status_code, outcome, latency_ms FROM route_events WHERE at>=? ORDER BY at DESC LIMIT 50000",
                                (since,)).fetchall()
        finally:
            conn.close()
        bad = sum(1 for r in rows if (r["status_code"] or 0) >= 500 or r["outcome"] == "failed_closed")
        out["database"] = {"ok": True, "kind": "postgres" if getattr(ctx, "postgres", False) else "sqlite"}
        out["outbox_depth"] = int(outbox)
        out["webhook_backlog"] = int(backlog)
        out["last_24h"] = {"fw_calls": len(rows),
                           "availability_percent": round(100 * (1 - bad / len(rows)), 3) if rows else None,
                           "fw_p95_ms": p95([r["latency_ms"] for r in rows if r["latency_ms"] is not None])}
    except Exception:
        out["database"] = {"ok": False, "kind": "postgres" if getattr(ctx, "postgres", False) else "sqlite"}
        out["outbox_depth"] = out["webhook_backlog"] = None
        out["last_24h"] = {"fw_calls": 0, "availability_percent": None, "fw_p95_ms": None}
    out["status"] = "ok" if out["core"]["reachable"] and out["database"]["ok"] else "degraded"
    return out


def cached_status(ctx) -> dict:
    with _cache.lock:
        if _cache.value is None or time.time() - _cache.at > STATUS_TTL_S:
            _cache.value = compute_status(ctx)
            _cache.at = time.time()
        return _cache.value


def status_page(s: dict) -> str:
    def row(label, value, ok=None):
        cls = "" if ok is None else (" ok" if ok else " bad")
        return f"<tr><th>{html.escape(label)}</th><td class=\"v{cls}\">{html.escape(str(value))}</td></tr>"
    l = s["last_24h"]
    av = "no calls yet" if l["availability_percent"] is None else f"{l['availability_percent']}%"
    p = "–" if l["fw_p95_ms"] is None else f"{l['fw_p95_ms']} ms"
    rows = "".join([
        row("Firewall core", "reachable" if s["core"]["reachable"] else "not reachable", s["core"]["reachable"]),
        row("Database", ("ok" if s["database"]["ok"] else "down") + f" ({s['database']['kind']})", s["database"]["ok"]),
        row("Held requests waiting to be sent", s["outbox_depth"] if s["outbox_depth"] is not None else "–"),
        row("Webhook deliveries waiting", s["webhook_backlog"] if s["webhook_backlog"] is not None else "–"),
        row("Calls through routes, last 24 h", l["fw_calls"]),
        row("Availability, last 24 h", av),
        row("Response time p95, last 24 h", p),
    ])
    ok = s["status"] == "ok"
    banner = "All systems working" if ok else "Degraded: something is not answering"
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="30"><title>Aran Cloud status</title>
<style>
:root{{--bg:#fff;--fg:#14181f;--mut:#5b6472;--line:#dfe3ea;--ok:#0a7a3d;--bad:#b42318}}
@media (prefers-color-scheme:dark){{:root{{--bg:#0f1318;--fg:#e8ebf0;--mut:#9aa4b2;--line:#2a313b;--ok:#4cc38a;--bad:#ff7b72}}}}
body{{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,sans-serif}}
main{{max-width:640px;margin:0 auto;padding:32px 16px}}
h1{{font-size:1.4rem;margin:0 0 4px}} .banner{{font-weight:600;color:var({'--ok' if ok else '--bad'});margin:0 0 20px}}
table{{width:100%;border-collapse:collapse}} th,td{{text-align:left;padding:10px 0;border-top:1px solid var(--line)}}
th{{font-weight:400;color:var(--mut)}} td.v{{text-align:right;font-variant-numeric:tabular-nums}} .ok{{color:var(--ok)}} .bad{{color:var(--bad)}}
p{{color:var(--mut);font-size:.85rem}}
</style></head><body><main><h1>Aran Cloud status</h1><p class="banner">{banner}</p>
<table>{rows}</table>
<p>Updated {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime(s['time']))}. This page shows service health only, never customer data.</p>
</main></body></html>"""


# ---------------------------------------------------------------- routes
class CloseMonth(BaseModel):
    period: str
    tenant_id: Optional[str] = None


def view_invoice(row) -> dict:
    return {"id": row["id"], "tenant_id": row["tenant_id"], "period": row["period"], "lines": json.loads(row["lines_json"]),
            "total_paise": row["total_paise"], "currency": "INR", "created_at": row["created_at"]}


def build_router(ctx) -> APIRouter:
    router = APIRouter()
    dash = ctx.require_scope("dashboard")

    @router.get("/v1/status")
    def api_status():
        return cached_status(ctx)

    @router.get("/status", response_class=HTMLResponse)
    def page_status():
        return HTMLResponse(status_page(cached_status(ctx)), headers={"Cache-Control": "no-store"})

    def plan_for(conn, tenant_id: str, period: str) -> str:
        if period >= current_period():
            return ctx.tenant_plan(tenant_id)
        _, hi, _ = period_bounds(period)
        end = dt.datetime.fromtimestamp(hi, IST).strftime("%Y-%m-%d %H:%M:%S")
        r = conn.execute("SELECT plan FROM plans WHERE tenant_id=? AND since < ? ORDER BY id DESC LIMIT 1", (tenant_id, end)).fetchone()
        if r:
            return ctx.plan_key(r["plan"])
        # no change before that month: it was still the starting plan if the tenant has changed plan since, else today's plan
        changed = conn.execute("SELECT 1 FROM plans WHERE tenant_id=?", (tenant_id,)).fetchone()
        return "sandbox" if changed else ctx.tenant_plan(tenant_id)

    @router.get("/v1/billing/preview")
    def preview(period: Optional[str] = None, tenant: dict = Depends(dash)):
        period = period or current_period()
        period_bounds(period)
        conn = ctx.get_db()
        try:
            inv = build_invoice(conn, ctx.plans, plan_for(conn, tenant["id"], period), tenant["id"], period)
            closed = conn.execute("SELECT id FROM invoices WHERE tenant_id=? AND period=?", (tenant["id"], period)).fetchone()
        finally:
            conn.close()
        inv.update({"preview": True, "closed_invoice_id": closed["id"] if closed else None, "payment_provider": None,
                    "note": NO_PAYMENT, "computed_at": time.time()})
        return inv

    @router.get("/v1/billing/invoices")
    def invoices(tenant: dict = Depends(dash)):
        conn = ctx.get_db()
        try:
            rows = conn.execute("SELECT * FROM invoices WHERE tenant_id=? ORDER BY period DESC", (tenant["id"],)).fetchall()
        finally:
            conn.close()
        return {"invoices": [view_invoice(r) for r in rows], "payment_provider": None, "note": NO_PAYMENT}

    @router.post("/v1/billing/close-month")
    def close_month(body: CloseMonth, _: None = Depends(ctx.require_admin)):
        """Closes one month for every tenant (or one). A month already closed for a tenant is returned as it was stored."""
        period_bounds(body.period)
        if body.period > current_period():
            raise HTTPException(422, "that month has not started yet")
        conn = ctx.get_db()
        out, created = [], 0
        try:
            if body.tenant_id:
                ids = [r["id"] for r in conn.execute("SELECT id FROM tenants WHERE id=?", (body.tenant_id,)).fetchall()]
                if not ids:
                    raise HTTPException(404, "tenant not found")
            else:
                ids = [r["id"] for r in conn.execute("SELECT id FROM tenants ORDER BY id").fetchall()]
            for tid in ids:
                inv = build_invoice(conn, ctx.plans, plan_for(conn, tid, body.period), tid, body.period)
                with conn:
                    cur = conn.execute(
                        "INSERT OR IGNORE INTO invoices (id, tenant_id, period, lines_json, total_paise, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                        ("inv_" + secrets.token_hex(8), tid, body.period, json.dumps(inv["lines"]), inv["total_paise"], time.time()))
                new = cur.rowcount == 1
                created += 1 if new else 0
                row = conn.execute("SELECT * FROM invoices WHERE tenant_id=? AND period=?", (tid, body.period)).fetchone()
                out.append(dict(view_invoice(row), created=new))
        finally:
            conn.close()
        return {"period": body.period, "created": created, "existing": len(out) - created, "invoices": out,
                "payment_provider": None, "note": NO_PAYMENT}

    return router

