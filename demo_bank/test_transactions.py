"""demo_bank/test_transactions.py: payments, ledger, fraud score and sink copies, in both banks.

Run from the repo root:   python -m pytest demo_bank/test_transactions.py -q
Needs httpx (FastAPI's TestClient). No Aran server is needed: Bank B's Aran call is mocked.
All identifiers here are generated, none belongs to a real person.
"""

import hashlib
import importlib.util
import json
import os
import re
import socket
import sys
import threading
import time
import uuid
from datetime import datetime

import pytest
from fastapi.testclient import TestClient

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "aran_sdk"))
import bank_txn  # noqa: E402
from bank_txn import IST, AranDown, luhn_complete, verhoeff_digit  # noqa: E402

DAY = datetime(2026, 11, 1, 12, 0, tzinfo=IST)
NIGHT = datetime(2026, 11, 2, 2, 0, tzinfo=IST)
PAN = "ABCDE1234F"
MOBILE = "9876543210"
CARD_PAYEE = luhn_complete("411111111111111")
ACCT_PAYEE = "123456789012"


def rs(n):  # rupees -> paise
    return int(n) * 100


# ------------------------------------------------------------------ a fake Aran that tokenises like the real one looks
def _tok(kind, v):
    h = hashlib.sha256((kind + v).encode()).hexdigest()
    if v.isdigit():
        t = "".join(str(int(c, 16) % 10) for c in h[: len(v)])
        return t if t != v else "9" * len(v)
    return f"<{kind}_{h[:6]}>"


def fake_tokenise(text):
    findings = []

    def sub(rx, kind, fn=None):
        nonlocal text

        def r(m):
            findings.append({"type": kind, "token": _tok(kind, m.group(0))})
            return _tok(kind, m.group(0))
        text = rx.sub(r, text)

    sub(bank_txn.VPA_FIND, "UPI")
    sub(bank_txn.PAN_RE, "PAN")
    sub(re.compile(r"\d{9,19}"), "NUM")
    return text, findings


class FakeClient:
    api_key = "test-key"
    base_url = "http://127.0.0.1:1"

    def protect(self, text, customer_ref=None, purpose=None, sink=None):
        m = re.search(r"Account holder (.+?) opened an account with mobile (\d+), Aadhaar (\d+), card (\d+)", text)
        if m:
            f = [{"type": "PER", "token": "<PER_" + hashlib.sha256(m.group(1).encode()).hexdigest()[:6] + ">"},
                 {"type": "MOBILE", "token": _tok("M", m.group(2))}, {"type": "AADHAAR", "token": _tok("A", m.group(3))},
                 {"type": "CARD", "token": _tok("C", m.group(4))}]
            return {"findings": f, "after": text}
        after, f = fake_tokenise(text)
        return {"findings": f, "after": after}

    def erase(self, customer_ref, purpose="KYC"):
        return {"alg": "Ed25519+ML-DSA-65", "root": "00"}

    def verify_receipt(self, r):
        return {"valid": True}

    def detokenise(self, token):
        return {"status": "erased", "value": None}


class FakeAranCloud:
    """Stands in for AranGateway.protect. Records the calls. down=True makes it fail like an unreachable cloud."""

    def __init__(self):
        self.down = False
        self.calls = []

    def __call__(self, entries, force=False):
        self.calls.append(entries)
        if self.down:
            raise AranDown("Aran Cloud unreachable (test)")
        out = {}
        for e in entries:
            fields, found = {}, 0
            for k, v in e["fields"].items():
                after, f = fake_tokenise(str(v))
                fields[k] = after
                found += len(f)
            out[(e["txn_id"], e["sink"])] = {"txn_id": e["txn_id"], "sink": e["sink"], "fields": fields, "found": found,
                                            "protected": found, "raw": 0, "by_type": {}, "latency_ms": 2, "replayed": False}
        return out


