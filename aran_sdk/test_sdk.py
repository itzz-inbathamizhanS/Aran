"""
Tests for Aran Python SDK against running stack.
"""

import json
import os
import sys
import time
import urllib.request
import pytest

# Ensure aran_sdk is on sys.path
SDK_DIR = os.path.dirname(os.path.abspath(__file__))
if SDK_DIR not in sys.path:
    sys.path.insert(0, SDK_DIR)

from aran import Aran, AranAuthError, AranScopeError, AranRateLimit, AranError


CLOUD_URL = os.environ.get("ARAN_CLOUD_URL", "http://127.0.0.1:8100")
CORE_URL = os.environ.get("ARAN_CORE_URL", "http://127.0.0.1:8000")


def get_internal_secret():
    secret = os.environ.get("ARAN_INTERNAL_SECRET")
    if not secret:
        env_local = os.path.join(os.path.dirname(__file__), "..", ".env.local")
        if os.path.exists(env_local):
            with open(env_local) as f:
                for line in f:
                    if line.startswith("ARAN_INTERNAL_SECRET="):
                        secret = line.strip().split("=", 1)[1]
    return secret


def get_sample_pii():
    secret = get_internal_secret()
    req = urllib.request.Request(
        f"{CORE_URL}/api/tour/generate",
        headers={"X-Aran-Internal": secret} if secret else {},
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


@pytest.fixture(scope="module")
def admin_key():
    req = urllib.request.Request(
        f"{CLOUD_URL}/v1/workspaces",
        data=json.dumps({"name": f"SDK Test Corp {time.time()}", "email": f"sdk_{time.time()}@test.com"}).encode("utf-8"),
        headers={"Content-Type": "application/json", "X-Forwarded-For": "10.250.1.1"},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        return data["api_key"]


def test_sdk_protect_and_detokenise(admin_key):
    client = Aran(api_key=admin_key, base_url=CLOUD_URL)
    
    sample = get_sample_pii()
    raw_aadhaar = sample["aadhaar"]

    # 1. Protect
    raw = f"Customer KYC Aadhaar: {raw_aadhaar}"
    res = client.protect(text=raw, customer_ref="SDK-CUST-1", purpose="KYC", sink="kyc-archive")
    assert res is not None
    assert "findings" in res
    assert len(res["findings"]) > 0
    token = res["findings"][0]["token"]
    assert token != raw_aadhaar
    assert len(token) > 0

    # 2. Detokenise
    detok = client.detokenise(token)
    assert detok.get("status") == "ok"
    assert detok.get("value") == raw_aadhaar


def test_sdk_gateway(admin_key):
    client = Aran(api_key=admin_key, base_url=CLOUD_URL)
    prompt = "Hello agent, customer mobile is 9876543210. Help them."
    res = client.gateway(prompt=prompt, role="customer-care")
    assert "provider_saw" in res
    saw_content = res["provider_saw"][0]["content"]
    assert "9876543210" not in saw_content
    assert "<MOBILE_1>" in saw_content or "MOBILE" in saw_content


def test_sdk_trace(admin_key):
    client = Aran(api_key=admin_key, base_url=CLOUD_URL)
    sample = get_sample_pii()
    raw_aadhaar = sample["aadhaar"]

    # Protect a token to trace
    p = client.protect(f"Aadhaar {raw_aadhaar}", customer_ref="SDK-CUST-2", sink="loan-vendor")
    tok = p["findings"][0]["token"]
    
    dump = f"Vendor dump: customer_record_token='{tok}'"
    tr = client.trace(dump)
    assert tr.get("matched", 0) > 0
    assert tr.get("top", {}).get("sink") == "loan-vendor"


def test_sdk_erase_and_verify_receipt(admin_key):
    client = Aran(api_key=admin_key, base_url=CLOUD_URL)
    sample = get_sample_pii()
    raw_card = sample["card"]

    # Protect a token under KYC
    p = client.protect(f"Card {raw_card}", customer_ref="SDK-CUST-3", purpose="KYC", sink="kyc-archive")
    tok = p["findings"][0]["token"]

    # Detokenise works before erasure
    before = client.detokenise(tok)
    assert before.get("status") == "ok"

    # Erase
    receipt = client.erase(customer_ref="SDK-CUST-3", purpose="KYC")
    assert receipt is not None
    assert "verified" in receipt or "event" in receipt

    # Detokenise fails / erased after erasure
    after = client.detokenise(tok)
    assert after.get("status") == "erased"

    # Verify receipt
    v = client.verify_receipt(receipt)
    assert v.get("valid") is True


def test_sdk_typed_error_401():
    client = Aran(api_key="aran_live_invalidkey00000000000000000", base_url=CLOUD_URL)
    with pytest.raises(AranAuthError) as exc_info:
        client.protect("Test text")
    assert exc_info.value.status_code == 401


def test_sdk_typed_error_403(admin_key):
    # Mint a key with only 'protect' scope
    req = urllib.request.Request(
        f"{CLOUD_URL}/v1/keys",
        data=json.dumps({"label": "Protect Only", "scopes": ["protect"]}).encode("utf-8"),
        headers={"Content-Type": "application/json", "X-API-Key": admin_key},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        scoped_key = json.loads(resp.read().decode("utf-8"))["api_key"]

    protect_client = Aran(api_key=scoped_key, base_url=CLOUD_URL)
    sample = get_sample_pii()
    raw_aadhaar = sample["aadhaar"]

    # protect succeeds
    res = protect_client.protect(f"Aadhaar {raw_aadhaar}", customer_ref="SDK-CUST-4")
    tok = res["findings"][0]["token"]

    # detokenise fails with 403 AranScopeError
    with pytest.raises(AranScopeError) as exc_info:
        protect_client.detokenise(tok)
    assert exc_info.value.status_code == 403
    assert "detokenise" in str(exc_info.value)


# ---------------------------------------------------------------- transactions and metrics
def _txn(txn_id, **fields):
    return {"txn_id": txn_id, "rail": "UPI", "sink": "txn-log", "purpose": "Service", "customer_ref": "SDK-CUST-T",
            "amount_paise": 245000, "fields": fields}


def test_sdk_protect_transactions_and_replay(admin_key):
    client = Aran(api_key=admin_key, base_url=CLOUD_URL)
    sample = get_sample_pii()
    tid = f"SDK-TXN-{time.time_ns()}"
    items = [_txn(tid, mobile=sample["mobile"], card=sample["card"], remarks=f"aadhaar {sample['aadhaar']}")]
    res = client.protect_transactions(items)
    assert set(res) == {"results", "latency_ms"}
    r0 = res["results"][0]
    assert r0["txn_id"] == tid and r0["replayed"] is False
    assert r0["protected"] >= 3 and r0["found"] == r0["protected"] + r0["raw"]
    assert sample["card"] not in r0["fields"]["card"] and sample["aadhaar"] not in r0["fields"]["remarks"]
    again = client.protect_transactions(items)["results"][0]
    assert again["replayed"] is True and again["fields"] == r0["fields"]


def test_sdk_protect_transactions_checks_the_batch_size(admin_key):
    client = Aran(api_key=admin_key, base_url=CLOUD_URL)
    with pytest.raises(ValueError):
        client.protect_transactions([])
    with pytest.raises(ValueError):
        client.protect_transactions([_txn(f"SDK-BIG-{i}", remarks="x") for i in range(501)])
    with pytest.raises(AranError) as exc_info:   # the server's own validation comes back as a typed error
        client.protect_transactions([dict(_txn("SDK-BAD", remarks="x"), rail="BITCOIN")])
    assert exc_info.value.status_code == 422


def test_sdk_metrics(admin_key):
    client = Aran(api_key=admin_key, base_url=CLOUD_URL)
    client.protect_transactions([_txn(f"SDK-M-{time.time_ns()}", mobile=get_sample_pii()["mobile"])])
    m = client.metrics("1h", "5m")
    assert len(m["buckets"]) == 12 and m["buckets"][-1]["partial"] is True
    assert m["totals"]["transactions"] >= 1 and "UPI" in m["by_rail"]
    assert len(client.metrics()["buckets"]) == 60
    with pytest.raises(AranError) as exc_info:
        client.metrics("7d", "1m")
    assert exc_info.value.status_code == 422


def test_sdk_metrics_needs_the_dashboard_scope(admin_key):
    req = urllib.request.Request(
        f"{CLOUD_URL}/v1/keys",
        data=json.dumps({"label": "Protect Only 2", "scopes": ["protect"]}).encode("utf-8"),
        headers={"Content-Type": "application/json", "X-API-Key": admin_key},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        scoped_key = json.loads(resp.read().decode("utf-8"))["api_key"]
    with pytest.raises(AranScopeError):
        Aran(api_key=scoped_key, base_url=CLOUD_URL).metrics()


def test_sdk_transaction_requests_without_a_server():
    """The request shape and the retry rule, checked against a tiny local server (no Aran Cloud needed)."""
    import http.server
    import threading

    seen = []
    fails = {"left": 1}

    class Handler(http.server.BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def _reply(self, code, body):
            data = json.dumps(body).encode()
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def do_POST(self):
            payload = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
            seen.append(("POST", self.path, self.headers.get("X-API-Key"), payload))
            if fails["left"]:
                fails["left"] -= 1
                return self._reply(503, {"detail": "try again"})
            self._reply(200, {"results": [], "latency_ms": 0.1})

        def do_GET(self):
            seen.append(("GET", self.path, self.headers.get("X-API-Key"), None))
            self._reply(200, {"buckets": []})

    srv = http.server.HTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    try:
        client = Aran(api_key="aran_live_stub", base_url=f"http://127.0.0.1:{srv.server_port}", backoff_factor=0.01)
        client.protect_transactions([_txn("STUB-1", remarks="x")])
        assert len(seen) == 2                       # the 503 was retried because the call is idempotent per txn_id
        assert seen[1][1] == "/v1/transactions/protect" and seen[1][2] == "aran_live_stub"
        assert seen[1][3]["transactions"][0]["txn_id"] == "STUB-1"
        client.metrics("24h", "5m")
        assert seen[-1][:3] == ("GET", "/v1/metrics?window=24h&step=5m", "aran_live_stub")
    finally:
        srv.shutdown()
