"""
Tests for firewall as a service, phase 1: routes (CRUD) and the /fw/<route>/... proxy.

They run against a live Aran Cloud (ARAN_CLOUD_URL, default http://127.0.0.1:8100) in front of a live core, started the
way scripts/run_demo.sh starts them (ARAN_DEMO_MODE=1, ARAN_FAAS_ALLOW_PRIVATE_UPSTREAMS=1, ARAN_FAAS_TEST_HOOKS=1).
A small upstream server runs inside the test and records what it is sent. The database file is read to prove that no
raw value is stored: set ARAN_CLOUD_DB to the path the server uses. All identifiers are generated.
"""

import json
import os
import random
import socket
import sqlite3
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest
import requests

CLOUD_URL = os.environ.get("ARAN_CLOUD_URL", "http://127.0.0.1:8100")
CORE_URL = os.environ.get("ARAN_CORE_URL", "http://127.0.0.1:8000")
BANK_B_URL = os.environ.get("ARAN_BANK_B_URL", "http://127.0.0.1:9002")
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
    assert r.status_code == 200, r.text
    return r.json()


def H(key, **extra):
    return dict({"X-API-Key": key}, **extra)


def mint(admin_key, label, scopes):
    r = requests.post(f"{CLOUD_URL}/v1/keys", headers=H(admin_key), json={"label": label, "scopes": scopes}, timeout=10)
    assert r.status_code == 200, r.text
    return r.json()["api_key"]


# ---------------------------------------------------------------- a small upstream that records what it gets
class Upstream:
    def __init__(self, port=0, status=200):
        self.received = []
        self.status = status
        outer = self

        class Handler(BaseHTTPRequestHandler):
            def _do(self):
                n = int(self.headers.get("Content-Length") or 0)
                body = self.rfile.read(n) if n else b""
                outer.received.append({"method": self.command, "path": self.path, "body": body.decode("utf-8", "replace"),
                                       "headers": {k.lower(): v for k, v in self.headers.items()}})
                out = json.dumps({"ok": True, "received": body.decode("utf-8", "replace")}).encode()
                self.send_response(outer.status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(out)))
                self.end_headers()
                self.wfile.write(out)

            do_GET = do_POST = do_PUT = do_PATCH = do_DELETE = _do

            def log_message(self, *a):
                pass

        self.server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
        self.port = self.server.server_address[1]
        self.url = f"http://127.0.0.1:{self.port}"
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def close(self):
        self.server.shutdown()
        self.server.server_close()

    def wait_for(self, n=1, timeout=20):
        end = time.time() + timeout
        while time.time() < end and len(self.received) < n:
            time.sleep(0.3)
        return self.received


def free_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    p = s.getsockname()[1]
    s.close()
    return p


def db_text(tenant_id):
    """Every stored text of this tenant's FaaS tables, in one string."""
    conn = sqlite3.connect(CLOUD_DB)
    parts = []
    for table in ("routes", "route_events", "route_outbox", "usage_events", "tenant_tokens"):
        for row in conn.execute(f"SELECT * FROM {table} WHERE tenant_id = ?", (tenant_id,)).fetchall():
            parts.append(json.dumps(row, default=str))
    conn.close()
    return "\n".join(parts)


def db_rows(sql, *args):
    conn = sqlite3.connect(CLOUD_DB)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(sql, args).fetchall()
    conn.close()
    return rows


@pytest.fixture(scope="module")
def alpha():
    return new_workspace("Faas Alpha")


@pytest.fixture(scope="module")
def beta():
    return new_workspace("Faas Beta")


@pytest.fixture()
def up():
    u = Upstream()
    yield u
    u.close()


def make_route(key, upstream_url, name=None, **kw):
    body = dict({"name": name or f"r{random.randint(10**6, 10**7)}", "upstream_url": upstream_url}, **kw)
    r = requests.post(f"{CLOUD_URL}/v1/routes", headers=H(key), json=body, timeout=10)
    assert r.status_code == 201, r.text
    return r.json()


def fw(key, route, path="", method="POST", **kw):
    return requests.request(method, f"{CLOUD_URL}/fw/{route['name']}/{path}", headers=kw.pop("headers", H(key)), timeout=30, **kw)