# ------------------------------------------------------------------ fixtures
class World:
    def __init__(self, mode, tmp_path, monkeypatch):
        monkeypatch.setenv("BANK_MODE", mode)
        monkeypatch.setenv("BANK_DATA_DIR", str(tmp_path))
        monkeypatch.setenv("BANK_SEED", "0")
        monkeypatch.setenv("ARAN_API_KEY", "test-key")
        monkeypatch.setenv("ARAN_URL", "http://127.0.0.1:1")
        monkeypatch.delenv("BANK_AUTO_TRAFFIC", raising=False)
        name = "bank_app_" + uuid.uuid4().hex[:8]
        spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, "app.py"))
        self.mod = importlib.util.module_from_spec(spec)
        sys.modules[name] = self.mod
        spec.loader.exec_module(self.mod)
        self.bank = self.mod.txn_bank
        self.bank.now = lambda: DAY
        self.cloud = FakeAranCloud()
        if mode == "aran":
            self.mod.get_sdk_clients = lambda: (FakeClient(), FakeClient(), FakeClient())
            self.bank.gateway.protect = self.cloud
        self.c = TestClient(self.mod.app)
        self.n = 0

    def customer(self, funds_rupees=None):
        self.n += 1
        aad = "2" + "".join(str((self.n * 7 + i * 3) % 10) for i in range(10))
        aad += str(verhoeff_digit(aad))
        body = {"name": f"Test Person {self.n}", "mobile": "98765%05d" % self.n, "aadhaar": aad,
                "card": luhn_complete("411111%09d" % (self.n * 77))}
        r = self.c.post("/api/customers", json=body)
        assert r.status_code == 200, r.text
        ref = r.json()["customer_ref"]
        if funds_rupees is not None:
            self.set_balance(ref, funds_rupees)
        return ref

    def set_balance(self, ref, rupees):
        conn = self.mod.get_db()
        cur = conn.execute("SELECT balance_paise FROM accounts WHERE customer_ref=?", (ref,)).fetchone()[0]
        with self.bank.lock, conn:
            if rs(rupees) > cur:
                self.bank.deposit(conn, ref, rs(rupees) - cur)
            elif rs(rupees) < cur:   # take money out through a normal double entry
                a = conn.execute("SELECT id FROM accounts WHERE customer_ref=?", (ref,)).fetchone()[0]
                self.bank._move(conn, "WD-" + uuid.uuid4().hex[:6], a, self.bank._internal(conn, "OPENING-FUNDS", "equity"),
                                cur - rs(rupees), "withdrawal")
        conn.close()

    def account(self, ref):
        return self.c.get("/api/accounts", params={"customer_ref": ref}).json()[0]

    def pay(self, ref, rail="UPI", payee="rekha413@unionbank", rupees=100, ifsc=None, key=None, **extra):
        body = {"customer_ref": ref, "rail": rail, "payee": payee, "amount_paise": rs(rupees), **extra}
        if ifsc:
            body["ifsc"] = ifsc
        return self.c.post("/api/transactions", json=body, headers={"Idempotency-Key": key or uuid.uuid4().hex})


@pytest.fixture(params=["legacy", "aran"])
def world(request, tmp_path, monkeypatch):
    return World(request.param, tmp_path, monkeypatch)


@pytest.fixture
def bank_a(tmp_path, monkeypatch):
    return World("legacy", tmp_path, monkeypatch)


@pytest.fixture
def bank_b(tmp_path, monkeypatch):
    return World("aran", tmp_path, monkeypatch)


def stored_text(w):
    """Everything in the copy tables of a bank, as one string."""
    conn = w.mod.get_db()
    parts = [r[0] for r in conn.execute("SELECT body FROM sink_copies")] + [r[0] for r in conn.execute("SELECT payload FROM outbox")]
    conn.close()
    return "\n".join(parts)


# ------------------------------------------------------------------ accounts
def test_account_opened_with_customer(world):
    ref = world.customer()
    a = world.account(ref)
    assert re.fullmatch(r"\d{14}", a["number"])
    assert a["ifsc"] == ("ARNB0001234" if world.bank.aran else "ARNA0001234")
    assert isinstance(a["balance_paise"], int) and a["balance_paise"] >= rs(100_000)


# ------------------------------------------------------------------ idempotency
def test_same_idempotency_key_pays_once(world):
    ref = world.customer(funds_rupees=10_000)
    r1 = world.pay(ref, rupees=250, key="K-1")
    r2 = world.pay(ref, rupees=250, key="K-1")
    assert r1.status_code == r2.status_code == 200
    assert r1.json()["txn_id"] == r2.json()["txn_id"]
    assert r1.json()["idempotent_replay"] is False and r2.json()["idempotent_replay"] is True
    assert world.account(ref)["balance_paise"] == rs(10_000 - 250)
    assert world.c.get("/api/transactions", params={"customer_ref": ref}).json()["total"] == 1
    # a different body with the same key still returns the first result
    r3 = world.pay(ref, rupees=999, key="K-1")
    assert r3.json()["txn_id"] == r1.json()["txn_id"] and r3.json()["amount_paise"] == rs(250)


