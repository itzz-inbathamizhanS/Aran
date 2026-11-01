"""demo_bank/bank_txn.py: accounts, payments, ledger, fraud score and the copies of each payment.

Used by demo_bank/app.py. The same code runs both banks:
- Bank A (BANK_MODE=legacy) writes every copy (log line, fraud-desk row, analytics row, SMS text, support chat)
  with the real identifiers.
- Bank B (BANK_MODE=aran) moves the money first, then sends the copies through Aran Cloud
  (POST /v1/transactions/protect) and stores only what comes back. If Aran does not answer within about
  1.5 seconds the copies are stored masked (last 4 digits only) and queued in the outbox for a retry.
  Bank B never writes a raw identifier to a copy table.

Everything is generated demo data. Money is integer paise, never floats. No real rail is called.
"""

import base64
import hashlib
import hmac
import json
import os
import random
import re
import secrets
import sqlite3
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, wait
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Union

from fastapi import FastAPI, Header, HTTPException, Query
from pydantic import BaseModel, StrictInt

IST = timezone(timedelta(hours=5, minutes=30))

# ------------------------------------------------------------------ rules
# limits in paise. UPI Rs 1,00,000; IMPS Rs 5,00,000; NEFT none; RTGS at least Rs 2,00,000.
RAILS: Dict[str, Dict[str, Any]] = {
    "UPI": {"max": 100_000 * 100, "min": 1, "id": "VPA"},
    "IMPS": {"max": 500_000 * 100, "min": 1, "id": "account + IFSC"},
    "NEFT": {"max": None, "min": 1, "id": "account + IFSC"},
    "RTGS": {"max": None, "min": 200_000 * 100, "id": "account + IFSC"},
    "CARD": {"max": None, "min": 1, "id": "16-digit card"},
}
MAX_AMOUNT = 10_000_000 * 100  # sanity cap, Rs 1 crore
FRAUD_AMOUNT = 50_000 * 100     # "large amount" is strictly above Rs 50,000
FRAUD_THRESHOLD = int(os.environ.get("BANK_FRAUD_THRESHOLD", "50"))
# (name, score) of each fraud rule
RULE_NEW_PAYEE, RULE_ODD_HOUR, RULE_LARGE, RULE_BURST = 30, 20, 30, 25

SINKS = ("txn-log", "fraud-desk", "analytics", "sms", "support-chat")
# identifier fields each sink receives (sent to Aran by name)
SINK_FIELDS = {
    "txn-log": ("payer_account", "payee", "remarks"),
    "fraud-desk": ("payer_account", "payee"),
    "analytics": ("payer_account", "payee"),
    "sms": ("payer_account", "payee", "mobile"),
    "support-chat": ("remarks", "payee"),
}
SINK_LABEL = {"txn-log": "Transaction log", "fraud-desk": "Fraud-desk row", "analytics": "Analytics export row",
              "sms": "SMS text", "support-chat": "Support chat"}
AI_TIMEOUT = float(os.environ.get("BANK_ARAN_TIMEOUT", "1.5"))
BREAKER_SECONDS = 10.0

VPA_RE = re.compile(r"^[A-Za-z0-9._\-]{2,64}@[A-Za-z][A-Za-z0-9]{1,30}$")
IFSC_RE = re.compile(r"^[A-Z]{4}0[A-Z0-9]{6}$")
ACCT_RE = re.compile(r"^\d{9,18}$")
PAN_RE = re.compile(r"\b[A-Z]{5}\d{4}[A-Z]\b")
VPA_FIND = re.compile(r"\b[A-Za-z0-9._\-]{2,64}@[A-Za-z][A-Za-z0-9]{1,30}\b")
NUM_RE = re.compile(r"\d{9,19}")
MOBILE_RE = re.compile(r"\b[6-9]\d{9}\b")


# ------------------------------------------------------------------ small helpers
def luhn_ok(num: str) -> bool:
    if not num.isdigit():
        return False
    total, alt = 0, False
    for ch in reversed(num):
        d = int(ch)
        if alt:
            d *= 2
            if d > 9:
                d -= 9
        total += d
        alt = not alt
    return total % 10 == 0


def luhn_complete(prefix: str) -> str:
    """prefix + the Luhn check digit."""
    for c in range(10):
        if luhn_ok(prefix + str(c)):
            return prefix + str(c)
    raise ValueError("unreachable")


