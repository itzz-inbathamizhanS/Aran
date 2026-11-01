"""
Tests for the transaction API of Aran Cloud: /v1/transactions/protect, /v1/transactions, /v1/metrics, /v1/stream,
/v1/usage, /v1/plan, /v1/team, /v1/slo and /v1/settings.

They run against a live Aran Cloud (ARAN_CLOUD_URL, default http://127.0.0.1:8100) in front of a live core, started with
ARAN_LOCAL_SIGNUPS=1 so that signups from this machine are not rate limited. The database file is read to prove that no raw
value is ever stored: set ARAN_CLOUD_DB to the same path the server uses.
"""

import glob
import json
import os
import random
import sqlite3
import threading
import time

import pytest
import requests

CLOUD_URL = os.environ.get("ARAN_CLOUD_URL", "http://127.0.0.1:8100")
CORE_URL = os.environ.get("ARAN_CORE_URL", "http://127.0.0.1:8000")
CLOUD_DB = os.environ.get("ARAN_CLOUD_DB") or os.path.join(os.path.dirname(__file__), "cloud.db")


def internal_headers():
    secret = os.environ.get("ARAN_INTERNAL_SECRET")
    if not secret:
        env_local = os.path.join(os.path.dirname(__file__), "..", ".env.local")
        if os.path.exists(env_local):
            with open(env_local) as f:
                for line in f:
                    if line.startswith("ARAN_INTERNAL_SECRET="):
                        secret = line.strip().split("=", 1)[1]
    return {"X-Aran-Internal": secret} if secret else {}


def sample_ids():
    r = requests.get(f"{CORE_URL}/api/tour/generate", headers=internal_headers(), timeout=5)
    r.raise_for_status()
    return r.json()


def new_workspace(label):
    body = {"name": f"{label} {time.time()}", "email": f"{label.lower().replace(' ', '')}_{random.randint(1, 10**9)}@bank.test"}
    r = requests.post(f"{CLOUD_URL}/v1/workspaces", json=body, timeout=10)
    if r.status_code == 429:  # not a demo-mode caller: use a fresh forwarded address (needs ARAN_TRUSTED_PROXIES)
        r = requests.post(f"{CLOUD_URL}/v1/workspaces", json=body, headers={"X-Forwarded-For": f"10.77.{random.randint(1, 250)}.{random.randint(1, 250)}"}, timeout=10)
    assert r.status_code == 200, r.text
    return r.json()


def H(key):
    return {"X-API-Key": key}


def mint(admin_key, label, scopes):
    r = requests.post(f"{CLOUD_URL}/v1/keys", headers=H(admin_key), json={"label": label, "scopes": scopes}, timeout=10)
    assert r.status_code == 200, r.text
    return r.json()["api_key"]


def txn(txn_id, fields, rail="UPI", sink="txn-log", **extra):
    return dict({"txn_id": txn_id, "rail": rail, "sink": sink, "purpose": "Service", "customer_ref": "CUST-T0001",
                 "amount_paise": 245000, "fields": fields}, **extra)


def protect(key, items):
    return requests.post(f"{CLOUD_URL}/v1/transactions/protect", headers=H(key), json={"transactions": items}, timeout=60)


def db_counts(tenant_id):
    conn = sqlite3.connect(CLOUD_DB)
    out = {
        "txn": conn.execute("SELECT COUNT(*) FROM txn_events WHERE tenant_id = ?", (tenant_id,)).fetchone()[0],
        "usage": conn.execute("SELECT COUNT(*) FROM usage_events WHERE tenant_id = ?", (tenant_id,)).fetchone()[0],
    }
    conn.close()
    return out


@pytest.fixture(scope="module")
def alpha():
    ws = new_workspace("Txn Alpha")
    ws["dash"] = ws["dashboard_key"]
    return ws


@pytest.fixture(scope="module")
def beta():
    ws = new_workspace("Txn Beta")
    ws["dash"] = ws["dashboard_key"]
    return ws


