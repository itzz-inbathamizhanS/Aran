"""aran_cloud/main.py: Aran Cloud (preview) - Multi-tenant SaaS proxy layer for Aran Data-Flow Firewall.

Provides:
- Workspaces and API Key generation (SHA-256 stored).
- Tenant namespacing and cross-tenant owner isolation safeguards.
- Per-tenant usage metering and deterministic latency calculation.
- Granular per-tenant audit logs, erasure receipts, and dashboard metrics.
"""

import asyncio
from collections import defaultdict, deque
from concurrent.futures import ThreadPoolExecutor
import datetime as dt
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import threading
import time
from typing import Any, Dict, List, Literal, Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
import numpy as np
from pydantic import BaseModel, Field, field_validator
import requests

# ---------------------------------------------------------------- configuration
PORT = int(os.environ.get("PORT", 8100))
ARAN_CORE_URL = os.environ.get("ARAN_CORE_URL", "http://127.0.0.1:8000").rstrip("/")
ARAN_ADMIN_TOKEN = os.environ.get("ARAN_ADMIN_TOKEN")

HERE = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(HERE, "static")
DB_PATH = os.environ.get("ARAN_CLOUD_DB") or os.path.join(HERE, "cloud.db")  # a container keeps it on a volume

VALID_SCOPES = {"admin", "protect", "gateway", "trace", "detokenise", "erase", "verify", "dashboard"}
DEFAULT_ADMIN_SCOPES = "admin,protect,gateway,trace,detokenise,erase,verify,dashboard"

# Rate limiting settings (Item 5 & Hardening 1a)
RATE_LIMIT_PER_KEY = int(os.environ.get("ARAN_RATE_LIMIT_PER_KEY", "300"))
ARAN_SIGNUP_LIMIT = int(os.environ.get("ARAN_SIGNUP_LIMIT", os.environ.get("ARAN_SIGNUP_LIMIT_PER_IP", "5")))
ARAN_DEMO_MODE = os.environ.get("ARAN_DEMO_MODE", "0") in ("1", "true", "True")

_key_request_timestamps = defaultdict(deque)  # key_hash -> deque of timestamps
_signup_ip_timestamps = defaultdict(deque)    # ip -> deque of timestamps
_rate_limit_lock = threading.Lock()


# X-Forwarded-For is only believed when the request really comes from a proxy we run.
# ARAN_TRUSTED_PROXIES is a comma-separated list of proxy IPs (empty = trust no one).
TRUSTED_PROXIES = {p.strip() for p in os.environ.get("ARAN_TRUSTED_PROXIES", "").split(",") if p.strip()}
LOOPBACK = ("127.0.0.1", "::1", "localhost")


def client_ip(request: Request) -> str:
    """The caller's address: the socket peer, or the first forwarded hop when the peer is a trusted proxy."""
    peer = request.client.host if request.client else "127.0.0.1"
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded and peer in TRUSTED_PROXIES:
        return forwarded.split(",")[0].strip() or peer
    return peer


def is_demo_exempt(request: Request) -> bool:
    """Demo mode skips the signup limit only for a real local caller, never for a forwarded header."""
    if not ARAN_DEMO_MODE:
        return False
    peer = request.client.host if request.client else ""
    return peer in LOOPBACK and not request.headers.get("X-Forwarded-For")


def require_admin_token(x_admin_token: Optional[str] = Header(None)):
    """Operator-only endpoints need ARAN_ADMIN_TOKEN; without one configured they stay off."""
    if not ARAN_ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="this endpoint is disabled: set ARAN_ADMIN_TOKEN to enable it")
    if not x_admin_token or not hmac.compare_digest(x_admin_token, ARAN_ADMIN_TOKEN):
        raise HTTPException(status_code=401, detail="missing or invalid X-Admin-Token")


def check_key_rate_limit(key_hash: str):
    now = time.time()
    window = 60.0  # 1 minute
    with _rate_limit_lock:
        ts_queue = _key_request_timestamps[key_hash]
        while ts_queue and ts_queue[0] <= now - window:
            ts_queue.popleft()
        if len(ts_queue) >= RATE_LIMIT_PER_KEY:
            retry_after = int(window - (now - ts_queue[0])) + 1
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded: max {RATE_LIMIT_PER_KEY} requests per minute.",
                headers={"Retry-After": str(max(1, retry_after))},
            )
        ts_queue.append(now)


def check_signup_rate_limit(request: Request):
    if is_demo_exempt(request):
        return
    ip = client_ip(request)

    now = time.time()
    window = 3600.0  # 1 hour
    with _rate_limit_lock:
        ts_queue = _signup_ip_timestamps[ip]
        while ts_queue and ts_queue[0] <= now - window:
            ts_queue.popleft()
        if len(ts_queue) >= ARAN_SIGNUP_LIMIT:
            retry_after = int(window - (now - ts_queue[0])) + 1
            raise HTTPException(
                status_code=429,
                detail=f"Signup rate limit exceeded: max {ARAN_SIGNUP_LIMIT} signups per hour per IP.",
                headers={"Retry-After": str(max(1, retry_after))},
            )
        ts_queue.append(now)

app = FastAPI(
    title="Aran Cloud (preview)",
    description="Thin SaaS proxy providing tenants, API keys, namespacing, and metering for Aran.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_no_cache_headers(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/static") or request.url.path in ("/", "/connect", "/dashboard"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


# ---------------------------------------------------------------- storage
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    return conn


def init_db():
    conn = get_db()
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS tenants (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                created_at TEXT NOT NULL,
                plan TEXT DEFAULT 'free'
            );
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS api_keys (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT NOT NULL REFERENCES tenants(id),
                key_hash TEXT UNIQUE NOT NULL,
                prefix TEXT NOT NULL,
                label TEXT DEFAULT 'Default Admin Key',
                scopes TEXT DEFAULT 'admin,protect,gateway,trace,detokenise,erase,verify,dashboard',
                created_at TEXT NOT NULL,
                last_used TEXT,
                revoked INTEGER DEFAULT 0
            );
        """)
        # Migration for existing api_keys tables missing scopes/last_used columns
        info_keys = conn.execute("PRAGMA table_info(api_keys);").fetchall()
        col_names = {row[1] for row in info_keys}
        if "scopes" not in col_names:
            conn.execute("""
                CREATE TABLE api_keys_v2 (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tenant_id TEXT NOT NULL REFERENCES tenants(id),
                    key_hash TEXT UNIQUE NOT NULL,
                    prefix TEXT NOT NULL,
                    label TEXT DEFAULT 'Default Admin Key',
                    scopes TEXT DEFAULT 'admin,protect,gateway,trace,detokenise,erase,verify,dashboard',
                    created_at TEXT NOT NULL,
                    last_used TEXT,
                    revoked INTEGER DEFAULT 0
                );
            """)
            conn.execute("""
                INSERT INTO api_keys_v2 (tenant_id, key_hash, prefix, label, scopes, created_at, revoked)
                SELECT tenant_id, key_hash, prefix, 'Default Admin Key',
                       'admin,protect,gateway,trace,detokenise,erase,verify,dashboard',
                       created_at, revoked FROM api_keys;
            """)
            conn.execute("DROP TABLE api_keys;")
            conn.execute("ALTER TABLE api_keys_v2 RENAME TO api_keys;")
        else:
            if "label" not in col_names:
                try:
                    conn.execute("ALTER TABLE api_keys ADD COLUMN label TEXT DEFAULT 'Default Admin Key';")
                except Exception:
                    pass
            if "last_used" not in col_names:
                try:
                    conn.execute("ALTER TABLE api_keys ADD COLUMN last_used TEXT;")
                except Exception:
                    pass

        conn.execute("""
            CREATE TABLE IF NOT EXISTS usage_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT NOT NULL REFERENCES tenants(id),
                at REAL NOT NULL,
                endpoint TEXT NOT NULL,
                sink TEXT,
                purpose TEXT,
                protected_count INTEGER DEFAULT 0,
                unprotected_count INTEGER DEFAULT 0,
                ignored_count INTEGER DEFAULT 0,
                by_type TEXT,
                latency_ms REAL NOT NULL,
                customer_ref TEXT,
                status TEXT DEFAULT 'ok'
            );
        """)
        try:
            conn.execute("ALTER TABLE usage_events ADD COLUMN unprotected_count INTEGER DEFAULT 0;")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE usage_events ADD COLUMN ignored_count INTEGER DEFAULT 0;")
        except sqlite3.OperationalError:
            pass

        conn.execute("""
            CREATE TABLE IF NOT EXISTS tenant_tokens (
                token TEXT NOT NULL,
                tenant_id TEXT NOT NULL REFERENCES tenants(id),
                customer_ref TEXT,
                purpose TEXT,
                sink TEXT,
                created_at REAL NOT NULL,
                PRIMARY KEY (tenant_id, token)
            );
        """)

        # Migration: check if tenant_tokens has single-column PK (token) and migrate to (tenant_id, token)
        info = conn.execute("PRAGMA table_info(tenant_tokens);").fetchall()
        pk_cols = [row[1] for row in info if row[5] > 0]
        if len(pk_cols) == 1 and pk_cols[0] == "token":
            conn.execute("""
                CREATE TABLE tenant_tokens_v2 (
                    token TEXT NOT NULL,
                    tenant_id TEXT NOT NULL REFERENCES tenants(id),
                    customer_ref TEXT,
                    purpose TEXT,
                    sink TEXT,
                    created_at REAL NOT NULL,
                    PRIMARY KEY (tenant_id, token)
                );
            """)
            conn.execute("""
                INSERT OR IGNORE INTO tenant_tokens_v2 (token, tenant_id, customer_ref, purpose, sink, created_at)
                SELECT token, tenant_id, customer_ref, purpose, sink, created_at FROM tenant_tokens
                WHERE token NOT LIKE '<%>%';
            """)
            conn.execute("DROP TABLE tenant_tokens;")
            conn.execute("ALTER TABLE tenant_tokens_v2 RENAME TO tenant_tokens;")

        conn.execute("CREATE INDEX IF NOT EXISTS idx_tenant_tokens_tenant ON tenant_tokens(tenant_id);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_tenant_tokens_token ON tenant_tokens(token);")
        # Clean up any leftover placeholder tokens
        conn.execute("DELETE FROM tenant_tokens WHERE token LIKE '<%>%';")

        conn.execute("""
            CREATE TABLE IF NOT EXISTS receipts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT NOT NULL REFERENCES tenants(id),
                customer_ref TEXT NOT NULL,
                purpose TEXT NOT NULL,
                at REAL NOT NULL,
                receipt_json TEXT NOT NULL,
                verified INTEGER DEFAULT 1
            );
        """)

        # Detokenise Audit table with cryptographic hash chain (Item 2 & Hardening 1d)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS detokenise_audit (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT NOT NULL REFERENCES tenants(id),
                key_id INTEGER,
                key_label TEXT,
                token TEXT NOT NULL,
                purpose TEXT,
                result TEXT NOT NULL,
                at REAL NOT NULL,
                created_at TEXT NOT NULL,
                prev_hash TEXT,
                entry_hash TEXT
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_audit_tenant ON detokenise_audit(tenant_id);")

        audit_cols = {row[1] for row in conn.execute("PRAGMA table_info(detokenise_audit);").fetchall()}
        if "prev_hash" not in audit_cols:
            try:
                conn.execute("ALTER TABLE detokenise_audit ADD COLUMN prev_hash TEXT;")
            except Exception:
                pass
        if "entry_hash" not in audit_cols:
            try:
                conn.execute("ALTER TABLE detokenise_audit ADD COLUMN entry_hash TEXT;")
            except Exception:
                pass

        # One row per protected transaction. Only the PROTECTED text and counts are kept, never a raw value.
        conn.execute("""
            CREATE TABLE IF NOT EXISTS txn_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT NOT NULL REFERENCES tenants(id),
                txn_id TEXT NOT NULL,
                rail TEXT NOT NULL,
                sink TEXT NOT NULL,
                purpose TEXT,
                customer_ref TEXT,
                amount_paise INTEGER,
                source TEXT,
                found INTEGER NOT NULL DEFAULT 0,
                protected INTEGER NOT NULL DEFAULT 0,
                raw INTEGER NOT NULL DEFAULT 0,
                ignored INTEGER NOT NULL DEFAULT 0,
                by_type TEXT,
                latency_ms REAL NOT NULL,
                at REAL NOT NULL,
                result_json TEXT NOT NULL,
                demo INTEGER NOT NULL DEFAULT 0
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_txn_events_tenant_at ON txn_events(tenant_id, at);")
        conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_txn_events_idem ON txn_events(tenant_id, txn_id, sink);")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT NOT NULL REFERENCES tenants(id),
                email TEXT NOT NULL,
                role TEXT NOT NULL,
                key_id INTEGER,
                created_at TEXT NOT NULL,
                UNIQUE (tenant_id, email)
            );
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS plans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT NOT NULL REFERENCES tenants(id),
                plan TEXT NOT NULL,
                since TEXT NOT NULL
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_plans_tenant ON plans(tenant_id);")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS tenant_settings (
                tenant_id TEXT PRIMARY KEY REFERENCES tenants(id),
                budget_ms REAL NOT NULL DEFAULT 10,
                slo_target REAL NOT NULL DEFAULT 99.9,
                fail_safe TEXT NOT NULL DEFAULT 'hold_then_mask',
                region TEXT NOT NULL DEFAULT 'india',
                updated_at TEXT
            );
        """)
    conn.close()


init_db()


def log_detokenise_audit(
    conn: sqlite3.Connection,
    tenant_id: str,
    key_id: Optional[int],
    key_label: Optional[str],
    token: str,
    purpose: Optional[str],
    result: str,
):
    """Inserts a cryptographic hash-chained audit log row for detokenise operations."""
    last_row = conn.execute(
        "SELECT entry_hash FROM detokenise_audit WHERE tenant_id = ? ORDER BY id DESC LIMIT 1",
        (tenant_id,),
    ).fetchone()
    prev_hash = last_row[0] if (last_row and last_row[0]) else "0" * 64

    now_ts = time.time()
    now_str = time.strftime("%Y-%m-%d %H:%M:%S")
    entry_payload = f"{prev_hash}|{tenant_id}|{key_id or ''}|{key_label or ''}|{token}|{purpose or ''}|{result}|{now_ts:.4f}|{now_str}"
    entry_hash = hashlib.sha256(entry_payload.encode("utf-8")).hexdigest()

    conn.execute(
        """
        INSERT INTO detokenise_audit (
            tenant_id, key_id, key_label, token, purpose, result, at, created_at, prev_hash, entry_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (tenant_id, key_id, key_label, token, purpose, result, now_ts, now_str, prev_hash, entry_hash),
    )