def test_idempotency_key_in_body_and_required(world):
    ref = world.customer(funds_rupees=10_000)
    body = {"customer_ref": ref, "rail": "UPI", "payee": "rekha413@unionbank", "amount_paise": rs(10), "idem_key": "BODY-1"}
    a, b = world.c.post("/api/transactions", json=body), world.c.post("/api/transactions", json=body)
    assert a.json()["txn_id"] == b.json()["txn_id"]
    body.pop("idem_key")
    assert world.c.post("/api/transactions", json=body).status_code == 400


# ------------------------------------------------------------------ validation and limits
def test_formats_are_validated(world):
    ref = world.customer(funds_rupees=10_000)
    assert world.pay(ref, payee="not-a-vpa").status_code == 422
    assert world.pay(ref, rail="IMPS", payee="12345", ifsc="HDFC0001234").status_code == 422        # account too short
    assert world.pay(ref, rail="IMPS", payee=ACCT_PAYEE, ifsc="BAD").status_code == 422
    assert world.pay(ref, rail="IMPS", payee=ACCT_PAYEE).status_code == 422                        # no IFSC
    assert world.pay(ref, rail="CARD", payee="4111111111111112").status_code == 422                # fails Luhn
    assert world.pay(ref, rail="CARD", payee="41111111").status_code == 422
    assert world.pay(ref, rail="XYZ", payee="a@b").status_code == 422
    assert world.c.post("/api/transactions", json={"customer_ref": ref, "rail": "UPI", "payee": "rekha413@unionbank",
                                                   "amount_paise": 10.5}, headers={"Idempotency-Key": "f1"}).status_code == 422
    assert world.c.post("/api/transactions", json={"customer_ref": ref, "rail": "UPI", "payee": "rekha413@unionbank",
                                                   "amount": "10.505"}, headers={"Idempotency-Key": "f2"}).status_code == 422
    ok = world.c.post("/api/transactions", json={"customer_ref": ref, "rail": "UPI", "payee": "rekha413@unionbank",
                                                 "amount": "10.50"}, headers={"Idempotency-Key": "f3"})
    assert ok.status_code == 200 and ok.json()["amount_paise"] == 1050
    assert world.pay(ref, rail="CARD", payee=CARD_PAYEE, rupees=100).json()["status"] == "success"


def test_rail_limits(world):
    ref = world.customer(funds_rupees=3_000_000)
    world.bank.threshold = 10_000   # keep the fraud score out of this test
    u = world.pay(ref, "UPI", rupees=100_000)
    assert u.json()["status"] == "success"
    u2 = world.pay(ref, "UPI", rupees=100_001)
    assert u2.json()["status"] == "failed" and "limit" in u2.json()["fail_reason"]
    assert world.pay(ref, "IMPS", ACCT_PAYEE, rupees=500_000, ifsc="HDFC0001234").json()["status"] == "success"
    assert world.pay(ref, "IMPS", ACCT_PAYEE, rupees=500_001, ifsc="HDFC0001234").json()["status"] == "failed"
    assert world.pay(ref, "NEFT", ACCT_PAYEE, rupees=1_000_000, ifsc="HDFC0001234").json()["status"] == "success"
    low = world.pay(ref, "RTGS", ACCT_PAYEE, rupees=199_999, ifsc="HDFC0001234").json()
    assert low["status"] == "failed" and "at least" in low["fail_reason"]
    assert world.pay(ref, "RTGS", ACCT_PAYEE, rupees=200_000, ifsc="HDFC0001234").json()["status"] == "success"
    assert world.c.get("/api/ledger/check").json()["sum"] == 0


def test_insufficient_balance_fails_and_moves_nothing(world):
    ref = world.customer(funds_rupees=500)
    t = world.pay(ref, rupees=501).json()
    assert t["status"] == "failed" and "Insufficient" in t["fail_reason"]
    assert world.account(ref)["balance_paise"] == rs(500)
    steps = [e["step"] for e in t["timeline"]]
    assert steps == ["initiated", "failed", "copies"]


