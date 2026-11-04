"""aran_cloud/edge_plane.py: the control plane for self-hosted data planes (aran_edge).

An edge is a small proxy that runs inside a customer's network. It pulls its config from here, signed with Ed25519,
cleans traffic with a core in the customer's own network, and reports only counts back.

Endpoints (scope `edge` for the edge itself, `dashboard` to look):
  GET  /v1/edge/public-key   the key that checks a config (public, no key needed)
  POST /v1/edge/register     an edge introduces itself (one edge per API key)
  GET  /v1/edge/config       the signed config: routes and active policies, no secrets, valid 10 minutes
  POST /v1/edge/report       counts only (calls, protected, blocked, held, p50, p95)
  GET  /v1/edges             the tenant's edges with last report and applied version

This module never imports main; main.py passes the faas.Ctx it already built.
"""

import base64
import json
import os
import re
import secrets
import sqlite3
import threading
import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request

try:
    from . import fw_core
except ImportError:
    import fw_core

NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9 ._-]{0,47}$")
ROUTE_ID_RE = re.compile(r"^rt_[0-9a-f]{6,32}$")
ONLINE_S = 300
# the only fields a report may carry; everything but route_id is a plain number
REPORT_NUMBERS = ("window_start", "calls", "protected", "blocked", "held", "p50_ms", "p95_ms", "applied_version")
REPORT_FIELDS = ("route_id",) + REPORT_NUMBERS
MAX_NUMBER = 1e12


def init_schema(conn: sqlite3.Connection):
    conn.execute("""CREATE TABLE IF NOT EXISTS edges (
        id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, key_id TEXT NOT NULL, name TEXT NOT NULL,
        created_at REAL NOT NULL, last_seen REAL, applied_version INTEGER NOT NULL DEFAULT 0,
        last_report_at REAL, last_report_json TEXT, UNIQUE (tenant_id, key_id))""")
    conn.execute("""CREATE TABLE IF NOT EXISTS edge_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL, edge_id TEXT NOT NULL, route_id TEXT NOT NULL,
        received_at REAL NOT NULL, window_start REAL, calls INTEGER, protected INTEGER, blocked INTEGER, held INTEGER,
        p50_ms REAL, p95_ms REAL)""")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_edge_reports ON edge_reports (tenant_id, edge_id, received_at)")
    conn.execute("""CREATE TABLE IF NOT EXISTS edge_versions (
        tenant_id TEXT PRIMARY KEY, version INTEGER NOT NULL, digest TEXT NOT NULL, updated_at REAL NOT NULL)""")
    conn.execute("CREATE TABLE IF NOT EXISTS edge_signing (id INTEGER PRIMARY KEY CHECK (id = 1), seed_hex TEXT NOT NULL)")


_key_lock = threading.Lock()
_seed_cache: Optional[bytes] = None


def signing_seed(conn) -> bytes:
    """The Ed25519 seed: ARAN_EDGE_SIGNING_KEY (64 hex characters) or one made on first use and kept in the DB."""
    global _seed_cache
    env = os.environ.get("ARAN_EDGE_SIGNING_KEY", "").strip()
    if env:
        try:
            seed = bytes.fromhex(env)
        except ValueError:
            seed = b""
        if len(seed) != 32:
            raise RuntimeError("ARAN_EDGE_SIGNING_KEY must be 64 hex characters (32 bytes)")
        return seed
    with _key_lock:
        if _seed_cache:
            return _seed_cache
        row = conn.execute("SELECT seed_hex FROM edge_signing WHERE id=1").fetchone()
        if not row:
            with conn:
                conn.execute("INSERT OR IGNORE INTO edge_signing (id, seed_hex) VALUES (1, ?)", (secrets.token_hex(32),))
            row = conn.execute("SELECT seed_hex FROM edge_signing WHERE id=1").fetchone()
        _seed_cache = bytes.fromhex(row["seed_hex"])
        return _seed_cache