# ---------------------------------------------------------------- the contract
def test_protect_contract_and_field_results(alpha):
    ids = sample_ids()
    items = [txn("TXN-B-000001", {
        "payer_account": "12345678901234", "payee": "ravi.kumar@okicici", "card": ids["card"],
        "mobile": ids["mobile"], "remarks": f"rent, aadhaar {ids['aadhaar']}",
    })]
    r = protect(alpha["admin_key"], items)
    assert r.status_code == 200, r.text
    body = r.json()
    assert set(body) == {"results", "latency_ms"}
    res = body["results"][0]
    assert set(res) == {"txn_id", "sink", "fields", "found", "protected", "raw", "by_type", "latency_ms", "replayed"}
    assert res["txn_id"] == "TXN-B-000001" and res["sink"] == "txn-log" and res["replayed"] is False
    assert set(res["fields"]) == {"payer_account", "payee", "card", "mobile", "remarks"}
    assert res["found"] == res["protected"] + res["raw"] and res["protected"] >= 4
    assert ids["card"] not in res["fields"]["card"] and "ravi.kumar@okicici" not in res["fields"]["payee"]
    assert ids["aadhaar"] not in res["fields"]["remarks"]
    assert res["by_type"].get("UPI") == 1 and res["by_type"].get("CARD") == 1


def test_idempotent_replay_is_not_metered_twice(alpha):
    ids = sample_ids()
    items = [txn(f"IDEM-{i}", {"mobile": ids["mobile"], "remarks": f"x {ids['aadhaar']}"}) for i in range(3)]
    key = alpha["admin_key"]
    first = protect(key, items).json()["results"]
    before = db_counts(alpha["tenant_id"])
    dash_before = requests.get(f"{CLOUD_URL}/v1/dashboard", headers=H(key), timeout=10).json()["metrics"]
    again = protect(key, items).json()["results"]
    after = db_counts(alpha["tenant_id"])
    dash_after = requests.get(f"{CLOUD_URL}/v1/dashboard", headers=H(key), timeout=10).json()["metrics"]
    assert [x["replayed"] for x in first] == [False] * 3
    assert [x["replayed"] for x in again] == [True] * 3
    assert [x["fields"] for x in again] == [x["fields"] for x in first]   # the stored result, not a new one
    assert after == before                                                 # no new txn_events, no new usage_events
    assert dash_after["requests_this_month"] == dash_before["requests_this_month"]
    assert dash_after["identifiers_protected"] == dash_before["identifiers_protected"]
    # the same txn_id to a different sink is a different copy and is processed
    other = protect(key, [txn("IDEM-0", {"mobile": ids["mobile"]}, sink="fraud-desk")]).json()["results"][0]
    assert other["replayed"] is False
    # a duplicate inside one batch counts once
    n0 = db_counts(alpha["tenant_id"])["txn"]
    dup = protect(key, [txn("IDEM-DUP", {"mobile": ids["mobile"]})] * 2).json()["results"]
    assert [x["replayed"] for x in dup] == [False, True]
    assert db_counts(alpha["tenant_id"])["txn"] == n0 + 1


def test_usage_events_stay_consistent_with_txn_events(alpha):
    """The old dashboard sums usage_events: one metered row per stored transaction, same protected count."""
    conn = sqlite3.connect(CLOUD_DB)
    t = conn.execute("SELECT COUNT(*), COALESCE(SUM(protected),0), COALESCE(SUM(raw),0) FROM txn_events WHERE tenant_id = ?", (alpha["tenant_id"],)).fetchone()
    u = conn.execute("SELECT COUNT(*), COALESCE(SUM(protected_count),0), COALESCE(SUM(unprotected_count),0) FROM usage_events WHERE tenant_id = ? AND endpoint = '/v1/transactions/protect'", (alpha["tenant_id"],)).fetchone()
    conn.close()
    assert t == u
    d = requests.get(f"{CLOUD_URL}/v1/dashboard", headers=H(alpha["dash"]), timeout=10).json()["metrics"]
    assert d["identifiers_protected"] >= t[1] > 0


def test_no_raw_value_is_stored_anywhere_in_cloud_db(beta):
    ids = sample_ids()
    pan = "ABCPD1234E"
    vpa = "secret.person77@okhdfcbank"
    account = "50100123456789"   # 14 digits: the core has no detector for a bare account number, so it is not tokenised
    key = beta["admin_key"]
    r = protect(key, [txn("RAW-1", {"payer_account": account, "payee": vpa, "card": ids["card"], "mobile": ids["mobile"],
                                    "remarks": f"pan {pan} and aadhaar {ids['aadhaar']}"})])
    assert r.status_code == 200, r.text
    out = r.json()["results"][0]
    assert out["raw"] == 0
    secrets_ = {"aadhaar": ids["aadhaar"], "card": ids["card"], "mobile": ids["mobile"], "vpa": vpa, "pan": pan}
    # 1. the API answer has none of them
    blob = json.dumps(out)
    for name, v in secrets_.items():
        assert v not in blob, f"{name} came back raw"
    # 2. the stored list, the stream feed and the dump of every table have none of them
    listed = requests.get(f"{CLOUD_URL}/v1/transactions", headers=H(beta["dash"]), timeout=10).text
    for name, v in secrets_.items():
        assert v not in listed, f"{name} listed raw"
    conn = sqlite3.connect(CLOUD_DB)
    dump = "\n".join("\n".join(map(str, line)) for line in conn.iterdump())
    conn.close()
    for name, v in secrets_.items():
        assert v not in dump, f"{name} stored raw in cloud.db"
    # 3. nor in the database or write-ahead log files on disk
    for path in glob.glob(CLOUD_DB + "*"):
        with open(path, "rb") as f:
            data = f.read()
        for name, v in secrets_.items():
            assert v.encode() not in data, f"{name} found in {os.path.basename(path)}"
    # 4. what is stored is exactly the protected answer (the 14-digit account is not an identifier the core knows)
    conn = sqlite3.connect(CLOUD_DB)
    stored = json.loads(conn.execute("SELECT result_json FROM txn_events WHERE tenant_id = ? AND txn_id = 'RAW-1'", (beta["tenant_id"],)).fetchone()[0])
    conn.close()
    assert stored["fields"] == out["fields"]


