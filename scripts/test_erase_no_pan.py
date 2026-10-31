"""scripts/test_erase_no_pan.py: Test for KeyError fix in Engine.erase when customer has no PAN."""

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SERVER_DIR = os.path.join(HERE, "..", "app", "server")
sys.path.insert(0, SERVER_DIR)

from engine import Engine


def test_erase_customer_without_pan():
    e = Engine()
    cust_ref = "CUST-TEST-NOPAN-99"

    # 1. Process customer with Aadhaar, Card, Mobile (NO PAN)
    text = json.dumps({
        "name": "Arun Kumar",
        "mobile": "9811223344",
        "aadhaar": "999924512458",  # won't match checksum, let's use valid aadhaar
    })
    # Use valid credentials
    import synth
    r = e.rand
    aadhaar = synth.gen_aadhaar(r).replace(" ", "")
    card = synth.gen_card(r).replace(" ", "")
    mobile = synth.gen_mobile(r)[-10:]

    payload = f"Name: Arun Kumar, Mobile: {mobile}, Aadhaar: {aadhaar}, Card: {card}"
    res = e.process(payload, source="core-banking", sink="kyc-archive",
                    customer_ref=cust_ref, purpose="KYC")

    # Assert customer is enrolled
    assert cust_ref in e.customers
    assert "PAN" not in e.customers[cust_ref], f"PAN should not be in customer record: {e.customers[cust_ref]}"

    # 2. Erase purpose KYC - must NOT raise KeyError
    receipt = e.erase(cust_ref, "KYC")
    assert receipt is not None
    assert receipt["event"]["customer"] == cust_ref
    assert receipt["event"]["purpose"] == "KYC"
    print("✔ test_erase_customer_without_pan passed successfully!")


if __name__ == "__main__":
    test_erase_customer_without_pan()
