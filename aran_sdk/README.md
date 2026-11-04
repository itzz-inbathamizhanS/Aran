# Aran Python SDK

Lightweight, standard-library-only Python client for the Aran Data-Flow Firewall.

## 3-Line Quickstart

```python
from aran import Aran

client = Aran("aran_live_your_api_key_here")
res = client.protect("Customer Aadhaar: 2345 6789 0123", customer_ref="CUST-101", sink="crm-notes")
print(res["text"])  # Tokenized PII output
```

## Features

- **Standard Library Only**: Zero external dependencies (`requests`, `urllib3`, etc. are not required).
- **Scoped API Keys**: Supports granular scopes (`protect`, `gateway`, `trace`, `detokenise`, `erase`, `verify`, `dashboard`, `admin`).
- **Typed Exceptions**:
  - `AranAuthError`: HTTP 401 for invalid or revoked credentials.
  - `AranScopeError`: HTTP 403 when a key lacks the necessary operation scope.
  - `AranRateLimit`: HTTP 429 when per-key (300/min) or signup limits are exceeded, with `retry_after`.
  - `AranError`: General API or network failures.
- **Resilient**: Automatic exponential backoff retries on transient network errors and HTTP 5xx responses for idempotent operations (`trace`, `detokenise`, `verify_receipt`).


## Bank transactions

```python
client = Aran("aran_live_your_api_key_here")
res = client.protect_transactions([{
    "txn_id": "TXN-B-000001", "rail": "UPI", "sink": "txn-log", "purpose": "Service",
    "customer_ref": "CUST-B0001", "amount_paise": 245000,
    "fields": {"payer_account": "50100123456789", "payee": "ravi@okicici", "mobile": "9876543210", "remarks": "rent"},
}])
for r in res["results"]:
    print(r["txn_id"], r["fields"], r["found"], r["protected"], r["raw"], r["latency_ms"], r["replayed"])
```

- `protect_transactions(transactions)` takes 1 to 500 items (rail: UPI, IMPS, NEFT, RTGS, CARD or OTHER; at most 20 fields, 4 KB each) and returns the protected text of every field. The money never waits on it: send the copies (log, fraud tool, analytics, chat) through it and store what comes back.
- It is **idempotent per (txn_id, sink)**: sending the same transaction again returns the stored result with `replayed: True` and is not metered twice, so the SDK retries it on network errors and HTTP 5xx.
- The cloud keeps only the protected text and counts, never the raw values.
- `metrics(window="1h", step="1m")` returns zero-filled time buckets (the current one has `partial: True`), totals with p50 / p95 latency and coverage, and breakdowns by rail, identifier type and destination. It needs a key with the `dashboard` scope.

## Verify a webhook

Aran Cloud signs every webhook it sends (headers `X-Aran-Event`, `X-Aran-Delivery`, `X-Aran-Timestamp`, `X-Aran-Signature: sha256=<hex>`). The signature is an HMAC-SHA256 of `timestamp + "." + raw body`, keyed with the secret shown once when you created the webhook. Check it on the **raw** bytes before you trust the payload:

```python
from aran import verify_webhook

# Flask-style handler
def receive(request):
    ok = verify_webhook(
        secret="whsec_...",                                   # shown once at creation
        timestamp=request.headers["X-Aran-Timestamp"],
        body=request.get_data(),                              # raw bytes, not request.json
        signature=request.headers["X-Aran-Signature"],
    )
    if not ok:
        return "bad signature", 401
    event = request.get_json()                                # {"id", "type", "data": {...}}
    return "", 204
```

`verify_webhook` also rejects a timestamp older than 5 minutes (pass `tolerance=None` to skip that). Payloads hold identifier types and counts, never the values. Answer with any 2xx; Aran retries other answers after 1 s, 5 s, 30 s, 2 min and 10 min (5 attempts in all).

## AI gateway: change the base URL only

Point your AI client at Aran and use your Aran key as the API key. Prompts are cleaned (identifiers become tokens, under your policy) before they reach a model. Nothing else in your code changes.

```python
import anthropic
from aran import Aran

aran = Aran("aran_live_xxx", base_url="https://cloud.example.com")
client = anthropic.Anthropic(api_key="aran_live_xxx", base_url=aran.ai_base_url())      # was: the default URL
reply = client.messages.create(model="claude-sonnet-4-5", max_tokens=200,
                               messages=[{"role": "user", "content": "Summarise the case of PAN ABCDE1234F"}])
```

For the OpenAI SDK use `base_url=aran.ai_base_url("openai")`. The key needs the `gateway` scope. Optional headers: `X-Aran-Policy` (a policy name), `X-Aran-Role` (`kyc-officer`, `customer-care` or `analyst`: tokens the role may see are restored in the answer; without it tokens stay), `X-Aran-Customer-Ref`. `stream=true` is not supported yet. Your Aran key is never sent to the model provider; the server holds the provider key. With no provider key configured the gateway answers with a local echo so you can try it offline.