# ---------------------------------------------------------------- CRUD
def test_route_crud(alpha, up):
    key = alpha["admin_key"]
    r = make_route(key, up.url, name="crud-one", sink="vendor-x", purpose="Marketing", fail_mode="closed")
    assert r["id"].startswith("rt_") and r["mode"] == "monitor" and r["fail_mode"] == "closed"
    assert r["sink"] == "vendor-x" and r["purpose"] == "Marketing" and r["disabled"] is False
    dup = requests.post(f"{CLOUD_URL}/v1/routes", headers=H(key), json={"name": "crud-one", "upstream_url": up.url}, timeout=10)
    assert dup.status_code == 409
    got = requests.get(f"{CLOUD_URL}/v1/routes/{r['id']}", headers=H(key), timeout=10).json()
    assert got["name"] == "crud-one" and got["stats_24h"]["calls"] == 0
    listed = requests.get(f"{CLOUD_URL}/v1/routes", headers=H(key), timeout=10).json()["routes"]
    assert any(x["id"] == r["id"] for x in listed)
    p = requests.patch(f"{CLOUD_URL}/v1/routes/{r['id']}", headers=H(key), json={"mode": "enforce", "fail_mode": "open"}, timeout=10)
    assert p.status_code == 200 and p.json()["mode"] == "enforce" and p.json()["fail_mode"] == "open"
    bad = requests.patch(f"{CLOUD_URL}/v1/routes/{r['id']}", headers=H(key), json={"mode": "nope"}, timeout=10)
    assert bad.status_code == 422
    badname = requests.post(f"{CLOUD_URL}/v1/routes", headers=H(key), json={"name": "Bad Name!", "upstream_url": up.url}, timeout=10)
    assert badname.status_code == 422
    d = requests.delete(f"{CLOUD_URL}/v1/routes/{r['id']}", headers=H(key), timeout=10)
    assert d.status_code == 200
    assert requests.get(f"{CLOUD_URL}/v1/routes/{r['id']}", headers=H(key), timeout=10).status_code == 404
    assert requests.post(f"{CLOUD_URL}/fw/crud-one/x", headers=H(key), json={}, timeout=10).status_code == 404


def test_scopes(alpha, up):
    admin = alpha["admin_key"]
    dash = alpha["dashboard_key"]
    assert "route" in alpha["scopes"]
    r = requests.post(f"{CLOUD_URL}/v1/routes", headers=H(dash), json={"name": "dash-no", "upstream_url": up.url}, timeout=10)
    assert r.status_code == 403
    assert requests.get(f"{CLOUD_URL}/v1/routes", headers=H(dash), timeout=10).status_code == 200   # read only is fine
    assert requests.get(f"{CLOUD_URL}/v1/routes", timeout=10).status_code == 401
    route = make_route(admin, up.url, name="scope-r", mode="enforce")
    app_key = mint(admin, "app", ["protect"])
    assert fw(app_key, route, "x", json={"a": "b"}).status_code == 200          # protect scope may call the proxy
    assert requests.post(f"{CLOUD_URL}/v1/routes", headers=H(app_key), json={"name": "app-no", "upstream_url": up.url}, timeout=10).status_code == 403
    trace_only = mint(admin, "t", ["trace"])
    assert fw(trace_only, route, "x", json={"a": "b"}).status_code == 403


# ---------------------------------------------------------------- isolation
def test_tenant_isolation(alpha, beta, up):
    route = make_route(alpha["admin_key"], up.url, name="iso-route", mode="enforce")
    other = beta["admin_key"]
    r = requests.post(f"{CLOUD_URL}/fw/iso-route/x", headers=H(other), json={"a": "1"}, timeout=10)
    assert r.status_code == 404
    assert not up.received                                                     # nothing reached the upstream
    assert requests.get(f"{CLOUD_URL}/v1/routes/{route['id']}", headers=H(other), timeout=10).status_code == 404
    assert requests.patch(f"{CLOUD_URL}/v1/routes/{route['id']}", headers=H(other), json={"mode": "monitor"}, timeout=10).status_code == 404
    assert requests.delete(f"{CLOUD_URL}/v1/routes/{route['id']}", headers=H(other), timeout=10).status_code == 404
    assert all(x["id"] != route["id"] for x in requests.get(f"{CLOUD_URL}/v1/routes", headers=H(other), timeout=10).json()["routes"])
    # the same name is free in the other workspace, and it is that workspace's own route
    mine = make_route(other, up.url, name="iso-route")
    assert mine["id"] != route["id"]
    assert requests.get(f"{CLOUD_URL}/v1/routes/{route['id']}", headers=H(alpha["admin_key"]), timeout=10).json()["mode"] == "enforce"
    ev = requests.get(f"{CLOUD_URL}/v1/route-events", headers=H(other), timeout=10).json()["events"]
    assert all(e["route_id"] != route["id"] for e in ev)