def test_validation_and_limits(alpha):
    key = alpha["admin_key"]
    ok = txn("VAL-1", {"remarks": "hello"})
    cases = {
        "empty batch": {"transactions": []},
        "missing txn_id": {"transactions": [{"rail": "UPI", "fields": {}}]},
        "bad rail": {"transactions": [dict(ok, rail="BITCOIN")]},
        "bad purpose": {"transactions": [dict(ok, purpose="Gossip")]},
        "21 fields": {"transactions": [dict(ok, fields={f"f{i}": "x" for i in range(21)})]},
        "field over 4 KB": {"transactions": [dict(ok, fields={"remarks": "a" * 4097})]},
        "non-string value": {"transactions": [dict(ok, fields={"remarks": 12345})]},
        "bad customer_ref": {"transactions": [dict(ok, customer_ref="a b/c")]},
    }
    for name, body in cases.items():
        r = requests.post(f"{CLOUD_URL}/v1/transactions/protect", headers=H(key), json=body, timeout=10)
        assert r.status_code == 422, f"{name}: {r.status_code} {r.text[:200]}"
    # 20 fields of exactly 4096 bytes is allowed
    r = protect(key, [txn("VAL-MAX", {f"f{i}": "a" * 4096 for i in range(20)})])
    assert r.status_code == 200, r.text[:300]
    # lower-case rail is accepted
    assert protect(key, [dict(ok, txn_id="VAL-2", rail="upi")]).status_code == 200


def test_batch_of_500_is_accepted_and_501_is_refused(alpha):
    key = alpha["admin_key"]
    items = [txn(f"BULK-{i:04d}", {"remarks": f"payment {i}"}, rail="NEFT") for i in range(500)]
    r = protect(key, items)
    assert r.status_code == 200, r.text[:300]
    assert len(r.json()["results"]) == 500
    r = protect(key, items + [txn("BULK-0500", {"remarks": "one too many"})])
    assert r.status_code == 422
    # the 500 are stored once, in request order
    assert [x["txn_id"] for x in protect(key, items).json()["results"]] == [i["txn_id"] for i in items]


def test_separator_in_a_value_falls_back_and_still_protects(alpha):
    ids = sample_ids()
    nasty = f"line one\n␞\nmobile: {ids['mobile']}"
    r = protect(alpha["admin_key"], [txn("SEP-1", {"remarks": nasty, "mobile": ids["mobile"]})])
    assert r.status_code == 200, r.text
    out = r.json()["results"][0]
    assert ids["mobile"] not in json.dumps(out["fields"])
    assert out["protected"] >= 2