# ---------------------------------------------------------------- auth dependency & scopes
def get_current_tenant_and_key(x_api_key: Optional[str] = Header(None)) -> dict:
    if not x_api_key:
        raise HTTPException(
            status_code=401,
            detail="Invalid, missing or revoked API key. Pass a valid key in header 'X-API-Key'.",
        )
    raw_key = x_api_key.strip()
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

    # Rate limit check per API key (Item 5)
    check_key_rate_limit(key_hash)

    conn = get_db()
    row = conn.execute(
        """
        SELECT t.id, t.name, t.email, t.created_at, t.plan,
               k.id as key_id, k.prefix as key_prefix, k.label as key_label, k.scopes as key_scopes, k.created_at as key_created
        FROM api_keys k
        JOIN tenants t ON k.tenant_id = t.id
        WHERE k.key_hash = ? AND k.revoked = 0
        """,
        (key_hash,),
    ).fetchone()

    if not row:
        conn.close()
        raise HTTPException(
            status_code=401,
            detail="Invalid, missing or revoked API key. Pass a valid key in header 'X-API-Key'.",
        )

    # Update last_used
    now_str = time.strftime("%Y-%m-%d %H:%M:%S")
    with conn:
        conn.execute("UPDATE api_keys SET last_used = ? WHERE key_hash = ?", (now_str, key_hash))
    conn.close()

    raw_scopes = row["key_scopes"] or ""
    scopes_list = [s.strip().lower() for s in raw_scopes.split(",") if s.strip()]

    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "created_at": row["created_at"],
        "plan": row["plan"],
        "key_id": row["key_id"],
        "key_prefix": row["key_prefix"],
        "key_label": row["key_label"],
        "scopes": scopes_list,
        "key_hash": key_hash,
    }


get_current_tenant = get_current_tenant_and_key


def require_scope(required_scope: str):
    def dependency(tenant_and_key: dict = Depends(get_current_tenant_and_key)):
        scopes = tenant_and_key.get("scopes", [])
        if "admin" not in scopes and required_scope not in scopes:
            raise HTTPException(
                status_code=403,
                detail=f"this key lacks the '{required_scope}' scope",
            )
        return tenant_and_key
    return dependency


# ---------------------------------------------------------------- models
class WorkspaceIn(BaseModel):
    name: str
    email: str


class ProtectIn(BaseModel):
    text: str
    customer_ref: Optional[str] = None
    purpose: Optional[str] = "KYC"
    sink: Optional[str] = "kyc-archive"


class GatewayIn(BaseModel):
    role: str = "customer-care"
    text: Optional[str] = None
    prompt: Optional[str] = None


class DetokeniseIn(BaseModel):
    token: str
    caller: Optional[str] = "console"


class EraseIn(BaseModel):
    customer_ref: str
    purpose: str = "KYC"


class TraceIn(BaseModel):
    dump: str


class KeyCreateIn(BaseModel):
    label: str
    scopes: List[str]


# ---------------------------------------------------------------- helpers
def call_core(method: str, endpoint: str, json_data: dict = None, admin: bool = False, timeout: float = 10.0):
    url = f"{ARAN_CORE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    internal_secret = os.environ.get("ARAN_INTERNAL_SECRET")
    if internal_secret:
        headers["X-Aran-Internal"] = internal_secret
    if admin and ARAN_ADMIN_TOKEN:
        headers["X-Admin-Token"] = ARAN_ADMIN_TOKEN
    try:
        t0 = time.perf_counter()
        if method.upper() == "GET":
            r = requests.get(url, headers=headers, params=json_data, timeout=timeout)
        else:
            r = requests.post(url, headers=headers, json=json_data, timeout=timeout)
        latency_ms = round((time.perf_counter() - t0) * 1000, 2)
        r.raise_for_status()
        return r.json(), latency_ms
    except requests.exceptions.RequestException as err:
        err_msg = str(err)
        if hasattr(err, "response") and err.response is not None:
            try:
                err_msg = err.response.json().get("detail", err.response.text)
            except Exception:
                err_msg = err.response.text
        raise HTTPException(status_code=502, detail=f"Aran core call {endpoint} failed: {err_msg}")


# ---------------------------------------------------------------- v1 API
@app.post("/v1/workspaces")
def create_workspace(body: WorkspaceIn, request: Request):
    """Creates a new workspace tenant and returns a single-use ADMIN API key with all scopes."""
    # Check signup rate limit (Item 5)
    check_signup_rate_limit(request)

    tenant_id = f"t_{secrets.token_hex(4)}"
    raw_key = f"aran_live_{secrets.token_hex(16)}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    prefix = raw_key[:14]

    raw_dash_key = f"aran_live_{secrets.token_hex(16)}"
    dash_key_hash = hashlib.sha256(raw_dash_key.encode()).hexdigest()
    dash_prefix = raw_dash_key[:14]
    now_str = time.strftime("%Y-%m-%d %H:%M:%S")

    conn = get_db()
    with conn:
        conn.execute(
            """
            INSERT INTO tenants (id, name, email, created_at, plan)
            VALUES (?, ?, ?, ?, 'free')
            """,
            (tenant_id, body.name.strip(), body.email.strip(), now_str),
        )
        conn.execute(
            """
            INSERT INTO api_keys (tenant_id, key_hash, prefix, label, scopes, created_at, revoked)
            VALUES (?, ?, ?, 'Default Admin Key', ?, ?, 0)
            """,
            (tenant_id, key_hash, prefix, DEFAULT_ADMIN_SCOPES, now_str),
        )
        conn.execute(
            """
            INSERT INTO api_keys (tenant_id, key_hash, prefix, label, scopes, created_at, revoked)
            VALUES (?, ?, ?, 'Dashboard Read-Only Key', 'dashboard', ?, 0)
            """,
            (tenant_id, dash_key_hash, dash_prefix, now_str),
        )
    conn.close()

    return {
        "tenant_id": tenant_id,
        "name": body.name.strip(),
        "email": body.email.strip(),
        "api_key": raw_key,
        "admin_key": raw_key,
        "dashboard_key": raw_dash_key,
        "prefix": prefix,
        "label": "Default Admin Key",
        "scopes": [s.strip() for s in DEFAULT_ADMIN_SCOPES.split(",")],
        "plan": "free",
        "created_at": now_str,
        "note": "Save your API key now. It is shown once and stored only as a SHA-256 hash.",
    }


# ---------------------------------------------------------------- Scoped API Key Management (Item 1)
@app.post("/v1/keys")
def mint_key(body: KeyCreateIn, tenant: dict = Depends(require_scope("admin"))):
    """Mints a key with a label and a chosen list of scopes (admin scope only)."""
    chosen_scopes = [s.strip().lower() for s in body.scopes if s.strip()]
    if not chosen_scopes:
        raise HTTPException(status_code=400, detail="At least one scope must be provided.")
    for s in chosen_scopes:
        if s not in VALID_SCOPES:
            raise HTTPException(status_code=400, detail=f"Invalid scope '{s}'. Valid scopes are: {sorted(VALID_SCOPES)}")

    raw_key = f"aran_live_{secrets.token_hex(16)}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    prefix = raw_key[:14]
    now_str = time.strftime("%Y-%m-%d %H:%M:%S")
    scopes_str = ",".join(chosen_scopes)

    conn = get_db()
    with conn:
        cur = conn.execute(
            """
            INSERT INTO api_keys (tenant_id, key_hash, prefix, label, scopes, created_at, revoked)
            VALUES (?, ?, ?, ?, ?, ?, 0)
            """,
            (tenant["id"], key_hash, prefix, body.label.strip(), scopes_str, now_str),
        )
        new_id = cur.lastrowid
    conn.close()

    return {
        "id": new_id,
        "prefix": prefix,
        "api_key": raw_key,
        "label": body.label.strip(),
        "scopes": chosen_scopes,
        "created": now_str,
        "created_at": now_str,
        "last_used": None,
        "revoked": 0,
        "note": "Save your API key now. It is shown once and stored only as a SHA-256 hash.",
    }


def _parse_local(stamp: Optional[str]) -> Optional[float]:
    """Key timestamps are written with the server's local clock; give the browser an epoch it can compare with now."""
    try:
        return time.mktime(time.strptime(stamp, "%Y-%m-%d %H:%M:%S")) if stamp else None
    except Exception:
        return None


