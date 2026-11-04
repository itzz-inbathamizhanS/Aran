"""aran_edge/edge.py: a self-hosted data plane for Aran Cloud.

The edge runs inside your network. Callers send requests to  http://<edge>/fw/<route>/<path>  with the edge's local
key; the edge cleans the request with YOUR core (ARAN_CORE_URL), applies the route's policy and forwards it to the
upstream. Raw identifiers never leave your network.

It talks to Aran Cloud for two things only:
  - it pulls its config (routes and active policies), signed with Ed25519, and applies it only if the signature,
    tenant, expiry and version are right; it keeps the last good config until that config expires;
  - it reports counts (calls, protected, blocked, held, p50, p95) and nothing else.

The cleaning logic is the same code Cloud uses (aran_cloud/fw_core.py). The edge has its own small SQLite file for
the identity it learned at registration, the last good config and an outbox of held requests (protected or masked
bodies only, never raw).
"""

import base64
import hmac
import json
import os
import re
import secrets
import sqlite3
import sys
import threading
import time
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional
from urllib.parse import quote, urlsplit

import requests
from fastapi import FastAPI, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse, Response

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(_HERE, "..", "aran_cloud"))
import fw_core  # noqa: E402  (the shared, pure helpers)

METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"]
CUSTOMER_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
OUTBOX_MAX_ATTEMPTS = 8
UPSTREAM_MAX_BYTES = 5 * 1024 * 1024


def _flag(name: str) -> bool:
    return os.environ.get(name, "0").strip().lower() in ("1", "true", "yes")


class Settings:
    """Read from the environment (see README.md). Tests build one directly."""

    def __init__(self, **kw):
        e = os.environ.get
        self.cloud_url = (kw.get("cloud_url") or e("ARAN_CLOUD_URL", "http://127.0.0.1:8100")).rstrip("/")
        self.edge_key = kw.get("edge_key") or e("ARAN_EDGE_KEY", "")
        self.core_url = (kw.get("core_url") or e("ARAN_CORE_URL", "http://127.0.0.1:8000")).rstrip("/")
        self.public_key = kw.get("public_key") if "public_key" in kw else e("ARAN_EDGE_PUBLIC_KEY", "")
        # off by default: without a pinned key the edge refuses to start trusting configs. Turning this on makes the
        # edge accept whatever key Cloud (or anyone in the middle of that first call) hands it at registration.
        self.trust_on_first_use = kw["trust_on_first_use"] if "trust_on_first_use" in kw else _flag("ARAN_EDGE_TRUST_ON_FIRST_USE")
        self.local_key = kw.get("local_key") or e("ARAN_EDGE_LOCAL_KEY", "")
        self.db_path = kw.get("db_path") or e("ARAN_EDGE_DB", "edge.db")
        self.name = kw.get("name") or e("ARAN_EDGE_NAME", "edge")
        self.port = int(kw.get("port") or e("ARAN_EDGE_PORT", "8200"))
        self.poll_s = float(kw.get("poll_s") or e("ARAN_EDGE_POLL_S", "60"))
        self.report_s = float(kw.get("report_s") or e("ARAN_EDGE_REPORT_S", "60"))
        self.sweep_s = float(kw.get("sweep_s") or e("ARAN_EDGE_SWEEP_S", "5"))
        self.core_timeout_ms = float(kw.get("core_timeout_ms") or e("ARAN_EDGE_CORE_TIMEOUT_MS", e("ARAN_FAAS_CORE_TIMEOUT_MS", "300")))
        self.upstream_timeout_s = float(kw.get("upstream_timeout_s") or e("ARAN_EDGE_UPSTREAM_TIMEOUT_S", "10"))
        self.allow_private = kw["allow_private"] if "allow_private" in kw else _flag("ARAN_EDGE_ALLOW_PRIVATE_UPSTREAMS")
        self.test_hooks = kw["test_hooks"] if "test_hooks" in kw else _flag("ARAN_EDGE_TEST_HOOKS")
        self.internal_secret = kw.get("internal_secret") or e("ARAN_INTERNAL_SECRET", "")
        self.background = kw["background"] if "background" in kw else True


def _pct(values: List[float], q: float) -> float:
    if not values:
        return 0.0
    v = sorted(values)
    return round(v[min(len(v) - 1, int(q * len(v)))], 2)