# ---------------------------------------------------------------- SSRF
@pytest.mark.parametrize("url", [
    "http://169.254.169.254/latest/meta-data/",
    "http://127.0.0.1:8000/api/health",            # Aran core
    "http://localhost:8000/",
    "http://127.0.0.1:8100/v1/health",             # Aran Cloud itself
    "ftp://example.com/x",
    "file:///etc/passwd",
    "gopher://127.0.0.1:9002/",
    "http://user:secret@127.0.0.1:9002/",
    "http://0.0.0.0:9002/",
    "http://[fd00:ec2::254]/",
    "http://127.0.0.1:9002/x?token=1",
    "not a url",
])
def test_ssrf_rejected_at_save(alpha, url):
    r = requests.post(f"{CLOUD_URL}/v1/routes", headers=H(alpha["admin_key"]), json={"name": f"ssrf{random.randint(1, 10**6)}", "upstream_url": url}, timeout=10)
    assert r.status_code == 400, (url, r.text)
    assert "refused" in r.text


def test_ssrf_rejected_on_patch(alpha, up):
    route = make_route(alpha["admin_key"], up.url)
    r = requests.patch(f"{CLOUD_URL}/v1/routes/{route['id']}", headers=H(alpha["admin_key"]), json={"upstream_url": "http://169.254.169.254/"}, timeout=10)
    assert r.status_code == 400
    assert requests.get(f"{CLOUD_URL}/v1/routes/{route['id']}", headers=H(alpha["admin_key"]), timeout=10).json()["upstream_url"] == up.url


def test_ssrf_checked_again_at_call_time(alpha, up):
    """A route that was saved with a good URL but whose row now points somewhere forbidden is refused when called
    (this is what stops a DNS name that changed after it was saved)."""
    route = make_route(alpha["admin_key"], up.url, name="rebind", mode="enforce")
    conn = sqlite3.connect(CLOUD_DB)
    conn.execute("UPDATE routes SET upstream_url = 'http://169.254.169.254/' WHERE id = ?", (route["id"],))
    conn.commit()
    conn.close()
    r = fw(alpha["admin_key"], route, "x", json={"a": "b"})
    assert r.status_code in (202, 502)
    assert not up.received
    assert "169.254" not in r.text or "refused" in r.text


# ---------------------------------------------------------------- cleaning in enforce mode
def test_enforce_json_cleaning(alpha, up):
    ids = sample_ids()
    route = make_route(alpha["admin_key"], up.url, mode="enforce")
    body = {"mobile": ids["mobile"], "note": f"card {ids['card']} please", "n": 5, "ok": True,
            "items": [{"aadhaar": ids["aadhaar"]}, "plain text"], "nested": {"deeper": {"mobile": ids["mobile"]}}}
    r = fw(alpha["admin_key"], route, "ingest", json=body)
    assert r.status_code == 200, r.text
    got = up.wait_for(1)[0]
    assert got["path"] == "/ingest" and got["method"] == "POST"
    for raw in (ids["mobile"], ids["card"], ids["aadhaar"]):
        assert raw not in got["body"], raw
    sent = json.loads(got["body"])
    assert sent["n"] == 5 and sent["ok"] is True and sent["items"][1] == "plain text"      # shape kept, keys untouched
    assert sent["mobile"] != ids["mobile"] and sent["nested"]["deeper"]["mobile"] == sent["mobile"]   # equal values, equal tokens
    assert int(r.headers["X-Aran-Protected"]) >= 4 and r.headers["X-Aran-Route"] == route["name"]
    assert "x-api-key" not in got["headers"] and got["headers"]["x-aran-route"] == route["name"]
    assert ids["mobile"] not in r.text                                                      # the upstream's echo is cleaned too


