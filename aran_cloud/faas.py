"""aran_cloud/faas.py: firewall as a service, phase 1 (routes: a reverse proxy that cleans what passes through).

A route is a named upstream. A caller sends its request to  <cloud>/fw/<route>/<path>  with its Aran key;
Aran cleans the path, query and body, forwards the cleaned request to the upstream and returns the answer.
The tenant always comes from the API key, never from the URL.

This module never imports main. main.py builds a Ctx with the helpers it needs and calls
build_router(ctx) and init_schema(conn). Pure helpers (body walking, masking, SSRF checks) are in fw_core.py.

Later phases plug in here:
- clean_body() is the one place a request is cleaned; a policy will be applied through its `policy` argument.
- emit_event() is the one place an alert is raised; webhooks will be delivered from it.
"""

import json
import os
import re
import secrets
import sqlite3
import threading
import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout
from typing import Any, Callable, Dict, List, Optional
from urllib.parse import quote, urlsplit

import requests
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel

try:                       # package layout (docker: aran_cloud.main) and flat layout (cd aran_cloud; main:app)
    from . import fw_core
except ImportError:
    import fw_core

FAIL_MODES = ("hold", "open", "closed")
MODES = ("monitor", "enforce")
PURPOSES = ("KYC", "Loans", "Service", "Marketing")
ROUTE_NAME_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,39}$")
CUSTOMER_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"]
UPSTREAM_MAX_BYTES = 5 * 1024 * 1024
OUTBOX_MAX_ATTEMPTS = 8


def _env_flag(name: str) -> bool:
    return os.environ.get(name, "0").strip().lower() in ("1", "true", "yes")


class Ctx:
    """What main.py hands over. Nothing here is imported from main."""

    def __init__(self, get_db: Callable, get_tenant: Callable, require_scope: Callable, protect_text: Callable,
                 record_tokens: Callable, call_core: Callable, core_url: str, port: int):
        self.get_db = get_db
        self.get_tenant = get_tenant            # FastAPI dependency: the tenant and key of this request
        self.require_scope = require_scope      # require_scope("route") -> dependency
        self.protect_text = protect_text
        self.record_tokens = record_tokens
        self.call_core = call_core
        self.core_url = core_url
        self.port = port


# ---------------------------------------------------------------- schema
def init_schema(conn: sqlite3.Connection):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS routes (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            name TEXT NOT NULL,
            upstream_url TEXT NOT NULL,
            sink TEXT NOT NULL,
            purpose TEXT NOT NULL DEFAULT 'Service',
            fail_mode TEXT NOT NULL DEFAULT 'hold',
            mode TEXT NOT NULL DEFAULT 'monitor',
            policy_id TEXT,
            created_at REAL NOT NULL,
            disabled INTEGER NOT NULL DEFAULT 0,
            UNIQUE (tenant_id, name)
        );
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS route_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id TEXT NOT NULL,
            route_id TEXT NOT NULL,
            at REAL NOT NULL,
            method TEXT,
            path TEXT,
            status_code INTEGER,
            upstream_status INTEGER,
            protected_count INTEGER NOT NULL DEFAULT 0,
            would_protect_count INTEGER NOT NULL DEFAULT 0,
            blocked INTEGER NOT NULL DEFAULT 0,
            latency_ms REAL,
            fw_ms REAL,
            outcome TEXT NOT NULL
        );
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_route_events_tenant_at ON route_events(tenant_id, at);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_route_events_route_at ON route_events(route_id, at);")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS route_outbox (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id TEXT NOT NULL,
            route_id TEXT NOT NULL,
            created_at REAL NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0,
            next_at REAL NOT NULL,
            method TEXT NOT NULL,
            path TEXT NOT NULL,
            headers_json TEXT NOT NULL DEFAULT '{}',
            body_protected TEXT,
            state TEXT NOT NULL DEFAULT 'pending',
            last_error TEXT
        );
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_route_outbox_due ON route_outbox(state, next_at);")


# ---------------------------------------------------------------- events (hook for alerts)
def emit_event(tenant_id: str, event_type: str, payload: dict):
    """The single place an alert is raised ('would_protect', 'block', 'route_failure' ...). Payloads hold types and
    counts, never raw values. Nothing is delivered yet; webhooks plug in here later."""
    return None