class Edge:
    def __init__(self, cfg: Settings, http=None):
        self.cfg = cfg
        self.http = http or requests          # anything with .get/.post like requests; tests pass a recorder
        self.lock = threading.Lock()
        self.config: Optional[dict] = None    # the applied payload
        self.digest: Optional[str] = None
        self.last_error = ""
        self.counters: Dict[str, dict] = {}
        self._init_db()
        self._load_identity()
        if not self.cfg.local_key:
            self.cfg.local_key = self._meta("local_key") or self._set_meta("local_key", secrets.token_urlsafe(24))
            print(f"aran_edge: no ARAN_EDGE_LOCAL_KEY set, made one: {self.cfg.local_key}", flush=True)
        self._load_saved_config()

    # ------------------------------------------------------------ sqlite
    def _db(self):
        conn = sqlite3.connect(self.cfg.db_path, timeout=10)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        conn = self._db()
        with conn:
            conn.execute("CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)")
            conn.execute("""CREATE TABLE IF NOT EXISTS outbox (
                id INTEGER PRIMARY KEY AUTOINCREMENT, route_name TEXT NOT NULL, created_at REAL NOT NULL,
                attempts INTEGER NOT NULL DEFAULT 0, next_at REAL NOT NULL, method TEXT, path TEXT,
                headers_json TEXT, body_protected TEXT, state TEXT NOT NULL DEFAULT 'pending', last_error TEXT)""")
        conn.close()

    def _meta(self, k: str) -> Optional[str]:
        conn = self._db()
        try:
            r = conn.execute("SELECT v FROM meta WHERE k=?", (k,)).fetchone()
            return r["v"] if r else None
        finally:
            conn.close()

    def _set_meta(self, k: str, v: str) -> str:
        conn = self._db()
        with conn:
            conn.execute("INSERT OR REPLACE INTO meta (k, v) VALUES (?, ?)", (k, v))
        conn.close()
        return v

    # ------------------------------------------------------------ identity and config
    def _load_identity(self):
        self.edge_id = self._meta("edge_id")
        self.tenant_id = self._meta("tenant_id")
        self.public_raw: Optional[bytes] = None
        pk = self.cfg.public_key or self._meta("public_key")
        if pk:
            self.public_raw = base64.b64decode(pk)

    def _cloud(self, method: str, path: str, **kw):
        h = {"X-API-Key": self.cfg.edge_key}
        return getattr(self.http, method)(self.cfg.cloud_url + path, headers=h, timeout=10, **kw)

    def register(self):
        """Tells Cloud this edge exists and learns its tenant and edge id. The public key that checks configs must be
        pinned (ARAN_EDGE_PUBLIC_KEY); learning it from Cloud is allowed only with ARAN_EDGE_TRUST_ON_FIRST_USE=1."""
        if not self.cfg.public_key and not self.public_raw and not self.cfg.trust_on_first_use:
            raise fw_core.ConfigRejected("no pinned Cloud public key: set ARAN_EDGE_PUBLIC_KEY (from GET /v1/edge/public-key), "
                                         "or ARAN_EDGE_TRUST_ON_FIRST_USE=1 to trust the key Cloud sends on first start")
        r = self._cloud("post", "/v1/edge/register", json={"name": self.cfg.name})
        r.raise_for_status()
        d = r.json()
        self.edge_id, self.tenant_id = d["edge_id"], d["tenant_id"]
        self._set_meta("edge_id", self.edge_id)
        self._set_meta("tenant_id", self.tenant_id)
        if not self.cfg.public_key and not self.public_raw:
            # trust on first use (opted in): keep the key Cloud gives on the very first registration
            print("aran_edge: WARNING: no pinned public key, trusting the key Cloud sent on first use "
                  f"(key id {d.get('key_id', '?')}). Pin ARAN_EDGE_PUBLIC_KEY instead.", flush=True)
            self._set_meta("public_key", d["public_key"])
            self.public_raw = base64.b64decode(d["public_key"])
        return d

    def _load_saved_config(self):
        """After a restart: re-check the last good config (signature, tenant and expiry) before using it."""
        text = self._meta("config_envelope")
        if not text or not self.public_raw or not self.tenant_id:
            return
        try:
            self.apply_envelope(json.loads(text), save=False)
        except (fw_core.ConfigRejected, ValueError):
            pass

    def apply_envelope(self, envelope: Any, save: bool = True) -> dict:
        """Verifies and applies a signed config. Raises fw_core.ConfigRejected and keeps the old config when it is refused."""
        if self.public_raw is None or not self.tenant_id:
            raise fw_core.ConfigRejected("edge is not registered yet")
        with self.lock:
            cur_v = self.config["version"] if self.config else 0
            try:
                p = fw_core.verify_config(envelope, self.public_raw, self.tenant_id, self.edge_id, cur_v, self.digest)
            except fw_core.ConfigRejected as err:
                self.last_error = str(err)
                raise
            self.config = p
            self.digest = fw_core.config_digest(p["routes"], p["policies"])
            self.last_error = ""
        if save:
            self._set_meta("config_envelope", json.dumps(envelope))
        return p

    def pull_config(self) -> dict:
        applied = self.config["version"] if self.config else 0
        r = self._cloud("get", f"/v1/edge/config?applied={applied}")
        r.raise_for_status()
        return self.apply_envelope(r.json())

    def active_config(self) -> Optional[dict]:
        """The applied config while it is still valid; None once it has expired (the edge then refuses traffic)."""
        c = self.config
        if c and float(c["expires_at"]) > time.time():
            return c
        return None

    # ------------------------------------------------------------ reporting
    def _count(self, route_id: str, calls=1, protected=0, blocked=0, held=0, ms: Optional[float] = None):
        with self.lock:
            c = self.counters.setdefault(route_id, {"window_start": time.time(), "calls": 0, "protected": 0, "blocked": 0, "held": 0, "ms": []})
            c["calls"] += calls
            c["protected"] += protected
            c["blocked"] += blocked
            c["held"] += held
            if ms is not None and len(c["ms"]) < 5000:
                c["ms"].append(ms)

    def report(self) -> dict:
        """Sends the counts since the last report: numbers and the route id, nothing else. Failed sends are kept."""
        with self.lock:
            taken, self.counters = self.counters, {}
        sent = failed = 0
        for rid, c in taken.items():
            body = {"route_id": rid, "window_start": round(c["window_start"], 3), "calls": c["calls"], "protected": c["protected"],
                    "blocked": c["blocked"], "held": c["held"], "p50_ms": _pct(c["ms"], 0.5), "p95_ms": _pct(c["ms"], 0.95),
                    "applied_version": self.config["version"] if self.config else 0}
            try:
                r = self._cloud("post", "/v1/edge/report", json=body)
                ok = r.status_code == 200
            except requests.exceptions.RequestException:
                ok = False
            if ok:
                sent += 1
            else:
                failed += 1
                with self.lock:                 # put the counts back for the next try
                    k = self.counters.setdefault(rid, {"window_start": c["window_start"], "calls": 0, "protected": 0, "blocked": 0, "held": 0, "ms": []})
                    for f in ("calls", "protected", "blocked", "held"):
                        k[f] += c[f]
                    k["ms"].extend(c["ms"])
                    k["window_start"] = min(k["window_start"], c["window_start"])
        return {"sent": sent, "failed": failed}

    # ------------------------------------------------------------ the core (local) and the upstream
    def core_protect(self, tenant_id: str, text: str, customer_ref: Optional[str], purpose: str, sink: str) -> dict:
        payload = {"text": text, "source": "core-banking", "sink": sink,
                   "customer_ref": f"{tenant_id}__{customer_ref}" if customer_ref else None,
                   "purpose": purpose, "scope": tenant_id}
        headers = {"Content-Type": "application/json"}
        if self.cfg.internal_secret:
            headers["X-Aran-Internal"] = self.cfg.internal_secret
        t0 = time.perf_counter()
        r = requests.post(self.cfg.core_url + "/api/process", json=payload, headers=headers, timeout=max(1.0, self.cfg.core_timeout_ms / 1000 * 4))
        r.raise_for_status()
        res = r.json()
        findings = res.get("findings", [])
        by_type: Dict[str, int] = {}
        prot = 0
        for f in findings:
            if f.get("protected"):
                prot += 1
                by_type[f.get("type", "UNKNOWN")] = by_type.get(f.get("type", "UNKNOWN"), 0) + 1
        notes = res.get("notes", [])
        return {"after": res.get("after", ""), "findings": findings, "protected": prot, "by_type": by_type,
                "unprotected": sum(1 for f in findings if not f.get("protected")) + sum(1 for n in notes if "passed through unchanged" in n),
                "ignored": sum(1 for n in notes if "fails the Aadhaar/Luhn checksum" in n),
                "latency_ms": res.get("latency_ms") or round((time.perf_counter() - t0) * 1000, 2)}

    def _own(self):
        cu = urlsplit(self.cfg.core_url)
        core_port = cu.port or (443 if cu.scheme == "https" else 80)
        return [(cu.hostname or "", core_port), ("localhost", self.cfg.port), ("127.0.0.1", self.cfg.port)], {core_port, self.cfg.port}

    def check_upstream(self, url: str):
        own, ports = self._own()
        return fw_core.check_upstream_url(url, allow_private=self.cfg.allow_private, own=own, own_ports=ports)

    def forward(self, route: dict, method: str, path: str, query: str, headers: Dict[str, str], body: bytes):
        """One request to the upstream. The URL is checked again now (DNS can change) and redirects are never followed."""
        try:
            ips = self.check_upstream(route["upstream_url"])
        except fw_core.UpstreamBlocked as err:
            raise UpstreamError(f"upstream refused: {err}")
        url = route["upstream_url"].rstrip("/") + ("/" + path if path else "") + ("?" + query if query else "")
        try:
            # connect to the address just checked, so a changed DNS answer cannot reach another host
            r = fw_core.pinned_request(method, url, ips[0], headers=headers, data=body or None,
                                       timeout=(3.0, self.cfg.upstream_timeout_s), allow_redirects=False, stream=True)
            content = r.raw.read(UPSTREAM_MAX_BYTES + 1, decode_content=True)
            r.close()
        except requests.exceptions.RequestException as err:
            raise UpstreamError(err.__class__.__name__)
        if len(content) > UPSTREAM_MAX_BYTES:
            raise UpstreamError("upstream answer too large")
        return r.status_code, dict(r.headers), content

    # ------------------------------------------------------------ the outbox
    def queue(self, route: dict, method: str, path: str, query: str, headers: Dict[str, str], body: bytes) -> int:
        conn = self._db()
        try:
            with conn:
                cur = conn.execute(
                    """INSERT INTO outbox (route_name, created_at, attempts, next_at, method, path, headers_json, body_protected, state)
                       VALUES (?, ?, 0, ?, ?, ?, ?, ?, 'pending')""",
                    (route["name"], time.time(), time.time() + 2, method, path + ("?" + query if query else ""),
                     json.dumps(fw_core.queue_headers(headers)), body.decode("utf-8", "replace")))
            return cur.lastrowid
        finally:
            conn.close()

    def sweep_outbox(self, limit: int = 20) -> dict:
        conn = self._db()
        sent = failed = 0
        try:
            rows = conn.execute("SELECT * FROM outbox WHERE state='pending' AND next_at<=? ORDER BY id LIMIT ?", (time.time(), limit)).fetchall()
            cfg = self.active_config()
            for o in rows:
                route = next((r for r in (cfg or {}).get("routes", []) if r["name"] == o["route_name"]), None)
                if not route:
                    continue            # no valid config (or route removed): leave it queued
                hdrs = json.loads(o["headers_json"] or "{}")
                hdrs["X-Aran-Route"] = route["name"]
                hdrs["X-Aran-Retry"] = str(o["attempts"] + 1)
                path, _, qs = o["path"].partition("?")
                try:
                    status, _, _ = self.forward(route, o["method"], path, qs, hdrs, (o["body_protected"] or "").encode())
                    err = f"upstream answered {status}" if status >= 500 else ""
                except UpstreamError as e:
                    err = str(e)
                with conn:
                    if not err:
                        conn.execute("UPDATE outbox SET state='sent', attempts=attempts+1, last_error=NULL WHERE id=?", (o["id"],))
                        sent += 1
                    else:
                        n = o["attempts"] + 1
                        conn.execute("UPDATE outbox SET attempts=?, next_at=?, state=?, last_error=? WHERE id=?",
                                     (n, time.time() + min(300, 2 ** n * 2), "dead" if n >= OUTBOX_MAX_ATTEMPTS else "pending", err[:200], o["id"]))
                        failed += 1
        finally:
            conn.close()
        return {"sent": sent, "failed": failed}

    def outbox_depth(self) -> int:
        conn = self._db()
        try:
            return conn.execute("SELECT COUNT(*) n FROM outbox WHERE state='pending'").fetchone()["n"]
        finally:
            conn.close()

    # ------------------------------------------------------------ one request
    def handle(self, route_name: str, method: str, path: str, query: str, headers: Dict[str, str], body: bytes) -> Response:
        t0 = time.perf_counter()
        cfg = self.active_config()
        if cfg is None:
            return JSONResponse({"error": "no_valid_config", "detail": "the edge has no unexpired signed config, so it forwards nothing"}, status_code=503)
        route = next((r for r in cfg["routes"] if r["name"] == route_name), None)
        if not route:
            raise HTTPException(404, "route not found")
        enforce = route["mode"] == "enforce"
        rules = None
        if route.get("policy"):
            pol = next((p for p in cfg["policies"] if p["name"] == route["policy"]), None)
            rules = pol["rules"] if pol else None
        ct = headers.get("content-type", "")
        cust = headers.get("x-aran-customer-ref")
        cust = cust if cust and CUSTOMER_RE.match(cust) else None
        fault = self.cfg.test_hooks and headers.get("x-aran-test-fault") == "core-down"
        tenant_id = cfg["tenant_id"]
        rid = route["id"]
        stats = {"protected": 0, "blocked": 0, "held": 0}

        def done(resp: Response) -> Response:
            self._count(rid, 1, stats["protected"], stats["blocked"], stats["held"], (time.perf_counter() - t0) * 1000)
            resp.headers["X-Aran-Route"] = route["name"]
            resp.headers["X-Aran-Edge"] = self.edge_id or ""
            return resp

        def jerr(code: int, payload: dict) -> Response:
            return JSONResponse(payload, status_code=code)

        raw_path = path
        path = "/".join(quote(seg, safe="@:.-_~") for seg in path.split("/")) if path else ""
        try:
            parsed = (fw_core.parse_body(ct, body), fw_core.parse_path(raw_path), fw_core.parse_query(query))
        except fw_core.BodyError as err:
            if enforce:
                stats["blocked"] += 1
                return done(jerr(400, {"error": "bad_body", "detail": str(err)}))
            parsed = (None, fw_core.parse_path(raw_path), fw_core.parse_query(query))
        if parsed[0] is None and body and enforce:
            stats["blocked"] += 1
            return done(jerr(415, {"error": "unsupported_media_type",
                                   "detail": "this route cleans JSON, text, NDJSON and form bodies; other types are refused"}))

        def protect_fn(text: str) -> dict:
            if fault:
                raise RuntimeError("simulated core outage")
            return self.core_protect(tenant_id, text, cust, route["purpose"], route["sink"])

        res = None
        failed = False
        if parsed[0] is not None:
            try:
                res = fw_core.clean_request(protect_fn, ct, body, path, query, rules, parsed)
            except fw_core.CleanFailed:
                failed = True

        fwd_headers = fw_core.forward_headers(headers)
        fwd_headers["X-Aran-Route"] = route["name"]
        failed_open = False
        would = 0
        if res is not None and res.block_types:
            if enforce:
                stats["blocked"] += 1
                return done(jerr(403, {"blocked": True, "types": res.block_types,
                                       "detail": "a rule of this route's policy refuses requests that carry these identifiers"}))
        if failed:
            if not enforce or route["fail_mode"] == "open":
                send_path, send_query, send_body, failed_open = path, query, body, True
            elif route["fail_mode"] == "closed":
                return done(jerr(503, {"error": "aran_unavailable", "failed": "closed",
                                       "detail": "the edge could not clean this request in time, so nothing was forwarded"}))
            else:
                m = fw_core.mask_request(parsed)
                qid = self.queue(route, method, m.path, m.query, headers, m.body)
                stats["held"] += 1
                return done(jerr(202, {"held": True, "reason": "core_unavailable", "id": qid}))
        elif enforce and res is not None and res.supported:
            send_path, send_query, send_body = res.path, res.query, res.body
            stats["protected"] = res.protected
        else:
            send_path, send_query, send_body = path, query, body
            would = res.protected if res is not None else 0

        # an "allow" rule leaves raw values in the cleaned body: the outbox keeps a masked copy instead
        held = (send_path, send_query, send_body)
        if res is not None and res.actions.get("allow") and parsed[0] is not None:
            m = fw_core.mask_request(parsed)
            held = (m.path, m.query, m.body)

        try:
            if not fw_core.safe_path(send_path):
                raise UpstreamError("path not allowed")
            status, up_headers, content = self.forward(route, method, send_path, send_query, fwd_headers, send_body)
        except UpstreamError as err:
            if enforce and not failed_open:
                qid = self.queue(route, method, *held[:2], headers, held[2])
                stats["held"] += 1
                return done(jerr(202, {"held": True, "reason": "upstream_unavailable", "id": qid}))
            return done(jerr(502, {"error": "upstream_unreachable", "detail": str(err)}))
        if status >= 500 and enforce and not failed_open:
            qid = self.queue(route, method, *held[:2], headers, held[2])
            stats["held"] += 1
            return done(jerr(202, {"held": True, "reason": "upstream_error", "upstream_status": status, "id": qid}))
        out_headers = {k: v for k, v in up_headers.items() if k.lower() not in fw_core.HOP_BY_HOP | {"content-encoding", "set-cookie"}}
        resp = Response(content=content, status_code=status, headers=out_headers)
        resp.headers["X-Aran-Protected"] = str(stats["protected"])
        if not enforce:
            resp.headers["X-Aran-Would-Protect"] = str(would)
        if failed_open:
            resp.headers["X-Aran-Fail"] = "open"
        return done(resp)

    # ------------------------------------------------------------ background work
    def start(self):
        threading.Thread(target=self._loop, daemon=True, name="edge-loop").start()

    def _loop(self):
        last_pull = last_report = last_sweep = 0.0
        while True:
            time.sleep(min(1.0, self.cfg.sweep_s))
            now = time.time()
            try:
                if not self.tenant_id:
                    self.register()
                if now - last_pull >= self.cfg.poll_s:
                    last_pull = now
                    try:
                        self.pull_config()
                    except (fw_core.ConfigRejected, requests.exceptions.RequestException) as err:
                        self.last_error = str(err)[:200]
                if now - last_report >= self.cfg.report_s:
                    last_report = now
                    self.report()
                if now - last_sweep >= self.cfg.sweep_s:
                    last_sweep = now
                    self.sweep_outbox()
            except Exception as err:
                self.last_error = err.__class__.__name__