# ------------------------------------------------------------------ ledger and reversal
def test_ledger_double_entry_sums_to_zero(world):
    ref = world.customer(funds_rupees=50_000)
    t = world.pay(ref, rupees=1234).json()
    rows = [l for l in world.c.get("/api/ledger", params={"txn_id": t["txn_id"]}).json()["items"]]
    assert len(rows) == 2
    assert sum(r["debit_paise"] for r in rows) == sum(r["credit_paise"] for r in rows) == rs(1234)
    chk = world.c.get("/api/ledger/check").json()
    assert chk["sum"] == 0 and chk["balanced"] is True and chk["balances_match_ledger"] is True
    assert {s["rail"]: s["balance_paise"] for s in chk["settlement"]}["UPI"] == rs(1234)


def test_reversal_restores_balance_and_keeps_books_balanced(world):
    ref = world.customer(funds_rupees=20_000)
    t = world.pay(ref, rupees=700).json()
    assert world.account(ref)["balance_paise"] == rs(19_300)
    r = world.c.post(f"/api/transactions/{t['txn_id']}/reverse", json={"reason": "customer asked"})
    assert r.status_code == 200 and r.json()["status"] == "reversed"
    assert world.account(ref)["balance_paise"] == rs(20_000)
    assert world.c.post(f"/api/transactions/{t['txn_id']}/reverse").status_code == 409     # not twice
    failed = world.pay(ref, rupees=10_000_000).json()
    assert failed["status"] == "failed"
    assert world.c.post(f"/api/transactions/{failed['txn_id']}/reverse").status_code == 409
    assert world.c.get("/api/ledger/check").json()["sum"] == 0
    assert world.c.post("/api/transactions/TXN-X-999999/reverse").status_code == 404


# ------------------------------------------------------------------ fraud score
def test_large_payment_to_new_payee_is_held_then_approved_or_declined(world):
    ref = world.customer(funds_rupees=500_000)
    before = world.account(ref)["balance_paise"]
    t = world.pay(ref, "IMPS", ACCT_PAYEE, rupees=60_000, ifsc="HDFC0001234").json()
    assert t["status"] == "held" and t["risk"] >= 60
    assert "new payee" in t["risk_reasons"] and "amount above Rs 50,000" in t["risk_reasons"]
    assert world.account(ref)["balance_paise"] == before                       # no money moved
    assert world.c.get("/api/ledger", params={"txn_id": t["txn_id"]}).json()["items"] == []
    q = world.c.get("/api/fraud/queue").json()
    assert q["count"] == 1 and q["items"][0]["txn_id"] == t["txn_id"]
    ok = world.c.post(f"/api/fraud/{t['txn_id']}/approve").json()
    assert ok["status"] == "success" and world.account(ref)["balance_paise"] == before - rs(60_000)
    t2 = world.pay(ref, "IMPS", "998877665544", rupees=70_000, ifsc="HDFC0001234").json()
    assert t2["status"] == "held"
    no = world.c.post(f"/api/fraud/{t2['txn_id']}/decline").json()
    assert no["status"] == "failed" and "declined" in no["fail_reason"]
    assert world.account(ref)["balance_paise"] == before - rs(60_000)
    assert world.c.post(f"/api/fraud/{t2['txn_id']}/approve").status_code == 409
    assert world.c.get("/api/fraud/queue").json()["count"] == 0
    assert world.c.get("/api/ledger/check").json()["sum"] == 0


def test_known_payee_small_payment_not_held_but_night_payment_to_new_payee_is(world):
    ref = world.customer(funds_rupees=100_000)
    assert world.pay(ref, rupees=100).json()["status"] == "success"            # new payee alone: 30 points, below 50
    assert world.pay(ref, rupees=100).json()["status"] == "success"            # now a known payee
    world.bank.now = lambda: NIGHT
    assert world.pay(ref, rupees=100).json()["status"] == "success"            # known payee at night: 20 points
    held = world.pay(ref, payee="newone77@okaxis", rupees=100).json()          # new payee at night: 50 points
    assert held["status"] == "held" and "odd hour (23:00 to 05:00)" in held["risk_reasons"]


def test_many_payments_in_ten_minutes_adds_to_the_score(world):
    ref = world.customer(funds_rupees=100_000)
    for i in range(6):
        assert world.pay(ref, rupees=10).json()["status"] == "success"        # same payee each time
    last = world.pay(ref, payee="fresh99@okaxis", rupees=10).json()
    assert last["status"] == "held" and any(r.startswith("many payments") for r in last["risk_reasons"])


