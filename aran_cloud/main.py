"""aran_cloud/main.py: Aran Cloud (preview) - Multi-tenant SaaS proxy layer for Aran Data-Flow Firewall.

Provides:
- Workspaces and API Key generation (SHA-256 stored).
- Tenant namespacing and cross-tenant owner isolation safeguards.
- Per-tenant usage metering and deterministic latency calculation.
- Granular per-tenant audit logs, erasure receipts, and dashboard metrics.
"""

import hashlib
import json
import os
import re
import secrets
import sqlite3
import time
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import numpy as np
from pydantic import BaseModel
import requests

# ---------------------------------------------------------------- configuration
PORT = int(os.environ.get("PORT", 8100))
ARAN_CORE_URL = os.environ.get("ARAN_CORE_URL", "http://127.0.0.1:8000").rstrip("/")
ARAN_ADMIN_TOKEN = os.environ.get("ARAN_ADMIN_TOKEN")

HERE = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(HERE, "static")
DB_PATH = os.path.join(HERE, "cloud.db")

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
                tenant_id TEXT NOT NULL REFERENCES tenants(id),
                key_hash TEXT PRIMARY KEY,
                prefix TEXT NOT NULL,
                created_at TEXT NOT NULL,
                revoked INTEGER DEFAULT 0
            );
        """)
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
    conn.close()


init_db()


# ---------------------------------------------------------------- auth dependency
def get_current_tenant(x_api_key: Optional[str] = Header(None)) -> dict:
    if not x_api_key:
        raise HTTPException(
            status_code=401,
            detail="Invalid, missing or revoked API key. Pass a valid key in header 'X-API-Key'.",
        )
    key_hash = hashlib.sha256(x_api_key.strip().encode()).hexdigest()
    conn = get_db()
    row = conn.execute(
        """
        SELECT t.id, t.name, t.email, t.created_at, t.plan
        FROM api_keys k
        JOIN tenants t ON k.tenant_id = t.id
        WHERE k.key_hash = ? AND k.revoked = 0
        """,
        (key_hash,),
    ).fetchone()
    conn.close()

    if not row:
        raise HTTPException(
            status_code=401,
            detail="Invalid, missing or revoked API key. Pass a valid key in header 'X-API-Key'.",
        )
    return dict(row)


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
    text: str


class DetokeniseIn(BaseModel):
    token: str
    caller: Optional[str] = "console"


class EraseIn(BaseModel):
    customer_ref: str
    purpose: str = "KYC"


class TraceIn(BaseModel):
    dump: str


# ---------------------------------------------------------------- helpers
def call_core(method: str, endpoint: str, json_data: dict = None, admin: bool = False, timeout: float = 10.0):
    url = f"{ARAN_CORE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
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
def create_workspace(body: WorkspaceIn):
    """Creates a new workspace tenant and returns a single-use API key."""
    tenant_id = f"t_{secrets.token_hex(4)}"
    raw_key = f"aran_live_{secrets.token_hex(16)}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    prefix = raw_key[:14]
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
            INSERT INTO api_keys (tenant_id, key_hash, prefix, created_at, revoked)
            VALUES (?, ?, ?, ?, 0)
            """,
            (tenant_id, key_hash, prefix, now_str),
        )
    conn.close()

    return {
        "tenant_id": tenant_id,
        "name": body.name.strip(),
        "email": body.email.strip(),
        "api_key": raw_key,
        "plan": "free",
        "created_at": now_str,
        "note": "Save your API key now. It is shown once and stored only as a SHA-256 hash.",
    }