def build_payload(conn, tenant_id: str, edge_id: str, now: float) -> dict:
    """The config for one tenant. Only what an edge needs to clean traffic: no keys, no webhook secrets."""
    policies = []
    for p in conn.execute("SELECT id, name, version, rules_json FROM policies WHERE tenant_id=? AND active=1 ORDER BY name", (tenant_id,)):
        policies.append({"id": p["id"], "name": p["name"], "version": p["version"], "rules": json.loads(p["rules_json"])})
    by_id = {}
    for p in conn.execute("SELECT id, name FROM policies WHERE tenant_id=?", (tenant_id,)):
        by_id[p["id"]] = p["name"]
    routes = []
    for r in conn.execute("SELECT * FROM routes WHERE tenant_id=? AND disabled=0 ORDER BY name", (tenant_id,)):
        routes.append({"id": r["id"], "name": r["name"], "upstream_url": r["upstream_url"], "sink": r["sink"],
                       "purpose": r["purpose"], "fail_mode": r["fail_mode"], "mode": r["mode"],
                       "policy": by_id.get(r["policy_id"]) if r["policy_id"] else None})
    digest = fw_core.config_digest(routes, policies)
    with conn:
        if not conn.in_transaction:
            conn.execute("BEGIN IMMEDIATE")        # two calls at once must not both bump the version
        row = conn.execute("SELECT version, digest FROM edge_versions WHERE tenant_id=?", (tenant_id,)).fetchone()
        if not row:
            version = 1
            conn.execute("INSERT INTO edge_versions (tenant_id, version, digest, updated_at) VALUES (?, 1, ?, ?)", (tenant_id, digest, now))
        elif row["digest"] != digest:
            version = row["version"] + 1
            conn.execute("UPDATE edge_versions SET version=?, digest=?, updated_at=? WHERE tenant_id=?", (version, digest, now, tenant_id))
        else:
            version = row["version"]
    return {"tenant_id": tenant_id, "edge_id": edge_id, "version": version, "issued_at": now,
            "expires_at": now + fw_core.EDGE_CONFIG_TTL_S, "routes": routes, "policies": policies}


def check_report(body) -> dict:
    """Counts only. Unknown fields, strings (except route_id) and negative or huge numbers are refused."""
    if not isinstance(body, dict):
        raise HTTPException(422, "the report must be a JSON object")
    extra = [k for k in body if k not in REPORT_FIELDS]
    if extra:
        raise HTTPException(422, f"unknown report fields: {sorted(str(k)[:30] for k in extra)}; only counts are accepted")
    rid = body.get("route_id")
    if not isinstance(rid, str) or not ROUTE_ID_RE.match(rid):
        raise HTTPException(422, "route_id must be a route id such as rt_0123abcd")
    out = {"route_id": rid}
    for k in REPORT_NUMBERS:
        if k not in body:
            if k in ("window_start", "applied_version"):
                continue
            body = dict(body, **{k: 0})
        v = body[k]
        if isinstance(v, bool) or not isinstance(v, (int, float)) or v != v or v < 0 or v > MAX_NUMBER:
            raise HTTPException(422, f"{k} must be a number (a count), not text")
        out[k] = v
    for k in ("calls", "protected", "blocked", "held", "applied_version"):
        if k in out:
            if out[k] != int(out[k]):
                raise HTTPException(422, f"{k} must be a whole number")
            out[k] = int(out[k])
    return out


