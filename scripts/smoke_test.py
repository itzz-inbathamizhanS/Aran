#!/usr/bin/env python3
"""End-to-end smoke test for Aran against http://127.0.0.1:8000."""
import json
import secrets
import sys
import time
import requests

BASE_URL = "http://127.0.0.1:8000"


def run_step(step_num, name, fn):
    t0 = time.perf_counter()
    try:
        res = fn()
        lat_ms = (time.perf_counter() - t0) * 1000
        print(f"Step {step_num} ({name}): PASS ({lat_ms:.2f} ms)")
        return res
    except Exception as e:
        lat_ms = (time.perf_counter() - t0) * 1000
        print(f"Step {step_num} ({name}): FAIL ({lat_ms:.2f} ms) - {e}")
        sys.exit(1)


def main():
    print(f"Starting Aran E2E Smoke Test against {BASE_URL}...\n")

    # Step 1: GET /api/health and confirm ready is true
    def step1():
        r = requests.get(f"{BASE_URL}/api/health", timeout=10)
        if r.status_code != 200:
            raise RuntimeError(f"Expected status 200, got {r.status_code}: {r.text}")
        data = r.json()
        if not data.get("ready"):
            raise RuntimeError(f"Server is not ready: {data}")
        return data

    run_step(1, "GET /api/health -> ready=True", step1)

    # Step 2: GET /api/tour/generate for a valid Aadhaar
    def step2():
        r = requests.get(f"{BASE_URL}/api/tour/generate", timeout=10)
        if r.status_code != 200:
            raise RuntimeError(f"Expected status 200, got {r.status_code}: {r.text}")
        data = r.json()
        aadhaar = data.get("aadhaar")
        if not aadhaar or len(aadhaar) != 12 or not aadhaar.isdigit():
            raise RuntimeError(f"Invalid generated Aadhaar: {data}")
        return aadhaar

    valid_aadhaar = run_step(2, "GET /api/tour/generate for valid Aadhaar", step2)

    # Single customer ref and purpose for the continuous path
    smoke_cust = f"CUST-SMOKE-{secrets.token_hex(4)}"
    smoke_purpose = "Service"
    target_sink = "log-platform"

    # Step 3: POST /api/process with a NEW customer_ref and that Aadhaar
    # Assert finding has erasable: True and capture token
    def step3():
        sentence = f"Customer identity verification requested for Aadhaar {valid_aadhaar} at branch."
        r = requests.post(f"{BASE_URL}/api/process", json={
            "text": sentence,
            "source": "mobile-app",
            "sink": target_sink,
            "customer_ref": smoke_cust,
            "purpose": smoke_purpose,
        }, timeout=10)
        if r.status_code != 200:
            raise RuntimeError(f"Expected status 200, got {r.status_code}: {r.text}")
        data = r.json()
        findings = data.get("findings", [])
        if not findings:
            raise RuntimeError(f"Expected findings to be non-empty, got: {data}")
        f0 = findings[0]
        if not f0.get("erasable"):
            raise RuntimeError(f"Expected finding to have erasable=True (vault path), got: {f0}")
        token = f0.get("token")
        if not token:
            raise RuntimeError(f"No token issued in finding: {f0}")
        after = data.get("after", "")
        if valid_aadhaar in after:
            raise RuntimeError(f"Raw Aadhaar {valid_aadhaar} still present in output: {after}")
        return dict(after=after, sink=target_sink, token=token, customer=smoke_cust, purpose=smoke_purpose)

    step3_result = run_step(3, "POST /api/process with NEW customer_ref (vault path)", step3)

    # Step 4: POST /api/detokenise BEFORE erasure; assert original Aadhaar readable
    def step4():
        tok = step3_result["token"]
        r = requests.post(f"{BASE_URL}/api/detokenise", json={"token": tok, "caller": "smoke-test"}, timeout=10)
        if r.status_code != 200:
            raise RuntimeError(f"Expected status 200, got {r.status_code}: {r.text}")
        data = r.json()
        if data.get("status") != "ok" or data.get("value") != valid_aadhaar:
            raise RuntimeError(f"Expected readable value '{valid_aadhaar}', got: {data}")
        return data

    run_step(4, "POST /api/detokenise BEFORE erasure -> owner reads original value", step4)

    # Step 5: POST /api/trace with processed output; confirm it names the sink
    def step5():
        dump_text = step3_result["after"]
        expected_sink = step3_result["sink"]
        r = requests.post(f"{BASE_URL}/api/trace", json={"dump": dump_text}, timeout=10)
        if r.status_code != 200:
            raise RuntimeError(f"Expected status 200, got {r.status_code}: {r.text}")
        data = r.json()
        top_sink = (data.get("top") or {}).get("sink")
        if top_sink != expected_sink:
            raise RuntimeError(f"Expected trace to name '{expected_sink}', got '{top_sink}': {data}")
        return data

    run_step(5, "POST /api/trace names the sink", step5)

    # Step 6: POST /api/erase for that customer and purpose; confirm receipt
    def step6():
        r = requests.post(f"{BASE_URL}/api/erase", json={
            "customer_ref": smoke_cust,
            "purpose": smoke_purpose,
        }, timeout=10)
        if r.status_code != 200:
            raise RuntimeError(f"Expected status 200, got {r.status_code}: {r.text}")
        receipt = r.json()
        if not receipt.get("signature") or not receipt.get("root"):
            raise RuntimeError(f"Incomplete erasure receipt: {receipt}")
        return receipt

    receipt = run_step(6, "POST /api/erase for customer and purpose -> receipt", step6)

    # Step 7: POST /api/receipts/verify with receipt; confirm valid=True
    def step7():
        r = requests.post(f"{BASE_URL}/api/receipts/verify", json=receipt, timeout=10)
        if r.status_code != 200:
            raise RuntimeError(f"Expected status 200, got {r.status_code}: {r.text}")
        data = r.json()
        if not data.get("valid"):
            raise RuntimeError(f"Receipt verification failed: {data}")
        return data

    run_step(7, "POST /api/receipts/verify -> valid=True", step7)

    # Step 8: POST /api/detokenise with same token AFTER erasure; confirm status is 'erased'
    def step8():
        tok = step3_result["token"]
        r = requests.post(f"{BASE_URL}/api/detokenise", json={"token": tok, "caller": "smoke-test"}, timeout=10)
        if r.status_code != 200:
            raise RuntimeError(f"Expected status 200, got {r.status_code}: {r.text}")
        data = r.json()
        status = data.get("status")
        value = data.get("value")
        if status != "erased" or value is not None:
            raise RuntimeError(f"Token did not report erased after shredding: {data}")
        return data

    run_step(8, "POST /api/detokenise AFTER erasure -> status='erased'", step8)

    # Step 9: Old unenrolled path (no customer_ref) -> assert erasable is False
    def step9():
        r_gen = requests.get(f"{BASE_URL}/api/tour/generate", timeout=10).json()
        stranger_aadhaar = r_gen["aadhaar"]
        sentence = f"Stranger payment check with Aadhaar {stranger_aadhaar}"
        r = requests.post(f"{BASE_URL}/api/process", json={
            "text": sentence,
            "source": "console",
            "sink": "log-platform",
        }, timeout=10)
        if r.status_code != 200:
            raise RuntimeError(f"Expected 200, got {r.status_code}: {r.text}")
        data = r.json()
        findings = data.get("findings", [])
        if not findings:
            raise RuntimeError(f"Expected findings, got none: {data}")
        f0 = findings[0]
        if f0.get("erasable"):
            raise RuntimeError(f"Unenrolled customer should have erasable=False, got: {f0}")
        print("   [Explanation] Unenrolled token uses vaultless FF1 path: traceable across sinks but not shreddable.")
        return data

    run_step(9, "Unenrolled request (no customer_ref) -> erasable=False (vaultless FF1)", step9)

    # Step 10: Extra case 1 - Same Aadhaar sent with a second customer_ref (first owner wins)
    def step10():
        # First owner is a fresh customer
        cust1 = f"CUST-OWNER1-{secrets.token_hex(3)}"
        cust2 = f"CUST-OWNER2-{secrets.token_hex(3)}"
        r_gen = requests.get(f"{BASE_URL}/api/tour/generate", timeout=10).json()
        shared_aadhaar = r_gen["aadhaar"]

        # Enroll under cust1
        r_c1 = requests.post(f"{BASE_URL}/api/process", json={
            "text": f"Enrolling customer 1 with Aadhaar {shared_aadhaar}",
            "sink": "log-platform",
            "customer_ref": cust1,
            "purpose": "Service",
        }, timeout=10)
        data_c1 = r_c1.json()
        tok1 = data_c1["findings"][0]["token"]

        # Now send same Aadhaar with cust2
        r_c2 = requests.post(f"{BASE_URL}/api/process", json={
            "text": f"Attempting to re-enroll same Aadhaar {shared_aadhaar} under customer 2",
            "sink": "log-platform",
            "customer_ref": cust2,
            "purpose": "Service",
        }, timeout=10)
        data_c2 = r_c2.json()
        f2 = data_c2["findings"][0]

        # Verify owner_conflict is reported on finding and notes
        if not f2.get("owner_conflict"):
            raise RuntimeError(f"Expected owner_conflict=True on finding, got: {f2}")
        if not any("owner_conflict" in n for n in data_c2.get("notes", [])):
            raise RuntimeError(f"Expected owner_conflict note in response notes: {data_c2.get('notes')}")
        if f2.get("customer_ref") != cust1:
            raise RuntimeError(f"Expected token to be issued under original owner '{cust1}', got: {f2.get('customer_ref')}")

        tok2 = f2["token"]

        # Erase cust2 and verify tok1/tok2 are NOT broken
        r_erase2 = requests.post(f"{BASE_URL}/api/erase", json={"customer_ref": cust2, "purpose": "Service"}, timeout=10)
        if r_erase2.status_code != 200:
            raise RuntimeError(f"Erasing cust2 failed: {r_erase2.text}")

        # tok2 was issued under cust1, so detokenise must still succeed!
        r_detok = requests.post(f"{BASE_URL}/api/detokenise", json={"token": tok2, "caller": "smoke"}, timeout=10)
        if r_detok.json().get("status") != "ok" or r_detok.json().get("value") != shared_aadhaar:
            raise RuntimeError(f"Token issued under cust1 was mistakenly erased when cust2 was erased! {r_detok.json()}")

        # Now erase cust1 and verify token is erased
        r_erase1 = requests.post(f"{BASE_URL}/api/erase", json={"customer_ref": cust1, "purpose": "Service"}, timeout=10)
        if r_erase1.status_code != 200:
            raise RuntimeError(f"Erasing cust1 failed: {r_erase1.text}")

        r_detok_after = requests.post(f"{BASE_URL}/api/detokenise", json={"token": tok2, "caller": "smoke"}, timeout=10)
        if r_detok_after.json().get("status") != "erased":
            raise RuntimeError(f"Token not erased after cust1 erasure: {r_detok_after.json()}")

        return True

    run_step(10, "Extra Case: Same identifier with 2 customer_refs (owner conflict & isolated erasure)", step10)

    # Step 11: Extra case 2 - Invalid customer_ref returns 422
    def step11():
        r = requests.post(f"{BASE_URL}/api/process", json={
            "text": "Valid test with invalid ref",
            "customer_ref": "../bad/path",
            "sink": "log-platform",
        }, timeout=10)
        if r.status_code != 422:
            raise RuntimeError(f"Expected HTTP 422 for invalid customer_ref, got {r.status_code}: {r.text}")
        return r.json()

    run_step(11, "Extra Case: Invalid customer_ref ('../bad/path') -> HTTP 422", step11)

    print("\nALL 11 SMOKE TEST STEPS PASSED SUCCESSFULLY!")
    sys.exit(0)


if __name__ == "__main__":
    main()