@app.post("/v1/protect")
def protect(body: ProtectIn, tenant: dict = Depends(get_current_tenant)):
    """Namespaces customer_ref, forwards to core /api/process, meters usage, and applies tenant isolation safeguards."""
    tenant_id = tenant["id"]
    # Core main.py enforces ^[A-Za-z0-9_-]{1,64}$, so we use '__' delimiter for namespacing
    sep = "__"
    namespaced_ref = f"{tenant_id}{sep}{body.customer_ref}" if body.customer_ref else None

    core_payload = {
        "text": body.text,
        "source": "core-banking",
        "sink": body.sink or "kyc-archive",
        "customer_ref": namespaced_ref,
        "purpose": body.purpose or "KYC",
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

    # Calculate counts:
    # 1. Real identifiers that were detected but not protected:
    # findings where protected is False, plus any valid raw identifiers core notes passed through
    unprot_findings = sum(1 for f in core_res.get("findings", []) if not f.get("protected"))
    raw_passed = sum(1 for note in core_res.get("notes", []) if "passed through unchanged" in note)
    unprot_count = unprot_findings + raw_passed

    # 2. Shape matches that fail their checksum (ignored, not valid IDs)
    ignored_count = sum(1 for note in core_res.get("notes", []) if "fails the Aadhaar/Luhn checksum" in note)

    now_ts = time.time()
    conn = get_db()
    with conn:
        # Record issued tokens under calling tenant (if not an owner conflict)
        for fc in clean_findings:
            tok = fc.get("token")
            if tok and not fc.get("owner_conflict"):
                c_ref = fc.get("customer_ref") or body.customer_ref
                c_purp = fc.get("purpose") or body.purpose or "KYC"
                c_sink = body.sink or "kyc-archive"
                conn.execute(
                    """
                    INSERT OR REPLACE INTO tenant_tokens (token, tenant_id, customer_ref, purpose, sink, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (str(tok), tenant_id, c_ref, c_purp, c_sink, now_ts),
                )

        # Record usage event
        conn.execute(
            """
            INSERT INTO usage_events (tenant_id, at, endpoint, sink, purpose, protected_count, unprotected_count, ignored_count, by_type, latency_ms, customer_ref, status)
            VALUES (?, ?, '/v1/protect', ?, ?, ?, ?, ?, ?, ?, ?, 'ok')
            """,
            (
                tenant_id,
                now_ts,
                body.sink or "kyc-archive",
                body.purpose or "KYC",
                prot_count,
                unprot_count,
                ignored_count,
                json.dumps(by_type),
                latency_ms,
                body.customer_ref,
            ),
        )
    conn.close()

    core_res["findings"] = clean_findings
    core_res["notes"] = clean_notes
    return core_res


@app.post("/v1/gateway")
def gateway(body: GatewayIn, tenant: dict = Depends(get_current_tenant)):
    """AI Gateway forwarder for staff chatbots."""
    tenant_id = tenant["id"]
    core_res, latency_ms = call_core("POST", "/api/tour/gateway", {"role": body.role, "text": body.text})

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

    # Check token ownership in cloud.db
    conn = get_db()
    row = conn.execute(
        "SELECT tenant_id FROM tenant_tokens WHERE token = ? AND tenant_id = ?",
        (body.token, tenant_id),
    ).fetchone()
    conn.close()

    unknown_res = {
        "token": body.token,
        "value": None,
        "status": "unknown",
        "reason": "Not a vault token. Vaultless FF1 tokens are reversed only inside the bank's key boundary.",
    }

    if not row:
        # Unknown to this tenant or belongs to another tenant: return standard unknown response
        conn = get_db()
        with conn:
            conn.execute(
                """
                INSERT INTO usage_events (tenant_id, at, endpoint, sink, purpose, protected_count, unprotected_count, ignored_count, by_type, latency_ms, customer_ref, status)
                VALUES (?, ?, '/v1/detokenise', 'vault', 'Detokenise', 0, 0, 0, '{}', 0.5, NULL, 'unknown')
                """,
                (tenant_id, time.time()),
            )
        conn.close()
        return unknown_res

    # Owned by caller: forward to Aran core
    core_res, latency_ms = call_core("POST", "/api/detokenise", {"token": body.token, "caller": body.caller or "console"})

    conn = get_db()
    with conn:
        conn.execute(
            """
            INSERT INTO usage_events (tenant_id, at, endpoint, sink, purpose, protected_count, unprotected_count, ignored_count, by_type, latency_ms, customer_ref, status)
            VALUES (?, ?, '/v1/detokenise', 'vault', 'Detokenise', 0, 0, 0, '{}', ?, NULL, ?)
            """,
            (tenant_id, time.time(), latency_ms, core_res.get("status", "ok")),
        )
    conn.close()

    return core_res


@app.post("/v1/erase")
def erase(body: EraseIn, tenant: dict = Depends(get_current_tenant)):
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
def verify_receipt(receipt: dict, tenant: dict = Depends(get_current_tenant)):
    """Forwards receipt verification to Aran core."""
    res, _ = call_core("POST", "/api/receipts/verify", receipt)
    return res


@app.post("/v1/trace")
def trace(body: TraceIn, tenant: dict = Depends(get_current_tenant)):
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
def get_dashboard(tenant: dict = Depends(get_current_tenant)):
    """Returns calling tenant's isolated metrics, usage events, and receipts."""
    tenant_id = tenant["id"]
    conn = get_db()

    events = [dict(r) for r in conn.execute(
        "SELECT * FROM usage_events WHERE tenant_id = ? ORDER BY id DESC", (tenant_id,)
    ).fetchall()]

    receipts_rows = [dict(r) for r in conn.execute(
        "SELECT * FROM receipts WHERE tenant_id = ? ORDER BY id DESC", (tenant_id,)
    ).fetchall()]
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
    plan_limit = 10000

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


# ---------------------------------------------------------------- static & frontend
@app.get("/")
def serve_landing():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


@app.get("/connect")
def serve_connect():
    return FileResponse(os.path.join(STATIC_DIR, "connect.html"))


@app.get("/dashboard")
def serve_dashboard():
    return FileResponse(os.path.join(STATIC_DIR, "dashboard.html"))


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