# ------------------------------------------------------------------ copies (sinks)
def make_rich_payment(w, ref, **extra):
    return w.pay(ref, "UPI", "rekha413@unionbank", rupees=2450,
                 remarks=f"Rent Nov, PAN {PAN}, call {MOBILE}", **extra).json()


def test_bank_a_copies_hold_the_real_identifiers(bank_a):
    ref = bank_a.customer(funds_rupees=50_000)
    acct = bank_a.account(ref)["number"]
    t = make_rich_payment(bank_a, ref, to_support_chat=True)
    items = bank_a.c.get("/api/sinks", params={"txn_id": t["txn_id"]}).json()["items"]
    assert {i["sink"] for i in items} == set(bank_txn.SINKS)
    text = stored_text(bank_a)
    assert acct in text and "rekha413@unionbank" in text and PAN in text and MOBILE in text
    assert all(i["state"] == "raw" for i in items)


def test_bank_b_copies_hold_no_raw_identifier(bank_b):
    ref = bank_b.customer(funds_rupees=500_000)
    acct = bank_b.account(ref)["number"]
    t = make_rich_payment(bank_b, ref, to_support_chat=True)
    t2 = bank_b.pay(ref, "CARD", CARD_PAYEE, rupees=500, remarks=f"refund card {CARD_PAYEE}").json()
    t3 = bank_b.pay(ref, "IMPS", ACCT_PAYEE, rupees=60_000, ifsc="HDFC0001234", notify_mobile=MOBILE).json()   # held
    assert t["status"] == "success" and t3["status"] == "held"
    items = bank_b.c.get("/api/sinks", params={"txn_id": t["txn_id"]}).json()["items"]
    assert {i["sink"] for i in items} == set(bank_txn.SINKS)
    assert all(i["state"] == "protected" for i in items)
    text = stored_text(bank_b)
    for raw in (acct, "rekha413@unionbank", PAN, MOBILE, CARD_PAYEE, ACCT_PAYEE):
        assert raw not in text, f"raw {raw} found in a Bank B copy"
    assert not re.search(r"\b[A-Z]{5}\d{4}[A-Z]\b", text)
    assert acct not in bank_b.c.get("/api/breach").json()["dump"]
    assert "rekha413@unionbank" not in bank_b.c.get("/api/breach").json()["dump"]
    # the single batch call carried every sink of the payment
    first = [c for c in bank_b.cloud.calls if c and c[0]["txn_id"] == t["txn_id"]][0]
    assert {e["sink"] for e in first} == set(bank_txn.SINKS) and first[0]["customer_ref"] == ref
    assert first[0]["purpose"] == "Service" and first[0]["amount_paise"] == rs(2450)


def test_bank_b_guard_masks_a_value_aran_left_raw(bank_b):
    ref = bank_b.customer(funds_rupees=50_000)
    acct = bank_b.account(ref)["number"]

    def sloppy(entries, force=False):   # an Aran that returns the text unchanged
        return {(e["txn_id"], e["sink"]): {"fields": dict(e["fields"]), "found": 0} for e in entries}
    bank_b.bank.gateway.protect = sloppy
    t = make_rich_payment(bank_b, ref)
    assert t["status"] == "success"
    text = stored_text(bank_b)
    assert acct not in text and "rekha413" not in text and PAN not in text
    assert acct[-4:] in text  # masked copies keep the last 4


def test_support_chat_only_when_asked(world):
    ref = world.customer(funds_rupees=50_000)
    a = world.pay(ref, rupees=10, remarks="hello").json()
    b = world.pay(ref, rupees=10, remarks="hello", to_support_chat=True).json()
    sinks = lambda t: {i["sink"] for i in world.c.get("/api/sinks", params={"txn_id": t["txn_id"]}).json()["items"]}
    assert "support-chat" not in sinks(a) and "support-chat" in sinks(b)