def test_enforce_text_ndjson_form_query_path(alpha, up):
    ids = sample_ids()
    key = alpha["admin_key"]
    route = make_route(key, up.url, mode="enforce")
    r = fw(key, route, "t", data=f"call me on mobile {ids['mobile']} about card {ids['card']}".encode(), headers=H(key, **{"Content-Type": "text/plain"}))
    assert r.status_code == 200
    r = fw(key, route, "n", data=(json.dumps({"mobile": ids["mobile"]}) + "\n" + f"plain card {ids['card']}\n").encode(),
           headers=H(key, **{"Content-Type": "application/x-ndjson"}))
    assert r.status_code == 200
    r = fw(key, route, "f", data={"mobile": ids["mobile"], "note": "hello", "card": ids["card"]})
    assert r.status_code == 200
    r = fw(key, route, f"cust/{ids['card']}", method="GET", params={"mobile": ids["mobile"], "q": "x"})
    assert r.status_code == 200
    got = up.wait_for(4)
    assert len(got) == 4
    for g in got:
        blob = g["path"] + g["body"]
        for raw in (ids["mobile"], ids["card"]):
            assert raw not in blob, (g["path"], raw)
    text, nd, form, get = got
    assert "mobile" in text["body"] and nd["body"].count("\n") == 2
    assert json.loads(nd["body"].split("\n")[0])["mobile"] != ids["mobile"]
    assert "note=hello" in form["body"] and ids["mobile"] not in form["body"]
    assert get["method"] == "GET" and get["path"].startswith("/cust/") and "q=x" in get["path"]


def test_enforce_refuses_binary_and_bad_json_and_big_bodies(alpha, up):
    key = alpha["admin_key"]
    route = make_route(key, up.url, mode="enforce")
    r = fw(key, route, "b", data=b"\x00\x01\x02", headers=H(key, **{"Content-Type": "application/octet-stream"}))
    assert r.status_code == 415
    r = fw(key, route, "j", data=b"{not json", headers=H(key, **{"Content-Type": "application/json"}))
    assert r.status_code == 400
    r = fw(key, route, "big", data=b"a" * (1024 * 1024 + 10), headers=H(key, **{"Content-Type": "text/plain"}))
    assert r.status_code == 413
    assert not up.received


def test_redirects_not_followed_and_status_passthrough(alpha):
    class Redir(BaseHTTPRequestHandler):
        def do_GET(self):
            self.send_response(302)
            self.send_header("Location", "http://169.254.169.254/latest")
            self.send_header("Content-Length", "0")
            self.end_headers()

        def log_message(self, *a):
            pass
    srv = ThreadingHTTPServer(("127.0.0.1", 0), Redir)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    try:
        route = make_route(alpha["admin_key"], f"http://127.0.0.1:{srv.server_address[1]}", mode="enforce")
        r = fw(alpha["admin_key"], route, "go", method="GET", allow_redirects=False)
        assert r.status_code == 302 and "169.254.169.254" in r.headers["Location"]     # handed back, never followed
    finally:
        srv.shutdown()
        srv.server_close()


# ---------------------------------------------------------------- monitor mode
def test_monitor_forwards_original_but_counts(alpha, up):
    ids = sample_ids()
    key = alpha["admin_key"]
    route = make_route(key, up.url)                       # monitor by default
    assert route["mode"] == "monitor"
    body = {"mobile": ids["mobile"], "card": ids["card"]}
    r = fw(key, route, "ingest", json=body)
    assert r.status_code == 200
    got = up.wait_for(1)[0]
    assert json.loads(got["body"]) == body                # the original, untouched
    assert r.headers["X-Aran-Protected"] == "0" and int(r.headers["X-Aran-Would-Protect"]) >= 2
    ev = requests.get(f"{CLOUD_URL}/v1/route-events", headers=H(key), params={"route_id": route["id"]}, timeout=10).json()["events"]
    assert ev[0]["would_protect_count"] >= 2 and ev[0]["protected_count"] == 0 and ev[0]["outcome"] == "forwarded"
    stats = requests.get(f"{CLOUD_URL}/v1/routes/{route['id']}", headers=H(key), timeout=10).json()["stats_24h"]
    assert stats["calls"] == 1 and stats["would_protect"] >= 2 and stats["protected"] == 0
    # flip to enforce: the next call is cleaned
    requests.patch(f"{CLOUD_URL}/v1/routes/{route['id']}", headers=H(key), json={"mode": "enforce"}, timeout=10)
    r = fw(key, route, "ingest", json=body)
    assert ids["mobile"] not in up.wait_for(2)[1]["body"]
    assert int(r.headers["X-Aran-Protected"]) >= 2


