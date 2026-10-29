#!/usr/bin/env python3
"""End-to-end smoke test for Aran against http://127.0.0.1:8000."""
import json
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

    # Step 3: POST /api/process with that Aadhaar inside a sentence
    # confirm findings is non-empty and output no longer contains the raw number
    def step3():
        sentence = f"Customer identity verification requested for Aadhaar {valid_aadhaar} at branch."
        target_sink = "log-platform"
        r = requests.post(f"{BASE_URL}/api/process", json={
            "text": sentence,
            "source": "mobile-app",
            "sink": target_sink,
        }, timeout=10)
        if r.status_code != 200:
            raise RuntimeError(f"Expected status 200, got {r.status_code}: {r.text}")
        data = r.json()
        findings = data.get("findings", [])
        if not findings:
            raise RuntimeError(f"Expected findings to be non-empty, got: {data}")
        after = data.get("after", "")
        if valid_aadhaar in after:
            raise RuntimeError(f"Raw Aadhaar {valid_aadhaar} still present in output: {after}")
        return dict(after=after, sink=target_sink)

    step3_result = run_step(3, "POST /api/process with valid Aadhaar", step3)

    # Step 4: POST /api/trace with processed output; confirm it names the sink
    def step4():
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

    run_step(4, "POST /api/trace names the sink", step4)

    # Step 5: Identify a customer and purpose that exist in the vault (use GET /api/customers),
    # tokenise one of that customer's identifiers, then POST /api/erase for that customer and purpose;
    # confirm a receipt.
    def step5():
        # Get customers
        r_custs = requests.get(f"{BASE_URL}/api/customers", timeout=10)
        if r_custs.status_code != 200:
            raise RuntimeError(f"Failed to fetch customers: {r_custs.text}")
        cust_list = r_custs.json()
        if not cust_list:
            raise RuntimeError("No customers found in vault")

        # Pick customer and purpose that is alive and not locked
        chosen_cust = None
        chosen_purpose = None
        for c in cust_list:
            for k in c.get("keys", []):
                if k.get("alive") and not k.get("locked_until"):
                    chosen_cust = c
                    chosen_purpose = k["purpose"]
                    break
            if chosen_cust:
                break

        if not chosen_cust:
            raise RuntimeError("Could not find an enrolled customer with an active unlocked purpose key")

        # Tokenise an identifier of this enrolled customer under this purpose
        # Use POST /api/sample with kind="loan" (serves purpose "Loans") or matching sink
        purpose_sink_map = {
            "Loans": "loan-vendor",
            "Service": "log-platform",
            "KYC": "kyc-archive",
            "Marketing": "marketing-cloud",
        }
        sink = purpose_sink_map.get(chosen_purpose, "loan-vendor")

        # Generate a request for this customer
        # We sample a loan application for an enrolled customer
        r_sample = requests.post(f"{BASE_URL}/api/sample", json={"kind": "loan", "who": "customer"}, timeout=10)
        if r_sample.status_code != 200:
            raise RuntimeError(f"Failed to sample customer request: {r_sample.text}")
        smp_data = r_sample.json()

        # Identify which customer was sampled from applicant name in before
        applicant_name = json.loads(smp_data["before"]).get("applicant")
        enrolled_cust = next((c for c in cust_list if c["name"] == applicant_name), chosen_cust)
        customer_ref = enrolled_cust["ref"]
        erase_purpose = "Loans"

        # Find the issued vault token
        tokens = [f["token"] for f in smp_data.get("findings", []) if f.get("token") and f.get("protected")]
        if not tokens:
            raise RuntimeError(f"No vault token returned for enrolled customer {customer_ref}: {smp_data}")
        token_to_test = tokens[0]

        # Call POST /api/erase for this customer and purpose
        r_erase = requests.post(f"{BASE_URL}/api/erase", json={
            "customer_ref": customer_ref,
            "purpose": erase_purpose,
        }, timeout=10)
        if r_erase.status_code != 200:
            raise RuntimeError(f"POST /api/erase returned status {r_erase.status_code}: {r_erase.text}")
        receipt = r_erase.json()
        if not receipt.get("signature") or not receipt.get("root"):
            raise RuntimeError(f"Incomplete erasure receipt: {receipt}")

        return dict(receipt=receipt, token=token_to_test, customer=customer_ref, purpose=erase_purpose)

    step5_result = run_step(5, "GET /api/customers, tokenise & POST /api/erase", step5)

    # Step 6: POST /api/receipts/verify with the receipt; confirm valid is true
    def step6():
        receipt = step5_result["receipt"]
        r = requests.post(f"{BASE_URL}/api/receipts/verify", json=receipt, timeout=10)
        if r.status_code != 200:
            raise RuntimeError(f"Expected status 200, got {r.status_code}: {r.text}")
        data = r.json()
        if not data.get("valid"):
            raise RuntimeError(f"Receipt verification failed: {data}")
        return data

    run_step(6, "POST /api/receipts/verify -> valid=True", step6)

    # Step 7: POST /api/detokenise with the earlier token; confirm it is no longer readable
    def step7():
        token = step5_result["token"]
        r = requests.post(f"{BASE_URL}/api/detokenise", json={"token": token, "caller": "smoke-test"}, timeout=10)
        if r.status_code != 200:
            raise RuntimeError(f"Expected status 200, got {r.status_code}: {r.text}")
        data = r.json()
        status = data.get("status")
        value = data.get("value")
        if status != "erased" or value is not None:
            raise RuntimeError(f"Token is still readable after erasure! Response: {data}")
        return data

    run_step(7, "POST /api/detokenise -> token no longer readable", step7)

    print("\nALL 7 SMOKE TEST STEPS PASSED SUCCESSFULLY!")
    sys.exit(0)


if __name__ == "__main__":
    main()