# ---------------------------------------------------------------- list, metrics
def test_transactions_list_filters_and_since_id(alpha):
    key = alpha["dash"]
    ids = sample_ids()
    protect(alpha["admin_key"], [txn("LIST-A", {"mobile": ids["mobile"]}, rail="IMPS", sink="analytics")])
    d = requests.get(f"{CLOUD_URL}/v1/transactions?limit=5", headers=H(key), timeout=10).json()
    assert d["count"] == 5 and d["transactions"][0]["id"] == d["max_id"]
    top = d["transactions"][0]
    assert top["txn_id"] == "LIST-A" and top["detail"]["mobile"]["protected"] == 1 and top["detail"]["mobile"]["types"] == {"MOBILE": 1}
    assert requests.get(f"{CLOUD_URL}/v1/transactions?since_id={d['max_id']}", headers=H(key), timeout=10).json()["count"] == 0
    protect(alpha["admin_key"], [txn("LIST-B", {"mobile": ids["mobile"]}, rail="IMPS", sink="analytics")])
    new = requests.get(f"{CLOUD_URL}/v1/transactions?since_id={d['max_id']}", headers=H(key), timeout=10).json()
    assert [x["txn_id"] for x in new["transactions"]] == ["LIST-B"]
    by_rail = requests.get(f"{CLOUD_URL}/v1/transactions?rail=imps&limit=200", headers=H(key), timeout=10).json()
    assert by_rail["count"] >= 2 and {x["rail"] for x in by_rail["transactions"]} == {"IMPS"}
    by_q = requests.get(f"{CLOUD_URL}/v1/transactions?q=LIST-", headers=H(key), timeout=10).json()
    assert {x["txn_id"] for x in by_q["transactions"]} == {"LIST-A", "LIST-B"}
    assert requests.get(f"{CLOUD_URL}/v1/transactions?q=%25", headers=H(key), timeout=10).json()["count"] == 0   # % is not a wildcard
    assert requests.get(f"{CLOUD_URL}/v1/transactions?limit=201", headers=H(key), timeout=10).status_code == 422


def test_metrics_buckets_are_zero_filled_and_the_last_is_partial():
    ws = new_workspace("Txn Empty")
    key = ws["dashboard_key"]
    for window, step, n in (("1h", "1m", 60), ("1h", "5m", 12), ("24h", "5m", 288), ("24h", "1h", 24), ("7d", "1h", 168)):
        m = requests.get(f"{CLOUD_URL}/v1/metrics?window={window}&step={step}", headers=H(key), timeout=10).json()
        b = m["buckets"]
        assert len(b) == n, (window, step)
        assert [x["partial"] for x in b] == [False] * (n - 1) + [True]
        assert all(x["transactions"] == 0 and x["protected"] == 0 and x["raw"] == 0 for x in b)
        assert all(x["coverage"] is None and x["p95_ms"] is None for x in b)      # no data is not "0% covered"
        assert all(b[i + 1]["t"] - b[i]["t"] == m["step_seconds"] for i in range(n - 1))
        assert m["totals"]["transactions"] == 0 and m["totals"]["coverage"] is None
        assert m["by_rail"] == {} and m["by_type"] == {} and m["by_sink"] == {}
    # default window and step
    assert len(requests.get(f"{CLOUD_URL}/v1/metrics", headers=H(key), timeout=10).json()["buckets"]) == 60


def test_metrics_counts_percentiles_and_breakdowns():
    ws = new_workspace("Txn Metrics")
    ids = sample_ids()
    rows = [txn("M-1", {"mobile": ids["mobile"]}, rail="UPI", sink="txn-log"),
            txn("M-2", {"mobile": ids["mobile"], "card": ids["card"]}, rail="CARD", sink="fraud-desk"),
            txn("M-3", {"remarks": "no identifiers here"}, rail="NEFT", sink="analytics")]
    assert protect(ws["admin_key"], rows).status_code == 200
    m = requests.get(f"{CLOUD_URL}/v1/metrics?window=1h&step=1m", headers=H(ws["dashboard_key"]), timeout=10).json()
    t = m["totals"]
    assert t["transactions"] == 3 and t["protected"] == 3 and t["raw"] == 0 and t["found"] == 3 and t["coverage"] == 1.0
    assert t["p50_ms"] is not None and t["p95_ms"] >= t["p50_ms"]
    assert m["by_rail"]["UPI"]["transactions"] == 1 and m["by_rail"]["CARD"]["protected"] == 2
    assert m["by_type"] == {"MOBILE": 2, "CARD": 1}
    assert set(m["by_sink"]) == {"txn-log", "fraud-desk", "analytics"}
    assert m["by_sink"]["fraud-desk"]["by_type"] == {"MOBILE": 1, "CARD": 1}
    cur = m["buckets"][-1]
    assert sum(x["transactions"] for x in m["buckets"]) == 3
    assert cur["partial"] is True
    for bad in ("window=2h", "step=10s", "window=7d&step=1m"):
        r = requests.get(f"{CLOUD_URL}/v1/metrics?{bad}", headers=H(ws["dashboard_key"]), timeout=10)
        assert r.status_code == 422, bad