_D = [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5], [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
      [3, 4, 0, 1, 2, 8, 9, 5, 6, 7], [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
      [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3], [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
      [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]]
_P = [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4], [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
      [8, 9, 1, 6, 0, 4, 3, 5, 2, 7], [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
      [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]]
_INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9]


def verhoeff_digit(num: str) -> int:
    c = 0
    for i, ch in enumerate(reversed(num)):
        c = _D[c][_P[(i + 1) % 8][int(ch)]]
    return _INV[c]


def verhoeff_ok(num: str) -> bool:
    c = 0
    for i, ch in enumerate(reversed(num)):
        c = _D[c][_P[i % 8][int(ch)]]
    return c == 0


def fmt_inr(paise: int) -> str:
    """Rs 1,00,000.00 with Indian digit grouping. paise is an integer."""
    rupees, frac = divmod(abs(int(paise)), 100)
    s = str(rupees)
    if len(s) > 3:
        head, tail, parts = s[:-3], s[-3:], []
        while len(head) > 2:
            parts.insert(0, head[-2:])
            head = head[:-2]
        if head:
            parts.insert(0, head)
        s = ",".join(parts + [tail])
    return f"{'-' if paise < 0 else ''}Rs {s}.{frac:02d}"


def parse_rupees(value: Union[str, int, float]) -> int:
    """'2450.50' -> 245050 paise, without floats. Rejects more than 2 decimals."""
    from decimal import Decimal, InvalidOperation
    try:
        d = Decimal(str(value).strip().replace(",", ""))
    except InvalidOperation:
        raise HTTPException(422, "amount is not a number")
    p = d * 100
    if p != p.to_integral_value():
        raise HTTPException(422, "amount has more than 2 decimal places")
    return int(p)


def mask_text(s: Any) -> Any:
    """Keep the last 4 digits only: 50100234567890 -> XXXXXXXXXX7890. UPI ids and PANs are masked too."""
    if not isinstance(s, str) or not s:
        return s
    s = VPA_FIND.sub(lambda m: "XXXXXX@" + m.group(0).split("@", 1)[1], s)
    s = PAN_RE.sub(lambda m: "XXXXXX" + m.group(0)[-4:], s)
    return NUM_RE.sub(lambda m: "X" * (len(m.group(0)) - 4) + m.group(0)[-4:], s)


def raw_identifiers(text: str) -> List[str]:
    """Identifiers a person typed into free text (remarks): PAN, mobile, long numbers, UPI ids."""
    out = set(PAN_RE.findall(text or "")) | set(MOBILE_RE.findall(text or "")) | set(VPA_FIND.findall(text or ""))
    out |= set(re.findall(r"\d{9,19}", text or ""))
    return [x for x in out if len(x) >= 6]


class AranDown(Exception):
    """Aran Cloud did not answer in time, or refused. The payment is never affected."""


# ------------------------------------------------------------------ the Aran Cloud call
class AranGateway:
    """Sends the copies of one payment to Aran Cloud in one call.

    Order: client.protect_transactions(list) if the SDK has it, else a direct POST to
    {base_url}/v1/transactions/protect with the bank's key (Bearer and X-API-Key). On 404 (older cloud)
    each field goes through client.protect(). Anything else raises AranDown. After a failure a short
    circuit breaker sends the next copies straight to the outbox instead of waiting again."""

    def __init__(self, get_clients, timeout: float = AI_TIMEOUT):
        self.get_clients = get_clients
        self.timeout = timeout
        self.down_until = 0.0
        self.last_error = ""
        self.mode_seen = ""   # "batch" or "per-field"
        self._client = None

    def breaker_open(self) -> bool:
        return time.time() < self.down_until

    def _short_client(self):
        if self._client is None:
            got = self.get_clients() if self.get_clients else (None, None, None)
            app_client = got[0] if got else None
            if app_client is None:
                raise AranDown("no Aran API key configured")
            from aran import Aran  # the SDK folder is on sys.path (see app.py)
            self._client = Aran(api_key=app_client.api_key, base_url=app_client.base_url,
                                timeout=self.timeout, max_retries=0)
        return self._client

    def protect(self, entries: List[dict], force: bool = False) -> Dict[tuple, dict]:
        """Returns {(txn_id, sink): result}. Missing keys mean 'not protected'. Raises AranDown when nothing came back."""
        if not entries:
            return {}
        if not force and self.breaker_open():
            raise AranDown("Aran Cloud unreachable (waiting before the next try)")
        try:
            client = self._short_client()
            try:
                if hasattr(client, "protect_transactions"):
                    data = client.protect_transactions(entries)
                else:
                    data = self._post(client, entries)
                self.mode_seen = "batch"
            except _NotFound:
                data = self._per_field(client, entries)
                self.mode_seen = "per-field"
            except Exception as err:  # SDK raised AranError with 404 -> fall back as well
                if getattr(err, "status_code", None) == 404:
                    data = self._per_field(client, entries)
                    self.mode_seen = "per-field"
                else:
                    raise
        except AranDown as err:
            self._fail(str(err))
            raise
        except Exception as err:
            self._fail(f"{err.__class__.__name__}: {err}")
            raise AranDown(self.last_error)
        out = {}
        for r in (data or {}).get("results", []):
            if isinstance(r, dict) and r.get("txn_id") and r.get("sink") is not None:
                out[(r["txn_id"], r["sink"])] = r
        if not out:
            self._fail("Aran answered with no results")
            raise AranDown(self.last_error)
        self.down_until = 0.0
        self.last_error = ""
        return out

    def _fail(self, msg: str):
        self.last_error = msg[:200]
        self.down_until = time.time() + BREAKER_SECONDS

    def _post(self, client, entries):
        import requests
        r = requests.post(
            client.base_url + "/v1/transactions/protect",
            json={"transactions": entries},
            headers={"Authorization": f"Bearer {client.api_key}", "X-API-Key": client.api_key,
                     "Content-Type": "application/json"},
            timeout=(min(self.timeout, 1.0), self.timeout),
        )
        if r.status_code == 404:
            raise _NotFound()
        if r.status_code >= 400:
            raise AranDown(f"HTTP {r.status_code} from Aran Cloud")
        return r.json()

    def _per_field(self, client, entries):
        """Older cloud: one /v1/protect call per field, in parallel, with a short overall limit."""
        prefix = {"payer_account": "Account number ", "payee": "Payee ", "card": "Card ", "mobile": "Mobile ", "remarks": ""}
        jobs = []
        pool = ThreadPoolExecutor(max_workers=8)
        try:
            cache = {}   # equal values give equal tokens, so each distinct value is sent once per call
            for e in entries:
                for name, value in (e.get("fields") or {}).items():
                    pre = prefix.get(name, "")
                    ck = (name, str(value), e.get("customer_ref"))
                    if ck not in cache:
                        cache[ck] = pool.submit(client.protect, text=pre + str(value), customer_ref=e.get("customer_ref"),
                                                purpose=e.get("purpose") or "Service", sink=e.get("sink"))
                    jobs.append((e, name, pre, cache[ck]))
            wait([j[3] for j in jobs], timeout=self.timeout * 2)
        finally:
            pool.shutdown(wait=False, cancel_futures=True)
        results: Dict[tuple, dict] = {}
        failed_any = False
        for e, name, pre, fut in jobs:
            key = (e["txn_id"], e["sink"])
            res = results.setdefault(key, {"txn_id": e["txn_id"], "sink": e["sink"], "fields": {}, "found": 0,
                                           "protected": 0, "raw": 0, "by_type": {}, "latency_ms": 0, "replayed": False})
            if not fut.done() or fut.exception() is not None:
                failed_any = True
                res["_partial"] = True
                continue
            d = fut.result()
            after = d.get("after", "")
            if pre and after.startswith(pre):
                after = after[len(pre):]
            res["fields"][name] = after
            fnd = d.get("findings") or []
            res["found"] += len(fnd)
            res["protected"] += len([f for f in fnd if f.get("token")])
            for f in fnd:
                res["by_type"][f.get("type", "?")] = res["by_type"].get(f.get("type", "?"), 0) + 1
        # an entry with a missing field is not complete: drop it so the whole sink goes to the outbox
        return {"results": [r for r in results.values() if not r.pop("_partial", False)], "partial": failed_any}


class _NotFound(Exception):
    pass


# ------------------------------------------------------------------ the bank
class Bank:
    def __init__(self, mode: str, get_db, db_dir: str, get_clients=None):
        self.mode = mode
        self.letter = "B" if mode == "aran" else "A"
        self.aran = mode == "aran"
        self.get_db = get_db
        self.lock = threading.RLock()
        self.gateway = AranGateway(get_clients) if self.aran else None
        self.threshold = FRAUD_THRESHOLD
        self.now = lambda: datetime.now(IST)          # tests replace this to set the hour
        self._key = self._load_key(db_dir) if self.aran else b""
        self._fernet = None
        if self.aran:
            from cryptography.fernet import Fernet
            self._fernet = Fernet(base64.urlsafe_b64encode(self._key))
        self.pools: Dict[str, list] = {}
        self.init_schema()

    # -- core encryption: Bank B keeps the account master and payees sealed at rest; the copies are Aran's job
    def _load_key(self, db_dir: str) -> bytes:
        env = os.environ.get("BANK_CORE_KEY")
        if env:
            return hashlib.sha256(env.encode()).digest()
        path = os.path.join(db_dir, "core_key_aran")
        if os.path.exists(path):
            with open(path, "rb") as f:
                return f.read()
        key = secrets.token_bytes(32)
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "wb") as f:
            f.write(key)
        return key

    def seal(self, s):
        if not self.aran or s is None or s == "" or s == "ERASED":
            return s
        return "enc:" + self._fernet.encrypt(str(s).encode()).decode()

    def unseal(self, s):
        if not isinstance(s, str) or not s.startswith("enc:"):
            return s
        try:
            return self._fernet.decrypt(s[4:].encode()).decode()
        except Exception:
            return "UNREADABLE"

    def payee_key(self, rail: str, payee: str) -> str:
        norm = f"{rail if rail == 'CARD' else 'X'}:{payee.strip().lower()}"
        if not self.aran:
            return norm
        return hmac.new(self._key, norm.encode(), hashlib.sha256).hexdigest()[:20]

    # -- schema
    def init_schema(self):
        conn = self.get_db()
        with conn:
            conn.executescript("""
            CREATE TABLE IF NOT EXISTS accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_ref TEXT UNIQUE,
                number TEXT NOT NULL UNIQUE,
                ifsc TEXT NOT NULL,
                balance_paise INTEGER NOT NULL DEFAULT 0,
                kind TEXT NOT NULL DEFAULT 'savings',
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                txn_id TEXT UNIQUE,
                idem_key TEXT UNIQUE NOT NULL,
                customer_ref TEXT NOT NULL,
                account_id INTEGER NOT NULL,
                payee TEXT NOT NULL,
                payee_ifsc TEXT,
                payee_key TEXT NOT NULL,
                rail TEXT NOT NULL,
                amount_paise INTEGER NOT NULL,
                remarks TEXT,
                notify_mobile TEXT,
                to_chat INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL,
                risk INTEGER NOT NULL DEFAULT 0,
                risk_reasons TEXT NOT NULL DEFAULT '[]',
                fail_reason TEXT,
                ts REAL NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS txn_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                txn_id TEXT NOT NULL,
                step TEXT NOT NULL,
                detail TEXT,
                at TEXT NOT NULL,
                ts REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS ledger (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                txn_id TEXT NOT NULL,
                account_id INTEGER NOT NULL,
                debit_paise INTEGER NOT NULL DEFAULT 0,
                credit_paise INTEGER NOT NULL DEFAULT 0,
                kind TEXT NOT NULL,
                at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sink_copies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                txn_id TEXT NOT NULL,
                sink TEXT NOT NULL,
                body TEXT NOT NULL,
                state TEXT NOT NULL,
                meta TEXT NOT NULL DEFAULT '{}',
                at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS outbox (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                txn_id TEXT NOT NULL,
                sink TEXT NOT NULL,
                copy_id INTEGER,
                payload TEXT NOT NULL,
                tries INTEGER NOT NULL DEFAULT 0,
                retry INTEGER NOT NULL DEFAULT 1,
                last_error TEXT,
                created_at TEXT NOT NULL,
                sent_at TEXT
            );
            CREATE INDEX IF NOT EXISTS ix_txn_cust ON transactions(customer_ref, ts);
            CREATE INDEX IF NOT EXISTS ix_ledger_txn ON ledger(txn_id);
            CREATE INDEX IF NOT EXISTS ix_copy_txn ON sink_copies(txn_id);
            """)
            for rail in RAILS:   # one settlement account per rail, plus the account the opening balances come from
                self._internal(conn, f"SETTLE-{rail}", "settlement")
            self._internal(conn, "OPENING-FUNDS", "equity")
        conn.close()

    def _stamp(self) -> str:
        return self.now().strftime("%Y-%m-%d %H:%M:%S")

    def _internal(self, conn, number: str, kind: str) -> int:
        row = conn.execute("SELECT id FROM accounts WHERE number=?", (number,)).fetchone()
        if row:
            return row["id"]
        cur = conn.execute(
            "INSERT INTO accounts (customer_ref, number, ifsc, balance_paise, kind, created_at) VALUES (NULL,?,?,0,?,?)",
            (number, f"ARN{self.letter}0000000", kind, self._stamp()))
        return cur.lastrowid

    # -- accounts
    def open_account(self, conn, customer_ref: str, opening_paise: Optional[int] = None) -> dict:
        """Create the savings account of a customer (idempotent). Call inside the caller's transaction."""
        row = conn.execute("SELECT * FROM accounts WHERE customer_ref=?", (customer_ref,)).fetchone()
        if row:
            return self._acct_view(row)
        prefix = "6020" if self.aran else "5010"
        number = prefix + "".join(str(secrets.randbelow(10)) for _ in range(10))
        if opening_paise is None:
            opening_paise = (100_000 + secrets.randbelow(900_000)) * 100   # Rs 1,00,000 to Rs 10,00,000
        cur = conn.execute(
            "INSERT INTO accounts (customer_ref, number, ifsc, balance_paise, kind, created_at) VALUES (?,?,?,0,'savings',?)",
            (customer_ref, self.seal(number), f"ARN{self.letter}0001234", self._stamp()))
        self._move(conn, f"OPEN-{cur.lastrowid:06d}", self._internal(conn, "OPENING-FUNDS", "equity"), cur.lastrowid,
                   opening_paise, "opening")
        return self._acct_view(conn.execute("SELECT * FROM accounts WHERE id=?", (cur.lastrowid,)).fetchone())

    def _acct_view(self, r) -> dict:
        return {"id": r["id"], "customer_ref": r["customer_ref"], "number": self.unseal(r["number"]), "ifsc": r["ifsc"],
                "balance_paise": r["balance_paise"], "kind": r["kind"]}

    def ensure_accounts(self):
        conn = self.get_db()
        with self.lock, conn:
            for c in conn.execute("SELECT customer_ref FROM customers").fetchall():
                self.open_account(conn, c["customer_ref"])
        conn.close()

    def deposit(self, conn, customer_ref: str, paise: int) -> None:
        a = conn.execute("SELECT id FROM accounts WHERE customer_ref=?", (customer_ref,)).fetchone()
        self._move(conn, f"DEP-{uuid.uuid4().hex[:8].upper()}", self._internal(conn, "OPENING-FUNDS", "equity"), a["id"],
                   paise, "deposit")

    # -- the one place money moves: a debit line and a credit line of the same amount
    def _move(self, conn, txn_id: str, debit_acct: int, credit_acct: int, paise: int, kind: str):
        at = self._stamp()
        conn.execute("INSERT INTO ledger (txn_id, account_id, debit_paise, credit_paise, kind, at) VALUES (?,?,?,0,?,?)",
                     (txn_id, debit_acct, paise, kind, at))
        conn.execute("INSERT INTO ledger (txn_id, account_id, debit_paise, credit_paise, kind, at) VALUES (?,?,0,?,?,?)",
                     (txn_id, credit_acct, paise, kind, at))
        conn.execute("UPDATE accounts SET balance_paise = balance_paise - ? WHERE id=?", (paise, debit_acct))
        conn.execute("UPDATE accounts SET balance_paise = balance_paise + ? WHERE id=?", (paise, credit_acct))

    def ledger_check(self) -> dict:
        conn = self.get_db()
        t = conn.execute("SELECT COALESCE(SUM(debit_paise),0) d, COALESCE(SUM(credit_paise),0) c, COUNT(*) n FROM ledger").fetchone()
        bad = []
        for a in conn.execute("SELECT a.id, a.number, a.kind, a.balance_paise b, "
                              "COALESCE((SELECT SUM(credit_paise)-SUM(debit_paise) FROM ledger WHERE account_id=a.id),0) l "
                              "FROM accounts a").fetchall():
            if a["b"] != a["l"]:
                bad.append({"account_id": a["id"], "kind": a["kind"], "balance_paise": a["b"], "ledger_paise": a["l"]})
        sett = [{"rail": r["number"].replace("SETTLE-", ""), "balance_paise": r["balance_paise"]}
                for r in conn.execute("SELECT number, balance_paise FROM accounts WHERE kind='settlement' ORDER BY id").fetchall()]
        conn.close()
        s = t["d"] - t["c"]
        return {"sum": s, "sum_paise": s, "balanced": s == 0 and not bad, "debit_paise": t["d"], "credit_paise": t["c"],
                "entries": t["n"], "balances_match_ledger": not bad, "mismatches": bad, "settlement": sett}

    # -- events and views
    def _event(self, conn, txn_id: str, step: str, detail: str = ""):
        now = self.now()
        conn.execute("INSERT INTO txn_events (txn_id, step, detail, at, ts) VALUES (?,?,?,?,?)",
                     (txn_id, step, detail, now.strftime("%H:%M:%S"), now.timestamp()))

    def _view(self, conn, r) -> dict:
        acct = conn.execute("SELECT number, ifsc FROM accounts WHERE id=?", (r["account_id"],)).fetchone()
        return {
            "txn_id": r["txn_id"], "idem_key": r["idem_key"], "customer_ref": r["customer_ref"], "rail": r["rail"],
            "amount_paise": r["amount_paise"], "payer_account": self.unseal(acct["number"]) if acct else None,
            "payer_ifsc": acct["ifsc"] if acct else None, "payee": self.unseal(r["payee"]), "payee_ifsc": r["payee_ifsc"],
            "remarks": self.unseal(r["remarks"]) or "", "status": r["status"], "risk": r["risk"],
            "risk_reasons": json.loads(r["risk_reasons"] or "[]"), "fail_reason": r["fail_reason"],
            "to_support_chat": bool(r["to_chat"]), "created_at": r["created_at"], "updated_at": r["updated_at"],
        }

    def timeline(self, conn, txn_id: str) -> List[dict]:
        return [{"step": e["step"], "detail": e["detail"], "at": e["at"]}
                for e in conn.execute("SELECT * FROM txn_events WHERE txn_id=? ORDER BY id", (txn_id,)).fetchall()]

    # -- validation
    def validate(self, p: dict) -> dict:
        rail = (p.get("rail") or "").upper()
        if rail not in RAILS:
            raise HTTPException(422, f"rail must be one of {', '.join(RAILS)}")
        payee = re.sub(r"\s+", "", str(p.get("payee") or "")) if rail != "UPI" else str(p.get("payee") or "").strip()
        ifsc = (p.get("ifsc") or "").strip().upper() or None
        if rail == "UPI":
            if not VPA_RE.match(payee):
                raise HTTPException(422, "UPI payee must look like name@bank")
            ifsc = None
        elif rail == "CARD":
            if not (len(payee) == 16 and payee.isdigit() and luhn_ok(payee)):
                raise HTTPException(422, "card must be 16 digits and pass the Luhn check")
            ifsc = None
        else:
            if not ACCT_RE.match(payee):
                raise HTTPException(422, "payee account must be 9 to 18 digits")
            if not ifsc or not IFSC_RE.match(ifsc):
                raise HTTPException(422, "IFSC must look like ABCD0123456")
        amt = p.get("amount_paise")
        if amt is None and p.get("amount") is not None:
            amt = parse_rupees(p["amount"])
        if amt is None or isinstance(amt, bool) or not isinstance(amt, int):
            raise HTTPException(422, "amount_paise (integer paise) or amount (rupees) is required")
        if amt <= 0:
            raise HTTPException(422, "amount must be more than zero")
        if amt > MAX_AMOUNT:
            raise HTTPException(422, "amount is above the demo cap of Rs 1 crore")
        remarks = (p.get("remarks") or "").strip()[:200]
        mob = re.sub(r"\D", "", p.get("notify_mobile") or "") or None
        if mob and not re.match(r"^[6-9]\d{9}$", mob):
            raise HTTPException(422, "notify_mobile must be a 10-digit mobile number")
        return {"rail": rail, "payee": payee, "ifsc": ifsc, "amount_paise": amt, "remarks": remarks, "mobile": mob}

    # -- the payment itself: money first, copies after
    def pay(self, p: dict) -> dict:
        """Runs the payment to success, held or failed. Returns {'txn': view, 'new': bool}. Never calls Aran."""
        key = (p.get("idem_key") or "").strip()
        if not key:
            raise HTTPException(400, "Idempotency-Key header (or idem_key in the body) is required")
        if len(key) > 128:
            raise HTTPException(400, "Idempotency-Key is longer than 128 characters")
        conn = self.get_db()
        try:
            with self.lock:
                old = conn.execute("SELECT * FROM transactions WHERE idem_key=?", (key,)).fetchone()
                if old:
                    return {"txn": self._view(conn, old), "new": False}
                v = self.validate(p)
                acct = None
                if p.get("customer_ref"):
                    acct = conn.execute("SELECT * FROM accounts WHERE customer_ref=?", (p["customer_ref"],)).fetchone()
                if not acct:
                    raise HTTPException(404, "No account for that customer")
                now = self.now()
                with conn:
                    cur = conn.execute(
                        "INSERT INTO transactions (idem_key, customer_ref, account_id, payee, payee_ifsc, payee_key, rail, amount_paise,"
                        " remarks, notify_mobile, to_chat, status, ts, created_at, updated_at, txn_id)"
                        " VALUES (?,?,?,?,?,?,?,?,?,?,?,'initiated',?,?,?,?)",
                        (key, acct["customer_ref"], acct["id"], self.seal(v["payee"]), v["ifsc"], self.payee_key(v["rail"], v["payee"]),
                         v["rail"], v["amount_paise"], self.seal(v["remarks"]), self.seal(v["mobile"]),
                         1 if p.get("to_support_chat") else 0, now.timestamp(), self._stamp(), self._stamp(), f"PENDING-{key}"))
                    txn_id = f"TXN-{self.letter}-{cur.lastrowid:06d}"
                    conn.execute("UPDATE transactions SET txn_id=? WHERE id=?", (txn_id, cur.lastrowid))
                    self._event(conn, txn_id, "initiated", f"{v['rail']} {fmt_inr(v['amount_paise'])}")
                    self._authorise(conn, txn_id, acct, v)
                row = conn.execute("SELECT * FROM transactions WHERE txn_id=?", (txn_id,)).fetchone()
                return {"txn": self._view(conn, row), "new": True}
        finally:
            conn.close()

    def _set(self, conn, txn_id: str, status: str, reason: Optional[str] = None, risk=None, reasons=None):
        sets, args = ["status=?", "updated_at=?"], [status, self._stamp()]
        if reason is not None:
            sets.append("fail_reason=?"); args.append(reason)
        if risk is not None:
            sets.append("risk=?"); args.append(risk)
        if reasons is not None:
            sets.append("risk_reasons=?"); args.append(json.dumps(reasons))
        conn.execute(f"UPDATE transactions SET {', '.join(sets)} WHERE txn_id=?", args + [txn_id])

    def _authorise(self, conn, txn_id: str, acct, v: dict):
        rail, amt = v["rail"], v["amount_paise"]
        spec = RAILS[rail]
        fresh = conn.execute("SELECT balance_paise FROM accounts WHERE id=?", (acct["id"],)).fetchone()
        why = None
        if spec["max"] is not None and amt > spec["max"]:
            why = f"{rail} limit is {fmt_inr(spec['max'])} per payment"
        elif amt < spec["min"]:
            why = f"{rail} needs at least {fmt_inr(spec['min'])}"
        elif amt > fresh["balance_paise"]:
            why = f"Insufficient balance ({fmt_inr(fresh['balance_paise'])} available)"
        if why:
            self._set(conn, txn_id, "failed", why)
            self._event(conn, txn_id, "failed", why)
            return
        self._set(conn, txn_id, "authorised")
        self._event(conn, txn_id, "authorised", "balance and limit checks passed")
        score, reasons = self.score(conn, acct["customer_ref"], rail, self.payee_key(rail, v["payee"]), amt, txn_id)
        self._set(conn, txn_id, "authorised", risk=score, reasons=reasons)
        if score >= self.threshold:
            self._set(conn, txn_id, "held")
            self._event(conn, txn_id, "held", f"fraud score {score} (threshold {self.threshold}): " + ", ".join(reasons))
            return
        self._settle(conn, txn_id, acct["id"], rail, amt)

    def _settle(self, conn, txn_id: str, acct_id: int, rail: str, amt: int):
        bal = conn.execute("SELECT balance_paise FROM accounts WHERE id=?", (acct_id,)).fetchone()["balance_paise"]
        if amt > bal:
            self._set(conn, txn_id, "failed", f"Insufficient balance ({fmt_inr(bal)} available)")
            self._event(conn, txn_id, "failed", "balance changed while the payment was held")
            return
        settle = self._internal(conn, f"SETTLE-{rail}", "settlement")
        self._move(conn, txn_id, acct_id, settle, amt, "payment")
        self._set(conn, txn_id, "success")
        self._event(conn, txn_id, "success", f"debit customer, credit SETTLE-{rail}: {fmt_inr(amt)}")

    def score(self, conn, customer_ref: str, rail: str, pkey: str, amt: int, txn_id: str):
        reasons, s = [], 0
        seen = conn.execute("SELECT 1 FROM transactions WHERE customer_ref=? AND payee_key=? AND txn_id<>? "
                            "AND status IN ('success','reversed') LIMIT 1", (customer_ref, pkey, txn_id)).fetchone()
        if not seen:
            s += RULE_NEW_PAYEE; reasons.append("new payee")
        h = self.now().hour
        if h >= 23 or h < 5:
            s += RULE_ODD_HOUR; reasons.append("odd hour (23:00 to 05:00)")
        if amt > FRAUD_AMOUNT:
            s += RULE_LARGE; reasons.append("amount above Rs 50,000")
        recent = conn.execute("SELECT COUNT(*) FROM transactions WHERE customer_ref=? AND ts>=? AND txn_id<>? "
                              "AND status IN ('success','reversed')",
                              (customer_ref, self.now().timestamp() - 600, txn_id)).fetchone()[0]
        if recent >= 6:
            s += RULE_BURST; reasons.append(f"many payments in 10 minutes ({recent + 1})")
        return s, reasons

    # -- fraud desk decisions
    def decide(self, txn_id: str, approve: bool) -> dict:
        conn = self.get_db()
        try:
            with self.lock, conn:
                r = conn.execute("SELECT * FROM transactions WHERE txn_id=?", (txn_id,)).fetchone()
                if not r:
                    raise HTTPException(404, "No such transaction")
                if r["status"] != "held":
                    raise HTTPException(409, f"Transaction is {r['status']}, not held")
                if approve:
                    self._event(conn, txn_id, "approved", "fraud desk approved")
                    self._settle(conn, txn_id, r["account_id"], r["rail"], r["amount_paise"])
                else:
                    self._set(conn, txn_id, "failed", "declined by the fraud desk")
                    self._event(conn, txn_id, "declined", "fraud desk declined")
                row = conn.execute("SELECT * FROM transactions WHERE txn_id=?", (txn_id,)).fetchone()
                self._mark_fraud_row(conn, txn_id, row["status"])
                self._plain_log(conn, txn_id, f"{txn_id} fraud desk decision: {row['status']}")
                return self._view(conn, row)
        finally:
            conn.close()

    def reverse(self, txn_id: str, reason: str = "") -> dict:
        conn = self.get_db()
        try:
            with self.lock, conn:
                r = conn.execute("SELECT * FROM transactions WHERE txn_id=?", (txn_id,)).fetchone()
                if not r:
                    raise HTTPException(404, "No such transaction")
                if r["status"] != "success":
                    raise HTTPException(409, f"Only a successful payment can be reversed (this one is {r['status']})")
                settle = self._internal(conn, f"SETTLE-{r['rail']}", "settlement")
                self._move(conn, txn_id, settle, r["account_id"], r["amount_paise"], "reversal")
                self._set(conn, txn_id, "reversed", reason.strip()[:120] or None)
                self._event(conn, txn_id, "reversed", f"credit back {fmt_inr(r['amount_paise'])}" + (f": {reason.strip()[:120]}" if reason.strip() else ""))
                self._mark_fraud_row(conn, txn_id, "reversed")
                self._plain_log(conn, txn_id, f"{txn_id} reversed")
                return self._view(conn, conn.execute("SELECT * FROM transactions WHERE txn_id=?", (txn_id,)).fetchone())
        finally:
            conn.close()

    # -- copies
    def _plain_log(self, conn, txn_id: str, line: str):
        """A log line with no identifier in it (a decision, a reversal): written the same way in both banks."""
        conn.execute("INSERT INTO sink_copies (txn_id, sink, body, state, meta, at) VALUES (?,?,?,?,?,?)",
                     (txn_id, "txn-log", json.dumps({"line": line}), "plain", "{}", self._stamp()))

    def _mark_fraud_row(self, conn, txn_id: str, status: str):
        for c in conn.execute("SELECT id, body FROM sink_copies WHERE txn_id=? AND sink='fraud-desk'", (txn_id,)).fetchall():
            b = json.loads(c["body"]); b["status"] = status
            conn.execute("UPDATE sink_copies SET body=? WHERE id=?", (json.dumps(b), c["id"]))

    def _raw_for(self, conn, r) -> dict:
        """The real values of one payment, read from the core (unsealed in memory only)."""
        acct = conn.execute("SELECT number FROM accounts WHERE id=?", (r["account_id"],)).fetchone()
        cust = conn.execute("SELECT mobile FROM customers WHERE customer_ref=?", (r["customer_ref"],)).fetchone()
        payee = self.unseal(r["payee"])
        raw = {"payer_account": self.unseal(acct["number"]),
               ("card" if r["rail"] == "CARD" else "payee"): payee,
               "remarks": self.unseal(r["remarks"]) or "",
               "mobile": self.unseal(r["notify_mobile"]) or ""}
        stored_mobile = cust["mobile"] if cust else ""
        if not self.aran and not raw["mobile"]:
            raw["mobile"] = stored_mobile
        return {"raw": raw, "stored_mobile": stored_mobile}

    def _entries(self, r, raw: dict) -> List[dict]:
        out = []
        for sink in SINKS:
            if sink == "support-chat" and not r["to_chat"]:
                continue
            fields = {}
            for name in SINK_FIELDS[sink]:
                key = "card" if (name == "payee" and r["rail"] == "CARD") else name
                if raw.get(key):
                    fields[key] = raw[key]
            if sink == "sms" and not fields.get("mobile"):
                pass
            out.append({"txn_id": r["txn_id"], "rail": r["rail"], "sink": sink, "purpose": "Service",
                        "customer_ref": r["customer_ref"], "amount_paise": r["amount_paise"], "fields": fields})
        return out

    def _compose(self, sink: str, r, v: dict, stored_mobile: str) -> dict:
        """The stored shape of one copy, built from the field values (raw in Bank A, protected or masked in Bank B)."""
        pay = v.get("card") if r["rail"] == "CARD" else v.get("payee")
        pk = "card" if r["rail"] == "CARD" else "payee"
        amt = fmt_inr(r["amount_paise"])
        if sink == "txn-log":
            line = (f"{r['txn_id']} {r['rail']} {amt} {r['status'].upper()} from a/c {v.get('payer_account', '')} to {pay or ''}"
                    + (f" ifsc={r['payee_ifsc']}" if r["payee_ifsc"] else "") + (f' remarks="{v["remarks"]}"' if v.get("remarks") else ""))
            b = {"payer_account": v.get("payer_account"), pk: pay}
            if v.get("remarks"):
                b["remarks"] = v["remarks"]
            b["line"] = line
            return b
        if sink == "fraud-desk":
            return {"payer_account": v.get("payer_account"), pk: pay, "amount_paise": r["amount_paise"], "rail": r["rail"],
                    "score": r["risk"], "reasons": json.loads(r["risk_reasons"] or "[]"), "status": r["status"]}
        if sink == "analytics":
            return {"day": r["created_at"][:10], "rail": r["rail"], "amount_paise": r["amount_paise"],
                    "payer_account": v.get("payer_account"), pk: pay, "status": r["status"]}
        if sink == "sms":
            to = v.get("mobile") or stored_mobile
            return {"to": to, "text": f"{amt} {'debited from' if r['status'] != 'failed' else 'NOT debited from'} a/c "
                                     f"{v.get('payer_account', '')} via {r['rail']} to {pay or ''}. Ref {r['txn_id']}"}
        b = {pk: pay} if pay else {}
        b["remarks"] = v.get("remarks", "")
        return b

    def emit_copies(self, txn_id: str) -> dict:
        """Writes the copies of a payment. Bank A: raw. Bank B: through Aran, else masked + outbox. Never raises."""
        conn = self.get_db()
        try:
            r = conn.execute("SELECT * FROM transactions WHERE txn_id=?", (txn_id,)).fetchone()
            if not r:
                return {}
            info = self._raw_for(conn, r)
            raw, smob = info["raw"], info["stored_mobile"]
            entries = self._entries(r, raw)
            results, err, took = {}, "", 0
            if self.aran:
                t0 = time.time()
                try:
                    results = self.gateway.protect(entries)
                except AranDown as e:
                    err = str(e)
                took = int((time.time() - t0) * 1000)
            sweep_set = set(v for v in (raw.get("payer_account"), raw.get("payee"), raw.get("card"), raw.get("mobile")) if v)
            sweep_set |= set(raw_identifiers(raw.get("remarks", "")))
            summary = {"sinks": {}, "aran_ms": took, "error": err}
            with self.lock, conn:
                for e in entries:
                    sink = e["sink"]
                    res = results.get((txn_id, sink))
                    meta, state = {}, "raw"
                    if not self.aran:
                        vals = dict(raw)
                    elif res is not None and all(k in (res.get("fields") or {}) for k in e["fields"]):
                        got = {k: str(res["fields"][k]) for k in e["fields"]}
                        vals = {k: self._sweep(x, sweep_set) for k, x in got.items()}
                        state = "protected" if vals == got else "guarded"   # guarded: Aran left a real value, the bank masked it
                        meta = {k: res.get(k) for k in ("found", "protected", "raw", "by_type", "latency_ms", "replayed")}
                        meta["via"] = self.gateway.mode_seen or "batch"
                    else:
                        vals = {k: mask_text(x) for k, x in e["fields"].items()}
                        state = "masked"
                    body = self._compose(sink, r, vals, smob)
                    if state == "masked":
                        body = {k: mask_text(x) if isinstance(x, str) else x for k, x in body.items()}
                    cur = conn.execute("INSERT INTO sink_copies (txn_id, sink, body, state, meta, at) VALUES (?,?,?,?,?,?)",
                                       (txn_id, sink, json.dumps(body), state, json.dumps(meta), self._stamp()))
                    if state == "masked":
                        conn.execute("INSERT INTO outbox (txn_id, sink, copy_id, payload, tries, retry, last_error, created_at)"
                                     " VALUES (?,?,?,?,0,1,?,?)", (txn_id, sink, cur.lastrowid, json.dumps(body), err[:200], self._stamp()))
                    summary["sinks"][sink] = state
                done = [s for s, st in summary["sinks"].items() if st != "masked"]
                held = [s for s, st in summary["sinks"].items() if st == "masked"]
                self._event(conn, txn_id, "copies",
                            ("written raw: " if not self.aran else "protected by Aran: ") + (", ".join(done) or "none")
                            + (f"; masked and queued in the outbox: {', '.join(held)}" if held else ""))
            return summary
        except Exception as err:   # a copy problem must never turn into a payment problem
            return {"sinks": {}, "error": f"{err.__class__.__name__}: {err}"}
        finally:
            conn.close()

    @staticmethod
    def _sweep(text: str, raws) -> str:   # returns the text unchanged when nothing real is left in it
        """Last guard in Bank B: if a real value is still in a protected copy, mask it."""
        for rv in sorted(raws, key=len, reverse=True):
            if rv and rv in text:
                text = text.replace(rv, mask_text(rv) if (rv.isdigit() or "@" in rv or PAN_RE.fullmatch(rv)) else "X" * len(rv))
        return text

    def flush_outbox(self, limit: int = 100) -> dict:
        """Retry the copies that were stored masked. Rebuilds the real values from the core (sealed at rest), sends them
        through Aran and replaces the masked copy with the protected one."""
        if not self.aran:
            return {"attempted": 0, "sent": 0, "pending": 0, "error": "Bank A has no Aran, so there is no outbox"}
        conn = self.get_db()
        try:
            rows = conn.execute("SELECT * FROM outbox WHERE retry=1 ORDER BY id LIMIT ?", (limit,)).fetchall()
            sent, skipped, err = 0, 0, ""
            todo = []
            for o in rows:
                r = conn.execute("SELECT * FROM transactions WHERE txn_id=?", (o["txn_id"],)).fetchone()
                info = self._raw_for(conn, r) if r else None
                if not r or any(v == "ERASED" for v in info["raw"].values()):
                    with conn:
                        conn.execute("UPDATE outbox SET retry=0, last_error='customer erased, nothing to send' WHERE id=?", (o["id"],))
                    skipped += 1
                    continue
                ent = [e for e in self._entries(r, info["raw"]) if e["sink"] == o["sink"]]
                if ent:
                    todo.append((o, r, info, ent[0]))
            results = {}
            if todo:
                try:
                    results = self.gateway.protect([t[3] for t in todo], force=True)
                except AranDown as e:
                    err = str(e)
            with self.lock, conn:
                for o, r, info, ent in todo:
                    res = results.get((o["txn_id"], o["sink"]))
                    if res is None or not all(k in (res.get("fields") or {}) for k in ent["fields"]):
                        conn.execute("UPDATE outbox SET tries=tries+1, last_error=? WHERE id=?", ((err or "no result for this copy")[:200], o["id"]))
                        continue
                    raw = info["raw"]
                    sw = set(v for v in (raw.get("payer_account"), raw.get("payee"), raw.get("card"), raw.get("mobile")) if v)
                    sw |= set(raw_identifiers(raw.get("remarks", "")))
                    got = {k: str(res["fields"][k]) for k in ent["fields"]}
                    vals = {k: self._sweep(x, sw) for k, x in got.items()}
                    body = self._compose(o["sink"], r, vals, info["stored_mobile"])
                    meta = {k: res.get(k) for k in ("found", "protected", "raw", "by_type", "latency_ms", "replayed")}
                    meta["via"] = self.gateway.mode_seen or "batch"; meta["from_outbox"] = True
                    conn.execute("UPDATE sink_copies SET body=?, state=?, meta=? WHERE id=?",
                                 (json.dumps(body), "protected" if vals == got else "guarded", json.dumps(meta), o["copy_id"]))
                    conn.execute("UPDATE outbox SET retry=0, tries=tries+1, last_error=NULL, sent_at=?, payload=? WHERE id=?",
                                 (self._stamp(), json.dumps(body), o["id"]))
                    self._event(conn, o["txn_id"], "outbox", f"{o['sink']} copy sent through Aran after a retry")
                    sent += 1
            pending = conn.execute("SELECT COUNT(*) FROM outbox WHERE retry=1").fetchone()[0]
            return {"attempted": len(todo), "sent": sent, "skipped": skipped, "pending": pending, "error": err}
        finally:
            conn.close()

    # -- reading
    def list_txns(self, customer_ref=None, rail=None, status=None, q=None, limit=50, offset=0) -> dict:
        where, args = [], []
        for col, val in (("customer_ref", customer_ref), ("rail", rail.upper() if rail else None), ("status", status)):
            if val:
                where.append(f"{col}=?"); args.append(val)
        if q:
            where.append("txn_id LIKE ?"); args.append(f"%{q.strip()}%")
        w = (" WHERE " + " AND ".join(where)) if where else ""
        conn = self.get_db()
        total = conn.execute(f"SELECT COUNT(*) FROM transactions{w}", args).fetchone()[0]
        rows = conn.execute(f"SELECT * FROM transactions{w} ORDER BY id DESC LIMIT ? OFFSET ?", args + [limit, offset]).fetchall()
        items = [self._view(conn, r) for r in rows]
        conn.close()
        return {"total": total, "items": items}

    def txn_detail(self, txn_id: str) -> dict:
        conn = self.get_db()
        r = conn.execute("SELECT * FROM transactions WHERE txn_id=?", (txn_id,)).fetchone()
        if not r:
            conn.close()
            raise HTTPException(404, "No such transaction")
        d = self._view(conn, r)
        d["timeline"] = self.timeline(conn, txn_id)
        d["ledger"] = self.ledger_rows(conn, txn_id)
        d["copies"] = self.copies(conn, txn_id)
        conn.close()
        return d

    def ledger_rows(self, conn, txn_id: Optional[str] = None, limit: int = 100) -> List[dict]:
        sql = ("SELECT l.id, l.txn_id, l.debit_paise, l.credit_paise, l.kind, l.at, a.kind akind, a.number anum, a.customer_ref cref "
               "FROM ledger l JOIN accounts a ON a.id=l.account_id")
        rows = conn.execute(sql + (" WHERE l.txn_id=?" if txn_id else "") + " ORDER BY l.id DESC LIMIT ?",
                            ([txn_id] if txn_id else []) + [limit]).fetchall()
        out = []
        for l in rows:
            if l["akind"] == "savings":
                num = self.unseal(l["anum"]) or ""
                label = f"{l['cref']} (a/c ...{num[-4:]})" if num and not num.startswith("ERASED") else f"{l['cref']} (erased)"
            else:
                label = l["anum"]
            out.append({"id": l["id"], "txn_id": l["txn_id"], "account": label, "debit_paise": l["debit_paise"],
                        "credit_paise": l["credit_paise"], "kind": l["kind"], "at": l["at"]})
        return out

    def copies(self, conn, txn_id: Optional[str] = None, sink: Optional[str] = None, limit: int = 200) -> List[dict]:
        where, args = [], []
        if txn_id:
            where.append("txn_id=?"); args.append(txn_id)
        if sink:
            where.append("sink=?"); args.append(sink)
        w = (" WHERE " + " AND ".join(where)) if where else ""
        rows = conn.execute(f"SELECT * FROM sink_copies{w} ORDER BY id DESC LIMIT ?" if not txn_id else f"SELECT * FROM sink_copies{w} ORDER BY id",
                            args + ([limit] if not txn_id else [])).fetchall()
        return [{"id": c["id"], "txn_id": c["txn_id"], "sink": c["sink"], "label": SINK_LABEL.get(c["sink"], c["sink"]),
                 "state": c["state"], "fields": json.loads(c["body"]), "meta": json.loads(c["meta"] or "{}"), "at": c["at"]} for c in rows]

    def fraud_queue(self) -> dict:
        conn = self.get_db()
        seen: Dict[str, int] = {}   # how often each payee text is on the desk: equal tokens are the same payee
        for c in conn.execute("SELECT body FROM sink_copies WHERE sink='fraud-desk'").fetchall():
            b = json.loads(c["body"])
            k = b.get("card") or b.get("payee")
            if k:
                seen[k] = seen.get(k, 0) + 1

        def row(r):
            v = self._view(conn, r)
            fd = conn.execute("SELECT body, state FROM sink_copies WHERE txn_id=? AND sink='fraud-desk' ORDER BY id DESC LIMIT 1",
                              (r["txn_id"],)).fetchone()
            shown = json.loads(fd["body"]) if fd else {}
            payer = shown.get("payer_account") or mask_text(v["payer_account"])
            payee = shown.get("card") or shown.get("payee") or mask_text(v["payee"])
            if self.aran:   # the desk of Bank B only has what Aran returned (or masked): never the core values
                v = {k: v[k] for k in ("txn_id", "customer_ref", "rail", "amount_paise", "status", "risk", "risk_reasons", "created_at", "fail_reason")}
            repeats = seen.get(payee, 0)
            v.update({"desk_payer": payer, "desk_payee": payee, "desk_state": fd["state"] if fd else "none", "payee_seen": repeats})
            return v
        held = [row(r) for r in conn.execute("SELECT * FROM transactions WHERE status='held' ORDER BY id").fetchall()]
        decided = [row(r) for r in conn.execute("SELECT t.* FROM transactions t WHERE EXISTS "
                   "(SELECT 1 FROM txn_events e WHERE e.txn_id=t.txn_id AND e.step IN ('approved','declined')) ORDER BY t.id DESC LIMIT 20").fetchall()]
        conn.close()
        return {"threshold": self.threshold, "count": len(held), "items": held, "decided": decided,
                "bank_mode": self.mode, "shows": "tokens (repeats are still counted)" if self.aran else "real payer and payee"}

    def outbox_rows(self, limit: int = 100) -> dict:
        conn = self.get_db()
        rows = conn.execute("SELECT * FROM outbox ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
        pending = conn.execute("SELECT COUNT(*) FROM outbox WHERE retry=1").fetchone()[0]
        conn.close()
        return {"pending": pending, "items": [{"id": o["id"], "txn_id": o["txn_id"], "sink": o["sink"], "tries": o["tries"],
                "retry": bool(o["retry"]), "last_error": o["last_error"], "payload": json.loads(o["payload"]),
                "created_at": o["created_at"], "sent_at": o["sent_at"]} for o in rows],
                "circuit_open": bool(self.gateway and self.gateway.breaker_open()),
                "aran_error": self.gateway.last_error if self.gateway else ""}

    def stats(self) -> dict:
        conn = self.get_db()
        by_status = {r["status"]: r["n"] for r in conn.execute("SELECT status, COUNT(*) n FROM transactions GROUP BY status")}
        by_rail = {r["rail"]: r["n"] for r in conn.execute("SELECT rail, COUNT(*) n FROM transactions GROUP BY rail")}
        vol = conn.execute("SELECT COALESCE(SUM(amount_paise),0) FROM transactions WHERE status='success'").fetchone()[0]
        copies = {r["state"]: r["n"] for r in conn.execute("SELECT state, COUNT(*) n FROM sink_copies GROUP BY state")}
        pend = conn.execute("SELECT COUNT(*) FROM outbox WHERE retry=1").fetchone()[0]
        total = conn.execute("SELECT COUNT(*) FROM transactions").fetchone()[0]
        accts = conn.execute("SELECT COUNT(*) FROM accounts WHERE kind='savings'").fetchone()[0]
        conn.close()
        return {"bank_mode": self.mode, "transactions": total, "accounts": accts, "by_status": by_status, "by_rail": by_rail,
                "success_volume_paise": vol, "held": by_status.get("held", 0), "copies": copies, "outbox_pending": pend,
                "ledger": self.ledger_check(), "aran_circuit_open": bool(self.gateway and self.gateway.breaker_open()),
                "fraud_threshold": self.threshold}

    # -- breach dump (core tables and every copy), as an attacker with the database file would read them
    def dump_lines(self) -> List[str]:
        conn = self.get_db()
        L = []
        def cut(x):
            x = "" if x is None else str(x)
            return x if len(x) <= 44 else x[:40] + "…"
        L += ["", "=== TABLE: accounts ==="]
        for a in conn.execute("SELECT * FROM accounts WHERE kind='savings' ORDER BY id").fetchall():
            L.append(f"ACCOUNT: {a['customer_ref']} | NUMBER: {cut(a['number'])} | IFSC: {a['ifsc']} | BALANCE_PAISE: {a['balance_paise']}")
        L += ["", "=== TABLE: transactions ==="]
        for t in conn.execute("SELECT * FROM transactions ORDER BY id").fetchall():
            L.append(f"[{t['created_at']}] {t['txn_id']} {t['rail']} {t['amount_paise']}p {t['status']} | CUSTOMER: {t['customer_ref']} | "
                     f"PAYEE: {cut(t['payee'])} {t['payee_ifsc'] or ''} | REMARKS: {cut(t['remarks'])}")
        L += ["", "=== TABLE: ledger ==="]
        for l in conn.execute("SELECT * FROM ledger ORDER BY id").fetchall():
            L.append(f"{l['txn_id']} acct#{l['account_id']} debit={l['debit_paise']} credit={l['credit_paise']} {l['kind']}")
        L += ["", "=== TABLE: sink_copies ==="]
        for c in conn.execute("SELECT * FROM sink_copies ORDER BY id").fetchall():
            L.append(f"[{c['at']}] {c['txn_id']} {c['sink']} ({c['state']}): {c['body']}")
        L += ["", "=== TABLE: outbox ==="]
        for o in conn.execute("SELECT * FROM outbox ORDER BY id").fetchall():
            L.append(f"{o['txn_id']} {o['sink']} retry={o['retry']} tries={o['tries']}: {o['payload']}")
        counts = {"account_count": conn.execute("SELECT COUNT(*) FROM accounts WHERE kind='savings'").fetchone()[0],
                  "transaction_count": conn.execute("SELECT COUNT(*) FROM transactions").fetchone()[0],
                  "sink_copy_count": conn.execute("SELECT COUNT(*) FROM sink_copies").fetchone()[0],
                  "outbox_count": conn.execute("SELECT COUNT(*) FROM outbox").fetchone()[0]}
        conn.close()
        return L, counts

    # -- erasure side effects (Bank B)
    def after_erase(self, customer_ref: str) -> dict:
        """Keep the amounts, drop the identifiers. Account number and payee details become ERASED in the core;
        the copies keep their tokens, which Aran can no longer turn back into numbers."""
        conn = self.get_db()
        with self.lock, conn:
            n_acct = 0
            a = conn.execute("SELECT id, number FROM accounts WHERE customer_ref=?", (customer_ref,)).fetchone()
            if a:
                conn.execute("UPDATE accounts SET number=? WHERE id=?", (f"ERASED-{a['id']}", a["id"]))
                n_acct = 1
            n_tx = conn.execute("UPDATE transactions SET payee='ERASED', remarks='ERASED', notify_mobile=NULL WHERE customer_ref=?",
                                (customer_ref,)).rowcount
            sums = conn.execute("SELECT COUNT(*) n, COALESCE(SUM(amount_paise),0) s FROM transactions WHERE customer_ref=? AND status IN ('success','reversed')",
                                (customer_ref,)).fetchone()
            copies = [c for c in conn.execute("SELECT c.body FROM sink_copies c JOIN transactions t ON t.txn_id=c.txn_id WHERE t.customer_ref=?",
                                              (customer_ref,)).fetchall()]
        conn.close()
        toks = set()
        for c in copies:
            for v in json.loads(c["body"]).values():
                if isinstance(v, str):
                    toks |= set(re.findall(r"<[A-Za-z0-9_:\-]+>", v)) | set(re.findall(r"(?<!\d)\d{12,16}(?!\d)", v))
        return {"accounts_wiped": n_acct, "transactions_wiped": n_tx, "ledger_payments_kept": sums["n"], "ledger_amount_kept_paise": sums["s"],
                "copy_tokens": sorted(toks)[:12]}

    # -- traffic generator
    NAMES = ["rekha", "suresh", "anita", "farhan", "divya", "karthik", "pooja", "imran", "lakshmi", "arjun", "meena", "naveen"]
    VPA_BANKS = ["okaxis", "oksbi", "ybl", "paytm", "unionbank", "icici"]
    IFSCS = ["HDFC0001234", "SBIN0004321", "ICIC0000987", "UTIB0001122", "PUNB0123456", "KKBK0000761"]
    PLAIN_REMARKS = ["Rent", "Dinner split", "Books", "Gift", "Loan EMI", "Electricity bill", "School fees", "Groceries", ""]

    def _payee_pool(self, cust: str, r: random.Random) -> list:
        pool = self.pools.get(cust)
        if pool is None:
            pool = []
            for _ in range(10):
                kind = r.choice(["UPI", "UPI", "ACC", "CARD"])
                if kind == "UPI":
                    pool.append(("UPI", f"{r.choice(self.NAMES)}{r.randint(10, 999)}@{r.choice(self.VPA_BANKS)}", None))
                elif kind == "ACC":
                    pool.append(("ACC", "".join(str(r.randint(0, 9)) for _ in range(r.choice([11, 12, 14, 16]))), r.choice(self.IFSCS)))
                else:
                    pool.append(("CARD", luhn_complete("4" + "".join(str(r.randint(0, 9)) for _ in range(14))), None))
            self.pools[cust] = pool
        return pool

    def _remark(self, r: random.Random) -> str:
        if r.random() > 0.35:
            return r.choice(self.PLAIN_REMARKS)
        pan = "".join(r.choice("ABCDEFGHJKLMNPRSTUVWXY") for _ in range(5)) + "".join(str(r.randint(0, 9)) for _ in range(4)) + r.choice("ABCDEFGHJKLMNPRSTUVWXY")
        mob = str(r.randint(6, 9)) + "".join(str(r.randint(0, 9)) for _ in range(9))
        card = luhn_complete("5" + "".join(str(r.randint(0, 9)) for _ in range(14)))
        return r.choice([f"Rent Nov, PAN {pan}", f"Call me on {mob} for the receipt", f"Refund for card {card}",
                         f"Fees paid, my PAN is {pan}", f"WhatsApp {mob} when received"])

    def simulate(self, n: int, rng: Optional[random.Random] = None) -> dict:
        r = rng or random.Random()
        conn = self.get_db()
        custs = [dict(x) for x in conn.execute("SELECT a.customer_ref, a.balance_paise FROM accounts a JOIN customers c ON c.customer_ref=a.customer_ref "
                              "WHERE a.kind='savings' AND a.number NOT LIKE 'ERASED%'").fetchall()]
        conn.close()
        if not custs:
            raise HTTPException(409, "No customers yet. The bank is still seeding its customers.")
        out = {"requested": n, "created": 0, "success": 0, "held": 0, "failed": 0, "txn_ids": []}
        burst_cust, burst_left = None, 0
        for _ in range(n):
            if burst_left > 0:
                c, burst_left = burst_cust, burst_left - 1
            else:
                c = r.choice(custs)["customer_ref"]
                if r.random() < 0.08:
                    burst_cust, burst_left = c, 7
            conn = self.get_db()
            bal = conn.execute("SELECT balance_paise FROM accounts WHERE customer_ref=?", (c,)).fetchone()["balance_paise"]
            if bal < 20_000 * 100:   # salary credit, so a long day does not run dry
                with self.lock, conn:
                    self.deposit(conn, c, (50_000 + r.randint(0, 400_000)) * 100)
                bal = conn.execute("SELECT balance_paise FROM accounts WHERE customer_ref=?", (c,)).fetchone()["balance_paise"]
            conn.close()
            rail = r.choices(["UPI", "IMPS", "NEFT", "CARD", "RTGS"], weights=[50, 18, 14, 12, 6])[0]
            pool = self._payee_pool(c, r)
            if rail == "UPI":
                kind = "UPI"
            elif rail == "CARD":
                kind = "CARD"
            else:
                kind = "ACC"
            cands = [x for x in pool if x[0] == kind] or [x for x in pool if x[0] == "UPI"]
            if kind != "UPI" and not [x for x in pool if x[0] == kind]:
                rail = "UPI"
            pk, payee, ifsc = r.choice(cands)
            big = r.random() < 0.08
            if rail == "RTGS":
                amt = (200_000 + r.randint(0, 150_000)) * 100
            elif big:
                amt = (50_001 + r.randint(0, 45_000)) * 100
            elif rail == "UPI":
                amt = r.choice([r.randint(20, 900), r.randint(200, 6000), r.randint(500, 20000)]) * 100 + r.choice([0, 0, 50])
            else:
                amt = r.randint(500, 40_000) * 100
            if rail == "UPI" and amt > RAILS["UPI"]["max"]:
                amt = RAILS["UPI"]["max"]
            if amt > bal:
                if rail == "RTGS":   # not enough for RTGS: an everyday payment instead
                    rail, pk, payee, ifsc = "UPI", "UPI", next(x[1] for x in pool if x[0] == "UPI") if any(x[0] == "UPI" for x in pool) else "someone1@okaxis", None
                amt = max(100, min(amt, bal // 2 // 100 * 100))
            try:
                res = self.pay({"customer_ref": c, "rail": rail, "payee": payee, "ifsc": ifsc, "amount_paise": int(amt),
                                "remarks": self._remark(r), "idem_key": f"sim-{uuid.uuid4().hex}",
                                "to_support_chat": r.random() < 0.15})
            except HTTPException:
                continue
            self.emit_copies(res["txn"]["txn_id"])
            out["created"] += 1
            st = res["txn"]["status"]
            out["success" if st == "success" else "held" if st == "held" else "failed"] += 1
            out["txn_ids"].append(res["txn"]["txn_id"])
        return out

    def seed_customers(self, register, n: int = 8) -> int:
        """Create demo customers through the normal sign-up (which opens their accounts). Returns how many exist."""
        names = ["Aarav Sharma", "Priya Patel", "Vikram Malhotra", "Ananya Deshmukh", "Rajesh Iyer", "Meera Nair",
                 "Amitabh Verma", "Sunita Rao", "Kavita Reddy", "Rohan Gupta", "Lakshmi Menon", "Farhan Qureshi"]
        conn = self.get_db()
        have = conn.execute("SELECT COUNT(*) FROM customers").fetchone()[0]
        conn.close()
        rr = random.Random()
        for i in range(have, n):
            aad = str(rr.randint(2, 9)) + "".join(str(rr.randint(0, 9)) for _ in range(10))
            aad += str(verhoeff_digit(aad))
            register({"name": names[i % len(names)], "mobile": str(rr.randint(6, 9)) + "".join(str(rr.randint(0, 9)) for _ in range(9)),
                      "aadhaar": aad, "card": luhn_complete(rr.choice(["4", "5"]) + "".join(str(rr.randint(0, 9)) for _ in range(14)))})
        conn = self.get_db()
        have = conn.execute("SELECT COUNT(*) FROM customers").fetchone()[0]
        conn.close()
        return have


# ------------------------------------------------------------------ HTTP
class PaymentIn(BaseModel):
    customer_ref: Optional[str] = None
    rail: str
    payee: str
    ifsc: Optional[str] = None
    amount_paise: Optional[StrictInt] = None
    amount: Optional[Union[str, int, float]] = None
    remarks: Optional[str] = ""
    idem_key: Optional[str] = None
    to_support_chat: bool = False
    notify_mobile: Optional[str] = None


class ReverseIn(BaseModel):
    reason: Optional[str] = ""


class SimIn(BaseModel):
    n: int = 20


def install(app: FastAPI, bank: Bank, register=None):
    """Adds the payment routes to the bank app."""

    @app.get("/api/rails")
    def rails():
        return {"rails": {k: {"max_paise": v["max"], "min_paise": v["min"], "payee": v["id"]} for k, v in RAILS.items()},
                "fraud": {"threshold": bank.threshold, "new_payee": RULE_NEW_PAYEE, "odd_hour": RULE_ODD_HOUR,
                          "large_amount": RULE_LARGE, "burst": RULE_BURST, "large_amount_paise": FRAUD_AMOUNT},
                "sinks": [{"id": s, "label": SINK_LABEL[s], "fields": list(SINK_FIELDS[s])} for s in SINKS],
                "ifsc": f"ARN{bank.letter}0001234", "bank_mode": bank.mode}

    @app.get("/api/accounts")
    def accounts(customer_ref: Optional[str] = None):
        conn = bank.get_db()
        sql = "SELECT a.*, c.name FROM accounts a LEFT JOIN customers c ON c.customer_ref=a.customer_ref WHERE a.kind='savings'"
        rows = conn.execute(sql + (" AND a.customer_ref=?" if customer_ref else "") + " ORDER BY a.id",
                            [customer_ref] if customer_ref else []).fetchall()
        out = [dict(bank._acct_view(r), name=r["name"]) for r in rows]
        conn.close()
        if customer_ref and not out:
            raise HTTPException(404, "No account for that customer")
        return out

    @app.post("/api/transactions")
    def create_txn(body: PaymentIn, idempotency_key: Optional[str] = Header(None)):
        p = body.model_dump()
        p["idem_key"] = (idempotency_key or p.get("idem_key") or "").strip()
        res = bank.pay(p)
        txn = res["txn"]
        if res["new"]:
            copies = bank.emit_copies(txn["txn_id"])
        else:
            copies = None
        detail = bank.txn_detail(txn["txn_id"])
        detail["idempotent_replay"] = not res["new"]
        detail["copies_summary"] = copies
        return detail

    @app.get("/api/transactions")
    def list_txns(customer_ref: Optional[str] = None, rail: Optional[str] = None, status: Optional[str] = None,
                  q: Optional[str] = None, limit: int = Query(50, ge=1, le=500), offset: int = Query(0, ge=0)):
        return bank.list_txns(customer_ref, rail, status, q, limit, offset)

    @app.get("/api/transactions/{txn_id}")
    def get_txn(txn_id: str):
        return bank.txn_detail(txn_id)

    @app.post("/api/transactions/{txn_id}/reverse")
    def reverse_txn(txn_id: str, body: Optional[ReverseIn] = None):
        bank.reverse(txn_id, (body.reason if body else "") or "")
        return bank.txn_detail(txn_id)

    @app.get("/api/ledger/check")
    def ledger_check():
        return bank.ledger_check()

    @app.get("/api/ledger")
    def ledger(txn_id: Optional[str] = None, limit: int = Query(100, ge=1, le=1000)):
        conn = bank.get_db()
        rows = bank.ledger_rows(conn, txn_id, limit)
        conn.close()
        return {"items": rows}

    @app.get("/api/fraud/queue")
    def fraud_queue():
        return bank.fraud_queue()

    @app.post("/api/fraud/{txn_id}/approve")
    def fraud_approve(txn_id: str):
        bank.decide(txn_id, True)
        return bank.txn_detail(txn_id)

    @app.post("/api/fraud/{txn_id}/decline")
    def fraud_decline(txn_id: str):
        bank.decide(txn_id, False)
        return bank.txn_detail(txn_id)

    @app.get("/api/sinks")
    def sinks(txn_id: Optional[str] = None, sink: Optional[str] = None, limit: int = Query(100, ge=1, le=500)):
        conn = bank.get_db()
        items = bank.copies(conn, txn_id, sink, limit)
        conn.close()
        return {"bank_mode": bank.mode, "txn_id": txn_id, "items": items,
                "stores": "tokens or masked text only" if bank.aran else "the real identifiers"}

    @app.get("/api/outbox")
    def outbox():
        return bank.outbox_rows()

    @app.post("/api/outbox/flush")
    def outbox_flush():
        return bank.flush_outbox()

    @app.get("/api/txn-stats")
    def txn_stats():
        return bank.stats()

    @app.post("/api/simulate")
    def simulate(body: SimIn):
        if not 1 <= body.n <= 200:
            raise HTTPException(422, "n must be between 1 and 200")
        t0 = time.time()
        res = bank.simulate(body.n)
        res["seconds"] = round(time.time() - t0, 2)
        return res

    @app.post("/api/seed")
    def seed():
        if register is None:
            raise HTTPException(501, "seeding is not wired")
        return {"customers": bank.seed_customers(register)}


def start_background(app: FastAPI, bank: Bank, register):
    """Seed 8 customers on first start, optional steady traffic (BANK_AUTO_TRAFFIC = payments per minute),
    and a retry of the outbox for Bank B. All in daemon threads so start-up is never blocked."""
    def seeder():
        wait = 5
        for _ in range(60):
            try:
                if bank.seed_customers(register) >= 8:
                    return
            except Exception:
                pass
            time.sleep(wait)
            wait = min(wait * 2, 60)  # Aran may be asleep on free hosting: back off instead of calling every 5 s

    def traffic(per_min: float):
        time.sleep(8)
        gap = 60.0 / per_min
        while True:
            try:
                bank.simulate(1)
            except Exception:
                pass
            time.sleep(gap * random.uniform(0.6, 1.4))

    def flusher():
        while True:
            time.sleep(15)
            try:
                if bank.aran and bank.outbox_rows(1)["pending"]:
                    bank.flush_outbox()
            except Exception:
                pass

    def go():
        if os.environ.get("BANK_SEED", "1") != "0":
            threading.Thread(target=seeder, daemon=True).start()
        try:
            rate = float(os.environ.get("BANK_AUTO_TRAFFIC", "0") or 0)
        except ValueError:
            rate = 0
        if rate > 0:
            threading.Thread(target=traffic, args=(rate,), daemon=True).start()
        if bank.aran:
            threading.Thread(target=flusher, daemon=True).start()

    app.router.on_startup.append(go)