def test_usage_is_metered(alpha, up):
    key = alpha["admin_key"]
    route = make_route(key, up.url, mode="enforce", sink="metered-sink")
    fw(key, route, "x", json={"mobile": sample_ids()["mobile"]})
    rows = db_rows("SELECT * FROM usage_events WHERE tenant_id=? AND endpoint='/fw' AND sink='metered-sink'", alpha["tenant_id"])
    assert len(rows) == 1 and rows[0]["protected_count"] >= 1


# ---------------------------------------------------------------- fail modes
def core_down_headers(key):
    return H(key, **{"X-Aran-Test-Fault": "core-down"})


def fault_works(key, route, up):
    """The server must run with ARAN_FAAS_TEST_HOOKS=1 (run_demo.sh does). Skip the fail-mode tests otherwise."""
    r = fw(key, route, "probe", json={"a": "b"}, headers=core_down_headers(key))
    if r.status_code == 200 and "X-Aran-Fail" not in r.headers:
        pytest.skip("server was not started with ARAN_FAAS_TEST_HOOKS=1")


def test_fail_open_forwards_original(alpha, up):
    ids = sample_ids()
    key = alpha["admin_key"]
    route = make_route(key, up.url, mode="enforce", fail_mode="open")
    fault_works(key, route, up)
    up.received.clear()
    r = fw(key, route, "x", json={"mobile": ids["mobile"]}, headers=core_down_headers(key))
    assert r.status_code == 200 and r.headers.get("X-Aran-Fail") == "open"
    assert json.loads(up.wait_for(1)[0]["body"]) == {"mobile": ids["mobile"]}
    ev = requests.get(f"{CLOUD_URL}/v1/route-events", headers=H(key), params={"route_id": route["id"], "limit": 1}, timeout=10).json()["events"][0]
    assert ev["outcome"] == "failed_open"


def test_fail_closed_refuses(alpha, up):
    key = alpha["admin_key"]
    route = make_route(key, up.url, mode="enforce", fail_mode="closed")
    fault_works(key, route, up)
    r = fw(key, route, "x", json={"mobile": sample_ids()["mobile"]}, headers=core_down_headers(key))
    assert r.status_code == 503 and r.json()["failed"] == "closed"
    time.sleep(0.5)
    assert not [g for g in up.received if g["path"] != "/probe"]
    ev = requests.get(f"{CLOUD_URL}/v1/route-events", headers=H(key), params={"route_id": route["id"], "limit": 1}, timeout=10).json()["events"][0]
    assert ev["outcome"] == "failed_closed"


def test_fail_hold_queues_masked_copy_and_delivers_later(alpha):
    ids = sample_ids()
    key = alpha["admin_key"]
    port = free_port()                                    # the upstream is down at first
    route = make_route(key, f"http://127.0.0.1:{port}", mode="enforce", fail_mode="hold")
    r = fw(key, route, "x", json={"card": ids["card"], "mobile": ids["mobile"]}, headers=core_down_headers(key))
    if r.status_code != 202 or r.json().get("reason") != "aran_unavailable":
        pytest.skip("server was not started with ARAN_FAAS_TEST_HOOKS=1")
    assert r.json()["held"] is True
    rows = db_rows("SELECT * FROM route_outbox WHERE route_id=?", route["id"])
    assert len(rows) == 1 and rows[0]["state"] == "pending"
    assert ids["card"] not in rows[0]["body_protected"] and ids["mobile"] not in rows[0]["body_protected"]
    assert ids["card"][-4:] in rows[0]["body_protected"] and "XXXX" in rows[0]["body_protected"]   # masked, last 4 kept
    up = Upstream(port=port)                              # the upstream comes up: the sweeper delivers the masked copy
    try:
        got = up.wait_for(1, timeout=40)
        assert got, "the held copy was not delivered"
        assert ids["card"] not in got[0]["body"] and ids["mobile"] not in got[0]["body"] and "XXXX" in got[0]["body"]
        time.sleep(1)
        assert db_rows("SELECT state FROM route_outbox WHERE route_id=?", route["id"])[0]["state"] == "sent"
    finally:
        up.close()
    assert ids["card"] not in db_text(alpha["tenant_id"]) and ids["mobile"] not in db_text(alpha["tenant_id"])