# ---------------------------------------------------------------- tenant isolation and scopes
def test_tenant_a_cannot_read_tenant_b(alpha, beta):
    ids = sample_ids()
    marker = f"ISO-B-{random.randint(10**6, 10**7)}"
    assert protect(beta["admin_key"], [txn(marker, {"mobile": ids["mobile"]}, sink="beta-only-sink", rail="RTGS", customer_ref="BETA-CUST-1")]).status_code == 200
    a_admin = alpha["admin_key"]
    seen = {
        "transactions": requests.get(f"{CLOUD_URL}/v1/transactions?limit=200", headers=H(a_admin), timeout=10).text,
        "metrics": requests.get(f"{CLOUD_URL}/v1/metrics?window=7d&step=1h", headers=H(a_admin), timeout=10).text,
        "usage": requests.get(f"{CLOUD_URL}/v1/usage", headers=H(a_admin), timeout=10).text,
        "slo": requests.get(f"{CLOUD_URL}/v1/slo", headers=H(a_admin), timeout=10).text,
        "team": requests.get(f"{CLOUD_URL}/v1/team", headers=H(a_admin), timeout=10).text,
        "dashboard": requests.get(f"{CLOUD_URL}/v1/dashboard", headers=H(a_admin), timeout=10).text,
    }
    for name, text in seen.items():
        assert marker not in text and "beta-only-sink" not in text and "BETA-CUST-1" not in text, f"{name} leaked tenant B"
    assert beta["email"] not in seen["team"]
    # B's own view has it
    assert marker in requests.get(f"{CLOUD_URL}/v1/transactions", headers=H(beta["dash"]), timeout=10).text
    # A's stream never carries B's transactions
    got = open_stream(a_admin)
    try:
        protect(beta["admin_key"], [txn(marker + "-LIVE", {"mobile": ids["mobile"]}, sink="beta-only-sink")])
        protect(a_admin, [txn("ISO-A-LIVE", {"mobile": ids["mobile"]})])
        assert wait_for(lambda: "ISO-A-LIVE" in "".join(got["lines"]), 10)
        assert marker not in "".join(got["lines"])
    finally:
        got["resp"].close()
    # B's team member cannot be removed by A
    m = requests.post(f"{CLOUD_URL}/v1/team", headers=H(beta["admin_key"]), json={"email": "officer@beta.test", "role": "security"}, timeout=10).json()
    assert requests.delete(f"{CLOUD_URL}/v1/team/{m['id']}", headers=H(a_admin), timeout=10).status_code == 404
    assert "officer@beta.test" in requests.get(f"{CLOUD_URL}/v1/team", headers=H(beta["admin_key"]), timeout=10).text


def test_same_aadhaar_at_two_banks_keeps_the_transaction_api_safe(alpha, beta):
    """The cross-tenant owner safeguards of /v1/protect hold on the transaction path too."""
    ids = sample_ids()
    a = protect(alpha["admin_key"], [txn("OWN-A", {"remarks": f"aadhaar {ids['aadhaar']}"}, customer_ref="ALPHA-ONLY-REF")])
    b = protect(beta["admin_key"], [txn("OWN-B", {"remarks": f"aadhaar {ids['aadhaar']}"}, customer_ref="BETA-REF")])
    assert a.status_code == 200 and b.status_code == 200
    assert "ALPHA-ONLY-REF" not in b.text and "owner_conflict" not in b.text
    conn = sqlite3.connect(CLOUD_DB)
    dump = "\n".join("\n".join(map(str, line)) for line in conn.execute("SELECT * FROM txn_events WHERE tenant_id = ?", (beta["tenant_id"],)))
    conn.close()
    assert "ALPHA-ONLY-REF" not in dump


