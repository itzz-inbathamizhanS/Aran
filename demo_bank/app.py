"""demo_bank/app.py: Mock Bank Instance for Aran Demonstrations.

Runs in one of two modes depending on BANK_MODE env var:
- BANK_MODE=legacy: Legacy banking app (unprotected PII, raw storage, unredacted logs/chat).
- BANK_MODE=aran: Modern Aran-protected banking app (vault tokens, redacted logs, AI gateway, crypto-shredding).
"""

import json
import os
import re
import secrets
import sqlite3
import sys
import time
from typing import Optional
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import requests

# Add aran_sdk to path for standard-library Python SDK
HERE_DIR = os.path.dirname(os.path.abspath(__file__))
SDK_DIR = os.path.join(HERE_DIR, "..", "aran_sdk")
if SDK_DIR not in sys.path:
    sys.path.insert(0, SDK_DIR)

from aran import Aran

if HERE_DIR not in sys.path:
    sys.path.insert(0, HERE_DIR)
import bank_txn  # accounts, payments, ledger, fraud score, copies of each payment

# ---------------------------------------------------------------- configuration
BANK_MODE = os.environ.get("BANK_MODE", "legacy").strip().lower()
if BANK_MODE not in ("legacy", "aran"):
    BANK_MODE = "legacy"

PORT = int(os.environ.get("PORT", 9001 if BANK_MODE == "legacy" else 9002))
ARAN_URL = os.environ.get("ARAN_URL", "http://127.0.0.1:8000").rstrip("/")
ARAN_API_KEY = os.environ.get("ARAN_API_KEY")
ARAN_ADMIN_TOKEN = os.environ.get("ARAN_ADMIN_TOKEN")

HERE = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(HERE, "static")
os.makedirs(STATIC_DIR, exist_ok=True)
DB_DIR = os.environ.get("BANK_DATA_DIR") or HERE  # a container keeps the data on a volume
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.path.join(DB_DIR, f"data_{BANK_MODE}.db")


