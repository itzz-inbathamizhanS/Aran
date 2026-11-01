#!/usr/bin/env python3
"""demo_bank/smoke_test.py: End-to-end integration and smoke test for Demo Bank instances.

Validates:
1. Registration & Write Path: Bank A stores raw PII, Bank B stores vault tokens.
2. Log Path & AI Chatbot: Bank A exposes raw PII to provider, Bank B intercepts via AI Gateway.
3. Authorised Officer View: Role switch (Teller masked, Compliance full, Developer tokens).
4. Breach Dump & Trace: Bank A dump leaks raw PII, Bank B dump matches vault tokens.
5. Right to Erasure: Bank A leaves residual copies in logs/chat; Bank B executes post-quantum
   receipt-verified crypto-shredding, rendering tokens permanently unreadable.
"""

import os
import secrets
import sys
import requests

BANK_A_URL = os.environ.get("BANK_A_URL", "http://127.0.0.1:9001")
BANK_B_URL = os.environ.get("BANK_B_URL", "http://127.0.0.1:9002")
ARAN_URL = os.environ.get("ARAN_URL", "http://127.0.0.1:8000")

INTERNAL_SECRET = os.environ.get("ARAN_INTERNAL_SECRET")
if not INTERNAL_SECRET:
    _env_local = os.path.join(os.path.dirname(__file__), "..", ".env.local")
    if os.path.exists(_env_local):
        with open(_env_local) as _f:
            for _line in _f:
                if _line.startswith("ARAN_INTERNAL_SECRET="):
                    INTERNAL_SECRET = _line.strip().split("=", 1)[1]


def get_core_headers():
    h = {}
    if INTERNAL_SECRET:
        h["X-Aran-Internal"] = INTERNAL_SECRET
    return h


def print_step(n, msg):
    print(f"\n[Step {n:02d}] {msg}")


def assert_eq(actual, expected, desc):
    if actual != expected:
        raise AssertionError(f"FAILED {desc}: expected {expected!r}, got {actual!r}")
    print(f"  ✔ {desc}: {actual!r}")


def assert_true(cond, desc, details=None):
    if not cond:
        msg = f"FAILED {desc}"
        if details:
            msg += f" (details: {details})"
        raise AssertionError(msg)
    print(f"  ✔ {desc}")