def test_scopes_are_enforced(alpha):
    admin = alpha["admin_key"]
    only_protect = mint(admin, "protect only", ["protect"])
    only_dash = mint(admin, "dashboard only", ["dashboard"])
    ids = sample_ids()
    ok = [txn("SC-1", {"mobile": ids["mobile"]})]
    # protect-only: can protect, cannot read anything
    assert protect(only_protect, ok).status_code == 200
    for path in ("/v1/metrics", "/v1/transactions", "/v1/usage", "/v1/slo", "/v1/team", "/v1/plan", "/v1/settings"):
        assert requests.get(f"{CLOUD_URL}{path}", headers=H(only_protect), timeout=10).status_code == 403, path
    assert requests.post(f"{CLOUD_URL}/v1/stream/token", headers=H(only_protect), timeout=10).status_code == 403
    assert requests.get(f"{CLOUD_URL}/v1/stream", headers=H(only_protect), timeout=10).status_code == 403
    # dashboard-only: can read the dashboard endpoints, cannot protect or change anything
    assert protect(only_dash, ok).status_code == 403
    for path in ("/v1/metrics", "/v1/transactions", "/v1/usage", "/v1/slo", "/v1/settings"):
        assert requests.get(f"{CLOUD_URL}{path}", headers=H(only_dash), timeout=10).status_code == 200, path
    for path in ("/v1/team", "/v1/plan"):
        assert requests.get(f"{CLOUD_URL}{path}", headers=H(only_dash), timeout=10).status_code == 403, path
    assert requests.post(f"{CLOUD_URL}/v1/plan", headers=H(only_dash), json={"plan": "growth"}, timeout=10).status_code == 403
    assert requests.post(f"{CLOUD_URL}/v1/team", headers=H(only_dash), json={"email": "x@y.test", "role": "admin"}, timeout=10).status_code == 403
    assert requests.put(f"{CLOUD_URL}/v1/slo", headers=H(only_dash), json={"budget_ms": 5}, timeout=10).status_code == 403
    assert requests.put(f"{CLOUD_URL}/v1/settings", headers=H(only_dash), json={"fail_safe": "mask_now"}, timeout=10).status_code == 403
    # no key at all
    for method, path in (("POST", "/v1/transactions/protect"), ("GET", "/v1/metrics"), ("GET", "/v1/transactions"),
                         ("GET", "/v1/stream"), ("POST", "/v1/stream/token"), ("GET", "/v1/usage"), ("GET", "/v1/team")):
        assert requests.request(method, f"{CLOUD_URL}{path}", json={"transactions": ok} if method == "POST" else None, timeout=10).status_code == 401, path


# ---------------------------------------------------------------- the live stream
def open_stream(key=None, token=None):
    """Opens GET /v1/stream and collects its lines in a thread."""
    if token:
        resp = requests.get(f"{CLOUD_URL}/v1/stream", params={"token": token}, stream=True, timeout=(5, 30))
    else:
        resp = requests.get(f"{CLOUD_URL}/v1/stream", headers=H(key), stream=True, timeout=(5, 30))
    assert resp.status_code == 200, resp.text
    got = {"lines": [], "resp": resp}

    def pump():
        try:
            for line in resp.iter_lines(decode_unicode=True):
                got["lines"].append(line or "")
        except Exception:
            pass

    threading.Thread(target=pump, daemon=True).start()
    assert wait_for(lambda: any(x.startswith("event: counters") for x in got["lines"]), 10), "no counters event on connect"
    return got


def wait_for(cond, seconds):
    end = time.time() + seconds
    while time.time() < end:
        if cond():
            return True
        time.sleep(0.1)
    return cond()


def test_stream_with_a_short_lived_token_pushes_protected_transactions_only():
    ws = new_workspace("Txn Stream")
    ids = sample_ids()
    tok = requests.post(f"{CLOUD_URL}/v1/stream/token", headers=H(ws["dashboard_key"]), timeout=10).json()
    assert tok["token"].startswith("ast_") and 0 < tok["expires_in"] <= 300
    got = open_stream(token=tok["token"])
    try:
        assert protect(ws["admin_key"], [txn("LIVE-1", {"mobile": ids["mobile"], "card": ids["card"]}, rail="CARD")]).status_code == 200
        assert wait_for(lambda: any(x.startswith("event: txn") for x in got["lines"]), 10)
        text = "\n".join(got["lines"])
        data = [json.loads(x[6:]) for x in got["lines"] if x.startswith("data: ") and '"txn_id"' in x]
        assert data and data[0]["txn_id"] == "LIVE-1" and data[0]["rail"] == "CARD"
        assert ids["mobile"] not in text and ids["card"] not in text      # tokens only, never the raw value
        counters = [json.loads(x[6:]) for x in got["lines"] if x.startswith("data: ") and '"transactions_today"' in x]
        assert counters and counters[0]["transactions_today"] == 0         # counts start at zero
    finally:
        got["resp"].close()


def test_stream_token_is_tenant_bound_and_expires_or_dies_with_its_key():
    ws = new_workspace("Txn Token")
    other = new_workspace("Txn Token Other")
    key = mint(ws["admin_key"], "stream key", ["dashboard"])
    tok = requests.post(f"{CLOUD_URL}/v1/stream/token", headers=H(key), timeout=10).json()["token"]
    forged = tok.replace(ws["tenant_id"], other["tenant_id"])
    assert forged != tok
    for bad in (forged, tok[:-3] + "000", "ast_garbage", "nope", ""):
        r = requests.get(f"{CLOUD_URL}/v1/stream", params={"token": bad}, timeout=10) if bad else requests.get(f"{CLOUD_URL}/v1/stream", timeout=10)
        assert r.status_code == 401, bad
    # a key in the query string is not accepted
    assert requests.get(f"{CLOUD_URL}/v1/stream", params={"key": ws["dashboard_key"]}, timeout=10).status_code == 401
    # revoking the key kills its tokens
    keys = requests.get(f"{CLOUD_URL}/v1/keys", headers=H(ws["admin_key"]), timeout=10).json()["keys"]
    kid = [k for k in keys if k["label"] == "stream key"][0]["id"]
    assert requests.delete(f"{CLOUD_URL}/v1/keys/{kid}", headers=H(ws["admin_key"]), timeout=10).status_code == 200
    assert requests.get(f"{CLOUD_URL}/v1/stream", params={"token": tok}, timeout=10).status_code == 401