def _auto_workspace():
    """Bank B with ARAN_AUTO_WORKSPACE=1 and no ARAN_API_KEY (docker compose): create this bank's
    Aran Cloud workspace once, keep its admin key next to the bank's data, and reuse it on restart."""
    key_file = os.path.join(DB_DIR, "aran_admin_key")
    if os.path.exists(key_file):
        with open(key_file) as f:
            return f.read().strip() or None
    import urllib.request
    body = json.dumps({"name": "Bank B (demo)", "email": "security@bank-b.example"}).encode()
    for _ in range(30):
        try:
            req = urllib.request.Request(f"{ARAN_URL}/v1/workspaces", data=body, method="POST",
                                         headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                d = json.loads(resp.read().decode())
            key = d.get("admin_key") or d.get("api_key")
            fd = os.open(key_file, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
            with os.fdopen(fd, "w") as f:
                f.write(key)
            print(f"Created Aran Cloud workspace {d.get('tenant_id')} for Bank B", flush=True)
            return key
        except Exception as err:  # the cloud may still be starting
            print(f"Waiting for Aran Cloud at {ARAN_URL}: {err.__class__.__name__}", flush=True)
            time.sleep(2)
    return None


if BANK_MODE == "aran" and not ARAN_API_KEY and os.environ.get("ARAN_AUTO_WORKSPACE") in ("1", "true", "True"):
    ARAN_API_KEY = _auto_workspace()

# In-memory token mapping for demo authorized officer view (Spec 3a)
TOKEN_MAP = {}

# Scoped SDK clients for Bank B (Item 4)
_sdk_clients = {}


def get_sdk_clients():
    """Returns (app_client, compliance_client, admin_client) for Bank B."""
    if not _sdk_clients and BANK_MODE == "aran":
        admin_key = ARAN_API_KEY
        if not admin_key:
            return None, None, None

        admin_client = Aran(api_key=admin_key, base_url=ARAN_URL)
        app_key = os.environ.get("ARAN_APP_KEY")
        compliance_key = os.environ.get("ARAN_COMPLIANCE_KEY")

        if not app_key:
            try:
                import urllib.request
                req = urllib.request.Request(
                    f"{ARAN_URL}/v1/keys",
                    data=json.dumps({"label": "Bank B Core Ingestion & AI", "scopes": ["protect", "gateway", "trace"]}).encode(),
                    headers={"Content-Type": "application/json", "X-API-Key": admin_key},
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=3) as resp:
                    app_key = json.loads(resp.read().decode())["api_key"]
            except Exception:
                app_key = admin_key

        if not compliance_key:
            try:
                import urllib.request
                req = urllib.request.Request(
                    f"{ARAN_URL}/v1/keys",
                    data=json.dumps({"label": "Bank B Compliance Audit", "scopes": ["detokenise"]}).encode(),
                    headers={"Content-Type": "application/json", "X-API-Key": admin_key},
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=3) as resp:
                    compliance_key = json.loads(resp.read().decode())["api_key"]
            except Exception:
                compliance_key = admin_key

        _sdk_clients["app"] = Aran(api_key=app_key, base_url=ARAN_URL)
        _sdk_clients["compliance"] = Aran(api_key=compliance_key, base_url=ARAN_URL)
        _sdk_clients["admin"] = admin_client

    return _sdk_clients.get("app"), _sdk_clients.get("compliance"), _sdk_clients.get("admin")

app = FastAPI(
    title=f"Demo Bank ({'Aran Protected' if BANK_MODE == 'aran' else 'Legacy'})",
    description="Side-by-side judge demonstration mock bank",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # the demo bank uses no cookies
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def basic_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    return response


# ---------------------------------------------------------------- database
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    return conn


def init_db():
    conn = get_db()
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_ref TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                mobile TEXT NOT NULL,
                aadhaar TEXT NOT NULL,
                card TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_ref TEXT,
                level TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS chat_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_ref TEXT,
                role TEXT NOT NULL,
                prompt TEXT NOT NULL,
                reply TEXT NOT NULL,
                provider_saw TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
        """)
    conn.close()


init_db()
txn_bank = bank_txn.Bank(BANK_MODE, get_db, DB_DIR, get_clients=lambda: get_sdk_clients())
txn_bank.ensure_accounts()  # customers from before accounts existed get one


# ---------------------------------------------------------------- Aran HTTP client
def _is_cloud(url: str) -> bool:
    """True when the URL is Aran Cloud (the SaaS API), False when it is the Aran core itself."""
    return "8100" in url or "/v1" in url


def aran_headers(admin: bool = False, to_cloud: Optional[bool] = None) -> dict:
    """Headers for a call to Aran. The core's internal secret goes only to the core, never to Aran Cloud
    (the cloud adds its own), and the workspace API key goes only to the cloud."""
    to_cloud = _is_cloud(ARAN_URL) if to_cloud is None else to_cloud
    h = {"Content-Type": "application/json"}
    internal_secret = os.environ.get("ARAN_INTERNAL_SECRET")
    if internal_secret and not to_cloud:
        h["X-Aran-Internal"] = internal_secret
    if ARAN_API_KEY and to_cloud:
        h["X-API-Key"] = ARAN_API_KEY
    if admin and ARAN_ADMIN_TOKEN:
        h["X-Admin-Token"] = ARAN_ADMIN_TOKEN
    return h


def call_aran(method: str, endpoint: str, json_data: dict = None, admin: bool = False, timeout: float = 10.0):
    # Compatibility switch: map core endpoints to Aran Cloud (/v1) when pointing to port 8100
    actual_endpoint = endpoint
    if _is_cloud(ARAN_URL):
        cloud_map = {
            "/api/process": "/v1/protect",
            "/api/tour/gateway": "/v1/gateway",
            "/api/detokenise": "/v1/detokenise",
            "/api/erase": "/v1/erase",
            "/api/receipts/verify": "/v1/receipts/verify",
            "/api/trace": "/v1/trace",
        }
        actual_endpoint = cloud_map.get(endpoint, endpoint)

    url = f"{ARAN_URL}{actual_endpoint}"
    headers = aran_headers(admin=admin)
    try:
        if method.upper() == "GET":
            r = requests.get(url, headers=headers, params=json_data, timeout=timeout)
        else:
            r = requests.post(url, headers=headers, json=json_data, timeout=timeout)
        r.raise_for_status()
        return r.json()
    except requests.exceptions.RequestException as err:
        err_msg = str(err)
        if hasattr(err, "response") and err.response is not None:
            try:
                err_msg = err.response.json().get("detail", err.response.text)
            except Exception:
                err_msg = err.response.text
        status = getattr(getattr(err, "response", None), "status_code", None)
        code = status if status in (400, 404, 409, 422, 423) else 502  # Aran's answer to a bad request keeps its status
        raise HTTPException(status_code=code, detail=f"Aran call {actual_endpoint} failed: {err_msg}")


# ---------------------------------------------------------------- models
class CustomerIn(BaseModel):
    name: str
    mobile: str
    aadhaar: str
    card: str
    customer_ref: Optional[str] = None


class ChatIn(BaseModel):
    customer_ref: Optional[str] = None
    prompt: str


class TraceIn(BaseModel):
    dump: Optional[str] = None


# Sample Indian names for sign-up generator
SAMPLE_NAMES = [
    "Aarav Sharma",
    "Priya Patel",
    "Vikram Malhotra",
    "Ananya Deshmukh",
    "Rajesh Iyer",
    "Meera Nair",
    "Amitabh Verma",
    "Sunita Rao",
    "Kavita Reddy",
    "Rohan Gupta",
]


# ---------------------------------------------------------------- routes
@app.get("/api/config")
def get_config():
    return {
        "bank_mode": BANK_MODE,
        "bank_name": "Aran Secure Bank (Firewall & Vault Active)" if BANK_MODE == "aran" else "Legacy Bank (Unprotected PII)",
        "port": PORT,
        "aran_url": ARAN_URL,
        "db_path": DB_PATH,
    }


@app.get("/api/sample-customer")
def get_sample_customer():
    """Fetches checksum-valid sample credentials from Aran tour endpoint and adds a typical Indian name."""
    sample = None
    try:
        sample = call_aran("GET", "/api/tour/generate")
        if not isinstance(sample, dict) or "mobile" not in sample:
            sample = None
    except Exception:
        pass

    if not sample:
        try:
            r = requests.get("http://127.0.0.1:8000/api/tour/generate", headers=aran_headers(to_cloud=False), timeout=3)
            r.raise_for_status()
            res_json = r.json()
            if isinstance(res_json, dict) and "mobile" in res_json:
                sample = res_json
        except Exception:
            pass

    if not sample or not isinstance(sample, dict) or "mobile" not in sample:
        sample = {
            "aadhaar": "895760490870",
            "card": "4532015112830366",
            "mobile": "9876543210",
        }
    sample["name"] = secrets.choice(SAMPLE_NAMES)
    sample["note"] = "Use sample data only. Never submit real financial credentials."
    return sample


@app.get("/api/customers")
def list_customers():
    conn = get_db()
    rows = conn.execute("SELECT * FROM customers ORDER BY id DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.post("/api/customers")
@app.post("/api/register")
def register_customer(body: CustomerIn):
    """Customer sign-up route (Write path).

    In Legacy mode: stores raw values and writes raw log.
    In Aran mode: passes name, mobile, Aadhaar, and card in ONE POST /api/process
    with customer_ref, purpose 'KYC', and sink 'kyc-archive'. Stores the output tokens
    and writes redacted log.
    """
    conn = get_db()
    count = conn.execute("SELECT COALESCE(MAX(id), 0) FROM customers").fetchone()[0]
    cust_ref = body.customer_ref or f"CUST-{'B' if BANK_MODE == 'aran' else 'A'}{count + 1:04d}"

    name = body.name.strip()
    mobile = re.sub(r"\D", "", body.mobile.strip())
    aadhaar = re.sub(r"\D", "", body.aadhaar.strip())
    card = re.sub(r"\D", "", body.card.strip())
    now_str = time.strftime("%Y-%m-%d %H:%M:%S")

    stored_name = name
    stored_mobile = mobile
    stored_aadhaar = aadhaar
    stored_card = card
    aran_findings = []

    if BANK_MODE == "aran":
        app_client, _, _ = get_sdk_clients()
        # Format chosen from demo_bank/names_experiment.py benchmark (100% tokenisation rate)
        registration_payload = f"Account holder {name} opened an account with mobile {mobile}, Aadhaar {aadhaar}, card {card}"
        res = app_client.protect(
            text=registration_payload,
            customer_ref=cust_ref,
            purpose="KYC",
            sink="kyc-archive",
        )
        aran_findings = res.get("findings", [])

        # Extract tokens for each identifier type from findings
        for f in aran_findings:
            ftype = f.get("type")
            tok = f.get("token")
            if ftype == "PER" and tok:
                stored_name = tok
            elif ftype == "MOBILE" and tok:
                stored_mobile = tok
            elif ftype == "AADHAAR" and tok:
                stored_aadhaar = tok
            elif ftype == "CARD" and tok:
                stored_card = tok

        # Record in memory token map for authorized officer view
        TOKEN_MAP[stored_aadhaar] = {"raw": aadhaar, "type": "AADHAAR", "customer_ref": cust_ref}
        TOKEN_MAP[stored_card] = {"raw": card, "type": "CARD", "customer_ref": cust_ref}
        TOKEN_MAP[stored_mobile] = {"raw": mobile, "type": "MOBILE", "customer_ref": cust_ref}
        if stored_name != name:
            TOKEN_MAP[stored_name] = {"raw": name, "type": "PER", "customer_ref": cust_ref}

    # Save to customers table
    try:
        with conn:
            conn.execute(
                """
                INSERT INTO customers (customer_ref, name, mobile, aadhaar, card, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (cust_ref, stored_name, stored_mobile, stored_aadhaar, stored_card, now_str),
            )
            account = txn_bank.open_account(conn, cust_ref)   # every customer gets a savings account
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=409, detail=f"Customer ref {cust_ref} already exists")

    # Log path: write audit log
    raw_log = f"Account created for {name} | Mobile: {mobile} | Aadhaar: {aadhaar} | Card: {card}"
    if BANK_MODE == "aran":
        # Sanitize log via Aran SDK before storing
        app_client, _, _ = get_sdk_clients()
        log_res = app_client.protect(
            text=raw_log,
            sink="log-platform",
            purpose="Service",
        )
        stored_log = log_res.get("after", raw_log)
    else:
        # Legacy writes raw log
        stored_log = raw_log

    with conn:
        conn.execute(
            """
            INSERT INTO logs (customer_ref, level, message, created_at)
            VALUES (?, 'INFO', ?, ?)
            """,
            (cust_ref, stored_log, now_str),
        )

    conn.close()
    return {
        "status": "success",
        "customer_ref": cust_ref,
        "name": stored_name,
        "mobile": stored_mobile,
        "aadhaar": stored_aadhaar,
        "card": stored_card,
        "bank_mode": BANK_MODE,
        "erasable": BANK_MODE == "aran",
        "findings": aran_findings,
        "account": {"number": account["number"], "ifsc": account["ifsc"], "balance_paise": account["balance_paise"]},
    }


@app.get("/api/db-view")
def get_db_view():
    """Database viewer endpoint: returns actual rows of customers, logs, and chat_history."""
    conn = get_db()
    customers = [dict(r) for r in conn.execute("SELECT * FROM customers ORDER BY id DESC").fetchall()]
    logs = [dict(r) for r in conn.execute("SELECT * FROM logs ORDER BY id DESC LIMIT 50").fetchall()]
    chat = [dict(r) for r in conn.execute("SELECT * FROM chat_history ORDER BY id DESC LIMIT 50").fetchall()]
    conn.close()
    return {
        "bank_mode": BANK_MODE,
        "customers": customers,
        "logs": logs,
        "chat_history": chat,
    }


@app.post("/api/chat")
def staff_chat(body: ChatIn):
    """Staff chatbot page:
    In Legacy mode: sends raw prompt to provider and stores raw prompt/reply.
    In Aran mode: passes prompt through Aran AI gateway (POST /api/tour/gateway, role customer-care),
    ensuring upstream provider sees placeholders only.
    """
    prompt = body.prompt.strip()
    cust_ref = body.customer_ref
    now_str = time.strftime("%Y-%m-%d %H:%M:%S")

    if BANK_MODE == "aran":
        app_client, _, _ = get_sdk_clients()
        # AI path: role customer-care using SDK gateway
        res = app_client.gateway(prompt=prompt, role="customer-care")
        provider_saw_list = res.get("provider_saw", [])
        provider_saw_text = "\n".join(m.get("content", "") for m in provider_saw_list) if isinstance(provider_saw_list, list) else str(provider_saw_list)
        reply = res.get("reply", "No reply received")
        audit_ok = res.get("audit_ok", True)

        # Sanitize prompt before saving to chat_history so Bank B DB holds no raw PII
        proc_prompt = app_client.protect(text=prompt, sink="llm-gateway", purpose="Service")
        stored_prompt = proc_prompt.get("after", prompt)
    else:
        # Legacy mode: provider sees full raw prompt
        provider_saw_text = prompt
        stored_prompt = prompt
        reply = f"Customer Care Assistant: Account review processed for: '{prompt}'. Status: Active. Approved balance check."
        audit_ok = False

    conn = get_db()
    with conn:
        conn.execute(
            """
            INSERT INTO chat_history (customer_ref, role, prompt, reply, provider_saw, created_at)
            VALUES (?, 'customer-care', ?, ?, ?, ?)
            """,
            (cust_ref, stored_prompt, reply, provider_saw_text, now_str),
        )

        # Log entry
        chat_log = f"Chat inquiry for {cust_ref or 'general'}: {prompt}"
        if BANK_MODE == "aran":
            proc = app_client.protect(text=chat_log, sink="log-platform", purpose="Service")
            chat_log = proc.get("after", chat_log)
        conn.execute(
            "INSERT INTO logs (customer_ref, level, message, created_at) VALUES (?, 'INFO', ?, ?)",
            (cust_ref, chat_log, now_str),
        )
    conn.close()

    return {
        "prompt": prompt,
        "reply": reply,
        "provider_saw": provider_saw_text,
        "audit_ok": audit_ok,
        "bank_mode": BANK_MODE,
    }


@app.get("/api/officer-view/{customer_ref}")
def officer_view(customer_ref: str, role: str = Query("teller")):
    """Authorised officer view (Aran mode only).

    Role switch (Spec 5, Amendment A4):
    - Teller: sees masked values (last 4 digits only).
    - Compliance: sees full plaintext values.
    - Developer: sees vault tokens directly.
    """
    if BANK_MODE != "aran":
        raise HTTPException(status_code=400, detail="Officer view is an Aran-mode feature")

    role = role.lower()
    if role not in ("teller", "compliance", "developer"):
        role = "teller"

    conn = get_db()
    row = conn.execute("SELECT * FROM customers WHERE customer_ref = ?", (customer_ref,)).fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Customer not found")

    cust = dict(row)
    result = {
        "customer_ref": customer_ref,
        "role": role,
        "disclaimer": "Demo role switch, not real authentication.",
        "fields": {},
    }

    # Helper mask functions
    def mask_num(val: str, keep_last: int = 4) -> str:
        if not val or len(val) <= keep_last:
            return val
        return "X" * (len(val) - keep_last) + val[-keep_last:]

    for field in ("aadhaar", "card", "mobile"):
        token = cust[field]
        if role == "developer":
            result["fields"][field] = {
                "display": token,
                "is_token": True,
                "status": "token",
            }
        else:
            # Call Aran detokenise using separate detokenise-scoped key via SDK (Item 4)
            try:
                _, compliance_client, _ = get_sdk_clients()
                detok = compliance_client.detokenise(token=token)
                status = detok.get("status", "unknown")
                raw_val = detok.get("value")
                if status == "erased":
                    result["fields"][field] = {
                        "display": f"[ERASED / UNREADABLE: {detok.get('reason', 'key destroyed')}]",
                        "status": "erased",
                        "is_token": False,
                    }
                elif status == "ok" and raw_val:
                    if role == "compliance":
                        result["fields"][field] = {
                            "display": raw_val,
                            "status": "ok",
                            "is_token": False,
                        }
                    else:  # teller
                        result["fields"][field] = {
                            "display": mask_num(raw_val, 4),
                            "status": "masked",
                            "is_token": False,
                        }
                else:
                    result["fields"][field] = {
                        "display": token,
                        "status": status,
                        "is_token": True,
                    }
            except Exception as err:
                result["fields"][field] = {
                    "display": token,
                    "status": "error",
                    "error": str(err),
                }

    result["fields"]["name"] = {
        "display": cust["name"],
        "status": "ok",
        "is_token": cust["name"].startswith("<PER:"),
    }
    return result


@app.get("/api/breach")
def get_breach_dump():
    """Breach button: dumps the entire database of this instance into a text format."""
    conn = get_db()
    customers = [dict(r) for r in conn.execute("SELECT * FROM customers").fetchall()]
    logs = [dict(r) for r in conn.execute("SELECT * FROM logs").fetchall()]
    chat = [dict(r) for r in conn.execute("SELECT * FROM chat_history").fetchall()]
    conn.close()

    lines = [
        f"-- DATABASE EXFILTRATION DUMP [{BANK_MODE.upper()}] --",
        f"-- Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')} --",
        "",
        "=== TABLE: customers ===",
    ]
    for c in customers:
        lines.append(f"REF: {c['customer_ref']} | NAME: {c['name']} | MOBILE: {c['mobile']} | AADHAAR: {c['aadhaar']} | CARD: {c['card']}")

    lines.append("")
    lines.append("=== TABLE: logs ===")
    for l in logs:
        lines.append(f"[{l['created_at']}] [{l['level']}] {l['message']}")

    lines.append("")
    lines.append("=== TABLE: chat_history ===")
    for ch in chat:
        lines.append(f"[{ch['created_at']}] PROMPT: {ch['prompt']} | REPLY: {ch['reply']} | PROVIDER_SAW: {ch['provider_saw']}")

    more, counts = txn_bank.dump_lines()   # accounts, transactions, ledger, every sink copy, the outbox
    lines += more
    dump_text = "\n".join(lines)
    return {
        "bank_mode": BANK_MODE,
        "dump": dump_text,
        "customer_count": len(customers),
        "log_count": len(logs),
        "chat_count": len(chat),
        **counts,
    }


@app.post("/api/trace-dump")
def trace_dump(body: TraceIn):
    """Sends database dump to Aran's POST /api/trace to inspect leaks and sink matches."""
    dump_text = body.dump
    if not dump_text:
        # Use current DB dump if none provided
        dump_res = get_breach_dump()
        dump_text = dump_res["dump"]

    if BANK_MODE == "aran":
        app_client, _, _ = get_sdk_clients()
        trace_res = app_client.trace(dump=dump_text)
    else:
        trace_res = call_aran("POST", "/api/trace", {"dump": dump_text})

    return {
        "bank_mode": BANK_MODE,
        "trace": trace_res,
    }


@app.post("/api/erase/{customer_ref}")
def erase_customer(customer_ref: str):
    """Erasure flow (Spec 7):
    - Legacy mode: deletes customer row only; leaves residual copies in logs and chat_history.
    - Aran mode: calls POST /v1/erase with purpose 'KYC' via admin-scoped SDK, verifies receipt,
      and shows tokens permanently unreadable.
    """
    conn = get_db()
    row = conn.execute("SELECT * FROM customers WHERE customer_ref = ?", (customer_ref,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Customer not found")

    cust = dict(row)
    now_str = time.strftime("%Y-%m-%d %H:%M:%S")

    if BANK_MODE == "legacy":
        # Legacy bank deletes the row only
        with conn:
            conn.execute("DELETE FROM customers WHERE customer_ref = ?", (customer_ref,))
            conn.execute(
                "INSERT INTO logs (customer_ref, level, message, created_at) VALUES (?, 'INFO', ?, ?)",
                (customer_ref, f"Customer {customer_ref} row deleted from database on request", now_str),
            )
        conn.close()
        return {
            "status": "deleted_row_only",
            "bank_mode": "legacy",
            "message": "Customer record removed from customers table. Residual copies still exist in logs and chat history.",
            "customer_ref": customer_ref,
            "ledger_note": "Bank A cannot erase the rest without breaking its books: the account, the transactions and the "
                           "ledger lines carry the real account numbers and payees, and so does every copy (log, fraud desk, "
                           "analytics, SMS). Deleting them would leave the ledger unbalanced and the audit trail empty.",
        }

    # Aran mode: crypto-shredding via key destruction using admin SDK client
    _, compliance_client, admin_client = get_sdk_clients()
    receipt = admin_client.erase(customer_ref=customer_ref, purpose="KYC")

    # 2. Verify the signed receipt via admin SDK verify_receipt
    verify_res = admin_client.verify_receipt(receipt)

    # 3. Verify detokenise now reports erased via compliance client
    detok_checks = {}
    for field in ("aadhaar", "card"):
        tok = cust[field]
        detok = compliance_client.detokenise(token=tok)
        detok_checks[field] = {
            "token": tok,
            "status": detok.get("status"),
            "reason": detok.get("reason"),
            "value": detok.get("value"),
        }

    # Payment copies were sent with purpose "Service": shred that purpose key too, then wipe the identifiers the core
    # keeps for this customer (the ledger keeps the amounts)
    try:
        service_receipt = admin_client.erase(customer_ref=customer_ref, purpose="Service")
    except Exception as err:
        service_receipt = {"error": str(err)[:160]}
    payments = txn_bank.after_erase(customer_ref)
    copy_checks = {}
    for tok in payments.get("copy_tokens", [])[:4]:
        try:
            d = compliance_client.detokenise(token=tok)
            copy_checks[tok] = {"status": d.get("status"), "value": d.get("value")}
        except Exception:
            copy_checks[tok] = {"status": "error", "value": None}

    # Log the erasure event
    with conn:
        conn.execute(
            "INSERT INTO logs (customer_ref, level, message, created_at) VALUES (?, 'INFO', ?, ?)",
            (customer_ref, f"DPDP Section 12 erasure executed for {customer_ref}: purpose KYC keys destroyed", now_str),
        )
    conn.close()

    return {
        "status": "crypto_shredded",
        "bank_mode": "aran",
        "customer_ref": customer_ref,
        "receipt": receipt,
        "verification": verify_res,
        "detokenise_checks": detok_checks,
        "service_receipt": service_receipt,
        "payments": payments,
        "copy_checks": copy_checks,
        "message": "Purpose keys permanently destroyed. Receipts cryptographically verified. The ledger keeps the amounts; "
                   "every payment copy is now unreadable.",
    }


@app.get("/api/aran-summary")
def aran_summary():
    """Bank B only: this bank's own Aran Cloud workspace numbers, for the side-by-side page.
    The browser never sees the bank's API key; the bank asks Aran Cloud and passes the metrics on."""
    if BANK_MODE != "aran" or not ARAN_API_KEY:
        return {"available": False, "reason": "only Bank B (Aran mode with an API key) has a workspace"}
    if not _is_cloud(ARAN_URL):
        return {"available": False, "reason": "Bank B is wired straight to the core, not to Aran Cloud"}
    try:
        r = requests.get(f"{ARAN_URL}/v1/dashboard", headers=aran_headers(), timeout=5)
        r.raise_for_status()
        d = r.json()
    except requests.exceptions.RequestException as err:
        return {"available": False, "reason": f"Aran Cloud unreachable: {err.__class__.__name__}"}
    t = d.get("tenant", {})
    return {"available": True, "tenant": {"id": t.get("id"), "name": t.get("name")}, "metrics": d.get("metrics", {})}


def _register_dict(d: dict):
    """Used by the seeder: the same sign-up as a customer would do."""
    return register_customer(CustomerIn(**d))


bank_txn.install(app, txn_bank, register=_register_dict)   # /api/accounts, /api/transactions, /api/fraud, /api/sinks ...
bank_txn.start_background(app, txn_bank, _register_dict)    # seed customers, optional traffic, outbox retry


# Serve static files and templates
@app.get("/")
def serve_index():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return HTMLResponse(f"<h1>Demo Bank ({BANK_MODE.upper()})</h1><p>Static UI not yet loaded.</p>")


@app.get("/compare")
def serve_compare():
    compare_path = os.path.join(STATIC_DIR, "compare.html")
    if os.path.exists(compare_path):
        return FileResponse(compare_path)
    return HTMLResponse("<h1>Aran vs Legacy Comparison</h1><p>Compare page not yet loaded.</p>")


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# The Aran UI (the console's design system in app/ui) is shared by every Aran app:
# its tokens, styles, component helpers and the kit for these pages are served at /aran.
ARAN_UI_DIR = os.environ.get("ARAN_UI_DIR", os.path.join(HERE, "..", "app", "ui"))
if os.path.isdir(ARAN_UI_DIR):
    app.mount("/aran", StaticFiles(directory=ARAN_UI_DIR), name="aran-ui")