def build_router(ctx) -> APIRouter:
    router = APIRouter()
    edge_scope = ctx.require_scope("edge")

    def viewer(tenant: dict = Depends(ctx.get_tenant)) -> dict:
        if not ({"admin", "edge", "dashboard"} & set(tenant.get("scopes", []))):
            raise HTTPException(403, "this key lacks the 'dashboard' or 'edge' scope")
        return tenant

    def ensure_edge(conn, tenant: dict, name: Optional[str] = None):
        row = conn.execute("SELECT * FROM edges WHERE tenant_id=? AND key_id=?", (tenant["id"], tenant["key_id"])).fetchone()
        if row:
            if name and name != row["name"]:
                with conn:
                    conn.execute("UPDATE edges SET name=? WHERE id=?", (name, row["id"]))
                row = conn.execute("SELECT * FROM edges WHERE id=?", (row["id"],)).fetchone()
            return row
        eid = "edg_" + secrets.token_hex(6)
        with conn:
            conn.execute("INSERT OR IGNORE INTO edges (id, tenant_id, key_id, name, created_at, last_seen) VALUES (?, ?, ?, ?, ?, ?)",
                         (eid, tenant["id"], tenant["key_id"], name or tenant.get("key_label") or "edge", time.time(), time.time()))
        return conn.execute("SELECT * FROM edges WHERE tenant_id=? AND key_id=?", (tenant["id"], tenant["key_id"])).fetchone()

    @router.get("/v1/edge/public-key")
    def public_key():
        conn = ctx.get_db()
        try:
            raw = fw_core.edge_public_raw(signing_seed(conn))
        finally:
            conn.close()
        return {"alg": "Ed25519", "key_id": fw_core.key_fingerprint(raw), "public_key": base64.b64encode(raw).decode(),
                "note": "Pin this key in the edge (ARAN_EDGE_PUBLIC_KEY) so it never trusts a key it was not given."}

    @router.post("/v1/edge/register")
    async def register(request: Request, tenant: dict = Depends(edge_scope)):
        try:
            body = await request.json()
        except Exception:
            body = {}
        name = body.get("name") if isinstance(body, dict) else None
        if name is not None and (not isinstance(name, str) or not NAME_RE.match(name)):
            raise HTTPException(422, "name may use letters, digits, space, dot, dash and underscore (48 characters at most)")
        conn = ctx.get_db()
        try:
            e = ensure_edge(conn, tenant, name)
            raw = fw_core.edge_public_raw(signing_seed(conn))
            return {"edge_id": e["id"], "tenant_id": tenant["id"], "name": e["name"],
                    "public_key": base64.b64encode(raw).decode(), "key_id": fw_core.key_fingerprint(raw)}
        finally:
            conn.close()

    @router.get("/v1/edge/config")
    def config(applied: Optional[int] = None, tenant: dict = Depends(edge_scope)):
        conn = ctx.get_db()
        try:
            e = ensure_edge(conn, tenant)
            now = time.time()
            with conn:
                if applied is not None and 0 <= applied < 10**9:
                    conn.execute("UPDATE edges SET last_seen=?, applied_version=? WHERE id=?", (now, applied, e["id"]))
                else:
                    conn.execute("UPDATE edges SET last_seen=? WHERE id=?", (now, e["id"]))
            payload = build_payload(conn, tenant["id"], e["id"], now)
            return fw_core.sign_config(signing_seed(conn), payload)
        finally:
            conn.close()

    @router.post("/v1/edge/report")
    async def report(request: Request, tenant: dict = Depends(edge_scope)):
        try:
            body = await request.json()
        except Exception:
            raise HTTPException(422, "the report must be JSON")
        rep = check_report(body)
        conn = ctx.get_db()
        try:
            if not conn.execute("SELECT 1 FROM routes WHERE id=? AND tenant_id=?", (rep["route_id"], tenant["id"])).fetchone():
                raise HTTPException(404, "route not found")
            e = ensure_edge(conn, tenant)
            now = time.time()
            with conn:
                conn.execute(
                    """INSERT INTO edge_reports (tenant_id, edge_id, route_id, received_at, window_start, calls, protected, blocked, held, p50_ms, p95_ms)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (tenant["id"], e["id"], rep["route_id"], now, rep.get("window_start"), rep["calls"], rep["protected"],
                     rep["blocked"], rep["held"], rep["p50_ms"], rep["p95_ms"]))
                conn.execute("UPDATE edges SET last_seen=?, last_report_at=?, last_report_json=? WHERE id=?",
                             (now, now, json.dumps(rep), e["id"]))
                if "applied_version" in rep:
                    conn.execute("UPDATE edges SET applied_version=? WHERE id=?", (rep["applied_version"], e["id"]))
            return {"accepted": True}
        finally:
            conn.close()

    @router.get("/v1/edges")
    def list_edges(tenant: dict = Depends(viewer)):
        conn = ctx.get_db()
        try:
            cur = conn.execute("SELECT version FROM edge_versions WHERE tenant_id=?", (tenant["id"],)).fetchone()
            now = time.time()
            since = now - 86400
            out = []
            for e in conn.execute("SELECT * FROM edges WHERE tenant_id=? ORDER BY created_at", (tenant["id"],)):
                t = conn.execute("""SELECT COALESCE(SUM(calls),0) c, COALESCE(SUM(protected),0) p, COALESCE(SUM(blocked),0) b,
                                    COALESCE(SUM(held),0) h FROM edge_reports WHERE edge_id=? AND received_at>=?""", (e["id"], since)).fetchone()
                out.append({"id": e["id"], "name": e["name"], "created_at": e["created_at"], "last_seen": e["last_seen"],
                            "online": bool(e["last_seen"] and now - e["last_seen"] < ONLINE_S),
                            "applied_version": e["applied_version"],
                            "current_version": cur["version"] if cur else 0,
                            "last_report_at": e["last_report_at"],
                            "last_report": json.loads(e["last_report_json"]) if e["last_report_json"] else None,
                            "totals_24h": {"calls": t["c"], "protected": t["p"], "blocked": t["b"], "held": t["h"]}})
            return {"edges": out}
        finally:
            conn.close()

    return router