# ---------------------------------------------------------------- usage, plan, team, SLO, settings
def test_usage_plan_and_soft_limit():
    ws = new_workspace("Txn Plan")
    key = ws["admin_key"]
    u = requests.get(f"{CLOUD_URL}/v1/usage", headers=H(key), timeout=10).json()
    assert u["plan"] == "sandbox" and u["limit"] == 10000 and u["used"] == 0 and u["over_limit"] is False
    assert len(u["per_day"]) >= 28 and all(d["calls"] == 0 for d in u["per_day"])
    assert set(u["plans"]) == {"sandbox", "growth", "enterprise"}
    ids = sample_ids()
    protect(key, [txn("PLAN-1", {"mobile": ids["mobile"]})])
    u = requests.get(f"{CLOUD_URL}/v1/usage", headers=H(key), timeout=10).json()
    assert u["used"] == 1 and sum(d["calls"] for d in u["per_day"]) == 1
    # push the month past the limit directly in the database, then keep calling: a payment is never refused for quota
    conn = sqlite3.connect(CLOUD_DB)
    with conn:
        conn.executemany(
            "INSERT INTO usage_events (tenant_id, at, endpoint, sink, purpose, protected_count, latency_ms, status) VALUES (?, ?, '/v1/protect', 'x', 'KYC', 0, 1.0, 'ok')",
            [(ws["tenant_id"], time.time())] * 10001,
        )
    conn.close()
    u = requests.get(f"{CLOUD_URL}/v1/usage", headers=H(key), timeout=10).json()
    assert u["over_limit"] is True and u["used"] > u["limit"]
    assert protect(key, [txn("PLAN-2", {"mobile": ids["mobile"]})]).status_code == 200
    # plan switch
    assert requests.post(f"{CLOUD_URL}/v1/plan", headers=H(key), json={"plan": "diamond"}, timeout=10).status_code == 400
    r = requests.post(f"{CLOUD_URL}/v1/plan", headers=H(key), json={"plan": "growth"}, timeout=10)
    assert r.status_code == 200 and r.json()["plan"] == "growth" and r.json()["limit"] == 1_000_000
    u = requests.get(f"{CLOUD_URL}/v1/usage", headers=H(key), timeout=10).json()
    assert u["plan"] == "growth" and u["over_limit"] is False
    assert requests.get(f"{CLOUD_URL}/v1/plan", headers=H(key), timeout=10).json()["history"][0]["plan"] == "growth"


def test_team_roles_map_to_scopes_and_removal_revokes_the_key():
    ws = new_workspace("Txn Team")
    admin = ws["admin_key"]
    t = requests.get(f"{CLOUD_URL}/v1/team", headers=H(admin), timeout=10).json()
    assert [m["email"] for m in t["members"]] == [ws["email"]] and t["members"][0]["owner"] is True
    r = requests.post(f"{CLOUD_URL}/v1/team", headers=H(admin), json={"email": "Audit@Bank.test", "role": "auditor", "issue_key": True}, timeout=10)
    assert r.status_code == 200, r.text
    m = r.json()
    assert m["email"] == "audit@bank.test" and m["scopes"] == ["dashboard", "verify"] and m["api_key"].startswith("aran_live_")
    assert requests.post(f"{CLOUD_URL}/v1/team", headers=H(admin), json={"email": "audit@bank.test", "role": "auditor"}, timeout=10).status_code == 409
    assert requests.post(f"{CLOUD_URL}/v1/team", headers=H(admin), json={"email": "x@bank.test", "role": "wizard"}, timeout=10).status_code == 422
    assert requests.post(f"{CLOUD_URL}/v1/team", headers=H(admin), json={"email": "not-an-email", "role": "admin"}, timeout=10).status_code == 422
    # the auditor's key reads but cannot protect
    assert requests.get(f"{CLOUD_URL}/v1/metrics", headers=H(m["api_key"]), timeout=10).status_code == 200
    assert protect(m["api_key"], [txn("TEAM-1", {"remarks": "x"})]).status_code == 403
    dev = requests.post(f"{CLOUD_URL}/v1/team", headers=H(admin), json={"email": "dev@bank.test", "role": "developer", "issue_key": True}, timeout=10).json()
    assert protect(dev["api_key"], [txn("TEAM-2", {"remarks": "x"})]).status_code == 200
    # the key is stored only as a hash
    conn = sqlite3.connect(CLOUD_DB)
    assert conn.execute("SELECT COUNT(*) FROM api_keys WHERE key_hash = ?", (m["api_key"],)).fetchone()[0] == 0
    conn.close()
    # removing the member revokes the key
    assert requests.delete(f"{CLOUD_URL}/v1/team/{m['id']}", headers=H(admin), timeout=10).json()["key_revoked"] is True
    assert requests.get(f"{CLOUD_URL}/v1/metrics", headers=H(m["api_key"]), timeout=10).status_code == 401
    assert requests.delete(f"{CLOUD_URL}/v1/team/{m['id']}", headers=H(admin), timeout=10).status_code == 404
    assert requests.delete(f"{CLOUD_URL}/v1/team/0", headers=H(admin), timeout=10).status_code == 404   # the owner stays