# ------------------------------------------------------------------ Aran down, slow, or old
def test_payment_succeeds_when_aran_is_down_and_copies_wait_in_the_outbox(bank_b):
    ref = bank_b.customer(funds_rupees=50_000)
    acct = bank_b.account(ref)["number"]
    bank_b.cloud.down = True
    t = make_rich_payment(bank_b, ref)
    assert t["status"] == "success"
    assert bank_b.account(ref)["balance_paise"] == rs(50_000 - 2450)           # ledger + status written
    assert bank_b.c.get("/api/ledger/check").json()["sum"] == 0
    items = bank_b.c.get("/api/sinks", params={"txn_id": t["txn_id"]}).json()["items"]
    assert items and all(i["state"] == "masked" for i in items)
    ob = bank_b.c.get("/api/outbox").json()
    assert ob["pending"] == len(items) and all(o["retry"] for o in ob["items"])
    text = stored_text(bank_b)
    assert acct not in text and "rekha413@unionbank" not in text and PAN not in text and MOBILE not in text
    assert ("X" * 10 + acct[-4:]) in text                                      # XXXXXXXXXX1234 style
    assert "XXXXXX@unionbank" in text
    # flushing while Aran is still down changes nothing
    fl = bank_b.c.post("/api/outbox/flush").json()
    assert fl["sent"] == 0 and fl["pending"] == ob["pending"] and fl["error"]
    # Aran comes back: the retry sends the copies and replaces the masked ones
    bank_b.cloud.down = False
    fl = bank_b.c.post("/api/outbox/flush").json()
    assert fl["sent"] == ob["pending"] and fl["pending"] == 0
    items = bank_b.c.get("/api/sinks", params={"txn_id": t["txn_id"]}).json()["items"]
    assert all(i["state"] == "protected" for i in items)
    text = stored_text(bank_b)
    assert acct not in text and PAN not in text


def test_slow_aran_times_out_and_the_payment_still_succeeds(tmp_path, monkeypatch):
    w = World("aran", tmp_path, monkeypatch)
    ref = w.customer(funds_rupees=50_000)
    srv = socket.socket()
    srv.bind(("127.0.0.1", 0))
    srv.listen(5)                                    # accepts connections, never answers
    port = srv.getsockname()[1]
    gw = w.bank.gateway
    gw.__class__ = type("RealGw", (bank_txn.AranGateway,), {})
    gw.protect = bank_txn.AranGateway.protect.__get__(gw)   # the real code path, not the mock
    gw.timeout = 0.4
    fake = FakeClient()
    fake.base_url = f"http://127.0.0.1:{port}"
    gw._client = fake
    t0 = time.time()
    t = make_rich_payment(w, ref)
    took = time.time() - t0
    assert t["status"] == "success" and took < 3.0
    assert all(i["state"] == "masked" for i in w.c.get("/api/sinks", params={"txn_id": t["txn_id"]}).json()["items"])
    assert w.c.get("/api/outbox").json()["pending"] == 4
    # the breaker is open: the next payment does not wait again
    t0 = time.time()
    w.pay(ref, rupees=5)
    assert time.time() - t0 < 0.5
    srv.close()


def test_older_cloud_without_the_batch_endpoint_falls_back_to_protect(bank_b, monkeypatch):
    ref = bank_b.customer(funds_rupees=50_000)
    acct = bank_b.account(ref)["number"]
    gw = bank_b.bank.gateway
    gw.__class__ = type("RealGw", (bank_txn.AranGateway,), {})
    gw.protect = bank_txn.AranGateway.protect.__get__(gw)
    gw._client = FakeClient()                                     # has protect(), no protect_transactions
    monkeypatch.setattr(bank_txn.AranGateway, "_post", lambda self, c, e: (_ for _ in ()).throw(bank_txn._NotFound()), raising=False)
    gw.timeout = 2.0
    t = make_rich_payment(bank_b, ref, to_support_chat=True)
    items = bank_b.c.get("/api/sinks", params={"txn_id": t["txn_id"]}).json()["items"]
    assert t["status"] == "success" and items and all(i["state"] == "protected" for i in items)
    assert all(i["meta"].get("via") == "per-field" for i in items)
    text = stored_text(bank_b)
    assert acct not in text and "rekha413@unionbank" not in text and PAN not in text


# ------------------------------------------------------------------ fraud desk view
def test_fraud_desk_shows_real_values_in_a_and_tokens_in_b_and_counts_repeats(world):
    ref = world.customer(funds_rupees=900_000)
    acct = world.account(ref)["number"]
    for _ in range(2):   # the same new payee twice: both held
        t = world.pay(ref, "IMPS", ACCT_PAYEE, rupees=60_000, ifsc="HDFC0001234").json()
        assert t["status"] == "held"
    other = world.pay(ref, "IMPS", "555566667777", rupees=61_000, ifsc="HDFC0001234").json()
    q = world.c.get("/api/fraud/queue").json()
    rows = {r["txn_id"]: r for r in q["items"]}
    assert len(rows) == 3
    same = [r for r in q["items"] if r["txn_id"] != other["txn_id"]]
    assert all(r["payee_seen"] == 2 for r in same)
    assert rows[other["txn_id"]]["payee_seen"] == 1
    desk = json.dumps(q)
    if world.bank.aran:
        assert ACCT_PAYEE not in desk and acct not in desk
        assert same[0]["desk_payee"] == same[1]["desk_payee"] != ACCT_PAYEE        # deterministic tokens
        assert "payer_account" not in same[0]
    else:
        assert same[0]["desk_payee"] == ACCT_PAYEE and same[0]["desk_payer"] == acct


