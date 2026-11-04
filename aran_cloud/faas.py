"""aran_cloud/faas.py: firewall as a service, phases 1 and 2 (routes: a reverse proxy that cleans what passes through;
policies: what to do with each kind of identifier, with monitor mode and a hash-chained config audit).

A route is a named upstream. A caller sends its request to  <cloud>/fw/<route>/<path>  with its Aran key;
Aran cleans the path, query and body, forwards the cleaned request to the upstream and returns the answer.
The tenant always comes from the API key, never from the URL.

This module never imports main. main.py builds a Ctx with the helpers it needs and calls
build_router(ctx) and init_schema(conn). Pure helpers (body walking, masking, SSRF checks) are in fw_core.py.

Later phases plug in here:
- clean_body() is the one place a request is cleaned; a policy (a rule list) is applied through its `policy` argument.
- emit_event() is the one place an alert is raised; signed webhooks are delivered from it (phase 3).
"""

import hashlib
import hmac
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
    cols = {r[1] for r in conn.execute("PRAGMA table_info(route_events);").fetchall()}
    if "would_block" not in cols:
        try:
            conn.execute("ALTER TABLE route_events ADD COLUMN would_block INTEGER NOT NULL DEFAULT 0;")
        except sqlite3.OperationalError:
            pass
    # a policy version is one row; the active row of a name is the one in force
    conn.execute("""
        CREATE TABLE IF NOT EXISTS policies (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            name TEXT NOT NULL,
            version INTEGER NOT NULL,
            rules_json TEXT NOT NULL,
            created_at REAL NOT NULL,
            active INTEGER NOT NULL DEFAULT 1,
            UNIQUE (tenant_id, name, version)
        );
    """)
    # every change of policies and routes, hash-chained per tenant like detokenise_audit
    conn.execute("""
        CREATE TABLE IF NOT EXISTS config_audit (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id TEXT NOT NULL,
            at REAL NOT NULL,
            actor TEXT,
            action TEXT NOT NULL,
            target_type TEXT NOT NULL,
            target_id TEXT NOT NULL,
            detail_json TEXT NOT NULL,
            prev_hash TEXT NOT NULL,
            entry_hash TEXT NOT NULL
        );
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_config_audit_tenant ON config_audit(tenant_id, id);")
    # webhooks: where alerts go. The secret signs every delivery and is shown once, at creation.
    conn.execute("""
        CREATE TABLE IF NOT EXISTS webhooks (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            url TEXT NOT NULL,
            secret TEXT NOT NULL,
            events TEXT NOT NULL DEFAULT '*',
            created_at REAL NOT NULL,
            disabled INTEGER NOT NULL DEFAULT 0
        );
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_webhooks_tenant ON webhooks(tenant_id);")
    # one row per event per webhook; payload_json holds types and counts only
    conn.execute("""
        CREATE TABLE IF NOT EXISTS webhook_deliveries (
            id TEXT PRIMARY KEY,
            webhook_id TEXT NOT NULL,
            tenant_id TEXT NOT NULL,
            event_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            at REAL NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0,
            status_code INTEGER,
            state TEXT NOT NULL DEFAULT 'pending',
            next_at REAL NOT NULL,
            payload_json TEXT NOT NULL,
            last_error TEXT
        );
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_wh_deliveries_due ON webhook_deliveries(state, next_at);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_wh_deliveries_tenant ON webhook_deliveries(tenant_id, at);")
    # a restart must not leave a delivery stuck in 'sending'
    conn.execute("UPDATE webhook_deliveries SET state='pending' WHERE state='sending'")


# ---------------------------------------------------------------- config audit (hash chain)
_audit_lock = threading.Lock()
ZERO_HASH = "0" * 64


def _audit_hash(prev: str, tenant_id: str, actor: str, action: str, ttype: str, tid: str, detail: str, at: float) -> str:
    return hashlib.sha256(f"{prev}|{tenant_id}|{actor}|{action}|{ttype}|{tid}|{detail}|{at:.4f}".encode("utf-8")).hexdigest()


def audit_config(conn: sqlite3.Connection, tenant: dict, action: str, target_type: str, target_id: str, detail: dict):
    """Appends one entry to the tenant's config audit chain. Call it inside the same transaction as the change.
    `detail` holds names, versions and counts, never request data."""
    actor = f"{tenant.get('key_label') or 'key'} ({tenant.get('key_id') or '-'})"
    d = json.dumps(detail, sort_keys=True, separators=(",", ":"))
    with _audit_lock:
        row = conn.execute("SELECT entry_hash FROM config_audit WHERE tenant_id=? ORDER BY id DESC LIMIT 1", (tenant["id"],)).fetchone()
        prev = row[0] if row else ZERO_HASH
        at = time.time()
        conn.execute(
            """INSERT INTO config_audit (tenant_id, at, actor, action, target_type, target_id, detail_json, prev_hash, entry_hash)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (tenant["id"], at, actor, action, target_type, target_id, d, prev,
             _audit_hash(prev, tenant["id"], actor, action, target_type, target_id, d, at)))


def verify_audit(conn: sqlite3.Connection, tenant_id: str) -> dict:
    rows = conn.execute("SELECT * FROM config_audit WHERE tenant_id=? ORDER BY id", (tenant_id,)).fetchall()
    prev = ZERO_HASH
    for r in rows:
        if r["prev_hash"] != prev:
            return {"valid": False, "error": f"broken chain pointer at entry {r['id']}", "failed_at_id": r["id"], "total_rows": len(rows)}
        want = _audit_hash(prev, r["tenant_id"], r["actor"] or "", r["action"], r["target_type"], r["target_id"], r["detail_json"], r["at"])
        if want != r["entry_hash"]:
            return {"valid": False, "error": f"entry {r['id']} was changed", "failed_at_id": r["id"], "total_rows": len(rows)}
        prev = r["entry_hash"]
    return {"valid": True, "total_rows": len(rows), "latest_hash": prev, "verified_at": time.strftime("%Y-%m-%d %H:%M:%S")}


# ---------------------------------------------------------------- events and webhooks
WEBHOOK_EVENTS = ("block", "alert", "spike", "route_failure")
DELIVERABLE = set(WEBHOOK_EVENTS) | {"test"}      # other events ('would_protect', 'would_block') are not sent out
BACKOFF_S = (1, 5, 30, 120, 600)                  # wait after attempt 1, 2, 3, 4; the 5th failure is final
MAX_ATTEMPTS = 5
MAX_WEBHOOKS = 10
SPIKE_MIN = 20
SPIKE_FACTOR = 5
SPIKE_EVERY_S = 600

_ctx: Optional["Ctx"] = None
_wake = threading.Event()


def _hook_match(events_csv: str, event_type: str) -> bool:
    ev = {e.strip() for e in (events_csv or "").split(",") if e.strip()}
    return "*" in ev or event_type in ev


def emit_event(tenant_id: str, event_type: str, payload: dict):
    """The single place an alert is raised. Queues one signed delivery per matching webhook of this tenant; the
    background thread sends it. Payloads hold types and counts, never raw values. Never raises into a request."""
    if _ctx is None or event_type not in DELIVERABLE:
        return None
    eid = "evt_" + secrets.token_hex(8)
    try:
        conn = _ctx.get_db()
        try:
            hooks = [w for w in conn.execute("SELECT id, events FROM webhooks WHERE tenant_id=? AND disabled=0", (tenant_id,)).fetchall()
                     if _hook_match(w["events"], event_type)]
            if hooks:
                now = time.time()
                body = json.dumps({"id": eid, "type": event_type, "created_at": now, "tenant_id": tenant_id, "data": payload},
                                  sort_keys=True, separators=(",", ":"))
                with conn:
                    for w in hooks:
                        conn.execute(
                            """INSERT INTO webhook_deliveries (id, webhook_id, tenant_id, event_id, event_type, at, attempts, state, next_at, payload_json)
                               VALUES (?, ?, ?, ?, ?, ?, 0, 'pending', ?, ?)""",
                            ("dl_" + secrets.token_hex(8), w["id"], tenant_id, eid, event_type, now, now, body))
        finally:
            conn.close()
    except Exception:
        return None
    _wake.set()
    return eid


def sign_payload(secret: str, timestamp: str, body: bytes) -> str:
    """X-Aran-Signature value: sha256=<hex HMAC-SHA256(secret, timestamp + "." + body)>."""
    mac = hmac.new(secret.encode("utf-8"), timestamp.encode("utf-8") + b"." + body, hashlib.sha256).hexdigest()
    return "sha256=" + mac


def send_webhook(ctx: "Ctx", url: str, secret: str, event_type: str, delivery_id: str, body: bytes):
    """One signed POST. Returns (status_code or None, error text). 2xx is success; redirects are never followed."""
    try:
        check_upstream(ctx, url)         # checked again now: DNS can change after the webhook was saved
    except fw_core.UpstreamBlocked as err:
        return None, f"refused: {err}"
    ts = str(int(time.time()))
    headers = {"Content-Type": "application/json", "User-Agent": "Aran-Webhook/1",
               "X-Aran-Event": event_type, "X-Aran-Delivery": delivery_id, "X-Aran-Timestamp": ts,
               "X-Aran-Signature": sign_payload(secret, ts, body)}
    try:
        r = requests.post(url, data=body, headers=headers, timeout=(3.0, 5.0), allow_redirects=False)
        code = r.status_code
        r.close()
    except requests.exceptions.RequestException as err:
        return None, err.__class__.__name__
    return code, ("" if 200 <= code < 300 else f"receiver answered {code}")


_hook_pool = ThreadPoolExecutor(max_workers=4, thread_name_prefix="fw-hook")
_hooks_started = False


def _deliver_loop(ctx: "Ctx"):
    while True:
        _wake.wait(timeout=float(os.environ.get("ARAN_FAAS_WEBHOOK_TICK_S", "1")))
        _wake.clear()
        try:
            sweep_webhooks(ctx)
        except Exception:
            pass


def _deliver_one(ctx: "Ctx", d) -> None:
    conn = ctx.get_db()
    try:
        w = conn.execute("SELECT * FROM webhooks WHERE id=?", (d["webhook_id"],)).fetchone()
        if not w or w["disabled"]:
            with conn:
                conn.execute("UPDATE webhook_deliveries SET state='failed', last_error='webhook removed or disabled' WHERE id=?", (d["id"],))
            return
        code, err = send_webhook(ctx, w["url"], w["secret"], d["event_type"], d["id"], d["payload_json"].encode("utf-8"))
        n = d["attempts"] + 1
        with conn:
            if not err:
                conn.execute("UPDATE webhook_deliveries SET state='delivered', attempts=?, status_code=?, last_error=NULL WHERE id=?", (n, code, d["id"]))
            elif n >= MAX_ATTEMPTS:
                conn.execute("UPDATE webhook_deliveries SET state='failed', attempts=?, status_code=?, last_error=? WHERE id=?", (n, code, err[:200], d["id"]))
            else:
                conn.execute("UPDATE webhook_deliveries SET state='pending', attempts=?, status_code=?, last_error=?, next_at=? WHERE id=?",
                             (n, code, err[:200], time.time() + BACKOFF_S[n - 1], d["id"]))
    finally:
        conn.close()


def sweep_webhooks(ctx: "Ctx", limit: int = 20) -> int:
    """Sends the deliveries that are due. A row is claimed ('sending') before it is sent."""
    conn = ctx.get_db()
    try:
        rows = conn.execute("SELECT * FROM webhook_deliveries WHERE state='pending' AND next_at<=? ORDER BY next_at LIMIT ?",
                            (time.time(), limit)).fetchall()
        mine = []
        for r in rows:
            with conn:
                cur = conn.execute("UPDATE webhook_deliveries SET state='sending' WHERE id=? AND state='pending'", (r["id"],))
            if cur.rowcount == 1:
                mine.append(r)
    finally:
        conn.close()
    list(_hook_pool.map(lambda d: _deliver_one(ctx, d), mine))
    return len(mine)


# a spike is reported at most once per route per 10 minutes
_spike_last: Dict[str, float] = {}
_spike_lock = threading.Lock()


def check_spike(conn: sqlite3.Connection, tenant_id: str, route: dict, now: Optional[float] = None):
    """Protected values in the last minute above 5x the per-minute average of the 30 minutes before, and at least 20."""
    now = now or time.time()
    cur = conn.execute("SELECT COALESCE(SUM(protected_count + would_protect_count), 0) FROM route_events WHERE route_id=? AND at>=?",
                       (route["id"], now - 60)).fetchone()[0]
    if cur < SPIKE_MIN:
        return
    prev = conn.execute("SELECT COALESCE(SUM(protected_count + would_protect_count), 0) FROM route_events WHERE route_id=? AND at>=? AND at<?",
                        (route["id"], now - 60 - 1800, now - 60)).fetchone()[0]
    avg = prev / 30.0
    if cur <= SPIKE_FACTOR * avg:
        return
    with _spike_lock:
        if now - _spike_last.get(route["id"], 0) < SPIKE_EVERY_S:
            return
        _spike_last[route["id"]] = now
    emit_event(tenant_id, "spike", {"route": route["name"], "protected_last_minute": int(cur),
                                    "average_per_minute_30m": round(avg, 2), "factor": SPIKE_FACTOR})


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
        self.actions: Dict[str, int] = {}     # policy decisions: action -> findings handled that way
        self.block_types: List[str] = []      # finding types whose rule is "block"
        self.alert_types: List[str] = []      # finding types whose rule is "alert"


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
    `policy` is a normalised rule list (or None for the default, tokenise everything): each finding becomes a token,
    a mask, the original (allow), or flags the request to be blocked or alerted."""
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
    actions: Dict[str, int] = {}
    block_types: set = set()
    alert_types: set = set()

    def postprocess(original: str, cleaned: str, findings: list) -> str:
        text, decisions = fw_core.apply_policy(original, findings, policy)
        for d in decisions:
            actions[d["action"]] = actions.get(d["action"], 0) + 1
            if d["action"] == "block":
                block_types.add(d["type"])
            elif d["action"] == "alert":
                alert_types.add(d["type"])
        return text

    if policy is None:
        postprocess = None
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
    if policy is not None:
        res.actions = actions
        res.block_types, res.alert_types = sorted(block_types), sorted(alert_types)
        # "protected" is what the policy changed in the request: allowed findings stay as they were
        res.protected = sum(n for a, n in actions.items() if a != "allow")
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
    threading.Thread(target=_deliver_loop, args=(ctx,), daemon=True, name="fw-webhooks").start()


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
    policy_id: Optional[str] = None


class PolicyIn(BaseModel):
    name: str
    rules: list = []


class PolicyTest(BaseModel):
    text: str
    policy_id: Optional[str] = None
    rules: Optional[list] = None


class RollbackIn(BaseModel):
    to_version: Optional[int] = None


class RoutePatch(BaseModel):
    upstream_url: Optional[str] = None
    sink: Optional[str] = None
    purpose: Optional[str] = None
    fail_mode: Optional[str] = None
    mode: Optional[str] = None
    policy_id: Optional[str] = None      # "" detaches the policy
    disabled: Optional[bool] = None


class WebhookIn(BaseModel):
    url: str
    events: Optional[list] = None        # default: all events


class WebhookPatch(BaseModel):
    url: Optional[str] = None
    events: Optional[list] = None
    disabled: Optional[bool] = None


# ---------------------------------------------------------------- SIEM export (CEF)
CEF_SEV = {"blocked": 8, "failed_closed": 6, "held": 5, "failed_open": 5, "forwarded": 1}


def _cef_head(v: str) -> str:
    return str(v).replace("\\", "\\\\").replace("|", "\\|").replace("\n", " ").replace("\r", " ")


def _cef_ext(v) -> str:
    return str(v).replace("\\", "\\\\").replace("=", "\\=").replace("\n", "\\n").replace("\r", "\\n")


def export_name(r) -> str:
    return "route.would_block" if r["would_block"] else "route." + r["outcome"]


def cef_line(r) -> str:
    """One route event as a CEF line. Only counts, outcomes and the cleaned path: no request data."""
    name = export_name(r)
    sev = 3 if r["would_block"] else CEF_SEV.get(r["outcome"], 3)
    ext = (f"rt={int(r['at'] * 1000)} act={_cef_ext(r['outcome'])} requestMethod={_cef_ext(r['method'] or '')} "
           f"request={_cef_ext(r['path'] or '')} cs1Label=route cs1={_cef_ext(r['route_name'] or r['route_id'])} "
           f"cs2Label=tenant cs2={_cef_ext(r['tenant_id'])} cn1Label=protected cn1={r['protected_count']} "
           f"cn2Label=wouldProtect cn2={r['would_protect_count']} cn3Label=httpStatus cn3={r['status_code'] if r['status_code'] is not None else 0}")
    return f"CEF:0|Aran|Aran Cloud|1.0|{_cef_head(name)}|{_cef_head(name)}|{sev}|{ext}"


def json_line(r) -> str:
    return json.dumps({"id": r["id"], "at": r["at"], "type": export_name(r), "route": r["route_name"] or r["route_id"],
                       "tenant_id": r["tenant_id"], "method": r["method"], "path": r["path"], "status_code": r["status_code"],
                       "upstream_status": r["upstream_status"], "outcome": r["outcome"], "blocked": bool(r["blocked"]),
                       "would_block": bool(r["would_block"]), "protected": r["protected_count"],
                       "would_protect": r["would_protect_count"], "latency_ms": r["latency_ms"], "fw_ms": r["fw_ms"]},
                      sort_keys=True, separators=(",", ":"))


def parse_since(v: Optional[str]) -> float:
    if not v:
        return 0.0
    try:
        return float(v)
    except ValueError:
        pass
    try:
        import datetime as _dt
        d = _dt.datetime.fromisoformat(v.replace("Z", "+00:00"))
        if d.tzinfo is None:
            d = d.replace(tzinfo=_dt.timezone.utc)
        return d.timestamp()
    except ValueError:
        raise HTTPException(422, "since must be a unix time or an ISO 8601 time")


# ---------------------------------------------------------------- the router
def build_router(ctx: Ctx) -> APIRouter:
    global _ctx
    _ctx = ctx
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

    def own_policy(conn, tenant_id: str, policy_id: str):
        row = conn.execute("SELECT * FROM policies WHERE id=? AND tenant_id=?", (policy_id, tenant_id)).fetchone()
        if not row:
            raise HTTPException(404, "policy not found")
        return row

    def rules_of(conn, tenant_id: str, policy_id: Optional[str]) -> Optional[list]:
        """The rules in force for a route: the active version of the policy it points at."""
        if not policy_id:
            return None
        row = conn.execute("SELECT * FROM policies WHERE id=? AND tenant_id=?", (policy_id, tenant_id)).fetchone()
        if not row:
            return None
        act = conn.execute("SELECT rules_json FROM policies WHERE tenant_id=? AND name=? AND active=1", (tenant_id, row["name"])).fetchone()
        return json.loads((act or row)["rules_json"])

    def host_of(url: str) -> str:
        return urlsplit(url).netloc

    def view(row, stats: Optional[dict] = None) -> dict:
        d = {k: row[k] for k in ("id", "name", "upstream_url", "sink", "purpose", "fail_mode", "mode", "policy_id", "created_at")}
        d["disabled"] = bool(row["disabled"])
        d["path"] = f"/fw/{row['name']}/"
        d["stats_24h"] = stats or {"calls": 0, "protected": 0, "would_protect": 0, "blocked": 0, "would_block": 0, "failed": 0, "held_pending": 0}
        return d

    def stats_for(conn, tenant_id: str) -> Dict[str, dict]:
        since = time.time() - 86400
        out: Dict[str, dict] = {}
        for r in conn.execute(
            """SELECT route_id, COUNT(*) calls, SUM(protected_count) p, SUM(would_protect_count) w, SUM(blocked) b,
                      SUM(CASE WHEN outcome IN ('failed_open','failed_closed') THEN 1 ELSE 0 END) f, SUM(would_block) wb
               FROM route_events WHERE tenant_id=? AND at>=? GROUP BY route_id""", (tenant_id, since)):
            out[r["route_id"]] = {"calls": r["calls"], "protected": r["p"] or 0, "would_protect": r["w"] or 0,
                                  "blocked": r["b"] or 0, "would_block": r["wb"] or 0, "failed": r["f"] or 0, "held_pending": 0}
        for r in conn.execute("SELECT route_id, COUNT(*) n FROM route_outbox WHERE tenant_id=? AND state='pending' GROUP BY route_id", (tenant_id,)):
            out.setdefault(r["route_id"], {"calls": 0, "protected": 0, "would_protect": 0, "blocked": 0, "would_block": 0, "failed": 0, "held_pending": 0})["held_pending"] = r["n"]
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
            if body.policy_id:
                own_policy(conn, tenant["id"], body.policy_id)      # 404 for a policy of another tenant
            with conn:
                try:
                    conn.execute(
                        """INSERT INTO routes (id, tenant_id, name, upstream_url, sink, purpose, fail_mode, mode, policy_id, created_at, disabled)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)""",
                        (rid, tenant["id"], body.name, body.upstream_url.strip(), body.sink or body.name, body.purpose,
                         body.fail_mode, body.mode, body.policy_id or None, time.time()))
                except sqlite3.IntegrityError:
                    raise HTTPException(409, f"a route named '{body.name}' already exists")
                audit_config(conn, tenant, "route.create", "route", rid,
                             {"name": body.name, "mode": body.mode, "fail_mode": body.fail_mode, "purpose": body.purpose,
                              "upstream_host": host_of(body.upstream_url.strip()), "policy_id": body.policy_id or None})
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
            before = own_route(conn, tenant["id"], route_id)
            if "policy_id" in body.model_fields_set and body.policy_id is not None:
                if body.policy_id:
                    own_policy(conn, tenant["id"], body.policy_id)       # 404 for a policy of another tenant
                sets.append("policy_id=?")
                args.append(body.policy_id or None)
            if sets:
                changes = {}
                for col in ("sink", "purpose", "fail_mode", "mode", "policy_id"):
                    v = getattr(body, col)
                    if v is not None and (v or None) != before[col]:
                        changes[col] = {"from": before[col], "to": v or None}
                if body.upstream_url is not None and body.upstream_url.strip() != before["upstream_url"]:
                    changes["upstream_host"] = {"from": host_of(before["upstream_url"]), "to": host_of(body.upstream_url.strip())}
                if body.disabled is not None and bool(body.disabled) != bool(before["disabled"]):
                    changes["disabled"] = {"from": bool(before["disabled"]), "to": bool(body.disabled)}
                with conn:
                    conn.execute(f"UPDATE routes SET {', '.join(sets)} WHERE id=? AND tenant_id=?", [*args, route_id, tenant["id"]])
                    if changes:
                        audit_config(conn, tenant, "route.update", "route", route_id, {"name": before["name"], "changes": changes})
            return view(own_route(conn, tenant["id"], route_id))
        finally:
            conn.close()

    @router.delete("/v1/routes/{route_id}")
    def delete_route(route_id: str, tenant: dict = Depends(manage)):
        conn = ctx.get_db()
        try:
            old = own_route(conn, tenant["id"], route_id)
            with conn:
                audit_config(conn, tenant, "route.delete", "route", route_id, {"name": old["name"]})
                conn.execute("DELETE FROM routes WHERE id=? AND tenant_id=?", (route_id, tenant["id"]))
                conn.execute("UPDATE route_outbox SET state='dead', last_error='route deleted' WHERE route_id=? AND state='pending'", (route_id,))
            return {"deleted": True, "id": route_id}
        finally:
            conn.close()

    # ---- policies
    policy_manage = ctx.require_scope("policy")

    def policy_reader(tenant: dict = Depends(ctx.get_tenant)) -> dict:
        if not ({"admin", "policy", "dashboard", "route"} & set(tenant.get("scopes", []))):
            raise HTTPException(403, "this key lacks the 'policy' or 'dashboard' scope")
        return tenant

    def policy_view(row, routes: Optional[list] = None) -> dict:
        d = {"id": row["id"], "name": row["name"], "version": row["version"], "rules": json.loads(row["rules_json"]),
             "created_at": row["created_at"], "active": bool(row["active"])}
        if routes is not None:
            d["routes"] = routes
        return d

    def clean_rules(rules) -> list:
        try:
            return fw_core.normalize_rules(rules)
        except ValueError as err:
            raise HTTPException(422, str(err))

    @router.post("/v1/policies", status_code=201)
    def create_policy(body: PolicyIn, tenant: dict = Depends(policy_manage)):
        if not ROUTE_NAME_RE.match(body.name):
            raise HTTPException(422, "name must be 1 to 40 characters: lowercase letters, digits, dash, underscore")
        rules = clean_rules(body.rules)
        pid = "pol_" + secrets.token_hex(8)
        conn = ctx.get_db()
        try:
            with conn:
                top = conn.execute("SELECT MAX(version) FROM policies WHERE tenant_id=? AND name=?", (tenant["id"], body.name)).fetchone()[0] or 0
                conn.execute("UPDATE policies SET active=0 WHERE tenant_id=? AND name=?", (tenant["id"], body.name))
                conn.execute("INSERT INTO policies (id, tenant_id, name, version, rules_json, created_at, active) VALUES (?, ?, ?, ?, ?, ?, 1)",
                             (pid, tenant["id"], body.name, top + 1, json.dumps(rules), time.time()))
                audit_config(conn, tenant, "policy.create", "policy", pid, {"name": body.name, "version": top + 1, "rules": rules})
            return policy_view(own_policy(conn, tenant["id"], pid))
        finally:
            conn.close()

    @router.get("/v1/policies")
    def list_policies(all_versions: bool = False, tenant: dict = Depends(policy_reader)):
        conn = ctx.get_db()
        try:
            sql = "SELECT * FROM policies WHERE tenant_id=?" + ("" if all_versions else " AND active=1") + " ORDER BY name, version DESC"
            rows = conn.execute(sql, (tenant["id"],)).fetchall()
            counts = {r["name"]: r["n"] for r in conn.execute("SELECT name, COUNT(*) n FROM policies WHERE tenant_id=? GROUP BY name", (tenant["id"],))}
            used: Dict[str, list] = {}
            for r in conn.execute("""SELECT r.name AS route, p.name AS pname FROM routes r JOIN policies p ON p.id=r.policy_id
                                     WHERE r.tenant_id=?""", (tenant["id"],)):
                used.setdefault(r["pname"], []).append(r["route"])
            out = []
            for r in rows:
                d = policy_view(r, used.get(r["name"], []))
                d["versions"] = counts.get(r["name"], 1)
                out.append(d)
            return {"policies": out, "types": list(fw_core.KNOWN_TYPES), "actions": list(fw_core.ACTIONS)}
        finally:
            conn.close()

    @router.post("/v1/policies/test")
    def test_policy(body: PolicyTest, tenant: dict = Depends(policy_reader)):
        """Shows what a policy would do to a text: per finding, its action, and the resulting text. Nothing is stored."""
        if len(body.text) > 20000:
            raise HTTPException(413, "text is limited to 20,000 characters")
        conn = ctx.get_db()
        try:
            if body.rules is not None:
                rules = clean_rules(body.rules)
            elif body.policy_id:
                rules = json.loads(own_policy(conn, tenant["id"], body.policy_id)["rules_json"])
            else:
                rules = []
        finally:
            conn.close()
        out = ctx.protect_text(tenant["id"], body.text, None, "Service", "policy-test")
        findings = out["res"].get("findings", [])
        text, decisions = fw_core.apply_policy(body.text, findings, rules)
        counts: Dict[str, int] = {}
        for d in decisions:
            counts[d["action"]] = counts.get(d["action"], 0) + 1
        return {"output": text, "findings": decisions, "counts": counts,
                "blocked": any(d["action"] == "block" for d in decisions),
                "alert": any(d["action"] == "alert" for d in decisions)}

    @router.get("/v1/policies/{policy_id}")
    def get_policy(policy_id: str, tenant: dict = Depends(policy_reader)):
        conn = ctx.get_db()
        try:
            row = own_policy(conn, tenant["id"], policy_id)
            hist = conn.execute("SELECT * FROM policies WHERE tenant_id=? AND name=? ORDER BY version DESC", (tenant["id"], row["name"])).fetchall()
            d = policy_view(row)
            d["history"] = [policy_view(h) for h in hist]
            d["routes"] = [r["name"] for r in conn.execute(
                "SELECT r.name FROM routes r JOIN policies p ON p.id=r.policy_id WHERE r.tenant_id=? AND p.name=?", (tenant["id"], row["name"]))]
            return d
        finally:
            conn.close()

    @router.post("/v1/policies/{name}/rollback")
    def rollback_policy(name: str, body: Optional[RollbackIn] = None, tenant: dict = Depends(policy_manage)):
        """Makes an earlier version the active one (the one before the active version unless to_version is given)."""
        conn = ctx.get_db()
        try:
            act = conn.execute("SELECT * FROM policies WHERE tenant_id=? AND name=? AND active=1", (tenant["id"], name)).fetchone()
            if not act:
                raise HTTPException(404, "policy not found")
            to = body.to_version if body and body.to_version is not None else None
            if to is None:
                target = conn.execute("SELECT * FROM policies WHERE tenant_id=? AND name=? AND version<? ORDER BY version DESC LIMIT 1",
                                      (tenant["id"], name, act["version"])).fetchone()
            else:
                target = conn.execute("SELECT * FROM policies WHERE tenant_id=? AND name=? AND version=?", (tenant["id"], name, to)).fetchone()
            if not target:
                raise HTTPException(409 if to is None else 404, "there is no earlier version to roll back to" if to is None else f"version {to} does not exist")
            if target["id"] == act["id"]:
                raise HTTPException(409, "that version is already active")
            with conn:
                conn.execute("UPDATE policies SET active=0 WHERE tenant_id=? AND name=?", (tenant["id"], name))
                conn.execute("UPDATE policies SET active=1 WHERE id=?", (target["id"],))
                audit_config(conn, tenant, "policy.rollback", "policy", target["id"],
                             {"name": name, "from_version": act["version"], "to_version": target["version"]})
            return policy_view(own_policy(conn, tenant["id"], target["id"]))
        finally:
            conn.close()

    # ---- config audit
    @router.get("/v1/config-audit")
    def config_audit_list(limit: int = 50, tenant: dict = Depends(policy_reader)):
        limit = max(1, min(200, limit))
        conn = ctx.get_db()
        try:
            rows = conn.execute("SELECT * FROM config_audit WHERE tenant_id=? ORDER BY id DESC LIMIT ?", (tenant["id"], limit)).fetchall()
            return {"audit": [{"id": r["id"], "at": r["at"], "actor": r["actor"], "action": r["action"], "target_type": r["target_type"],
                               "target_id": r["target_id"], "detail": json.loads(r["detail_json"]), "prev_hash": r["prev_hash"],
                               "entry_hash": r["entry_hash"]} for r in rows]}
        finally:
            conn.close()

    @router.get("/v1/config-audit/verify")
    def config_audit_verify(tenant: dict = Depends(policy_reader)):
        conn = ctx.get_db()
        try:
            return verify_audit(conn, tenant["id"])
        finally:
            conn.close()

    # ---- webhooks
    hook_manage = ctx.require_scope("webhook")

    def hook_reader(tenant: dict = Depends(ctx.get_tenant)) -> dict:
        if not ({"admin", "webhook", "dashboard"} & set(tenant.get("scopes", []))):
            raise HTTPException(403, "this key lacks the 'webhook' or 'dashboard' scope")
        return tenant

    def own_hook(conn, tenant_id: str, hook_id: str):
        row = conn.execute("SELECT * FROM webhooks WHERE id=? AND tenant_id=?", (hook_id, tenant_id)).fetchone()
        if not row:
            raise HTTPException(404, "webhook not found")
        return row

    def hook_view(row, secret: bool = False) -> dict:
        d = {"id": row["id"], "url": row["url"], "events": [e for e in row["events"].split(",") if e],
             "created_at": row["created_at"], "disabled": bool(row["disabled"])}
        if secret:
            d["secret"] = row["secret"]      # only in the answer to create
            d["note"] = "Copy the secret now. It is not shown again."
        return d

    def clean_events(events) -> str:
        if events is None or events == []:
            return "*"
        if not isinstance(events, list) or not all(isinstance(e, str) for e in events):
            raise HTTPException(422, "events must be a list of event names")
        bad = [e for e in events if e not in WEBHOOK_EVENTS and e != "*"]
        if bad:
            raise HTTPException(422, f"unknown events {bad}; use {list(WEBHOOK_EVENTS)} or '*'")
        return ",".join(dict.fromkeys(events))

    def check_hook_url(url: str):
        if len(url) > 500:
            raise HTTPException(422, "url is too long")
        try:
            check_upstream(ctx, url)
        except fw_core.UpstreamBlocked as err:
            raise HTTPException(400, f"url refused: {err}")

    @router.post("/v1/webhooks", status_code=201)
    def create_webhook(body: WebhookIn, tenant: dict = Depends(hook_manage)):
        url = body.url.strip()
        events = clean_events(body.events)
        check_hook_url(url)
        wid, secret = "wh_" + secrets.token_hex(8), "whsec_" + secrets.token_hex(24)
        conn = ctx.get_db()
        try:
            n = conn.execute("SELECT COUNT(*) FROM webhooks WHERE tenant_id=?", (tenant["id"],)).fetchone()[0]
            if n >= MAX_WEBHOOKS:
                raise HTTPException(409, f"a workspace can have {MAX_WEBHOOKS} webhooks at most")
            with conn:
                conn.execute("INSERT INTO webhooks (id, tenant_id, url, secret, events, created_at, disabled) VALUES (?, ?, ?, ?, ?, ?, 0)",
                             (wid, tenant["id"], url, secret, events, time.time()))
                audit_config(conn, tenant, "webhook.create", "webhook", wid, {"host": host_of(url), "events": events})
            row = own_hook(conn, tenant["id"], wid)
        finally:
            conn.close()
        start_sweeper(ctx)
        return hook_view(row, secret=True)

    @router.get("/v1/webhooks")
    def list_webhooks(tenant: dict = Depends(hook_reader)):
        conn = ctx.get_db()
        try:
            rows = conn.execute("SELECT * FROM webhooks WHERE tenant_id=? ORDER BY created_at", (tenant["id"],)).fetchall()
            states: Dict[str, dict] = {}
            for r in conn.execute("SELECT webhook_id, state, COUNT(*) n FROM webhook_deliveries WHERE tenant_id=? GROUP BY webhook_id, state", (tenant["id"],)):
                states.setdefault(r["webhook_id"], {})[r["state"]] = r["n"]
            out = []
            for r in rows:
                d = hook_view(r)
                d["deliveries"] = states.get(r["id"], {})
                out.append(d)
            return {"webhooks": out, "events": list(WEBHOOK_EVENTS)}
        finally:
            conn.close()

    @router.get("/v1/webhook-deliveries")
    def list_deliveries(limit: int = 50, webhook_id: Optional[str] = None, tenant: dict = Depends(hook_reader)):
        limit = max(1, min(200, limit))
        conn = ctx.get_db()
        try:
            sql = "SELECT * FROM webhook_deliveries WHERE tenant_id=?"
            args: list = [tenant["id"]]
            if webhook_id:
                sql += " AND webhook_id=?"
                args.append(webhook_id)
            rows = conn.execute(sql + " ORDER BY at DESC, rowid DESC LIMIT ?", [*args, limit]).fetchall()
            return {"deliveries": [{"id": r["id"], "webhook_id": r["webhook_id"], "event_id": r["event_id"], "event_type": r["event_type"],
                                    "at": r["at"], "attempts": r["attempts"], "status_code": r["status_code"], "state": r["state"],
                                    "next_at": r["next_at"] if r["state"] == "pending" else None, "error": r["last_error"],
                                    "payload": json.loads(r["payload_json"])} for r in rows]}
        finally:
            conn.close()

    @router.get("/v1/webhooks/{hook_id}")
    def get_webhook(hook_id: str, tenant: dict = Depends(hook_reader)):
        conn = ctx.get_db()
        try:
            return hook_view(own_hook(conn, tenant["id"], hook_id))
        finally:
            conn.close()

    @router.patch("/v1/webhooks/{hook_id}")
    def patch_webhook(hook_id: str, body: WebhookPatch, tenant: dict = Depends(hook_manage)):
        conn = ctx.get_db()
        try:
            before = own_hook(conn, tenant["id"], hook_id)
            sets, args, changes = [], [], {}
            if body.url is not None:
                url = body.url.strip()
                check_hook_url(url)
                sets.append("url=?")
                args.append(url)
                changes["host"] = {"from": host_of(before["url"]), "to": host_of(url)}
            if body.events is not None:
                ev = clean_events(body.events)
                sets.append("events=?")
                args.append(ev)
                changes["events"] = {"from": before["events"], "to": ev}
            if body.disabled is not None:
                sets.append("disabled=?")
                args.append(1 if body.disabled else 0)
                changes["disabled"] = {"from": bool(before["disabled"]), "to": bool(body.disabled)}
            if sets:
                with conn:
                    conn.execute(f"UPDATE webhooks SET {', '.join(sets)} WHERE id=? AND tenant_id=?", [*args, hook_id, tenant["id"]])
                    audit_config(conn, tenant, "webhook.update", "webhook", hook_id, {"changes": changes})
            return hook_view(own_hook(conn, tenant["id"], hook_id))
        finally:
            conn.close()

    @router.delete("/v1/webhooks/{hook_id}")
    def delete_webhook(hook_id: str, tenant: dict = Depends(hook_manage)):
        conn = ctx.get_db()
        try:
            old = own_hook(conn, tenant["id"], hook_id)
            with conn:
                audit_config(conn, tenant, "webhook.delete", "webhook", hook_id, {"host": host_of(old["url"])})
                conn.execute("DELETE FROM webhooks WHERE id=? AND tenant_id=?", (hook_id, tenant["id"]))
                conn.execute("UPDATE webhook_deliveries SET state='failed', last_error='webhook deleted' WHERE webhook_id=? AND state='pending'", (hook_id,))
            return {"deleted": True, "id": hook_id}
        finally:
            conn.close()

    @router.post("/v1/webhooks/{hook_id}/test")
    def test_webhook(hook_id: str, tenant: dict = Depends(hook_manage)):
        """Sends one signed 'test' event now, a single attempt, and records it."""
        conn = ctx.get_db()
        try:
            w = own_hook(conn, tenant["id"], hook_id)
            now, did, eid = time.time(), "dl_" + secrets.token_hex(8), "evt_" + secrets.token_hex(8)
            body = json.dumps({"id": eid, "type": "test", "created_at": now, "tenant_id": tenant["id"],
                               "data": {"message": "This is a test event from Aran Cloud."}}, sort_keys=True, separators=(",", ":"))
            code, err = send_webhook(ctx, w["url"], w["secret"], "test", did, body.encode("utf-8"))
            with conn:
                conn.execute(
                    """INSERT INTO webhook_deliveries (id, webhook_id, tenant_id, event_id, event_type, at, attempts, status_code, state, next_at, payload_json, last_error)
                       VALUES (?, ?, ?, ?, 'test', ?, 1, ?, ?, ?, ?, ?)""",
                    (did, w["id"], tenant["id"], eid, now, code, "failed" if err else "delivered", now, body, err[:200] or None))
            return {"delivered": not err, "status_code": code, "error": err or None, "delivery_id": did, "event_id": eid}
        finally:
            conn.close()

    # ---- SIEM export
    @router.get("/v1/events/export")
    def export_events(format: str = "json", since: Optional[str] = None, limit: int = 1000, tenant: dict = Depends(reader)):
        """Route events (blocks included) as NDJSON or CEF lines, oldest first. Pass the X-Aran-Next-Since header
        of one answer as `since` of the next to read on."""
        if format not in ("json", "cef"):
            raise HTTPException(422, "format must be json or cef")
        t0 = parse_since(since)
        limit = max(1, min(5000, limit))
        conn = ctx.get_db()
        try:
            rows = conn.execute(
                """SELECT e.*, r.name AS route_name FROM route_events e LEFT JOIN routes r ON r.id=e.route_id
                   WHERE e.tenant_id=? AND e.at>? ORDER BY e.at, e.id LIMIT ?""", (tenant["id"], t0, limit)).fetchall()
        finally:
            conn.close()
        lines = [cef_line(r) if format == "cef" else json_line(r) for r in rows]
        resp = Response(content=("\n".join(lines) + "\n") if lines else "",
                        media_type="application/x-ndjson" if format == "json" else "text/plain; charset=utf-8")
        resp.headers["X-Aran-Count"] = str(len(lines))
        resp.headers["X-Aran-Next-Since"] = repr(rows[-1]["at"]) if rows else repr(t0)
        return resp

    # ---- the proxy
    def record(conn, tenant_id: str, route: dict, ev: dict, usage: Optional[dict]):
        now = time.time()
        with conn:
            conn.execute(
                """INSERT INTO route_events (tenant_id, route_id, at, method, path, status_code, upstream_status, protected_count,
                                             would_protect_count, blocked, latency_ms, fw_ms, outcome, would_block)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (tenant_id, route["id"], now, ev["method"], ev["path"], ev["status"], ev.get("upstream_status"),
                 ev.get("protected", 0), ev.get("would", 0), ev.get("blocked", 0), ev.get("latency_ms"), ev.get("fw_ms"), ev["outcome"],
                 ev.get("would_block", 0)))
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
                if ev.get("protected") or ev.get("would"):
                    check_spike(conn, tenant_id, route)
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
                res = clean_body(ctx, tenant_id, route, ct, body, path, query, cust, rules_of(conn, tenant_id, route.get("policy_id")), fault, parsed)
            except CleanFailed:
                failed = True
        fw_ms = round((time.perf_counter() - t0) * 1000, 2)
        ev["fw_ms"] = fw_ms
        if res is not None and res.supported:
            ev["path"] = "/" + fw_core.mask_text(res.path)      # the log never keeps what the policy let through
        usage = None
        if res is not None and res.supported:
            usage = {"protected": res.protected, "unprotected": res.unprotected, "ignored": res.ignored, "by_type": res.by_type,
                     "latency_ms": res.latency_ms or fw_ms, "findings": res.findings, "customer_ref": cust}

        fwd_headers = fw_core.forward_headers(headers)
        fwd_headers["X-Aran-Route"] = route["name"]

        if res is not None and res.alert_types:
            emit_event(tenant_id, "alert", {"route": route["name"], "mode": route["mode"], "types": res.alert_types})
        if res is not None and res.block_types:
            emit_event(tenant_id, "block" if enforce else "would_block", {"route": route["name"], "types": res.block_types})
            if enforce:
                ev["outcome"] = "blocked"
                ev["blocked"] = 1
                return done(jerr(403, {"blocked": True, "types": res.block_types,
                                       "detail": "a rule of this route's policy refuses requests that carry these identifiers"}), usage)
            ev["would_block"] = 1       # monitor: forward the original, but say it would have been refused

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
            if ev.get("would_block"):
                resp.headers["X-Aran-Would-Block"] = "1"
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