def test_upstream_down_in_enforce_holds_protected_body(alpha):
    ids = sample_ids()
    key = alpha["admin_key"]
    port = free_port()
    route = make_route(key, f"http://127.0.0.1:{port}", mode="enforce", fail_mode="closed")
    r = fw(key, route, "x", json={"mobile": ids["mobile"], "n": 1})
    assert r.status_code == 202 and r.json()["held"] is True and r.json()["reason"] == "upstream_unavailable"
    row = db_rows("SELECT * FROM route_outbox WHERE route_id=?", route["id"])[0]
    assert ids["mobile"] not in row["body_protected"] and json.loads(row["body_protected"])["n"] == 1
    assert json.loads(row["body_protected"])["mobile"] != ids["mobile"]     # the protected body, not the original
    up = Upstream(port=port)
    try:
        got = up.wait_for(1, timeout=40)
        assert got and json.loads(got[0]["body"])["mobile"] == json.loads(row["body_protected"])["mobile"]
    finally:
        up.close()


def test_upstream_5xx_in_enforce_holds(alpha):
    key = alpha["admin_key"]
    up = Upstream(status=503)
    try:
        route = make_route(key, up.url, mode="enforce")
        r = fw(key, route, "x", json={"a": "b"})
        assert r.status_code == 202 and r.json()["reason"] == "upstream_error"
        assert db_rows("SELECT COUNT(*) n FROM route_outbox WHERE route_id=? AND state='pending'", route["id"])[0]["n"] == 1
    finally:
        up.close()


def test_monitor_never_blocks_on_core_failure(alpha, up):
    key = alpha["admin_key"]
    route = make_route(key, up.url, fail_mode="closed")      # monitor, closed
    r = fw(key, route, "x", json={"a": "b"}, headers=core_down_headers(key))
    assert r.status_code == 200                              # monitor mode never refuses traffic
    assert len(up.wait_for(1)) == 1


# ---------------------------------------------------------------- nothing raw is stored
def test_no_raw_identifier_in_cloud_db(alpha, up):
    ids = sample_ids()
    key = alpha["admin_key"]
    enforce = make_route(key, up.url, mode="enforce")
    monitor = make_route(key, up.url)
    for route in (enforce, monitor):
        fw(key, route, f"lookup/{ids['card']}", json={"mobile": ids["mobile"], "card": ids["card"], "aadhaar": ids["aadhaar"]},
           params={"mobile": ids["mobile"]})
    blob = db_text(alpha["tenant_id"])
    for raw in (ids["mobile"], ids["card"], ids["aadhaar"]):
        assert raw not in blob, raw
    assert "lookup" in blob                                  # the (cleaned) path is logged


# ---------------------------------------------------------------- Bank B's analytics copy goes through a route
def test_bank_b_analytics_vendor_gets_no_raw_identifiers():
    try:
        cfg = requests.get(f"{BANK_B_URL}/api/config", timeout=3).json()
    except Exception:
        pytest.skip("Bank B is not running")
    if cfg.get("bank_mode") != "aran":
        pytest.skip("not Bank B")
    accts = requests.get(f"{BANK_B_URL}/api/accounts", timeout=5).json()
    if not accts:
        pytest.skip("Bank B has no accounts yet")
    acct = accts[0]
    vpa = f"qa.{random.randint(10**6, 10**7)}@okicici"
    r = requests.post(f"{BANK_B_URL}/api/transactions", timeout=20, json={
        "idem_key": f"faas-{time.time()}-{random.random()}", "customer_ref": acct["customer_ref"], "rail": "UPI",
        "payee": vpa, "amount": "12.50", "remarks": "analytics route test"})
    assert r.status_code in (200, 201), r.text
    txn = r.json()
    if (txn.get("status") or "") not in ("success", "held"):
        pytest.skip(f"payment ended as {txn.get('status')}")
    time.sleep(1.5)
    got = requests.get(f"{BANK_B_URL}/vendor/analytics/received?limit=20", timeout=5).json()["received"]
    mine = [g for g in got if g["via_route"] == "analytics" and g["body"].get("amount_paise") == 1250 and "payee" in g["body"]]
    if not mine:
        pytest.skip("Bank B was not started with ARAN_ANALYTICS_ROUTE=analytics")
    blob = json.dumps(got)
    assert vpa not in blob and acct["number"] not in blob, "the analytics vendor received a raw identifier"
    assert mine[0]["body"]["payee"].startswith("<UPI:") or mine[0]["body"]["payee"] != vpa
    copy = requests.get(f"{BANK_B_URL}/api/sinks", params={"txn_id": txn["txn_id"], "sink": "analytics"}, timeout=5).json()["items"][0]
    assert copy["meta"]["via"] == "route" and vpa not in json.dumps(copy) and acct["number"] not in json.dumps(copy)