# ------------------------------------------------------------------ breach, erase, traffic
def test_breach_dump_includes_transactions_and_copies(world):
    ref = world.customer(funds_rupees=50_000)
    acct = world.account(ref)["number"]
    t = make_rich_payment(world, ref)
    d = world.c.get("/api/breach").json()
    assert "=== TABLE: transactions ===" in d["dump"] and "=== TABLE: sink_copies ===" in d["dump"]
    assert t["txn_id"] in d["dump"] and d["transaction_count"] == 1
    if world.bank.aran:
        for raw in (acct, "rekha413@unionbank", PAN):
            assert raw not in d["dump"]
    else:
        assert acct in d["dump"] and "rekha413@unionbank" in d["dump"] and PAN in d["dump"]


def test_erase_keeps_ledger_amounts(world):
    ref = world.customer(funds_rupees=50_000)
    acct = world.account(ref)["number"]
    make_rich_payment(world, ref)
    r = world.c.post(f"/api/erase/{ref}")
    assert r.status_code == 200
    assert world.c.get("/api/ledger/check").json()["sum"] == 0
    if world.bank.aran:
        d = r.json()
        assert d["status"] == "crypto_shredded" and d["payments"]["ledger_amount_kept_paise"] == rs(2450)
        assert acct not in world.c.get("/api/breach").json()["dump"]
        rows = world.c.get("/api/transactions").json()["items"]
        assert rows[0]["payee"] == "ERASED" and rows[0]["amount_paise"] == rs(2450)
    else:
        assert "ledger" in r.json()["ledger_note"]
        assert acct in world.c.get("/api/breach").json()["dump"]               # Bank A still holds every copy


def test_simulate_creates_a_realistic_mix_and_keeps_the_books_balanced(world):
    for _ in range(3):
        world.customer()
    r = world.c.post("/api/simulate", json={"n": 20})
    assert r.status_code == 200
    d = r.json()
    assert d["created"] == 20 and d["success"] + d["held"] + d["failed"] == 20 and d["success"] >= 8
    st = world.c.get("/api/txn-stats").json()
    assert st["transactions"] == 20 and st["ledger"]["sum"] == 0
    assert len({t["rail"] for t in world.c.get("/api/transactions", params={"limit": 50}).json()["items"]}) >= 2
    assert world.c.post("/api/simulate", json={"n": 0}).status_code == 422
    if world.bank.aran:
        assert not re.search(r"\b" + re.escape(world.account(world.c.get("/api/accounts").json()[0]["customer_ref"])["number"]) + r"\b", stored_text(world))


def test_transactions_filters_and_detail(world):
    ref = world.customer(funds_rupees=50_000)
    a = world.pay(ref, "UPI", rupees=10).json()
    world.pay(ref, "CARD", CARD_PAYEE, rupees=20)
    assert world.c.get("/api/transactions", params={"rail": "card"}).json()["total"] == 1
    assert world.c.get("/api/transactions", params={"status": "success", "customer_ref": ref}).json()["total"] == 2
    d = world.c.get(f"/api/transactions/{a['txn_id']}").json()
    assert [e["step"] for e in d["timeline"]][:3] == ["initiated", "authorised", "success"]
    assert len(d["ledger"]) == 2 and d["copies"]
    assert world.c.get("/api/transactions/NOPE").status_code == 404


def test_money_helpers():
    assert bank_txn.fmt_inr(10_000_000) == "Rs 1,00,000.00"
    assert bank_txn.fmt_inr(123456789) == "Rs 12,34,567.89"
    assert bank_txn.mask_text("50100234567890") == "XXXXXXXXXX7890"
    assert bank_txn.luhn_ok(CARD_PAYEE) and not bank_txn.luhn_ok("4111111111111112")
    a = "2" + "34567890123"
    assert bank_txn.verhoeff_ok(a + str(verhoeff_digit(a)))