@app.get("/v1/keys")
def list_keys(tenant: dict = Depends(require_scope("dashboard"))):
    """Lists keys for the authenticated tenant (prefix, label, scopes, created, last used, revoked; never the secret)."""
    conn = get_db()
    rows = conn.execute(
        """
        SELECT id, prefix, label, scopes, created_at, last_used, revoked
        FROM api_keys
        WHERE tenant_id = ?
        ORDER BY id ASC
        """,
        (tenant["id"],),
    ).fetchall()
    conn.close()

    out = []
    for r in rows:
        scopes_list = [s.strip().lower() for s in (r["scopes"] or "").split(",") if s.strip()]
        out.append({
            "id": r["id"],
            "prefix": r["prefix"],
            "label": r["label"],
            "scopes": scopes_list,
            "created": r["created_at"],
            "created_at": r["created_at"],
            "last_used": r["last_used"],
            "last_used_epoch": _parse_local(r["last_used"]),
            "revoked": bool(r["revoked"]),
        })
    return {"keys": out, "count": len(out)}


@app.delete("/v1/keys/{key_id}")
def revoke_key(key_id: str, tenant: dict = Depends(require_scope("admin"))):
    """Revokes an API key by id or prefix (admin scope only)."""
    conn = get_db()
    with conn:
        row = conn.execute(
            """
            SELECT id, prefix, revoked FROM api_keys
            WHERE tenant_id = ? AND (id = ? OR prefix = ?)
            """,
            (tenant["id"], key_id, key_id),
        ).fetchone()

        if not row:
            conn.close()
            raise HTTPException(status_code=404, detail="Key not found.")

        conn.execute(
            """
            UPDATE api_keys SET revoked = 1
            WHERE tenant_id = ? AND (id = ? OR prefix = ?)
            """,
            (tenant["id"], key_id, key_id),
        )
    conn.close()

    return {"status": "ok", "message": f"Key {key_id} has been revoked.", "revoked": True}


def protect_text(tenant_id: str, text: str, customer_ref: Optional[str], purpose: str, sink: str) -> dict:
    """The one path every protect call takes: namespace the customer_ref, call the core's /api/process
    with this tenant as the ownership scope, and apply the cross-tenant owner-conflict safeguards.
    It writes nothing; the caller records tokens and metering. Used by /v1/protect and /v1/transactions/protect."""
    # Core main.py enforces ^[A-Za-z0-9_-]{1,64}$, so we use '__' delimiter for namespacing
    sep = "__"
    namespaced_ref = f"{tenant_id}{sep}{customer_ref}" if customer_ref else None

    core_payload = {
        "text": text,
        "source": "core-banking",
        "sink": sink,
        "customer_ref": namespaced_ref,
        "purpose": purpose,
        "scope": tenant_id,  # identifier ownership is looked up inside this tenant only
    }

    core_res, latency_ms = call_core("POST", "/api/process", core_payload)
    if "latency_ms" in core_res:
        latency_ms = core_res["latency_ms"]

    clean_findings = []
    by_type = {}
    prot_count = 0
    prefix = f"{tenant_id}{sep}"
    prefix_alt = f"{tenant_id}:"

    # Safeguard 1: Strip namespace for own customer_ref; NEVER reveal other tenant's customer_ref
    for f in core_res.get("findings", []):
        fc = dict(f)
        ftyp = fc.get("type", "UNKNOWN")
        if fc.get("protected"):
            prot_count += 1
            by_type[ftyp] = by_type.get(ftyp, 0) + 1

        cref = fc.get("customer_ref")
        if cref:
            if cref.startswith(prefix):
                fc["customer_ref"] = cref[len(prefix):]
            elif cref.startswith(prefix_alt):
                fc["customer_ref"] = cref[len(prefix_alt):]
            else:
                # CROSS-TENANT OWNER CONFLICT: MUST NEVER REVEAL OTHER TENANT'S CUSTOMER_REF!
                fc["customer_ref"] = None
                fc["owner_conflict"] = True
        clean_findings.append(fc)

    # Safeguard 2: Sanitize conflict notes
    clean_notes = []
    for note in core_res.get("notes", []):
        if "owner_conflict" in note:
            clean_notes.append("identifier already enrolled elsewhere; token issued under its original owner.")
        else:
            clean_notes.append(note)

    # Real identifiers that were detected but not protected, plus any raw identifiers the core passed through
    unprot_findings = sum(1 for f in core_res.get("findings", []) if not f.get("protected"))
    raw_passed = sum(1 for note in core_res.get("notes", []) if "passed through unchanged" in note)
    # Shape matches that fail their checksum (ignored, not valid IDs)
    ignored_count = sum(1 for note in core_res.get("notes", []) if "fails the Aadhaar/Luhn checksum" in note)

    core_res["findings"] = clean_findings
    core_res["notes"] = clean_notes
    return {
        "res": core_res,
        "by_type": by_type,
        "protected": prot_count,
        "unprotected": unprot_findings + raw_passed,
        "ignored": ignored_count,
        "latency_ms": latency_ms,
    }