def main():
    print("=" * 65)
    print(" Running Demo Bank E2E Smoke Test (Bank A Legacy vs Bank B Aran)")
    print("=" * 65)

    # 1. Health checks
    print_step(1, "Check service connectivity (Aran, Bank A, Bank B)")
    r_aran = requests.get(f"{ARAN_URL}/api/health", timeout=5)
    assert_eq(r_aran.status_code, 200, "Aran health status")
    assert_true(r_aran.json().get("ready"), "Aran ready is true")

    r_a = requests.get(f"{BANK_A_URL}/api/config", timeout=5)
    assert_eq(r_a.status_code, 200, "Bank A config status")
    assert_eq(r_a.json().get("bank_mode"), "legacy", "Bank A mode")

    r_b = requests.get(f"{BANK_B_URL}/api/config", timeout=5)
    assert_eq(r_b.status_code, 200, "Bank B config status")
    assert_eq(r_b.json().get("bank_mode"), "aran", "Bank B mode")

    # 2. Get valid sample customer
    print_step(2, "Fetch checksum-valid customer credentials from Aran")
    r_sample = requests.get(f"{BANK_B_URL}/api/sample-customer", timeout=5)
    assert_eq(r_sample.status_code, 200, "Sample customer status")
    sample = r_sample.json()
    raw_name = sample["name"]
    raw_mobile = sample["mobile"]
    raw_aadhaar = sample["aadhaar"]
    raw_card = sample["card"]
    assert_true(len(raw_aadhaar) == 12 and raw_aadhaar.isdigit(), "Aadhaar is 12 digits")
    assert_true(len(raw_card) == 16 and raw_card.isdigit(), "Card is 16 digits")
    assert_true(len(raw_mobile) == 10 and raw_mobile.isdigit(), "Mobile is 10 digits")
    print(f"  Sample generated: {raw_name} | Aadhaar: {raw_aadhaar} | Card: {raw_card}")

    # 3. Register identical customer in Bank A (Legacy) and Bank B (Aran)
    cust_ref = f"CUST-SMOKE-{secrets.token_hex(3).upper()}"
    print_step(3, f"Register {cust_ref} in Bank A (Legacy) and Bank B (Aran)")

    payload = {
        "name": raw_name,
        "mobile": raw_mobile,
        "aadhaar": raw_aadhaar,
        "card": raw_card,
        "customer_ref": cust_ref,
    }

    r_reg_a = requests.post(f"{BANK_A_URL}/api/customers", json=payload, timeout=10)
    assert_eq(r_reg_a.status_code, 200, "Bank A registration status")
    data_a = r_reg_a.json()
    assert_eq(data_a["aadhaar"], raw_aadhaar, "Bank A stores raw Aadhaar")
    assert_eq(data_a["card"], raw_card, "Bank A stores raw card")
    assert_eq(data_a["erasable"], False, "Bank A erasable flag")

    r_reg_b = requests.post(f"{BANK_B_URL}/api/customers", json=payload, timeout=10)
    assert_eq(r_reg_b.status_code, 200, "Bank B registration status")
    data_b = r_reg_b.json()
    tok_aadhaar = data_b["aadhaar"]
    tok_card = data_b["card"]
    assert_true(tok_aadhaar != raw_aadhaar and len(tok_aadhaar) == 12 and tok_aadhaar.isdigit(),
                f"Bank B Aadhaar is vault token: {tok_aadhaar}")
    assert_true(tok_card != raw_card and len(tok_card) == 16 and tok_card.isdigit(),
                f"Bank B Card is vault token: {tok_card}")
    assert_eq(data_b["erasable"], True, "Bank B erasable flag")

    # 4. Verify Database View on Bank A and Bank B
    print_step(4, "Verify database viewer rows for Bank A vs Bank B")
    r_db_a = requests.get(f"{BANK_A_URL}/api/db-view", timeout=5)
    row_a = next(c for c in r_db_a.json()["customers"] if c["customer_ref"] == cust_ref)
    assert_eq(row_a["aadhaar"], raw_aadhaar, "Bank A DB holds raw Aadhaar")

    r_db_b = requests.get(f"{BANK_B_URL}/api/db-view", timeout=5)
    row_b = next(c for c in r_db_b.json()["customers"] if c["customer_ref"] == cust_ref)
    assert_eq(row_b["aadhaar"], tok_aadhaar, "Bank B DB holds vault token")

    # 5. Staff AI Chatbot Path
    print_step(5, "Test Staff AI Chatbot (AI Gateway tokenisation)")
    chat_prompt = f"Please check balance and loan eligibility for Aadhaar {raw_aadhaar}"
    
    r_chat_a = requests.post(f"{BANK_A_URL}/api/chat", json={"customer_ref": cust_ref, "prompt": chat_prompt}, timeout=10)
    assert_eq(r_chat_a.status_code, 200, "Bank A chat status")
    assert_true(raw_aadhaar in r_chat_a.json()["provider_saw"], "Bank A exposed raw Aadhaar to AI provider")

    r_chat_b = requests.post(f"{BANK_B_URL}/api/chat", json={"customer_ref": cust_ref, "prompt": chat_prompt}, timeout=10)
    assert_eq(r_chat_b.status_code, 200, "Bank B chat status")
    chat_b_res = r_chat_b.json()
    assert_true(raw_aadhaar not in chat_b_res["provider_saw"], "Bank B intercepted raw Aadhaar from provider")
    assert_true("<AADHAAR_" in chat_b_res["provider_saw"], "Bank B sent AI Gateway placeholder to provider")
    assert_true(chat_b_res["audit_ok"], "Bank B AI Gateway audit trail verified")

    # 6. Authorised Officer View (Aran role switch)
    print_step(6, "Test Authorised Officer View on Bank B (Role Switch)")
    # Developer
    r_dev = requests.get(f"{BANK_B_URL}/api/officer-view/{cust_ref}?role=developer", timeout=5)
    assert_eq(r_dev.json()["fields"]["aadhaar"]["display"], tok_aadhaar, "Developer sees vault token")

    # Teller
    r_tel = requests.get(f"{BANK_B_URL}/api/officer-view/{cust_ref}?role=teller", timeout=5)
    masked_aadhaar = "XXXXXXXX" + raw_aadhaar[-4:]
    assert_eq(r_tel.json()["fields"]["aadhaar"]["display"], masked_aadhaar, "Teller sees masked Aadhaar")

    # Compliance Officer
    r_comp = requests.get(f"{BANK_B_URL}/api/officer-view/{cust_ref}?role=compliance", timeout=5)
    assert_eq(r_comp.json()["fields"]["aadhaar"]["display"], raw_aadhaar, "Compliance sees full plaintext")
    assert_true("Demo role switch" in r_comp.json()["disclaimer"], "Role switch disclaimer present")

    # 7. Breach Dump & Trace
    print_step(7, "Simulate Database Exfiltration Breach & Firewall Trace")
    # Bank A
    r_breach_a = requests.get(f"{BANK_A_URL}/api/breach", timeout=5)
    dump_a = r_breach_a.json()["dump"]
    assert_true(raw_aadhaar in dump_a, "Bank A breach dump contains raw Aadhaar")

    r_trace_a = requests.post(f"{BANK_A_URL}/api/trace-dump", json={"dump": dump_a}, timeout=10)
    trace_a = r_trace_a.json()["trace"]
    assert_eq(trace_a["matched"], 0, "Bank A trace matched 0 vault tokens")
    assert_true(trace_a.get("raw_identifiers_in_dump", 0) > 0 or len(trace_a.get("raw_matches", [])) > 0,
                "Bank A trace flagged raw identifiers in dump")

    # Bank B
    r_breach_b = requests.get(f"{BANK_B_URL}/api/breach", timeout=5)
    dump_b = r_breach_b.json()["dump"]
    assert_true(raw_aadhaar not in dump_b, "Bank B breach dump contains NO raw Aadhaar")

    r_trace_b = requests.post(f"{BANK_B_URL}/api/trace-dump", json={"dump": dump_b}, timeout=10)
    trace_b = r_trace_b.json()["trace"]
    assert_true(trace_b["matched"] > 0, "Bank B trace matched vault tokens")
    top_sink = (trace_b.get("top") or {}).get("sink")
    assert_true(top_sink in ("kyc-archive", "log-platform", "txn-log", "fraud-desk", "analytics", "sms", "support-chat"), f"Bank B trace sink attribution: {top_sink}")

    # 8. Erasure Execution & Verification
    print_step(8, "Execute DPDP Erasure on Bank A vs Bank B")
    # Bank A: Row deletion only
    r_erase_a = requests.post(f"{BANK_A_URL}/api/erase/{cust_ref}", timeout=5)
    assert_eq(r_erase_a.status_code, 200, "Bank A erase status")
    assert_eq(r_erase_a.json()["status"], "deleted_row_only", "Bank A deleted row only")

    # Confirm Bank A residual copies remain in logs and chat
    db_view_a = requests.get(f"{BANK_A_URL}/api/db-view", timeout=5).json()
    assert_true(not any(c["customer_ref"] == cust_ref for c in db_view_a["customers"]), "Customer row gone from Bank A")
    assert_true(any(raw_aadhaar in l["message"] for l in db_view_a["logs"]), "Residual copy STILL in Bank A logs")
    assert_true(any(raw_aadhaar in ch["prompt"] for ch in db_view_a["chat_history"]), "Residual copy STILL in Bank A chat")

    # Bank B: Cryptographic shredding
    r_erase_b = requests.post(f"{BANK_B_URL}/api/erase/{cust_ref}", timeout=10)
    assert_eq(r_erase_b.status_code, 200, "Bank B erase status")
    erase_b_res = r_erase_b.json()
    assert_eq(erase_b_res["status"], "crypto_shredded", "Bank B crypto-shredded")
    
    # Verify post-quantum receipt
    receipt = erase_b_res["receipt"]
    assert_eq(receipt["alg"], "Ed25519+ML-DSA-65", "Receipt algorithm is hybrid post-quantum")
    assert_true(erase_b_res["verification"]["valid"], "Receipt cryptographically valid")
    assert_true(erase_b_res["verification"]["signature_valid"], "Ed25519 signature valid")
    assert_true(erase_b_res["verification"]["post_quantum_valid"], "ML-DSA-65 signature valid")
    assert_true(erase_b_res["verification"]["included_in_log"], "Merkle log inclusion verified")

    # 9. Verify tokens permanently unreadable
    print_step(9, "Verify Bank B tokens are permanently unreadable via detokenise")
    r_detok_after = requests.post(f"{ARAN_URL}/api/detokenise", headers=get_core_headers(), json={"token": tok_aadhaar, "caller": "smoke"}, timeout=5)
    assert_eq(r_detok_after.json()["status"], "erased", "Aadhaar token status is erased")
    assert_eq(r_detok_after.json()["value"], None, "Detokenised value is None")

    # Verify officer view reflects erased status
    r_officer_after = requests.get(f"{BANK_B_URL}/api/officer-view/{cust_ref}?role=compliance", timeout=5)
    aad_status = r_officer_after.json()["fields"]["aadhaar"]["status"]
    assert_eq(aad_status, "erased", "Officer view reports erased status")

    print("\n" + "=" * 65)
    print(" ALL 9 E2E SMOKE TEST STEPS PASSED SUCCESSFULLY! ")
    print("=" * 65)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ SMOKE TEST FAILED: {e}", file=sys.stderr)
        sys.exit(1)