# ---------------------------------------------------------------- cleaning
class CleanResult:
    """The outcome of cleaning one request: protected path, query and body, plus the counts."""

    def __init__(self):
        self.path = ""
        self.query = ""
        self.body: bytes = b""
        self.protected = 0
        self.unprotected = 0
        self.ignored = 0
        self.by_type: Dict[str, int] = {}
        self.findings: list = []
        self.latency_ms = 0.0
        self.supported = True       # False for a content type that cannot be cleaned


class CleanFailed(Exception):
    """The core could not be reached (or was too slow) while cleaning."""


_pool = ThreadPoolExecutor(max_workers=8, thread_name_prefix="fw-clean")
_core_pool = ThreadPoolExecutor(max_workers=8, thread_name_prefix="fw-core")


def core_budget_ms() -> float:
    try:
        return float(os.environ.get("ARAN_FAAS_CORE_TIMEOUT_MS", "300"))
    except ValueError:
        return 300.0


def clean_body(ctx: Ctx, tenant_id: str, route: dict, content_type: str, body: bytes, path: str, query: str,
               customer_ref: Optional[str] = None, policy: Any = None, fault: bool = False,
               parsed: Optional[tuple] = None) -> CleanResult:
    """Cleans the path, query and body of one request with the core. Raises fw_core.BodyError for a body that does
    not match its content type and CleanFailed when the core fails or is too slow. Writes nothing.
    `policy` is the hook for phase 2 (it will turn findings into tokenise / mask / block / allow)."""
    res = CleanResult()
    if parsed is None:
        parsed = (fw_core.parse_body(content_type, body), fw_core.parse_path(path), fw_core.parse_query(query))
    pbody, ppath, pquery = parsed
    if pbody is None:
        res.supported = False
        return res
    parts = [ppath, pquery, pbody]
    units = [u for p in parts for u in p.units]
    purpose, sink = route["purpose"], route["sink"]

    def protect_fn(text: str) -> dict:
        if fault:
            raise RuntimeError("simulated core outage")
        out = ctx.protect_text(tenant_id, text, customer_ref, purpose, sink)
        d = dict(out)
        d["after"] = out["res"].get("after", "")
        d["findings"] = out["res"].get("findings", [])
        return d

    groups = max(1, sum(len(v) for _, v in units) // fw_core.MAX_JOIN_CHARS + 1)
    budget = (core_budget_ms() + 25.0 * (groups - 1)) / 1000.0
    postprocess = None  # a policy will be applied here in phase 2
    fut = _pool.submit(fw_core.clean_units, units, protect_fn, _core_pool.map, fw_core.MAX_JOIN_CHARS, postprocess)
    try:
        out = fut.result(timeout=budget)
    except FutureTimeout:
        fut.cancel()
        raise CleanFailed("the core did not answer within the budget")
    except fw_core.BodyError:
        raise
    except Exception as err:
        raise CleanFailed(f"{err.__class__.__name__}")

    pos = 0
    rebuilt = []
    for p in parts:
        n = len(p.units)
        rebuilt.append(p.rebuild(out.values[pos:pos + n]))
        pos += n
    res.path, res.query, res.body = rebuilt
    res.protected, res.unprotected, res.ignored = out.protected, out.unprotected, out.ignored
    res.by_type, res.findings, res.latency_ms = out.by_type, out.findings, out.latency_ms
    return res


def mask_request(parsed: tuple) -> CleanResult:
    """The core is down: a masked copy of the request (last 4 digits only). Used by fail mode 'hold'."""
    pbody, ppath, pquery = parsed
    res = CleanResult()
    outs = []
    for p in (ppath, pquery, pbody):
        outs.append(p.rebuild([fw_core.mask_text(v) for _, v in p.units]))
    res.path, res.query, res.body = outs
    return res


# ---------------------------------------------------------------- upstream
def _own_services(ctx: Ctx):
    cu = urlsplit(ctx.core_url)
    core_port = cu.port or (443 if cu.scheme == "https" else 80)
    own = [(cu.hostname or "", core_port), ("localhost", ctx.port), ("127.0.0.1", ctx.port)]
    return own, {core_port, ctx.port}


def check_upstream(ctx: Ctx, url: str) -> List[str]:
    own, ports = _own_services(ctx)
    return fw_core.check_upstream_url(url, allow_private=_env_flag("ARAN_FAAS_ALLOW_PRIVATE_UPSTREAMS"),
                                      own=own, own_ports=ports)


class UpstreamError(Exception):
    pass


def upstream_timeout() -> float:
    try:
        return float(os.environ.get("ARAN_FAAS_UPSTREAM_TIMEOUT_S", "10"))
    except ValueError:
        return 10.0


def forward(ctx: Ctx, route: dict, method: str, path: str, query: str, headers: Dict[str, str], body: bytes):
    """Sends one request to the route's upstream. The URL is checked again here (DNS can change after the route
    was saved) and redirects are never followed. Returns (status, headers, content)."""
    try:
        check_upstream(ctx, route["upstream_url"])
    except fw_core.UpstreamBlocked as err:
        raise UpstreamError(f"upstream refused: {err}")
    base = route["upstream_url"].rstrip("/")
    url = base + ("/" + path if path else "")      # path arrives already percent-encoded
    if query:
        url += "?" + query
    try:
        r = requests.request(method, url, headers=headers, data=body or None, timeout=(3.0, upstream_timeout()),
                             allow_redirects=False, stream=True)
        content = r.raw.read(UPSTREAM_MAX_BYTES + 1, decode_content=True)
        r.close()
    except requests.exceptions.RequestException as err:
        raise UpstreamError(f"{err.__class__.__name__}")
    if len(content) > UPSTREAM_MAX_BYTES:
        raise UpstreamError("upstream answer too large")
    return r.status_code, dict(r.headers), content


# ---------------------------------------------------------------- the outbox sweeper
_sweeper_started = False
_sweeper_lock = threading.Lock()


def start_sweeper(ctx: Ctx):
    """Starts the background retry of held bodies once per process."""
    global _sweeper_started
    with _sweeper_lock:
        if _sweeper_started:
            return
        _sweeper_started = True
    threading.Thread(target=_sweep_loop, args=(ctx,), daemon=True, name="fw-outbox").start()


def _sweep_loop(ctx: Ctx):
    while True:
        time.sleep(float(os.environ.get("ARAN_FAAS_SWEEP_S", "5")))
        try:
            sweep_outbox(ctx)
        except Exception:
            pass


def sweep_outbox(ctx: Ctx, limit: int = 20) -> dict:
    """Retries held bodies. Only protected or masked bodies are in the outbox, so nothing raw is ever stored."""
    conn = ctx.get_db()
    sent = failed = 0
    try:
        rows = conn.execute("SELECT * FROM route_outbox WHERE state='pending' AND next_at <= ? ORDER BY id LIMIT ?",
                            (time.time(), limit)).fetchall()
        for o in rows:
            route = conn.execute("SELECT * FROM routes WHERE id=?", (o["route_id"],)).fetchone()
            if not route or route["disabled"]:
                with conn:
                    conn.execute("UPDATE route_outbox SET state='dead', last_error='route removed or disabled' WHERE id=?", (o["id"],))
                continue
            hdrs = json.loads(o["headers_json"] or "{}")
            hdrs["X-Aran-Route"] = route["name"]
            hdrs["X-Aran-Retry"] = str(o["attempts"] + 1)
            path, _, qs = o["path"].partition("?")
            try:
                status, _, _ = forward(ctx, dict(route), o["method"], path, qs, hdrs, (o["body_protected"] or "").encode("utf-8"))
                err = f"upstream answered {status}" if status >= 500 else ""
            except UpstreamError as e:
                err = str(e)
            with conn:
                if not err:
                    conn.execute("UPDATE route_outbox SET state='sent', attempts=attempts+1, last_error=NULL WHERE id=?", (o["id"],))
                    sent += 1
                else:
                    n = o["attempts"] + 1
                    state = "dead" if n >= OUTBOX_MAX_ATTEMPTS else "pending"
                    conn.execute("UPDATE route_outbox SET attempts=?, next_at=?, state=?, last_error=? WHERE id=?",
                                 (n, time.time() + min(300, 2 ** n * 2), state, err[:200], o["id"]))
                    failed += 1
    finally:
        conn.close()
    return {"sent": sent, "failed": failed}


# ---------------------------------------------------------------- models
class RouteIn(BaseModel):
    name: str
    upstream_url: str
    sink: Optional[str] = None
    purpose: str = "Service"
    fail_mode: str = "hold"
    mode: str = "monitor"


class RoutePatch(BaseModel):
    upstream_url: Optional[str] = None
    sink: Optional[str] = None
    purpose: Optional[str] = None
    fail_mode: Optional[str] = None
    mode: Optional[str] = None
    disabled: Optional[bool] = None


# ---------------------------------------------------------------- the router
def build_router(ctx: Ctx) -> APIRouter:
    router = APIRouter()
    manage = ctx.require_scope("route")

    def reader(tenant: dict = Depends(ctx.get_tenant)) -> dict:
        s = tenant.get("scopes", [])
        if not ({"admin", "route", "dashboard"} & set(s)):
            raise HTTPException(403, "this key lacks the 'route' or 'dashboard' scope")
        return tenant

    def caller(tenant: dict = Depends(ctx.get_tenant)) -> dict:
        s = tenant.get("scopes", [])
        if not ({"admin", "route", "protect"} & set(s)):
            raise HTTPException(403, "this key lacks the 'protect' or 'route' scope")
        return tenant

    def own_route(conn, tenant_id: str, route_id: str):
        row = conn.execute("SELECT * FROM routes WHERE id=? AND tenant_id=?", (route_id, tenant_id)).fetchone()
        if not row:
            raise HTTPException(404, "route not found")
        return row

    def view(row, stats: Optional[dict] = None) -> dict:
        d = {k: row[k] for k in ("id", "name", "upstream_url", "sink", "purpose", "fail_mode", "mode", "policy_id", "created_at")}
        d["disabled"] = bool(row["disabled"])
        d["path"] = f"/fw/{row['name']}/"
        d["stats_24h"] = stats or {"calls": 0, "protected": 0, "would_protect": 0, "blocked": 0, "failed": 0, "held_pending": 0}
        return d

    def stats_for(conn, tenant_id: str) -> Dict[str, dict]:
        since = time.time() - 86400
        out: Dict[str, dict] = {}
        for r in conn.execute(
            """SELECT route_id, COUNT(*) calls, SUM(protected_count) p, SUM(would_protect_count) w, SUM(blocked) b,
                      SUM(CASE WHEN outcome IN ('failed_open','failed_closed') THEN 1 ELSE 0 END) f
               FROM route_events WHERE tenant_id=? AND at>=? GROUP BY route_id""", (tenant_id, since)):
            out[r["route_id"]] = {"calls": r["calls"], "protected": r["p"] or 0, "would_protect": r["w"] or 0,
                                  "blocked": r["b"] or 0, "failed": r["f"] or 0, "held_pending": 0}
        for r in conn.execute("SELECT route_id, COUNT(*) n FROM route_outbox WHERE tenant_id=? AND state='pending' GROUP BY route_id", (tenant_id,)):
            out.setdefault(r["route_id"], {"calls": 0, "protected": 0, "would_protect": 0, "blocked": 0, "failed": 0, "held_pending": 0})["held_pending"] = r["n"]
        return out

    def check_fields(purpose=None, fail_mode=None, mode=None, url=None, sink=None):
        if purpose is not None and purpose not in PURPOSES:
            raise HTTPException(422, f"purpose must be one of {list(PURPOSES)}")
        if fail_mode is not None and fail_mode not in FAIL_MODES:
            raise HTTPException(422, f"fail_mode must be one of {list(FAIL_MODES)}")
        if mode is not None and mode not in MODES:
            raise HTTPException(422, f"mode must be one of {list(MODES)}")
        if sink is not None and not re.fullmatch(r"[A-Za-z0-9._-]{1,48}", sink):
            raise HTTPException(422, "sink may use letters, digits, dot, dash and underscore (48 characters at most)")
        if url is not None:
            try:
                check_upstream(ctx, url)
            except fw_core.UpstreamBlocked as err:
                raise HTTPException(400, f"upstream_url refused: {err}")

    # ---- CRUD
    @router.post("/v1/routes", status_code=201)
    def create_route(body: RouteIn, tenant: dict = Depends(manage)):
        if not ROUTE_NAME_RE.match(body.name):
            raise HTTPException(422, "name must be 1 to 40 characters: lowercase letters, digits, dash, underscore")
        check_fields(body.purpose, body.fail_mode, body.mode, body.upstream_url, body.sink)
        rid = "rt_" + secrets.token_hex(8)
        conn = ctx.get_db()
        try:
            with conn:
                try:
                    conn.execute(
                        """INSERT INTO routes (id, tenant_id, name, upstream_url, sink, purpose, fail_mode, mode, created_at, disabled)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)""",
                        (rid, tenant["id"], body.name, body.upstream_url.strip(), body.sink or body.name, body.purpose,
                         body.fail_mode, body.mode, time.time()))
                except sqlite3.IntegrityError:
                    raise HTTPException(409, f"a route named '{body.name}' already exists")
            row = own_route(conn, tenant["id"], rid)
        finally:
            conn.close()
        start_sweeper(ctx)
        return view(row)

    @router.get("/v1/routes")
    def list_routes(tenant: dict = Depends(reader)):
        conn = ctx.get_db()
        try:
            rows = conn.execute("SELECT * FROM routes WHERE tenant_id=? ORDER BY created_at", (tenant["id"],)).fetchall()
            stats = stats_for(conn, tenant["id"])
            return {"routes": [view(r, stats.get(r["id"])) for r in rows]}
        finally:
            conn.close()

    @router.get("/v1/route-events")
    def route_events(limit: int = 50, route_id: Optional[str] = None, tenant: dict = Depends(reader)):
        limit = max(1, min(200, limit))
        conn = ctx.get_db()
        try:
            sql = ("SELECT e.*, r.name AS route_name FROM route_events e LEFT JOIN routes r ON r.id=e.route_id "
                   "WHERE e.tenant_id=?")
            args: list = [tenant["id"]]
            if route_id:
                sql += " AND e.route_id=?"
                args.append(route_id)
            rows = conn.execute(sql + " ORDER BY e.id DESC LIMIT ?", [*args, limit]).fetchall()
            return {"events": [dict(r) for r in rows]}
        finally:
            conn.close()

    @router.get("/v1/routes/{route_id}")
    def get_route(route_id: str, tenant: dict = Depends(reader)):
        conn = ctx.get_db()
        try:
            row = own_route(conn, tenant["id"], route_id)
            return view(row, stats_for(conn, tenant["id"]).get(route_id))
        finally:
            conn.close()

    @router.patch("/v1/routes/{route_id}")
    def patch_route(route_id: str, body: RoutePatch, tenant: dict = Depends(manage)):
        check_fields(body.purpose, body.fail_mode, body.mode, body.upstream_url, body.sink)
        sets, args = [], []
        for col in ("upstream_url", "sink", "purpose", "fail_mode", "mode"):
            v = getattr(body, col)
            if v is not None:
                sets.append(f"{col}=?")
                args.append(v.strip() if col == "upstream_url" else v)
        if body.disabled is not None:
            sets.append("disabled=?")
            args.append(1 if body.disabled else 0)
        conn = ctx.get_db()
        try:
            own_route(conn, tenant["id"], route_id)
            if sets:
                with conn:
                    conn.execute(f"UPDATE routes SET {', '.join(sets)} WHERE id=? AND tenant_id=?", [*args, route_id, tenant["id"]])
            return view(own_route(conn, tenant["id"], route_id))
        finally:
            conn.close()

    @router.delete("/v1/routes/{route_id}")
    def delete_route(route_id: str, tenant: dict = Depends(manage)):
        conn = ctx.get_db()
        try:
            own_route(conn, tenant["id"], route_id)
            with conn:
                conn.execute("DELETE FROM routes WHERE id=? AND tenant_id=?", (route_id, tenant["id"]))
                conn.execute("UPDATE route_outbox SET state='dead', last_error='route deleted' WHERE route_id=? AND state='pending'", (route_id,))
            return {"deleted": True, "id": route_id}
        finally:
            conn.close()

    # ---- the proxy
    def record(conn, tenant_id: str, route: dict, ev: dict, usage: Optional[dict]):
        now = time.time()
        with conn:
            conn.execute(
                """INSERT INTO route_events (tenant_id, route_id, at, method, path, status_code, upstream_status, protected_count,
                                             would_protect_count, blocked, latency_ms, fw_ms, outcome)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (tenant_id, route["id"], now, ev["method"], ev["path"], ev["status"], ev.get("upstream_status"),
                 ev.get("protected", 0), ev.get("would", 0), ev.get("blocked", 0), ev.get("latency_ms"), ev.get("fw_ms"), ev["outcome"]))
            if usage is not None:
                conn.execute(
                    """INSERT INTO usage_events (tenant_id, at, endpoint, sink, purpose, protected_count, unprotected_count, ignored_count,
                                                 by_type, latency_ms, customer_ref, status)
                       VALUES (?, ?, '/fw', ?, ?, ?, ?, ?, ?, ?, ?, 'ok')""",
                    (tenant_id, now, route["sink"], route["purpose"], usage["protected"], usage["unprotected"], usage["ignored"],
                     json.dumps(usage["by_type"]), usage["latency_ms"], usage.get("customer_ref")))
                ctx.record_tokens(conn, tenant_id, usage["findings"], usage.get("customer_ref"), route["purpose"], route["sink"], now)

    def queue(conn, tenant_id: str, route: dict, method: str, path: str, query: str, headers: dict, body: bytes) -> int:
        with conn:
            cur = conn.execute(
                """INSERT INTO route_outbox (tenant_id, route_id, created_at, attempts, next_at, method, path, headers_json, body_protected, state)
                   VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, 'pending')""",
                (tenant_id, route["id"], time.time(), time.time() + 2, method, path + ("?" + query if query else ""),
                 json.dumps(fw_core.queue_headers(headers)), body.decode("utf-8", "replace")))
        return cur.lastrowid

    def handle(tenant: dict, route: dict, method: str, path: str, query: str, headers: Dict[str, str], body: bytes) -> Response:
        t0 = time.perf_counter()
        tenant_id = tenant["id"]
        enforce = route["mode"] == "enforce"
        ct = headers.get("content-type", "")
        cust = headers.get("x-aran-customer-ref")
        cust = cust if cust and CUSTOMER_RE.match(cust) else None
        fault = _env_flag("ARAN_FAAS_TEST_HOOKS") and headers.get("x-aran-test-fault") == "core-down"
        conn = ctx.get_db()
        # the event log keeps the cleaned path (or a masked one), never the original
        ev = {"method": method, "path": "/" + fw_core.mask_text(path), "outcome": "forwarded", "status": 200}

        def done(resp: Response, usage: Optional[dict] = None) -> Response:
            ev["status"] = resp.status_code
            ev["latency_ms"] = round((time.perf_counter() - t0) * 1000, 2)
            try:
                record(conn, tenant_id, route, ev, usage)
            finally:
                conn.close()
            resp.headers["X-Aran-Route"] = route["name"]
            return resp

        def jerr(code: int, payload: dict) -> Response:
            return JSONResponse(payload, status_code=code)

        raw_path = path
        path = "/".join(quote(seg, safe="@:.-_~") for seg in path.split("/")) if path else ""   # encoded for the wire
        try:
            parsed = (fw_core.parse_body(ct, body), fw_core.parse_path(raw_path), fw_core.parse_query(query))
        except fw_core.BodyError as err:
            if enforce:
                ev["outcome"] = "blocked"
                return done(jerr(400, {"error": "bad_body", "detail": str(err)}))
            parsed = (None, fw_core.parse_path(raw_path), fw_core.parse_query(query))
        if parsed[0] is None and body and enforce:
            ev["outcome"] = "blocked"
            return done(jerr(415, {"error": "unsupported_media_type",
                                   "detail": "this route cleans JSON, text, NDJSON and form bodies; other types are refused"}))

        # 1. clean (monitor mode cleans too, to count what it would have protected)
        res: Optional[CleanResult] = None
        failed = False
        if parsed[0] is not None:
            try:
                res = clean_body(ctx, tenant_id, route, ct, body, path, query, cust, None, fault, parsed)
            except CleanFailed:
                failed = True
        fw_ms = round((time.perf_counter() - t0) * 1000, 2)
        ev["fw_ms"] = fw_ms
        if res is not None and res.supported:
            ev["path"] = "/" + res.path
        usage = None
        if res is not None and res.supported:
            usage = {"protected": res.protected, "unprotected": res.unprotected, "ignored": res.ignored, "by_type": res.by_type,
                     "latency_ms": res.latency_ms or fw_ms, "findings": res.findings, "customer_ref": cust}

        fwd_headers = fw_core.forward_headers(headers)
        fwd_headers["X-Aran-Route"] = route["name"]

        if failed:
            emit_event(tenant_id, "route_failure", {"route": route["name"], "fail_mode": route["fail_mode"]})
            if not enforce or route["fail_mode"] == "open":
                send_path, send_query, send_body = path, query, body       # monitor never blocks; open passes the original
                ev["outcome"] = "failed_open"
            elif route["fail_mode"] == "closed":
                ev["outcome"] = "failed_closed"
                return done(jerr(503, {"error": "aran_unavailable", "failed": "closed",
                                       "detail": "Aran could not clean this request in time, so nothing was forwarded"}))
            else:   # hold: keep only a masked copy and deliver it when the upstream is reachable
                m = mask_request(parsed)
                qid = queue(conn, tenant_id, route, method, m.path, m.query, headers, m.body)
                ev["outcome"] = "held"
                return done(jerr(202, {"held": True, "reason": "aran_unavailable", "id": qid,
                                       "detail": "a masked copy is queued and will be delivered"}))
        elif enforce and res is not None and res.supported:
            send_path, send_query, send_body = res.path, res.query, res.body
            ev["protected"] = res.protected
        else:
            send_path, send_query, send_body = path, query, body
            ev["would"] = res.protected if res is not None else 0
            if res is not None and res.protected:
                emit_event(tenant_id, "would_protect", {"route": route["name"], "by_type": res.by_type})

        # 2. forward
        t1 = time.perf_counter()
        try:
            if not fw_core.safe_path(send_path):
                raise UpstreamError("path not allowed")
            status, up_headers, content = forward(ctx, route, method, send_path, send_query, fwd_headers, send_body)
        except UpstreamError as err:
            if enforce and not (ev["outcome"] == "failed_open"):
                qid = queue(conn, tenant_id, route, method, send_path, send_query, headers, send_body)
                ev["outcome"] = "held"
                emit_event(tenant_id, "route_failure", {"route": route["name"], "reason": "upstream"})
                return done(jerr(202, {"held": True, "reason": "upstream_unavailable", "id": qid}), usage)
            if ev["outcome"] != "failed_open":
                ev["outcome"] = "failed_closed"      # could not be delivered and nothing was queued
            return done(jerr(502, {"error": "upstream_unreachable", "detail": str(err)}), usage)
        if status >= 500 and enforce and ev["outcome"] != "failed_open":
            qid = queue(conn, tenant_id, route, method, send_path, send_query, headers, send_body)
            ev["outcome"] = "held"
            ev["upstream_status"] = status
            return done(jerr(202, {"held": True, "reason": "upstream_error", "upstream_status": status, "id": qid}), usage)
        ev["upstream_status"] = status
        out_headers = {k: v for k, v in up_headers.items()
                       if k.lower() not in fw_core.HOP_BY_HOP | {"content-encoding", "set-cookie"}}
        resp = Response(content=content, status_code=status, headers=out_headers)
        resp.headers["X-Aran-Protected"] = str(ev.get("protected", 0))
        if not enforce:
            resp.headers["X-Aran-Would-Protect"] = str(ev.get("would", 0))
        if ev["outcome"] == "failed_open":
            resp.headers["X-Aran-Fail"] = "open"
        return done(resp, usage)

    async def proxy(route_name: str, request: Request, path: str, tenant: dict):
        if not ROUTE_NAME_RE.match(route_name):
            raise HTTPException(404, "route not found")
        conn = ctx.get_db()
        try:
            row = conn.execute("SELECT * FROM routes WHERE tenant_id=? AND name=? AND disabled=0", (tenant["id"], route_name)).fetchone()
        finally:
            conn.close()
        if not row:
            raise HTTPException(404, "route not found")
        cl = request.headers.get("content-length")
        if cl and cl.isdigit() and int(cl) > fw_core.MAX_BODY_BYTES:
            raise HTTPException(413, "request body too large (1 MB at most)")
        chunks, size = [], 0
        async for chunk in request.stream():
            size += len(chunk)
            if size > fw_core.MAX_BODY_BYTES:
                raise HTTPException(413, "request body too large (1 MB at most)")
            chunks.append(chunk)
        headers = {k.lower(): v for k, v in request.headers.items()}
        return await run_in_threadpool(handle, tenant, dict(row), request.method, path, request.url.query, headers, b"".join(chunks))

    @router.api_route("/fw/{route_name}/{path:path}", methods=METHODS)
    async def fw_path(route_name: str, path: str, request: Request, tenant: dict = Depends(caller)):
        return await proxy(route_name, request, path, tenant)

    @router.api_route("/fw/{route_name}", methods=METHODS)
    async def fw_root(route_name: str, request: Request, tenant: dict = Depends(caller)):
        return await proxy(route_name, request, "", tenant)

    return router