class UpstreamError(Exception):
    pass


def create_app(cfg: Optional[Settings] = None, http=None) -> FastAPI:
    cfg = cfg or Settings()
    edge = Edge(cfg, http)

    @asynccontextmanager
    async def lifespan(_app):
        if cfg.background:
            edge.start()
        yield

    app = FastAPI(title="Aran Edge", docs_url=None, redoc_url=None, openapi_url=None, lifespan=lifespan)
    app.state.edge = edge

    def local_auth(request: Request):
        k = request.headers.get("x-api-key", "")
        if not k or not hmac.compare_digest(k.encode(), edge.cfg.local_key.encode()):
            raise HTTPException(401, "missing or wrong local key (X-API-Key)")

    @app.get("/edge/health")
    def health():
        return {"ok": True, "config_valid": edge.active_config() is not None}

    @app.get("/edge/status")
    def status(request: Request):
        local_auth(request)
        c = edge.config
        return {"edge_id": edge.edge_id, "tenant_id": edge.tenant_id, "version": c["version"] if c else None,
                "config_valid": edge.active_config() is not None, "expires_at": c["expires_at"] if c else None,
                "routes": [r["name"] for r in (c or {}).get("routes", [])], "outbox_pending": edge.outbox_depth(),
                "last_error": edge.last_error}

    @app.post("/edge/sync")
    def sync(request: Request):
        """Pull the config and send the counts now (the background loop does this on a timer)."""
        local_auth(request)
        out: Dict[str, Any] = {}
        try:
            if not edge.tenant_id:
                edge.register()
            out["version"] = edge.pull_config()["version"]
        except fw_core.ConfigRejected as err:
            out["rejected"] = str(err)
        except requests.exceptions.RequestException as err:
            out["error"] = err.__class__.__name__
        out["report"] = edge.report()
        return out

    async def proxy(route_name: str, request: Request, path: str):
        local_auth(request)
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
        return await run_in_threadpool(edge.handle, route_name, request.method, path, request.url.query, headers, b"".join(chunks))

    @app.api_route("/fw/{route_name}/{path:path}", methods=METHODS)
    async def fw_path(route_name: str, path: str, request: Request):
        return await proxy(route_name, request, path)

    @app.api_route("/fw/{route_name}", methods=METHODS)
    async def fw_root(route_name: str, request: Request):
        return await proxy(route_name, request, "")

    return app


def __getattr__(name: str):
    """`uvicorn aran_edge.edge:app` asks for `app`; it is made on first use from the environment."""
    if name == "app":
        if not os.environ.get("ARAN_EDGE_KEY"):
            raise RuntimeError("ARAN_EDGE_KEY is not set: make a key with the 'edge' scope in Aran Cloud and export it")
        global _app
        if "_app" not in globals():
            _app = create_app(Settings())
        return _app
    raise AttributeError(name)