def test_slo_and_settings():
    ws = new_workspace("Txn Slo")
    admin, dash = ws["admin_key"], ws["dashboard_key"]
    s = requests.get(f"{CLOUD_URL}/v1/slo", headers=H(dash), timeout=10).json()
    assert s["budget_ms"] == 10 and s["target_percent"] == 99.9 and s["status"] == "no_data"
    assert s["good_minutes"] == 0 and s["bad_minutes"] == 0 and 43 <= s["error_budget_minutes"] <= 45
    assert s["error_budget_left_minutes"] == s["error_budget_minutes"]
    r = requests.put(f"{CLOUD_URL}/v1/slo", headers=H(admin), json={"budget_ms": 4.5}, timeout=10)
    assert r.status_code == 200 and r.json()["budget_ms"] == 4.5
    assert requests.get(f"{CLOUD_URL}/v1/slo", headers=H(dash), timeout=10).json()["budget_ms"] == 4.5
    assert requests.put(f"{CLOUD_URL}/v1/slo", headers=H(admin), json={"budget_ms": -1}, timeout=10).status_code == 422
    assert requests.put(f"{CLOUD_URL}/v1/slo", headers=H(admin), json={"budget_ms": 100000}, timeout=10).status_code == 422
    st = requests.get(f"{CLOUD_URL}/v1/settings", headers=H(dash), timeout=10).json()
    assert st["region"] == "india" and st["fail_safe"] == "hold_then_mask" and st["budget_ms"] == 4.5
    assert requests.put(f"{CLOUD_URL}/v1/settings", headers=H(admin), json={"fail_safe": "yolo"}, timeout=10).status_code == 422
    st = requests.put(f"{CLOUD_URL}/v1/settings", headers=H(admin), json={"fail_safe": "mask_now"}, timeout=10).json()
    assert st["fail_safe"] == "mask_now" and st["budget_ms"] == 4.5          # one setting does not reset the other


def test_slo_counts_a_slow_minute_as_bad():
    ws = new_workspace("Txn Slo Bad")
    admin, dash = ws["admin_key"], ws["dashboard_key"]
    ids = sample_ids()
    # a budget no real call can meet: every closed minute with traffic is a bad minute
    requests.put(f"{CLOUD_URL}/v1/slo", headers=H(admin), json={"budget_ms": 0.5}, timeout=10)
    protect(admin, [txn("SLO-1", {"mobile": ids["mobile"]})])
    conn = sqlite3.connect(CLOUD_DB)
    with conn:   # move the transaction two minutes into the past so its minute is closed
        conn.execute("UPDATE txn_events SET at = at - 180 WHERE tenant_id = ?", (ws["tenant_id"],))
    conn.close()
    s = requests.get(f"{CLOUD_URL}/v1/slo", headers=H(dash), timeout=10).json()
    if s["active_minutes"]:   # skipped only when the test runs in the first minutes of an India-time month
        assert s["bad_minutes"] == 1 and s["good_minutes"] == 0 and s["status"] in ("ok", "at_risk")


def test_demo_seed_is_gone(alpha):
    """No endpoint fills a workspace with made-up transactions any more."""
    ws = new_workspace("Txn No Seed")
    r = requests.post(f"{CLOUD_URL}/v1/demo/seed", headers=H(ws["admin_key"]), json={}, timeout=10)
    assert r.status_code in (404, 405)
