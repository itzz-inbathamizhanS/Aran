#!/usr/bin/env python3
"""aran_cloud/smoke_test.py: End-to-end integration and smoke test for Aran Cloud (preview).

Validates:
1. Workspace Signup & Key Generation (single-use raw key, SHA-256 stored).
2. Key Authentication & 401 enforcement.
3. Protect Write Path: namespacing, tokenisation, namespace stripping.
4. Metering & Dashboard: isolated counts, p50/p95 latency from tenant usage events.
5. Cross-Tenant Owner Isolation Safeguards: zero leakage of customer_refs across tenants.
6. Erasure & Receipt Storage: Ed25519 + ML-DSA-65 receipts stored and verified.
7. Restart Persistence: kills and restarts Aran Cloud process; verifies keys and metrics persist.
"""

import os
import subprocess
import sys
import time
import requests

CLOUD_URL = os.environ.get("ARAN_CLOUD_URL", "http://127.0.0.1:8100")
CORE_URL = os.environ.get("ARAN_CORE_URL", "http://127.0.0.1:8000")


def print_step(n, msg):
    step_str = f"{n:02d}" if isinstance(n, int) else str(n)
    print(f"\n[Step {step_str}] {msg}")


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
    print(" Running Aran Cloud SaaS Smoke Test Suite")
    print("=" * 65)

    # 1. Connectivity
    print_step(1, "Check Aran Core & Aran Cloud service health")
    r_core = requests.get(f"{CORE_URL}/api/health", timeout=5)
    assert_eq(r_core.status_code, 200, "Aran Core status")
    assert_true(r_core.json().get("ready"), "Aran Core ready flag")

    r_cloud_home = requests.get(f"{CLOUD_URL}/", timeout=5)
    assert_eq(r_cloud_home.status_code, 200, "Aran Cloud landing page status")

    # 2. Signup
    print_step(2, "Workspace signup & key generation (POST /v1/workspaces)")
    r_ws = requests.post(f"{CLOUD_URL}/v1/workspaces", json={
        "name": "Cloud Smoke Corp",
        "email": "dev@smoke.io"
    }, timeout=5)
    assert_eq(r_ws.status_code, 200, "Workspace creation status")
    ws_data = r_ws.json()
    t_id = ws_data["tenant_id"]
    api_key = ws_data["api_key"]
    assert_true(t_id.startswith("t_"), f"Tenant ID prefix ({t_id})")
    assert_true(api_key.startswith("aran_live_") and len(api_key) == 42, f"API key format: {api_key[:16]}...")

    # 3. Key Authentication (401 checks)
    print_step(3, "Enforce API key authentication (401 on missing/invalid keys)")
    r_no_key = requests.post(f"{CLOUD_URL}/v1/protect", json={"text": "hello"}, timeout=5)
    assert_eq(r_no_key.status_code, 401, "Missing key rejected with 401")
    assert_true("Invalid, missing or revoked" in r_no_key.json()["detail"], "Clear 401 message")

    r_bad_key = requests.post(f"{CLOUD_URL}/v1/protect", headers={"X-API-Key": "aran_live_badkey_000000000000000000"}, json={"text": "hello"}, timeout=5)
    assert_eq(r_bad_key.status_code, 401, "Invalid key rejected with 401")

    # 4. Protect write path
    print_step(4, "Protect customer PII (POST /v1/protect with namespacing)")
    sample = requests.get(f"{CORE_URL}/api/tour/generate", timeout=5).json()
    aadhaar = sample["aadhaar"]
    card = sample["card"]
    cust_ref = "CUST-SMK-001"

    r_prot = requests.post(f"{CLOUD_URL}/v1/protect", headers={"X-API-Key": api_key}, json={
        "text": f"Customer Sunita with Aadhaar {aadhaar} and Card {card}",
        "customer_ref": cust_ref,
        "purpose": "KYC",
        "sink": "kyc-archive"
    }, timeout=10)
    assert_eq(r_prot.status_code, 200, "Protect status")
    prot_data = r_prot.json()

    f_aad = next(f for f in prot_data["findings"] if f["type"] == "AADHAAR")
    f_crd = next(f for f in prot_data["findings"] if f["type"] == "CARD")
    assert_eq(f_aad["customer_ref"], cust_ref, "Aadhaar customer_ref namespace stripped for tenant")
    assert_eq(f_crd["customer_ref"], cust_ref, "Card customer_ref namespace stripped for tenant")
    assert_true(f_aad["erasable"], "Aadhaar token is erasable")
    tok_aadhaar = f_aad["token"]

    # 5. Dashboard metrics
    print_step(5, "Verify isolated dashboard metrics (GET /v1/dashboard)")
    r_dash = requests.get(f"{CLOUD_URL}/v1/dashboard", headers={"X-API-Key": api_key}, timeout=5)
    assert_eq(r_dash.status_code, 200, "Dashboard status")
    dash = r_dash.json()
    assert_eq(dash["tenant"]["id"], t_id, "Dashboard tenant ID")
    assert_true(dash["metrics"]["identifiers_protected"] >= 2, "Protected count >= 2")
    assert_eq(dash["metrics"]["requests_this_month"], 1, "Requests count == 1")
    assert_true(dash["metrics"]["p95_ms"] > 0, f"p95 latency computed: {dash['metrics']['p95_ms']}ms")
    assert_true("Aran Cloud (preview)" in dash["preview_notice"], "Preview disclaimer present")

    # 6. Two-tenant isolation safeguard
    print_step(6, "Verify cross-tenant owner isolation safeguard (zero customer_ref leakage)")
    # Create second tenant
    r_t2 = requests.post(f"{CLOUD_URL}/v1/workspaces", json={"name": "Tenant Beta", "email": "beta@tenant.io"}, timeout=5).json()
    key_t2 = r_t2["api_key"]

    # Tenant 2 sends the SAME Aadhaar under their own customer_ref
    r_prot2 = requests.post(f"{CLOUD_URL}/v1/protect", headers={"X-API-Key": key_t2}, json={
        "text": f"Customer Beta with Aadhaar {aadhaar}",
        "customer_ref": "CUST-BETA-CONFIDENTIAL",
        "purpose": "KYC"
    }, timeout=10).json()

    f_aad2 = next(f for f in r_prot2["findings"] if f["type"] == "AADHAAR")
    assert_eq(f_aad2["customer_ref"], None, "Tenant Beta customer_ref is None (NEVER reveals Tenant 1 ref)")
    assert_true(f_aad2["owner_conflict"], "Owner conflict flag is True")
    assert_true(any("identifier already enrolled elsewhere" in n for n in r_prot2.get("notes", [])),
                "Clean isolation note present")

    # Confirm Tenant 2 dashboard contains ZERO events from Tenant 1
    dash_t2 = requests.get(f"{CLOUD_URL}/v1/dashboard", headers={"X-API-Key": key_t2}, timeout=5).json()
    assert_eq(dash_t2["metrics"]["requests_this_month"], 1, "Tenant 2 has exactly 1 request")
    assert_true(not any(e["customer_ref"] == cust_ref for e in dash_t2["recent_activity"]),
                "Tenant 1 customer_ref completely absent from Tenant 2 dashboard activity")

    # 7. Cross-Tenant Token Ownership & Isolation (Detokenise & Trace)
    print_step(7, "Cross-tenant token isolation: detokenise and trace access control")
    # Beta calls detokenise with Alpha's token -> MUST get "unknown"
    r_beta_detok = requests.post(f"{CLOUD_URL}/v1/detokenise", headers={"X-API-Key": key_t2}, json={"token": tok_aadhaar}, timeout=5).json()
    assert_eq(r_beta_detok["status"], "unknown", "Tenant Beta detokenising Alpha's token receives 'unknown'")
    assert_eq(r_beta_detok["value"], None, "Tenant Beta receives None value for Alpha's token")
    assert_true("Not a vault token" in r_beta_detok.get("reason", ""), "Standard unknown token reason returned")

    # Alpha calls detokenise with its own token -> receives "ok" and actual decrypted value
    r_alpha_detok = requests.post(f"{CLOUD_URL}/v1/detokenise", headers={"X-API-Key": api_key}, json={"token": tok_aadhaar}, timeout=5).json()
    assert_eq(r_alpha_detok["status"], "ok", "Tenant Alpha detokenises its own token successfully ('ok')")
    assert_eq(r_alpha_detok["value"], aadhaar, "Tenant Alpha detokenises to correct original Aadhaar value")

    # Breach dump containing Alpha's token
    dump_text = f"CONFIDENTIAL EXFILTRATION DUMP:\nrecord: token={tok_aadhaar} sink=kyc-archive\nstatus: raw_leak"

    # Beta traces the dump containing Alpha's token -> zero matches, no top sink, empty ranking
    r_beta_trace = requests.post(f"{CLOUD_URL}/v1/trace", headers={"X-API-Key": key_t2}, json={"dump": dump_text}, timeout=5).json()
    assert_eq(r_beta_trace["matched"], 0, "Tenant Beta trace on Alpha's token reports matched == 0")
    assert_eq(r_beta_trace["top"], None, "Tenant Beta trace on Alpha's token reports top == None")
    assert_eq(len(r_beta_trace["ranking"]), 0, "Tenant Beta trace on Alpha's token reports empty ranking")

    # Alpha traces the dump containing its own token -> resolves match and identifies top sink
    r_alpha_trace = requests.post(f"{CLOUD_URL}/v1/trace", headers={"X-API-Key": api_key}, json={"dump": dump_text}, timeout=5).json()
    assert_true(r_alpha_trace["matched"] >= 1, f"Tenant Alpha trace reports matched >= 1 (got {r_alpha_trace['matched']})")
    assert_true(r_alpha_trace["top"] is not None, "Tenant Alpha trace has top sink identification")
    assert_eq(r_alpha_trace["top"]["sink"], "kyc-archive", "Tenant Alpha trace correctly identifies 'kyc-archive' sink")

    # 8. AI Gateway Placeholder Token Ownership
    print_step(8, "AI Gateway token ownership recording in cloud.db")
    r_gw = requests.post(f"{CLOUD_URL}/v1/gateway", headers={"X-API-Key": api_key}, json={
        "role": "customer-care",
        "text": f"Customer card is {card}"
    }, timeout=10).json()
    assert_true(r_gw.get("findings_in_prompt", 0) >= 1, "Gateway detected prompt PII")

    # 9. Dashboard Metric: Passed unprotected
    print_step(9, "Verify 'Passed unprotected' dashboard metric calculation")
    # Send text with an invalid checksum Aadhaar that passes through unchanged
    requests.post(f"{CLOUD_URL}/v1/protect", headers={"X-API-Key": api_key}, json={
        "text": "Bogus invalid Aadhaar 1234 5678 9012 passed into system",
        "customer_ref": "CUST-UNPROT-TEST",
        "purpose": "KYC"
    }, timeout=10)
    dash_unprot = requests.get(f"{CLOUD_URL}/v1/dashboard", headers={"X-API-Key": api_key}, timeout=5).json()
    assert_true("passed_unprotected" in dash_unprot["metrics"], "'passed_unprotected' present in dashboard metrics")
    assert_true(dash_unprot["metrics"]["passed_unprotected"] >= 1,
                f"Passed unprotected count >= 1 (got {dash_unprot['metrics']['passed_unprotected']})")

    # 10. Erase and Receipt Storage
    print_step(10, "Execute erasure & verify stored post-quantum receipts")
    r_erase = requests.post(f"{CLOUD_URL}/v1/erase", headers={"X-API-Key": api_key}, json={
        "customer_ref": cust_ref,
        "purpose": "KYC"
    }, timeout=10)
    assert_eq(r_erase.status_code, 200, "Erasure status")
    receipt = r_erase.json()
    assert_eq(receipt["alg"], "Ed25519+ML-DSA-65", "Receipt algorithm")
    assert_eq(receipt["tenant_customer_ref"], cust_ref, "Receipt outer customer ref un-namespaced")

    # Verify receipt via /v1/receipts/verify
    r_ver = requests.post(f"{CLOUD_URL}/v1/receipts/verify", headers={"X-API-Key": api_key}, json=receipt, timeout=5).json()
    assert_true(r_ver.get("valid"), "Receipt verification valid")
    assert_true(r_ver.get("post_quantum_valid"), "Post-quantum ML-DSA-65 signature verified")

    # Confirm receipt stored in tenant dashboard
    dash_after_erase = requests.get(f"{CLOUD_URL}/v1/dashboard", headers={"X-API-Key": api_key}, timeout=5).json()
    assert_true(dash_after_erase["metrics"]["receipts_count"] >= 1, "Receipt recorded in dashboard")
    saved_receipt = next(r for r in dash_after_erase["receipts"] if r["customer_ref"] == cust_ref)
    assert_eq(saved_receipt["alg"], "Ed25519+ML-DSA-65", "Dashboard stored receipt algorithm")

    # Confirm token is permanently erased via detokenise for Alpha
    r_detok = requests.post(f"{CLOUD_URL}/v1/detokenise", headers={"X-API-Key": api_key}, json={"token": tok_aadhaar}, timeout=5).json()
    assert_eq(r_detok["status"], "erased", "Detokenise reports erased status for Alpha")
    assert_eq(r_detok["value"], None, "Detokenised value is None")

    # Confirm Tenant Beta STILL receives "unknown" with zero hint of erasure
    r_beta_detok_after = requests.post(f"{CLOUD_URL}/v1/detokenise", headers={"X-API-Key": key_t2}, json={"token": tok_aadhaar}, timeout=5).json()
    assert_eq(r_beta_detok_after["status"], "unknown", "Tenant Beta still receives 'unknown' for erased token")
    assert_eq(r_beta_detok_after["value"], None, "Tenant Beta receives None for erased token")

    # 11. Restart Persistence Test
    print_step(11, "Test restart persistence across process reboot")
    print("  ▶ Restarting Aran Cloud process...")
    # Find PID on port 8100
    pid_res = subprocess.run(["lsof", "-Pi", ":8100", "-sTCP:LISTEN", "-t"], capture_output=True, text=True)
    if pid_res.stdout.strip():
        subprocess.run(["kill", "-9", pid_res.stdout.strip()])
        time.sleep(1)

    # Relaunch Aran Cloud on 8100
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    venv_py = os.path.join(repo_root, ".venv", "bin", "python3")
    proc = subprocess.Popen(
        [venv_py, "-m", "uvicorn", "main:app", "--port", "8100"],
        cwd=os.path.join(repo_root, "aran_cloud"),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    time.sleep(2)

    # Verify key and metrics persist in cloud.db
    r_persist = requests.get(f"{CLOUD_URL}/v1/dashboard", headers={"X-API-Key": api_key}, timeout=5)
    assert_eq(r_persist.status_code, 200, "API key valid after restart")
    persist_data = r_persist.json()
    assert_eq(persist_data["tenant"]["name"], "Cloud Smoke Corp", "Tenant name preserved")
    assert_true(persist_data["metrics"]["identifiers_protected"] >= 2, "Metrics preserved across reboot")
    assert_true(persist_data["metrics"]["receipts_count"] >= 1, "Erasure receipts preserved in cloud.db")

    print("\n" + "=" * 65)
    print(" ALL 11 ARAN CLOUD SMOKE TEST STEPS PASSED SUCCESSFULLY! ")
    print("=" * 65)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ ARAN CLOUD SMOKE TEST FAILED: {e}", file=sys.stderr)
        sys.exit(1)