def record_tokens(conn: sqlite3.Connection, tenant_id: str, findings: list, customer_ref: Optional[str],
                  purpose: str, sink: str, now_ts: float):
    """Remember which tokens this tenant issued (so trace and detokenise answer for the owner only)."""
    for fc in findings:
        tok = fc.get("token")
        if tok and not fc.get("owner_conflict"):
            conn.execute(
                """
                INSERT OR REPLACE INTO tenant_tokens (token, tenant_id, customer_ref, purpose, sink, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (str(tok), tenant_id, fc.get("customer_ref") or customer_ref, fc.get("purpose") or purpose, sink, now_ts),
            )


@app.post("/v1/protect")
def protect(body: ProtectIn, tenant: dict = Depends(require_scope("protect"))):
    """Namespaces customer_ref, forwards to core /api/process, meters usage, and applies tenant isolation safeguards."""
    tenant_id = tenant["id"]
    sink = body.sink or "kyc-archive"
    purpose = body.purpose or "KYC"
    out = protect_text(tenant_id, body.text, body.customer_ref, purpose, sink)
    core_res = out["res"]

    now_ts = time.time()
    conn = get_db()
    with conn:
        record_tokens(conn, tenant_id, core_res["findings"], body.customer_ref, purpose, sink, now_ts)
        conn.execute(
            """
            INSERT INTO usage_events (tenant_id, at, endpoint, sink, purpose, protected_count, unprotected_count, ignored_count, by_type, latency_ms, customer_ref, status)
            VALUES (?, ?, '/v1/protect', ?, ?, ?, ?, ?, ?, ?, ?, 'ok')
            """,
            (tenant_id, now_ts, sink, purpose, out["protected"], out["unprotected"], out["ignored"],
             json.dumps(out["by_type"]), out["latency_ms"], body.customer_ref),
        )
    conn.close()
    return core_res


@app.post("/v1/gateway")
def gateway(body: GatewayIn, tenant: dict = Depends(require_scope("gateway"))):
    """AI Gateway forwarder for staff chatbots."""
    tenant_id = tenant["id"]
    prompt_text = body.prompt if body.prompt is not None else (body.text or "")
    core_res, latency_ms = call_core("POST", "/api/tour/gateway", {"role": body.role, "text": prompt_text})

    findings_in_prompt = core_res.get("findings_in_prompt", 0)
    by_type = {"PROMPT_PII": findings_in_prompt} if findings_in_prompt else {}

    now_ts = time.time()
    conn = get_db()
    with conn:
        conn.execute(
            """
            INSERT INTO usage_events (tenant_id, at, endpoint, sink, purpose, protected_count, unprotected_count, ignored_count, by_type, latency_ms, customer_ref, status)
            VALUES (?, ?, '/v1/gateway', 'llm-gateway', 'Service', ?, 0, 0, ?, ?, NULL, 'ok')
            """,
            (tenant_id, now_ts, findings_in_prompt, json.dumps(by_type), latency_ms),
        )
    conn.close()

    return core_res


@app.post("/v1/detokenise")
def detokenise(body: DetokeniseIn, tenant: dict = Depends(get_current_tenant)):
    """Detokenisation forwarder: only resolves tokens that belong to the calling tenant."""
    tenant_id = tenant["id"]
    scopes = tenant.get("scopes", [])

    # Scope check: must have 'detokenise' or 'admin'
    if "admin" not in scopes and "detokenise" not in scopes:
        conn = get_db()
        with conn:
            log_detokenise_audit(
                conn,
                tenant_id=tenant_id,
                key_id=tenant.get("key_id"),
                key_label=tenant.get("key_label"),
                token=body.token,
                purpose="unknown",
                result="denied",
            )
        conn.close()
        raise HTTPException(status_code=403, detail="this key lacks the 'detokenise' scope")

    # Check token ownership in cloud.db
    conn = get_db()
    row = conn.execute(
        "SELECT tenant_id, purpose FROM tenant_tokens WHERE token = ? AND tenant_id = ?",
        (body.token, tenant_id),
    ).fetchone()

    unknown_res = {
        "token": body.token,
        "value": None,
        "status": "unknown",
        "reason": "Not a vault token. Vaultless FF1 tokens are reversed only inside the bank's key boundary.",
    }

    if not row:
        # Unknown to this tenant or belongs to another tenant: return standard unknown response
        with conn:
            conn.execute(
                """
                INSERT INTO usage_events (tenant_id, at, endpoint, sink, purpose, protected_count, unprotected_count, ignored_count, by_type, latency_ms, customer_ref, status)
                VALUES (?, ?, '/v1/detokenise', 'vault', 'Detokenise', 0, 0, 0, '{}', 0.5, NULL, 'unknown')
                """,
                (tenant_id, time.time()),
            )
            log_detokenise_audit(
                conn,
                tenant_id=tenant_id,
                key_id=tenant.get("key_id"),
                key_label=tenant.get("key_label"),
                token=body.token,
                purpose="unknown",
                result="unknown",
            )
        conn.close()
        return unknown_res

    purpose = row["purpose"] or "KYC"

    # Owned by caller: forward to Aran core
    core_res, latency_ms = call_core("POST", "/api/detokenise", {"token": body.token, "caller": body.caller or "console"})
    res_status = core_res.get("status", "ok")

    with conn:
        conn.execute(
            """
            INSERT INTO usage_events (tenant_id, at, endpoint, sink, purpose, protected_count, unprotected_count, ignored_count, by_type, latency_ms, customer_ref, status)
            VALUES (?, ?, '/v1/detokenise', 'vault', 'Detokenise', 0, 0, 0, '{}', ?, NULL, ?)
            """,
            (tenant_id, time.time(), latency_ms, res_status),
        )
        log_detokenise_audit(
            conn,
            tenant_id=tenant_id,
            key_id=tenant.get("key_id"),
            key_label=tenant.get("key_label"),
            token=body.token,
            purpose=purpose,
            result=res_status,
        )
    conn.close()

    return core_res


@app.post("/v1/erase")
def erase(body: EraseIn, tenant: dict = Depends(require_scope("erase"))):
    """Namespaces customer_ref, forwards to core /api/erase, and stores cryptographic receipt."""
    tenant_id = tenant["id"]
    namespaced_ref = f"{tenant_id}__{body.customer_ref}"

    receipt, latency_ms = call_core(
        "POST",
        "/api/erase",
        {"customer_ref": namespaced_ref, "purpose": body.purpose},
        admin=True,
    )

    # Note: receipt["event"] is cryptographically signed (Ed25519 + ML-DSA-65).
    # We preserve the signed event intact for mathematical verification, and provide
    # the un-namespaced customer ref on the outer response envelope.
    receipt["tenant_customer_ref"] = body.customer_ref

    now_ts = time.time()
    conn = get_db()
    with conn:
        conn.execute(
            """
            INSERT INTO receipts (tenant_id, customer_ref, purpose, at, receipt_json, verified)
            VALUES (?, ?, ?, ?, ?, 1)
            """,
            (tenant_id, body.customer_ref, body.purpose, now_ts, json.dumps(receipt)),
        )
        conn.execute(
            """
            INSERT INTO usage_events (tenant_id, at, endpoint, sink, purpose, protected_count, unprotected_count, ignored_count, by_type, latency_ms, customer_ref, status)
            VALUES (?, ?, '/v1/erase', 'vault', ?, 0, 0, 0, '{}', ?, ?, 'shredded')
            """,
            (tenant_id, now_ts, body.purpose, latency_ms, body.customer_ref),
        )
    conn.close()

    return receipt


@app.post("/v1/receipts/verify")
def verify_receipt(receipt: dict, tenant: dict = Depends(require_scope("verify"))):
    """Forwards receipt verification to Aran core."""
    res, _ = call_core("POST", "/api/receipts/verify", receipt)
    return res


@app.post("/v1/trace")
def trace(body: TraceIn, tenant: dict = Depends(require_scope("trace"))):
    """Forwards dump trace to Aran core, reporting only tokens owned by the calling tenant."""
    tenant_id = tenant["id"]
    core_res, latency_ms = call_core("POST", "/api/trace", {"dump": body.dump})

    conn = get_db()
    caller_tokens = {
        row["token"]: dict(row)
        for row in conn.execute(
            "SELECT token, sink, purpose, customer_ref FROM tenant_tokens WHERE tenant_id = ?",
            (tenant_id,),
        ).fetchall()
    }
    conn.close()

    votes = {}
    matched = 0
    filtered_items = []

    for item in core_res.get("items", []):
        val = item.get("value")
        if val in caller_tokens:
            tok_info = caller_tokens[val]
            sink = tok_info.get("sink") or item.get("sink")
            how = item.get("how")
            if sink:
                votes[sink] = votes.get(sink, 0) + 1
                matched += 1
            filtered_items.append({"value": val, "sink": sink, "how": how})
        else:
            # Token does not belong to caller or is unknown: hide sink/how
            filtered_items.append({"value": val, "sink": None, "how": None})

    ranking = []
    for s, n in votes.items():
        share = round(n / matched, 4) if matched else 0.0
        ranking.append({"sink": s, "tokens": n, "share": share})
    ranking.sort(key=lambda x: -x["tokens"])

    filtered_res = {
        "candidates": core_res.get("candidates", len(filtered_items)),
        "matched": matched,
        "ranking": ranking,
        "top": ranking[0] if ranking else None,
        "items": filtered_items,
        "raw_identifiers_in_dump": core_res.get("raw_identifiers_in_dump", 0),
    }

    conn = get_db()
    with conn:
        conn.execute(
            """
            INSERT INTO usage_events (tenant_id, at, endpoint, sink, purpose, protected_count, unprotected_count, ignored_count, by_type, latency_ms, customer_ref, status)
            VALUES (?, ?, '/v1/trace', 'trace', 'Audit', ?, 0, 0, '{}', ?, NULL, 'ok')
            """,
            (tenant_id, time.time(), matched, latency_ms),
        )
    conn.close()

    return filtered_res


@app.get("/v1/dashboard")
def get_dashboard(tenant: dict = Depends(require_scope("dashboard"))):
    """Returns calling tenant's isolated metrics, usage events, and receipts."""
    tenant_id = tenant["id"]
    conn = get_db()

    events = [dict(r) for r in conn.execute(
        "SELECT * FROM usage_events WHERE tenant_id = ? ORDER BY id DESC", (tenant_id,)
    ).fetchall()]

    receipts_rows = [dict(r) for r in conn.execute(
        "SELECT * FROM receipts WHERE tenant_id = ? ORDER BY id DESC", (tenant_id,)
    ).fetchall()]

    # Count plaintext reads from detokenise_audit (Item 2)
    plaintext_reads = conn.execute(
        "SELECT count(*) FROM detokenise_audit WHERE tenant_id = ? AND result = 'ok'",
        (tenant_id,),
    ).fetchone()[0]
    conn.close()

    total_protected = sum(e["protected_count"] for e in events)
    total_unprotected = sum((e.get("unprotected_count") or 0) for e in events)
    total_ignored = sum((e.get("ignored_count") or 0) for e in events)
    by_type = {}
    latencies = []
    destinations = {}

    for e in events:
        lat = e["latency_ms"]
        if lat is not None:
            latencies.append(lat)

        if e["sink"]:
            destinations[e["sink"]] = destinations.get(e["sink"], 0) + (e["protected_count"] or 1)

        if e["by_type"]:
            try:
                bt = json.loads(e["by_type"])
                for k, v in bt.items():
                    by_type[k] = by_type.get(k, 0) + v
            except Exception:
                pass

    p50_ms = round(float(np.median(latencies)), 2) if latencies else 0.0
    p95_ms = round(float(np.percentile(latencies, 95)), 2) if latencies else 0.0
    requests_count = len(events)
    plan_limit = PLANS[plan_key(tenant.get("plan"))]["monthly_limit"]

    parsed_receipts = []
    for r in receipts_rows:
        try:
            r_json = json.loads(r["receipt_json"])
        except Exception:
            r_json = {}
        parsed_receipts.append({
            "id": r["id"],
            "customer_ref": r["customer_ref"],
            "purpose": r["purpose"],
            "at": r["at"],
            "verified": bool(r["verified"]),
            "alg": r_json.get("alg", "Ed25519+ML-DSA-65"),
            "root": r_json.get("root"),
            "signature": r_json.get("signature"),
        })

    return {
        "tenant": tenant,
        "preview_notice": "Aran Cloud (preview): separate keys, namespaces, metering and dashboards. Per-tenant engines and persistent vault storage are the next milestone.",
        "metrics": {
            "identifiers_protected": total_protected,
            "passed_unprotected": total_unprotected,
            "raw_values_passed": total_unprotected,
            "not_valid_ids_ignored": total_ignored,
            "ignored_checksum_count": total_ignored,
            "plaintext_reads": plaintext_reads,
            "plaintext reads": plaintext_reads,
            "by_type": by_type,
            "p50_ms": p50_ms,
            "p95_ms": p95_ms,
            "requests_this_month": requests_count,
            "plan_limit": plan_limit,
            "usage_percent": round((requests_count / plan_limit) * 100, 2),
            "destinations": destinations,
            "receipts_count": len(parsed_receipts),
        },
        "recent_activity": events[:50],
        "receipts": parsed_receipts,
    }


# ---------------------------------------------------------------- Detokenise Audit (Item 2 & Hardening 1d)
@app.get("/v1/audit")
def get_audit(tenant: dict = Depends(require_scope("dashboard"))):
    """Returns caller's detokenise audit log rows (dashboard scope)."""
    tenant_id = tenant["id"]
    conn = get_db()
    rows = conn.execute(
        """
        SELECT id, key_id, key_label, token, purpose, result, at, created_at, prev_hash, entry_hash
        FROM detokenise_audit
        WHERE tenant_id = ?
        ORDER BY id DESC LIMIT 200
        """,
        (tenant_id,),
    ).fetchall()
    conn.close()

    out = []
    for r in rows:
        out.append({
            "id": r["id"],
            "key_id": r["key_id"],
            "key_label": r["key_label"],
            "token": r["token"],
            "purpose": r["purpose"],
            "result": r["result"],
            "at": r["at"],
            "created_at": r["created_at"],
            "prev_hash": r["prev_hash"],
            "entry_hash": r["entry_hash"],
        })
    return {"audit": out, "count": len(out)}


@app.get("/v1/audit/verify")
def verify_audit_chain(tenant: dict = Depends(require_scope("dashboard"))):
    """Recomputes and cryptographically verifies the hash chain of detokenise_audit rows."""
    tenant_id = tenant["id"]
    conn = get_db()
    rows = conn.execute(
        """
        SELECT id, tenant_id, key_id, key_label, token, purpose, result, at, created_at, prev_hash, entry_hash
        FROM detokenise_audit
        WHERE tenant_id = ?
        ORDER BY id ASC
        """,
        (tenant_id,),
    ).fetchall()
    conn.close()

    expected_prev = "0" * 64
    for r in rows:
        prev_hash = r["prev_hash"]
        entry_hash = r["entry_hash"]

        if prev_hash != expected_prev:
            return {
                "valid": False,
                "error": f"Broken chain pointer at row id {r['id']}: expected prev_hash {expected_prev}, got {prev_hash}",
                "failed_at_id": r["id"],
                "total_rows": len(rows),
            }

        recomputed = hashlib.sha256(
            f"{prev_hash}|{r['tenant_id']}|{r['key_id'] or ''}|{r['key_label'] or ''}|{r['token']}|{r['purpose'] or ''}|{r['result']}|{r['at']:.4f}|{r['created_at']}".encode("utf-8")
        ).hexdigest()

        if entry_hash != recomputed:
            return {
                "valid": False,
                "error": f"Tampered entry hash at row id {r['id']}: expected {recomputed}, stored {entry_hash}",
                "failed_at_id": r["id"],
                "total_rows": len(rows),
            }

        expected_prev = entry_hash

    return {
        "valid": True,
        "total_rows": len(rows),
        "latest_hash": expected_prev,
        "verified_at": time.strftime("%Y-%m-%d %H:%M:%S"),
    }


@app.post("/v1/internal/reset-limiters")
def reset_limiters(_: None = Depends(require_admin_token)):
    """Clears in-memory rate limiter state."""
    with _rate_limit_lock:
        _key_request_timestamps.clear()
        _signup_ip_timestamps.clear()
    return {"status": "ok", "cleared": True}


@app.get("/v1/health")
def get_v1_health():
    """Checks the core at /api/health and returns ok or degraded."""
    try:
        resp = requests.get(f"{ARAN_CORE_URL}/api/health", timeout=2.0)
        if resp.status_code == 200:
            core_data = resp.json()
            if core_data.get("ready"):
                return {"status": "ok", "core": True, "core_ready": True}
        return {"status": "degraded", "core": False, "core_ready": False}
    except Exception as e:
        return {"status": "degraded", "core": False, "error": str(e)}


@app.post("/v1/demo/seed")
def trigger_demo_seed(request: Request, tenant: dict = Depends(require_scope("admin"))):
    """Triggers realistic demo traffic seeding for the calling workspace."""
    import subprocess
    import sys
    demo_txns = seed_demo_transactions(tenant, 200) if ARAN_DEMO_MODE else 0
    api_key = request.headers.get("X-API-Key")
    script_path = os.path.join(HERE, "..", "scripts", "seed_demo.py")
    res = subprocess.run(
        [sys.executable, script_path, "--api-key", api_key],
        capture_output=True,
        text=True,
        timeout=60,
    )
    if res.returncode != 0:
        raise HTTPException(status_code=500, detail=f"Seed failed: {res.stderr}")
    return {"status": "ok", "output": res.stdout, "demo_transactions": demo_txns,
            "note": "Demo data: generated identifiers, labelled demo." if demo_txns else None}


# ---------------------------------------------------------------- transactions: time, plans, roles
IST = dt.timezone(dt.timedelta(hours=5, minutes=30))  # the workspace region is India: "today" and "this month" are IST
PLANS = {
    "sandbox": {"label": "Sandbox", "monthly_limit": 10_000, "price_inr": 0, "overage_per_1000_inr": 0,
                "blurb": "Free while you build. Over the limit is flagged, never refused."},
    "growth": {"label": "Growth", "monthly_limit": 1_000_000, "price_inr": 25_000, "overage_per_1000_inr": 30,
               "blurb": "For a live product. 1 million calls a month included."},
    "enterprise": {"label": "Enterprise", "monthly_limit": 50_000_000, "price_inr": 250_000, "overage_per_1000_inr": 10,
                   "blurb": "Dedicated support and a private deployment. 50 million calls a month included."},
}
PLAN_NOTE = "Prices are illustrative. No real billing happens in this preview."
ROLE_SCOPES = {
    "admin": sorted(VALID_SCOPES),
    "security": ["dashboard", "detokenise", "erase", "trace", "verify"],
    "auditor": ["dashboard", "verify"],
    "developer": ["dashboard", "gateway", "protect"],
}
FAIL_SAFE_MODES = {
    "hold_then_mask": "Hold the copy in an outbox and send it once Aran answers; send it masked if Aran never does.",
    "mask_now": "Send the copy masked at once if Aran does not answer in time.",
    "hold_only": "Hold the copy until Aran answers. Never send it masked.",
}
RAILS = ("UPI", "IMPS", "NEFT", "RTGS", "CARD", "OTHER")
PURPOSE_NAMES = ("KYC", "Loans", "Service", "Marketing")
TXN_ENDPOINT = "/v1/transactions/protect"
MAX_BATCH = 500
MAX_BODY_BYTES = 12 * 1024 * 1024
FIELD_SEP = "\n␞\n"  # joins one transaction's fields into one core call
MAX_JOIN_CHARS = 15000     # the core accepts 20,000 characters per call
STREAM_TOKEN_TTL = 120
STREAM_HEARTBEAT_S = float(os.environ.get("ARAN_STREAM_HEARTBEAT_S", "5"))
STREAM_POLL_S = float(os.environ.get("ARAN_STREAM_POLL_S", "1"))
STREAM_MAX_S = 1800
STREAM_SECRET = (os.environ.get("ARAN_STREAM_SECRET") or secrets.token_hex(32)).encode()
_core_pool = ThreadPoolExecutor(max_workers=8, thread_name_prefix="txn-core")


def plan_key(raw: Optional[str]) -> str:
    raw = (raw or "").lower()
    return raw if raw in PLANS else "sandbox"  # "free" from older workspaces is the Sandbox


def ist_day_start(ts: float) -> float:
    return dt.datetime.fromtimestamp(ts, IST).replace(hour=0, minute=0, second=0, microsecond=0).timestamp()


def ist_month_bounds(ts: float):
    d = dt.datetime.fromtimestamp(ts, IST).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    nxt = (d.replace(year=d.year + 1, month=1) if d.month == 12 else d.replace(month=d.month + 1))
    return d.timestamp(), nxt.timestamp(), d.strftime("%Y-%m")


def pctl(values: list, q: float) -> Optional[float]:
    return round(float(np.percentile(values, q)), 2) if values else None


def ratio(num: int, den: int) -> Optional[float]:
    return round(num / den, 4) if den else None


def loads(raw: Optional[str], default):
    try:
        return json.loads(raw) if raw else default
    except Exception:
        return default


# ---------------------------------------------------------------- transactions: models
class TxnIn(BaseModel):
    txn_id: str = Field(min_length=1, max_length=64, pattern=r"^[A-Za-z0-9._:/-]+$")
    rail: str = "OTHER"
    sink: str = Field(default="txn-log", pattern=r"^[A-Za-z0-9._:-]{1,64}$")
    purpose: str = "Service"
    customer_ref: Optional[str] = Field(default=None, pattern=r"^[A-Za-z0-9_-]{1,48}$")
    amount_paise: Optional[int] = Field(default=None, ge=0, le=10**15)
    fields: Dict[str, str] = Field(default_factory=dict)

    @field_validator("rail")
    @classmethod
    def _rail(cls, v: str) -> str:
        v = v.strip().upper()
        if v not in RAILS:
            raise ValueError(f"rail must be one of {', '.join(RAILS)}")
        return v

    @field_validator("purpose")
    @classmethod
    def _purpose(cls, v: str) -> str:
        if v not in PURPOSE_NAMES:
            raise ValueError(f"purpose must be one of {', '.join(PURPOSE_NAMES)}")
        return v

    @field_validator("fields")
    @classmethod
    def _fields(cls, v: Dict[str, str]) -> Dict[str, str]:
        if len(v) > 20:
            raise ValueError("a transaction may have at most 20 fields")
        for k, val in v.items():
            if not k or len(k) > 64:
                raise ValueError("a field name must be 1 to 64 characters")
            if len(val.encode("utf-8")) > 4096:
                raise ValueError(f"field '{k[:40]}' is longer than 4 KB")
        return v


class TxnBatchIn(BaseModel):
    transactions: List[TxnIn] = Field(min_length=1, max_length=MAX_BATCH)


class PlanIn(BaseModel):
    plan: str


class MemberIn(BaseModel):
    email: str = Field(max_length=200)
    role: str
    issue_key: bool = False


class SloIn(BaseModel):
    budget_ms: Optional[float] = Field(default=None, ge=0.5, le=1000)
    target_percent: Optional[float] = Field(default=None, ge=90, le=99.999)


class SettingsIn(BaseModel):
    fail_safe: Optional[str] = None


# ---------------------------------------------------------------- transactions: protect
def _label(name: str) -> str:
    """A field's name goes in front of its value as context for the detector ("mobile: 98..."); odd names become 'field'."""
    return name if re.fullmatch(r"[A-Za-z][A-Za-z0-9_ -]{0,40}", name) else "field"


def protect_fields(tenant_id: str, t: TxnIn) -> dict:
    """Protects every field of one transaction through protect_text (the same core path as /v1/protect).
    Fields are joined into one core call with a separator and split back; if the split does not line up
    (or a value contains the separator), each field gets its own call. Writes nothing."""
    out_fields: Dict[str, str] = {}
    detail: Dict[str, dict] = {}
    by_type: Dict[str, int] = {}
    tokens: List[dict] = []
    tot = {"protected": 0, "unprotected": 0, "ignored": 0}
    latency = 0.0

    def absorb(r: dict):
        nonlocal latency
        tot["protected"] += r["protected"]
        tot["unprotected"] += r["unprotected"]
        tot["ignored"] += r["ignored"]
        latency += float(r["latency_ms"] or 0)
        for k, v in r["by_type"].items():
            by_type[k] = by_type.get(k, 0) + v
        for f in r["res"].get("findings", []):
            if f.get("token") and not f.get("owner_conflict"):
                tokens.append({"token": f["token"], "customer_ref": f.get("customer_ref"), "purpose": f.get("purpose")})

    def note_field(name: str, findings: list):
        d = detail.setdefault(name, {"found": 0, "protected": 0, "types": {}})
        for f in findings:
            d["found"] += 1
            if f.get("protected"):
                d["protected"] += 1
                d["types"][f.get("type", "UNKNOWN")] = d["types"].get(f.get("type", "UNKNOWN"), 0) + 1

    def one_by_one(group: List[tuple]):
        for name, value in group:
            r = protect_text(tenant_id, f"{_label(name)}: {value}", t.customer_ref, t.purpose, t.sink)
            after = r["res"].get("after", "")
            pre = f"{_label(name)}: "
            out_fields[name] = after[len(pre):] if after.startswith(pre) else after
            absorb(r)
            note_field(name, r["res"].get("findings", []))

    # empty values need no call; the rest are grouped so one call stays under the core's size limit
    groups: List[List[tuple]] = []
    cur: List[tuple] = []
    size = 0
    for name, value in t.fields.items():
        if value == "":
            out_fields[name] = ""
            detail[name] = {"found": 0, "protected": 0, "types": {}}
            continue
        if cur and size + len(value) + len(name) + 8 > MAX_JOIN_CHARS:
            groups.append(cur)
            cur, size = [], 0
        cur.append((name, value))
        size += len(value) + len(name) + 8
    if cur:
        groups.append(cur)

    for group in groups:
        if len(group) == 1 or any(FIELD_SEP in v or FIELD_SEP in n for n, v in group):
            one_by_one(group)
            continue
        prefixes = [f"{_label(n)}: " for n, _ in group]
        text = FIELD_SEP.join(p + v for p, (_, v) in zip(prefixes, group))
        r = protect_text(tenant_id, text, t.customer_ref, t.purpose, t.sink)
        parts = r["res"].get("after", "").split(FIELD_SEP)
        if len(parts) != len(group) or not all(p.startswith(pre) for p, pre in zip(parts, prefixes)):
            one_by_one(group)  # the output did not split back cleanly: do not guess
            continue
        absorb(r)
        start = 0
        spans = []
        for p, (_, v) in zip(prefixes, group):
            spans.append((start, start + len(p) + len(v)))
            start += len(p) + len(v) + len(FIELD_SEP)
        for (name, _), (lo, hi), part, pre in zip(group, spans, parts, prefixes):
            out_fields[name] = part[len(pre):]
            note_field(name, [f for f in r["res"].get("findings", []) if f.get("start") is not None and lo <= f["start"] < hi])

    return {
        "fields": {n: out_fields.get(n, "") for n in t.fields},
        "detail": {n: detail.get(n, {"found": 0, "protected": 0, "types": {}}) for n in t.fields},
        "found": tot["protected"] + tot["unprotected"],
        "protected": tot["protected"],
        "raw": tot["unprotected"],
        "ignored": tot["ignored"],
        "by_type": by_type,
        "latency_ms": round(latency, 2),
        "tokens": tokens,
    }


def txn_view(row: sqlite3.Row, replayed: bool = False) -> dict:
    """A stored transaction as the API shows it: protected text and counts only."""
    stored = loads(row["result_json"], {})
    return {
        "id": row["id"],
        "txn_id": row["txn_id"],
        "rail": row["rail"],
        "sink": row["sink"],
        "purpose": row["purpose"],
        "customer_ref": row["customer_ref"],
        "amount_paise": row["amount_paise"],
        "source": row["source"],
        "at": row["at"],
        "fields": stored.get("fields", {}),
        "detail": stored.get("detail", {}),
        "found": row["found"],
        "protected": row["protected"],
        "raw": row["raw"],
        "by_type": loads(row["by_type"], {}),
        "latency_ms": row["latency_ms"],
        "demo": bool(row["demo"]),
        "replayed": replayed,
    }


def run_transactions(tenant: dict, items: List[TxnIn], at_list: Optional[List[float]] = None, demo: bool = False) -> List[dict]:
    """Protects a batch for one tenant, stores one txn_events row and one usage_events row per NEW transaction,
    and returns the results in request order. A (txn_id, sink) already stored for this tenant is a replay:
    the stored result comes back with replayed=true and nothing is metered again."""
    tenant_id = tenant["id"]
    source = tenant.get("key_label")
    conn = get_db()
    try:
        # which (txn_id, sink) pairs are already stored for this tenant
        existing: Dict[tuple, sqlite3.Row] = {}
        ids = sorted({t.txn_id for t in items})
        for i in range(0, len(ids), 400):
            chunk = ids[i:i + 400]
            qm = ",".join("?" * len(chunk))
            for r in conn.execute(f"SELECT * FROM txn_events WHERE tenant_id = ? AND txn_id IN ({qm})", [tenant_id, *chunk]):
                existing[(r["txn_id"], r["sink"])] = r

        todo: Dict[tuple, int] = {}  # first position of each new (txn_id, sink)
        for pos, t in enumerate(items):
            k = (t.txn_id, t.sink)
            if k not in existing and k not in todo:
                todo[k] = pos

        # the core calls run in parallel; the first failure stops the rest
        abort = threading.Event()

        def work(pos: int):
            if abort.is_set():
                return pos, None, "skipped"
            try:
                return pos, protect_fields(tenant_id, items[pos]), None
            except HTTPException as e:
                abort.set()
                return pos, None, str(e.detail)
            except Exception as e:  # never let one transaction crash the batch silently
                abort.set()
                return pos, None, f"{type(e).__name__}: {e}"

        t0 = time.perf_counter()
        done = list(_core_pool.map(work, todo.values()))
        failed = [(p, err) for p, out, err in done if err and err != "skipped"]
        if failed:
            now_ts = time.time()
            elapsed = round((time.perf_counter() - t0) * 1000, 2)
            with conn:
                for pos, _ in failed:
                    t = items[pos]
                    conn.execute(
                        """
                        INSERT INTO usage_events (tenant_id, at, endpoint, sink, purpose, protected_count, unprotected_count, ignored_count, by_type, latency_ms, customer_ref, status)
                        VALUES (?, ?, ?, ?, ?, 0, 0, 0, '{}', ?, ?, 'error')
                        """,
                        (tenant_id, now_ts, TXN_ENDPOINT, t.sink, t.purpose, elapsed, t.customer_ref),
                    )
            raise HTTPException(status_code=502, detail=f"Aran core could not protect transaction '{items[failed[0][0]].txn_id}': {failed[0][1]}. Nothing was stored; send the batch again.")
        outputs = {pos: out for pos, out, _ in done}

        # write: one txn_events row, its tokens and one usage_events row per new transaction
        replay_of: Dict[tuple, sqlite3.Row] = dict(existing)
        fresh_keys = set()
        now_ts = time.time()
        with conn:
            for pos, out in outputs.items():
                t = items[pos]
                at = at_list[pos] if at_list else now_ts
                cur = conn.execute(
                    """
                    INSERT OR IGNORE INTO txn_events
                      (tenant_id, txn_id, rail, sink, purpose, customer_ref, amount_paise, source, found, protected, raw, ignored,
                       by_type, latency_ms, at, result_json, demo)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (tenant_id, t.txn_id, t.rail, t.sink, t.purpose, t.customer_ref, t.amount_paise, source, out["found"],
                     out["protected"], out["raw"], out["ignored"], json.dumps(out["by_type"]), out["latency_ms"], at,
                     json.dumps({"fields": out["fields"], "detail": out["detail"]}), 1 if demo else 0),
                )
                if cur.rowcount == 0:
                    continue  # another request stored the same transaction first: this one is a replay
                fresh_keys.add((t.txn_id, t.sink))
                record_tokens(conn, tenant_id, out["tokens"], t.customer_ref, t.purpose, t.sink, at)
                conn.execute(
                    """
                    INSERT INTO usage_events (tenant_id, at, endpoint, sink, purpose, protected_count, unprotected_count, ignored_count, by_type, latency_ms, customer_ref, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ok')
                    """,
                    (tenant_id, at, TXN_ENDPOINT, t.sink, t.purpose, out["protected"], out["raw"], out["ignored"],
                     json.dumps(out["by_type"]), out["latency_ms"], t.customer_ref),
                )
        # read back what is stored (this also covers the lost-race replays)
        stored: Dict[tuple, sqlite3.Row] = {}
        for t in items:
            k = (t.txn_id, t.sink)
            if k not in stored:
                stored[k] = replay_of.get(k) or conn.execute(
                    "SELECT * FROM txn_events WHERE tenant_id = ? AND txn_id = ? AND sink = ?", (tenant_id, t.txn_id, t.sink)
                ).fetchone()
        results, shown = [], set()
        for t in items:
            k = (t.txn_id, t.sink)
            replayed = k not in fresh_keys or k in shown
            shown.add(k)
            results.append(txn_view(stored[k], replayed=replayed))
        return results
    finally:
        conn.close()


@app.post("/v1/transactions/protect")
def protect_transactions(body: TxnBatchIn, request: Request, tenant: dict = Depends(require_scope("protect"))):
    """Protects 1 to 500 transactions. Each field is tokenised through the same core path as /v1/protect.
    Idempotent per (tenant, txn_id, sink): a repeat returns the stored result with replayed=true and is not metered twice."""
    cl = request.headers.get("content-length")
    if cl and cl.isdigit() and int(cl) > MAX_BODY_BYTES:
        raise HTTPException(status_code=413, detail="request body too large (12 MB at most)")
    t0 = time.perf_counter()
    rows = run_transactions(tenant, body.transactions)
    results = [{
        "txn_id": r["txn_id"], "sink": r["sink"], "fields": r["fields"], "found": r["found"], "protected": r["protected"],
        "raw": r["raw"], "by_type": r["by_type"], "latency_ms": r["latency_ms"], "replayed": r["replayed"],
    } for r in rows]
    return {"results": results, "latency_ms": round((time.perf_counter() - t0) * 1000, 2)}


# ---------------------------------------------------------------- transactions: list, metrics
def _like(q: str) -> str:
    return "%" + q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"


@app.get("/v1/transactions")
def list_transactions(
    since_id: int = Query(0, ge=0),
    before_id: Optional[int] = Query(None, ge=0),
    limit: int = Query(50, ge=1, le=200),
    rail: Optional[str] = None,
    sink: Optional[str] = None,
    q: Optional[str] = Query(None, max_length=64),
    tenant: dict = Depends(require_scope("dashboard")),
):
    """The newest protected transactions of this workspace, newest first. Poll with since_id to get only new ones.
    Protected text and counts only: this API never has a raw value."""
    where, args = ["tenant_id = ?"], [tenant["id"]]
    if since_id:
        where.append("id > ?"); args.append(since_id)
    if before_id:
        where.append("id < ?"); args.append(before_id)
    if rail:
        where.append("rail = ?"); args.append(rail.upper())
    if sink:
        where.append("sink = ?"); args.append(sink)
    if q:
        where.append("txn_id LIKE ? ESCAPE '\\'"); args.append(_like(q))
    conn = get_db()
    rows = conn.execute(f"SELECT * FROM txn_events WHERE {' AND '.join(where)} ORDER BY id DESC LIMIT ?", [*args, limit]).fetchall()
    max_id = conn.execute("SELECT COALESCE(MAX(id), 0) FROM txn_events WHERE tenant_id = ?", (tenant["id"],)).fetchone()[0]
    total = conn.execute("SELECT COUNT(*) FROM txn_events WHERE tenant_id = ?", (tenant["id"],)).fetchone()[0]
    conn.close()
    return {"transactions": [txn_view(r) for r in rows], "count": len(rows), "max_id": max_id, "total_stored": total, "updated_at": time.time()}


WINDOWS = {"1h": 3600, "24h": 86400, "7d": 604800}
STEPS = {"1m": 60, "5m": 300, "1h": 3600}
MAX_BUCKETS = 2016


def build_metrics(tenant_id: str, window: str, step: str, now: Optional[float] = None) -> dict:
    if window not in WINDOWS:
        raise HTTPException(status_code=422, detail="window must be one of 1h, 24h, 7d")
    if step not in STEPS:
        raise HTTPException(status_code=422, detail="step must be one of 1m, 5m, 1h")
    w, s = WINDOWS[window], STEPS[step]
    n = w // s
    if n < 1 or n > MAX_BUCKETS:
        raise HTTPException(status_code=422, detail=f"window={window} with step={step} would make {w // s} buckets; use a larger step (at most {MAX_BUCKETS} buckets)")
    now = now or time.time()
    cur = int(now // s) * s
    start = cur - (n - 1) * s
    conn = get_db()
    rows = conn.execute(
        "SELECT at, latency_ms, found, protected, raw, rail, sink, by_type, source, demo FROM txn_events WHERE tenant_id = ? AND at >= ? AND at <= ?",
        (tenant_id, start, now + 1),
    ).fetchall()
    errs = conn.execute(
        "SELECT at FROM usage_events WHERE tenant_id = ? AND endpoint = ? AND status = 'error' AND at >= ?",
        (tenant_id, TXN_ENDPOINT, start),
    ).fetchall()
    conn.close()

    lat: List[List[float]] = [[] for _ in range(n)]
    b = [{"t": start + i * s, "transactions": 0, "found": 0, "protected": 0, "raw": 0, "errors": 0} for i in range(n)]
    all_lat: List[float] = []
    by_rail: Dict[str, dict] = {}
    by_type: Dict[str, int] = {}
    by_sink: Dict[str, dict] = {}
    by_source: Dict[str, dict] = {}
    demo_n = 0
    for r in rows:
        i = int((int(r["at"] // s) * s - start) // s)
        if i < 0 or i >= n:
            continue
        x = b[i]
        x["transactions"] += 1; x["found"] += r["found"]; x["protected"] += r["protected"]; x["raw"] += r["raw"]
        lat[i].append(r["latency_ms"]); all_lat.append(r["latency_ms"])
        demo_n += r["demo"]
        bt = loads(r["by_type"], {})
        for key, bucket in ((r["rail"], by_rail), (r["sink"], by_sink), (r["source"] or "unknown", by_source)):
            e = bucket.setdefault(key, {"transactions": 0, "protected": 0, "raw": 0, "by_type": {}})
            e["transactions"] += 1; e["protected"] += r["protected"]; e["raw"] += r["raw"]
            for tk, tv in bt.items():
                e["by_type"][tk] = e["by_type"].get(tk, 0) + tv
        for tk, tv in bt.items():
            by_type[tk] = by_type.get(tk, 0) + tv
    for e in errs:
        i = int((int(e["at"] // s) * s - start) // s)
        if 0 <= i < n:
            b[i]["errors"] += 1
    for i, x in enumerate(b):
        x["coverage"] = ratio(x["protected"], x["found"])
        x["p50_ms"] = pctl(lat[i], 50)
        x["p95_ms"] = pctl(lat[i], 95)
        x["partial"] = (i == n - 1)
    tx = sum(x["transactions"] for x in b)
    found = sum(x["found"] for x in b); prot = sum(x["protected"] for x in b); raw = sum(x["raw"] for x in b)
    n_err = sum(x["errors"] for x in b)
    return {
        "window": window, "step": step, "step_seconds": s, "from": start, "to": now, "generated_at": now,
        "buckets": b,
        "totals": {
            "transactions": tx, "found": found, "protected": prot, "raw": raw, "coverage": ratio(prot, found),
            "p50_ms": pctl(all_lat, 50), "p95_ms": pctl(all_lat, 95), "p99_ms": pctl(all_lat, 99),
            "errors": n_err, "error_rate": ratio(n_err, tx + n_err), "demo_transactions": demo_n,
        },
        "by_rail": by_rail, "by_type": by_type, "by_sink": by_sink, "by_source": by_source,
    }


@app.get("/v1/metrics")
def get_metrics(window: str = "1h", step: str = "1m", tenant: dict = Depends(require_scope("dashboard"))):
    """Time buckets (zero-filled, the current one flagged partial), totals and breakdowns by rail, type, destination. This workspace only."""
    return build_metrics(tenant["id"], window, step)


# ---------------------------------------------------------------- live stream (Server-Sent Events)
def make_stream_token(tenant_id: str, key_id: int, ttl: int = STREAM_TOKEN_TTL) -> str:
    body = f"{tenant_id}.{key_id}.{int(time.time()) + ttl}"
    sig = hmac.new(STREAM_SECRET, body.encode(), hashlib.sha256).hexdigest()[:40]
    return f"ast_{body}.{sig}"


def read_stream_token(token: str) -> Optional[dict]:
    """The tenant and key a valid, unexpired stream token was issued for, or None."""
    try:
        if not token.startswith("ast_"):
            return None
        body, sig = token[4:].rsplit(".", 1)
        good = hmac.new(STREAM_SECRET, body.encode(), hashlib.sha256).hexdigest()[:40]
        if not hmac.compare_digest(sig, good):
            return None
        tenant_id, key_id, exp = body.split(".")
        if int(exp) < time.time():
            return None
        return {"id": tenant_id, "key_id": int(key_id)}
    except Exception:
        return None


def key_is_live(tenant_id: str, key_id: int) -> bool:
    conn = get_db()
    r = conn.execute("SELECT revoked FROM api_keys WHERE id = ? AND tenant_id = ?", (key_id, tenant_id)).fetchone()
    conn.close()
    return bool(r) and not r["revoked"]


@app.post("/v1/stream/token")
def stream_token(tenant: dict = Depends(require_scope("dashboard"))):
    """A short-lived token for GET /v1/stream?token=... (a browser EventSource cannot send the X-API-Key header)."""
    return {
        "token": make_stream_token(tenant["id"], tenant["key_id"]),
        "expires_in": STREAM_TOKEN_TTL,
        "note": "Use it to open /v1/stream once; ask for a new one to reconnect. It works only for this workspace and stops working if the key is revoked.",
    }


def tenant_plan(tenant_id: str) -> str:
    conn = get_db()
    r = conn.execute("SELECT plan FROM tenants WHERE id = ?", (tenant_id,)).fetchone()
    conn.close()
    return plan_key(r["plan"] if r else None)


def month_used(conn: sqlite3.Connection, tenant_id: str, now: float) -> int:
    lo, hi, _ = ist_month_bounds(now)
    return conn.execute(
        "SELECT COUNT(*) FROM usage_events WHERE tenant_id = ? AND at >= ? AND at < ? AND status != 'error'", (tenant_id, lo, hi)
    ).fetchone()[0]


def counters_now(tenant_id: str) -> dict:
    now = time.time()
    conn = get_db()
    day = ist_day_start(now)
    r = conn.execute(
        "SELECT COUNT(*) n, COALESCE(SUM(found),0) f, COALESCE(SUM(protected),0) p, COALESCE(SUM(raw),0) w FROM txn_events WHERE tenant_id = ? AND at >= ?",
        (tenant_id, day),
    ).fetchone()
    demo_today = conn.execute("SELECT COUNT(*) FROM txn_events WHERE tenant_id = ? AND at >= ? AND demo = 1", (tenant_id, day)).fetchone()[0]
    stored = conn.execute("SELECT COUNT(*) FROM txn_events WHERE tenant_id = ?", (tenant_id,)).fetchone()[0]
    last_min = conn.execute("SELECT COUNT(*) FROM txn_events WHERE tenant_id = ? AND at >= ?", (tenant_id, now - 60)).fetchone()[0]
    lats = [x[0] for x in conn.execute("SELECT latency_ms FROM txn_events WHERE tenant_id = ? AND at >= ?", (tenant_id, now - 3600))]
    st = conn.execute("SELECT budget_ms FROM tenant_settings WHERE tenant_id = ?", (tenant_id,)).fetchone()
    used = month_used(conn, tenant_id, now)
    conn.close()
    limit = PLANS[tenant_plan(tenant_id)]["monthly_limit"]
    return {
        "at": now, "today": "today (India time)",
        "transactions_today": r["n"], "found_today": r["f"], "protected_today": r["p"], "raw_today": r["w"],
        "coverage_today": ratio(r["p"], r["f"]), "transactions_last_minute": last_min,
        "demo_today": demo_today, "transactions_stored": stored,
        "p95_ms_last_hour": pctl(lats, 95), "budget_ms": (st["budget_ms"] if st else 10.0),
        "month_used": used, "month_limit": limit, "over_limit": used > limit,
    }


@app.get("/v1/counters")
def get_counters(tenant: dict = Depends(require_scope("dashboard"))):
    """Today's counters (India time), the last hour's p95 against the budget and the month against the plan: the same payload as the stream's heartbeat."""
    return counters_now(tenant["id"])


@app.get("/v1/stream")
async def stream(request: Request, token: Optional[str] = None, x_api_key: Optional[str] = Header(None),
                 last_event_id: Optional[str] = Header(None)):
    """Server-Sent Events for this workspace: `event: txn` for every new protected transaction (protected text only, never a raw
    value) and `event: counters` every ~5 s. Authenticate with `?token=` from POST /v1/stream/token (preferred, because a browser
    EventSource cannot set headers) or with the X-API-Key header from a script. A key in the query string is NOT accepted."""
    if token:
        who = read_stream_token(token)
        if not who or not await asyncio.to_thread(key_is_live, who["id"], who["key_id"]):
            raise HTTPException(status_code=401, detail="Invalid or expired stream token. Ask POST /v1/stream/token for a new one.")
        tenant_id, key_id = who["id"], who["key_id"]
    else:
        t = await asyncio.to_thread(get_current_tenant_and_key, x_api_key)
        if "admin" not in t["scopes"] and "dashboard" not in t["scopes"]:
            raise HTTPException(status_code=403, detail="this key lacks the 'dashboard' scope")
        tenant_id, key_id = t["id"], t["key_id"]

    def newest_id() -> int:
        c = get_db()
        v = c.execute("SELECT COALESCE(MAX(id), 0) FROM txn_events WHERE tenant_id = ?", (tenant_id,)).fetchone()[0]
        c.close()
        return v

    def fetch_after(after: int) -> list:
        c = get_db()
        rows = c.execute("SELECT * FROM txn_events WHERE tenant_id = ? AND id > ? ORDER BY id ASC LIMIT 100", (tenant_id, after)).fetchall()
        c.close()
        return [txn_view(r) for r in rows]

    last = int(last_event_id) if last_event_id and last_event_id.isdigit() else await asyncio.to_thread(newest_id)

    async def gen():
        nonlocal last
        started = time.time()
        yield "retry: 3000\n\n"
        yield f"event: counters\ndata: {json.dumps(await asyncio.to_thread(counters_now, tenant_id))}\n\n"
        beat = time.time()
        while time.time() - started < STREAM_MAX_S:
            if await request.is_disconnected():
                return
            for v in await asyncio.to_thread(fetch_after, last):
                last = v["id"]
                yield f"id: {v['id']}\nevent: txn\ndata: {json.dumps(v)}\n\n"
            if time.time() - beat >= STREAM_HEARTBEAT_S:
                beat = time.time()
                if not await asyncio.to_thread(key_is_live, tenant_id, key_id):
                    yield "event: closed\ndata: {\"reason\": \"key revoked\"}\n\n"
                    return
                yield f"event: counters\ndata: {json.dumps(await asyncio.to_thread(counters_now, tenant_id))}\n\n"
            await asyncio.sleep(STREAM_POLL_S)

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no", "Connection": "keep-alive"})


# ---------------------------------------------------------------- usage, plan, team, SLO, settings
def usage_summary(tenant_id: str) -> dict:
    now = time.time()
    lo, hi, month = ist_month_bounds(now)
    plan = tenant_plan(tenant_id)
    p = PLANS[plan]
    conn = get_db()
    rows = conn.execute(
        """
        SELECT strftime('%Y-%m-%d', at + 19800, 'unixepoch') AS d, COUNT(*) AS n, COALESCE(SUM(protected_count), 0) AS prot
        FROM usage_events WHERE tenant_id = ? AND at >= ? AND at < ? AND status != 'error' GROUP BY d
        """,
        (tenant_id, lo, hi),
    ).fetchall()
    tx_month = conn.execute("SELECT COUNT(*) FROM txn_events WHERE tenant_id = ? AND at >= ? AND at < ?", (tenant_id, lo, hi)).fetchone()[0]
    conn.close()
    got = {r["d"]: (r["n"], r["prot"]) for r in rows}
    first = dt.datetime.fromtimestamp(lo, IST)
    days_in_month = int((hi - lo) // 86400 + 0.5)
    today = dt.datetime.fromtimestamp(now, IST).strftime("%Y-%m-%d")
    per_day = []
    for i in range(days_in_month):
        d = (first + dt.timedelta(days=i)).strftime("%Y-%m-%d")
        n, prot = got.get(d, (0, 0))
        per_day.append({"date": d, "calls": n, "values_protected": prot, "future": d > today})
    used = sum(n for n, _ in got.values())
    over = max(0, used - p["monthly_limit"])
    overage = (-(-over // 1000)) * p["overage_per_1000_inr"]
    return {
        "month": month, "window": f"{month} (India time)", "generated_at": now,
        "plan": plan, "plan_label": p["label"], "limit": p["monthly_limit"], "used": used,
        "transactions_this_month": tx_month, "percent": round(100 * used / p["monthly_limit"], 2),
        "over_limit": used > p["monthly_limit"], "per_day": per_day,
        "invoice_preview": {
            "currency": "INR", "base": p["price_inr"], "included_calls": p["monthly_limit"], "extra_calls": over,
            "extra_charge": overage, "total": p["price_inr"] + overage, "note": PLAN_NOTE,
            "rule": "One call is one protected transaction or one API request. Going over the limit never blocks a call; it is billed at the plan's extra rate (Sandbox: flagged only).",
        },
        "plans": {k: dict(v, key=k) for k, v in PLANS.items()},
    }


@app.get("/v1/usage")
def get_usage(tenant: dict = Depends(require_scope("dashboard"))):
    """This month against the plan, per day (India time), with an invoice preview. Soft limit: over the limit is flagged, never refused."""
    return usage_summary(tenant["id"])


@app.get("/v1/plan")
def get_plan(tenant: dict = Depends(require_scope("admin"))):
    conn = get_db()
    hist = [dict(r) for r in conn.execute("SELECT plan, since FROM plans WHERE tenant_id = ? ORDER BY id DESC LIMIT 20", (tenant["id"],))]
    conn.close()
    u = usage_summary(tenant["id"])
    return {"plan": u["plan"], "plan_label": u["plan_label"], "limit": u["limit"], "used": u["used"], "over_limit": u["over_limit"],
            "soft_limit": True, "plans": u["plans"], "history": hist, "note": PLAN_NOTE}


@app.post("/v1/plan")
def set_plan(body: PlanIn, tenant: dict = Depends(require_scope("admin"))):
    """Switches the plan. Limits are soft: no call is ever refused for quota."""
    new = body.plan.strip().lower()
    if new not in PLANS:
        raise HTTPException(status_code=400, detail=f"plan must be one of {', '.join(PLANS)}")
    conn = get_db()
    with conn:
        conn.execute("UPDATE tenants SET plan = ? WHERE id = ?", (new, tenant["id"]))
        conn.execute("INSERT INTO plans (tenant_id, plan, since) VALUES (?, ?, ?)", (tenant["id"], new, time.strftime("%Y-%m-%d %H:%M:%S")))
    conn.close()
    return get_plan(tenant)


EMAIL_RE = re.compile(r"^[^@\s]{1,100}@[^@\s]{1,100}\.[^@\s]{2,20}$")


def member_view(r: sqlite3.Row) -> dict:
    return {"id": r["id"], "email": r["email"], "role": r["role"], "scopes": ROLE_SCOPES.get(r["role"], []),
            "key_id": r["key_id"], "created_at": r["created_at"], "owner": False}


@app.get("/v1/team")
def list_team(tenant: dict = Depends(require_scope("admin"))):
    conn = get_db()
    rows = conn.execute("SELECT * FROM members WHERE tenant_id = ? ORDER BY id ASC", (tenant["id"],)).fetchall()
    t = conn.execute("SELECT email, created_at FROM tenants WHERE id = ?", (tenant["id"],)).fetchone()
    conn.close()
    owner = {"id": 0, "email": t["email"], "role": "admin", "scopes": ROLE_SCOPES["admin"], "key_id": None, "created_at": t["created_at"], "owner": True}
    return {"members": [owner] + [member_view(r) for r in rows], "roles": ROLE_SCOPES}


@app.post("/v1/team")
def add_member(body: MemberIn, tenant: dict = Depends(require_scope("admin"))):
    """Adds a person with a role (admin, security, auditor, developer). The role decides the scopes of the key issued to them."""
    email = body.email.strip().lower()
    role = body.role.strip().lower()
    if not EMAIL_RE.match(email):
        raise HTTPException(status_code=422, detail="enter a valid email address")
    if role not in ROLE_SCOPES:
        raise HTTPException(status_code=422, detail=f"role must be one of {', '.join(ROLE_SCOPES)}")
    now_str = time.strftime("%Y-%m-%d %H:%M:%S")
    raw_key, key_id = None, None
    conn = get_db()
    try:
        with conn:
            if conn.execute("SELECT 1 FROM members WHERE tenant_id = ? AND email = ?", (tenant["id"], email)).fetchone():
                raise HTTPException(status_code=409, detail="that person is already on the team")
            if body.issue_key:
                raw_key = f"aran_live_{secrets.token_hex(16)}"
                cur = conn.execute(
                    "INSERT INTO api_keys (tenant_id, key_hash, prefix, label, scopes, created_at, revoked) VALUES (?, ?, ?, ?, ?, ?, 0)",
                    (tenant["id"], hashlib.sha256(raw_key.encode()).hexdigest(), raw_key[:14], f"{email} ({role})",
                     ",".join(ROLE_SCOPES[role]), now_str),
                )
                key_id = cur.lastrowid
            cur = conn.execute("INSERT INTO members (tenant_id, email, role, key_id, created_at) VALUES (?, ?, ?, ?, ?)",
                               (tenant["id"], email, role, key_id, now_str))
            row = conn.execute("SELECT * FROM members WHERE id = ?", (cur.lastrowid,)).fetchone()
    finally:
        conn.close()
    out = member_view(row)
    if raw_key:
        out["api_key"] = raw_key
        out["note"] = "Save this key now. It is shown once and stored only as a SHA-256 hash."
    return out


@app.delete("/v1/team/{member_id}")
def remove_member(member_id: int, tenant: dict = Depends(require_scope("admin"))):
    """Removes a person and revokes the key that was issued to them, if any."""
    conn = get_db()
    with conn:
        row = conn.execute("SELECT * FROM members WHERE id = ? AND tenant_id = ?", (member_id, tenant["id"])).fetchone()
        if row:
            if row["key_id"]:
                conn.execute("UPDATE api_keys SET revoked = 1 WHERE id = ? AND tenant_id = ?", (row["key_id"], tenant["id"]))
            conn.execute("DELETE FROM members WHERE id = ? AND tenant_id = ?", (member_id, tenant["id"]))
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="no such team member")
    return {"status": "ok", "removed": row["email"], "key_revoked": bool(row["key_id"])}


def get_settings_row(conn: sqlite3.Connection, tenant_id: str) -> dict:
    r = conn.execute("SELECT * FROM tenant_settings WHERE tenant_id = ?", (tenant_id,)).fetchone()
    if r:
        return dict(r)
    return {"tenant_id": tenant_id, "budget_ms": 10.0, "slo_target": 99.9, "fail_safe": "hold_then_mask", "region": "india", "updated_at": None}


def save_settings(tenant_id: str, **changes) -> dict:
    conn = get_db()
    with conn:
        cur = get_settings_row(conn, tenant_id)
        cur.update({k: v for k, v in changes.items() if v is not None})
        conn.execute(
            """
            INSERT INTO tenant_settings (tenant_id, budget_ms, slo_target, fail_safe, region, updated_at) VALUES (?, ?, ?, ?, 'india', ?)
            ON CONFLICT(tenant_id) DO UPDATE SET budget_ms = excluded.budget_ms, slo_target = excluded.slo_target,
                                                 fail_safe = excluded.fail_safe, updated_at = excluded.updated_at
            """,
            (tenant_id, cur["budget_ms"], cur["slo_target"], cur["fail_safe"], time.strftime("%Y-%m-%d %H:%M:%S")),
        )
    conn.close()
    return cur


def slo_report(tenant_id: str) -> dict:
    now = time.time()
    lo, hi, month = ist_month_bounds(now)
    conn = get_db()
    st = get_settings_row(conn, tenant_id)
    rows = conn.execute("SELECT at, latency_ms FROM txn_events WHERE tenant_id = ? AND at >= ? AND at < ?", (tenant_id, lo, hi)).fetchall()
    conn.close()
    cur_minute = int(now // 60)
    per_min: Dict[int, List[float]] = {}
    for r in rows:
        m = int(r["at"] // 60)
        if m < cur_minute:  # only closed minutes count
            per_min.setdefault(m, []).append(r["latency_ms"])
    budget, target = st["budget_ms"], st["slo_target"]
    active = len(per_min)
    bad = sum(1 for v in per_min.values() if float(np.percentile(v, 95)) > budget)
    minutes_in_month = int((hi - lo) // 60)
    total_budget = round((1 - target / 100.0) * minutes_in_month, 1)
    left = round(max(0.0, total_budget - bad), 1)
    status = "no_data" if not active else ("breached" if bad > total_budget else ("at_risk" if bad > total_budget / 2 else "ok"))
    return {
        "budget_ms": budget, "target_percent": target, "month": month, "window": f"{month} (India time)",
        "indicator": "p95 added latency per minute, minutes with traffic only",
        "active_minutes": active, "good_minutes": active - bad, "bad_minutes": bad,
        "good_percent": (round(100 * (active - bad) / active, 3) if active else None),
        "error_budget_minutes": total_budget, "error_budget_left_minutes": left,
        "error_budget_left_percent": (round(100 * left / total_budget, 1) if total_budget else None),
        "status": status, "generated_at": now,
    }


@app.get("/v1/slo")
def get_slo(tenant: dict = Depends(require_scope("dashboard"))):
    """The latency objective, this month's good minutes and the error budget left."""
    return slo_report(tenant["id"])


@app.put("/v1/slo")
def put_slo(body: SloIn, tenant: dict = Depends(require_scope("admin"))):
    save_settings(tenant["id"], budget_ms=body.budget_ms, slo_target=body.target_percent)
    return slo_report(tenant["id"])


@app.get("/v1/settings")
def get_settings(tenant: dict = Depends(require_scope("dashboard"))):
    conn = get_db()
    st = get_settings_row(conn, tenant["id"])
    conn.close()
    return {"region": "india", "budget_ms": st["budget_ms"], "slo_target": st["slo_target"], "fail_safe": st["fail_safe"],
            "fail_safe_modes": FAIL_SAFE_MODES, "updated_at": st["updated_at"]}


@app.put("/v1/settings")
def put_settings(body: SettingsIn, tenant: dict = Depends(require_scope("admin"))):
    if body.fail_safe is not None and body.fail_safe not in FAIL_SAFE_MODES:
        raise HTTPException(status_code=422, detail=f"fail_safe must be one of {', '.join(FAIL_SAFE_MODES)}")
    save_settings(tenant["id"], fail_safe=body.fail_safe)
    return get_settings(tenant)


# ---------------------------------------------------------------- demo transactions
DEMO_SINKS = ["txn-log", "txn-log", "txn-log", "fraud-desk", "fraud-desk", "analytics", "sms-gateway", "support-chat"]
DEMO_RAILS = ["UPI"] * 5 + ["IMPS"] * 2 + ["NEFT"] * 2 + ["CARD"] * 2 + ["RTGS"]
DEMO_NAMES = ["aarav", "priya", "vikram", "ananya", "rajesh", "meera", "amit", "sunita", "kavita", "rohan", "siddharth", "deepa"]
DEMO_REMARKS = ["rent for November", "dinner split", "loan EMI", "refund for order", "school fees", "gift", "electricity bill", "grocery"]


def seed_demo_transactions(tenant: dict, n: int = 200) -> int:
    """About n demo transactions spread over the last hour (generated identifiers, labelled demo) so a fresh dashboard is not empty."""
    import random
    rnd = random.Random()
    now = time.time()
    ids = [call_core("GET", "/api/tour/generate")[0] for _ in range(min(40, n))]
    run = int(now)
    items: List[TxnIn] = []
    for i in range(n):
        g = rnd.choice(ids)
        rail = rnd.choice(DEMO_RAILS)
        name = rnd.choice(DEMO_NAMES)
        pan = "".join(rnd.choice("ABCDEFGHJKLMNPRSTUVWXYZ") for _ in range(3)) + "P" + rnd.choice("ABCDEFGHJKLMNPRSTUVWXYZ") + f"{rnd.randint(1000, 9999)}" + rnd.choice("ABCDEFGHJKLMNPRSTUVWXYZ")
        fields = {"payer_account": "".join(rnd.choice("0123456789") for _ in range(14)), "remarks": rnd.choice(DEMO_REMARKS)}
        if rail == "UPI":
            fields["payee"] = f"{name}{rnd.randint(1, 99)}@okhdfcbank"
            fields["mobile"] = g["mobile"]
        elif rail == "CARD":
            fields["card"] = g["card"]
            fields["mobile"] = g["mobile"]
        else:
            fields["payee_account"] = "".join(rnd.choice("0123456789") for _ in range(14))
            fields["remarks"] += f" aadhaar {g['aadhaar']}" if rnd.random() < 0.4 else f" pan {pan}"
        items.append(TxnIn(txn_id=f"DEMO-{run}-{i + 1:04d}", rail=rail, sink=rnd.choice(DEMO_SINKS), purpose="Service",
                           customer_ref=f"CUST-D{rnd.randint(1, 60):04d}", amount_paise=rnd.randint(5_000, 5_000_000), fields=fields))
    # more traffic in the later minutes, none in the last few seconds
    ats = sorted(now - 3540 + 3500 * (rnd.random() ** 0.7) for _ in range(n))
    for i in range(0, n, 100):
        run_transactions(tenant, items[i:i + 100], at_list=ats[i:i + 100], demo=True)
    return n


# ---------------------------------------------------------------- static & frontend
@app.get("/")
def serve_landing():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


@app.get("/connect")
def serve_connect():
    return FileResponse(os.path.join(STATIC_DIR, "connect.html"))


# The dashboard runs no inline script: scripts only from this server, styles and fonts from Google Fonts.
DASHBOARD_CSP = ("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                 "font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; "
                 "frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'")


@app.get("/dashboard")
def serve_dashboard():
    return FileResponse(os.path.join(STATIC_DIR, "dashboard.html"), headers={"Content-Security-Policy": DASHBOARD_CSP})


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# The Aran UI (the console's design system in app/ui) is shared by every Aran app:
# its tokens, styles, component helpers and the kit for these pages are served at /aran.
ARAN_UI_DIR = os.environ.get("ARAN_UI_DIR", os.path.join(HERE, "..", "app", "ui"))
if os.path.isdir(ARAN_UI_DIR):
    app.mount("/aran", StaticFiles(directory=ARAN_UI_DIR), name="aran-ui")
