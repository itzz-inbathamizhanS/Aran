"""
Tests for firewall as a service: routes (CRUD), the /fw/<route>/... proxy, policies, monitor mode, the config audit,
signed webhooks, spike alerts and the SIEM export.

They run against a live Aran Cloud (ARAN_CLOUD_URL, default http://127.0.0.1:8100) in front of a live core, started the
way scripts/run_demo.sh starts them (ARAN_DEMO_MODE=1, ARAN_FAAS_ALLOW_PRIVATE_UPSTREAMS=1, ARAN_FAAS_TEST_HOOKS=1).
A small upstream server runs inside the test and records what it is sent. The database file is read to prove that no
raw value is stored: set ARAN_CLOUD_DB to the path the server uses. All identifiers are generated.
"""

import json
import os
import random
import socket
import sys
import sqlite3
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest
import requests

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "aran_sdk"))
from aran import verify_webhook  # noqa: E402

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
    for table in ("routes", "route_events", "route_outbox", "usage_events", "tenant_tokens", "policies", "config_audit", "webhooks", "webhook_deliveries"):
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


# ================================================================ phase 2: policies and monitor mode
def make_policy(key, name, rules):
    r = requests.post(f"{CLOUD_URL}/v1/policies", headers=H(key), json={"name": name, "rules": rules}, timeout=10)
    assert r.status_code == 201, r.text
    return r.json()


def pname():
    return f"pol{random.randint(10**6, 10**7)}"


def test_policy_versions_list_and_validation(alpha):
    key = alpha["admin_key"]
    name = pname()
    p1 = make_policy(key, name, [{"type": "mobile", "action": "mask"}])
    assert p1["version"] == 1 and p1["active"] and p1["rules"] == [{"type": "MOBILE", "action": "mask"}] and p1["id"].startswith("pol_")
    p2 = make_policy(key, name, [{"type": "*", "action": "allow"}])
    assert p2["version"] == 2 and p2["id"] != p1["id"]
    listed = requests.get(f"{CLOUD_URL}/v1/policies", headers=H(key), timeout=10).json()["policies"]
    mine = [p for p in listed if p["name"] == name]
    assert len(mine) == 1 and mine[0]["version"] == 2 and mine[0]["versions"] == 2           # only the active version is listed
    got = requests.get(f"{CLOUD_URL}/v1/policies/{p1['id']}", headers=H(key), timeout=10).json()
    assert [h["version"] for h in got["history"]] == [2, 1]
    for bad in ([{"type": "NOPE", "action": "mask"}], [{"type": "CARD", "action": "shred"}], "x", [1]):
        r = requests.post(f"{CLOUD_URL}/v1/policies", headers=H(key), json={"name": pname(), "rules": bad}, timeout=10)
        assert r.status_code == 422, bad
    r = requests.post(f"{CLOUD_URL}/v1/policies", headers=H(key), json={"name": "Bad Name", "rules": []}, timeout=10)
    assert r.status_code == 422


def test_policy_scope_and_tenant_isolation(alpha, beta):
    ka, kb = alpha["admin_key"], beta["admin_key"]
    p = make_policy(ka, pname(), [{"type": "*", "action": "mask"}])
    protect_only = mint(ka, "protect only", ["protect"])
    r = requests.post(f"{CLOUD_URL}/v1/policies", headers=H(protect_only), json={"name": pname(), "rules": []}, timeout=10)
    assert r.status_code == 403
    assert requests.get(f"{CLOUD_URL}/v1/policies/{p['id']}", headers=H(kb), timeout=10).status_code == 404
    assert p["id"] not in requests.get(f"{CLOUD_URL}/v1/policies", headers=H(kb), timeout=10).text
    assert requests.post(f"{CLOUD_URL}/v1/policies/{p['name']}/rollback", headers=H(kb), timeout=10).status_code == 404


def test_cross_tenant_policy_attach_refused(alpha, beta, up):
    foreign = make_policy(beta["admin_key"], pname(), [{"type": "*", "action": "block"}])
    key = alpha["admin_key"]
    route = make_route(key, up.url)
    r = requests.patch(f"{CLOUD_URL}/v1/routes/{route['id']}", headers=H(key), json={"policy_id": foreign["id"]}, timeout=10)
    assert r.status_code == 404
    r = requests.post(f"{CLOUD_URL}/v1/routes", headers=H(key), json={"name": f"x{random.randint(10**6, 10**7)}", "upstream_url": up.url,
                                                                    "policy_id": foreign["id"]}, timeout=10)
    assert r.status_code == 404
    got = requests.get(f"{CLOUD_URL}/v1/routes/{route['id']}", headers=H(key), timeout=10).json()
    assert got["policy_id"] is None
    # an own policy attaches, and "" detaches
    own = make_policy(key, pname(), [])
    r = requests.patch(f"{CLOUD_URL}/v1/routes/{route['id']}", headers=H(key), json={"policy_id": own["id"]}, timeout=10)
    assert r.status_code == 200 and r.json()["policy_id"] == own["id"]
    r = requests.patch(f"{CLOUD_URL}/v1/routes/{route['id']}", headers=H(key), json={"policy_id": ""}, timeout=10)
    assert r.json()["policy_id"] is None


def test_policy_test_endpoint_each_action(alpha):
    ids = sample_ids()
    key = alpha["admin_key"]
    text = f"Aadhaar: {ids['aadhaar']} and mobile {ids['mobile']}"
    url = f"{CLOUD_URL}/v1/policies/test"
    # default (no rules): everything is tokenised
    r = requests.post(url, headers=H(key), json={"text": text, "rules": []}, timeout=20).json()
    assert {f["action"] for f in r["findings"]} == {"tokenise"} and len(r["findings"]) == 2
    assert ids["aadhaar"] not in r["output"] and ids["mobile"] not in r["output"] and not r["blocked"]
    # mask keeps the last 4
    r = requests.post(url, headers=H(key), json={"text": text, "rules": [{"type": "MOBILE", "action": "mask"}]}, timeout=20).json()
    assert "XXXXXX" + ids["mobile"][-4:] in r["output"] and ids["mobile"] not in r["output"]
    assert ids["aadhaar"] not in r["output"]                                   # the other type fell to the default
    # allow puts the original back
    r = requests.post(url, headers=H(key), json={"text": text, "rules": [{"type": "AADHAAR", "action": "allow"}]}, timeout=20).json()
    assert ids["aadhaar"] in r["output"] and ids["mobile"] not in r["output"]
    # first match wins
    r = requests.post(url, headers=H(key), json={"text": text, "rules": [{"type": "MOBILE", "action": "allow"}, {"type": "*", "action": "mask"}]}, timeout=20).json()
    assert ids["mobile"] in r["output"] and ids["aadhaar"] not in r["output"] and "XXXXXXXX" + ids["aadhaar"][-4:] in r["output"]
    # block and alert
    r = requests.post(url, headers=H(key), json={"text": text, "rules": [{"type": "AADHAAR", "action": "block"}]}, timeout=20).json()
    assert r["blocked"] is True and r["counts"]["block"] == 1
    r = requests.post(url, headers=H(key), json={"text": text, "rules": [{"type": "MOBILE", "action": "alert"}]}, timeout=20).json()
    assert r["alert"] is True and ids["mobile"] not in r["output"]
    # by policy id
    p = make_policy(key, pname(), [{"type": "*", "action": "allow"}])
    r = requests.post(url, headers=H(key), json={"text": text, "policy_id": p["id"]}, timeout=20).json()
    assert r["output"] == text
    assert requests.post(url, headers=H(key), json={"text": text, "rules": [{"type": "X", "action": "mask"}]}, timeout=20).status_code == 422


def test_enforce_applies_each_action(alpha, up):
    ids = sample_ids()
    key = alpha["admin_key"]
    pol = make_policy(key, pname(), [{"type": "MOBILE", "action": "mask"}, {"type": "CARD", "action": "allow"},
                                     {"type": "AADHAAR", "action": "tokenise"}])
    route = make_route(key, up.url, mode="enforce", policy_id=pol["id"])
    body = {"mobile": ids["mobile"], "card": ids["card"], "aadhaar": ids["aadhaar"]}
    r = fw(key, route, "ingest", json=body)
    assert r.status_code == 200, r.text
    sent = json.loads(up.wait_for(1)[0]["body"])
    assert sent["mobile"] == "XXXXXX" + ids["mobile"][-4:]          # mask
    assert sent["card"] == ids["card"]                              # allow
    assert sent["aadhaar"] != ids["aadhaar"] and len(sent["aadhaar"]) == 12   # tokenise
    assert int(r.headers["X-Aran-Protected"]) == 2                  # allow is not counted as protected


def test_enforce_block_returns_403_and_forwards_nothing(alpha, up):
    ids = sample_ids()
    key = alpha["admin_key"]
    pol = make_policy(key, pname(), [{"type": "AADHAAR", "action": "block"}])
    route = make_route(key, up.url, mode="enforce", policy_id=pol["id"])
    r = fw(key, route, "ingest", json={"note": "ok", "aadhaar": ids["aadhaar"]})
    assert r.status_code == 403
    assert r.json()["blocked"] is True and r.json()["types"] == ["AADHAAR"]
    assert ids["aadhaar"] not in r.text
    time.sleep(0.5)
    assert not up.received
    ev = requests.get(f"{CLOUD_URL}/v1/route-events", headers=H(key), params={"route_id": route["id"]}, timeout=10).json()["events"][0]
    assert ev["blocked"] == 1 and ev["outcome"] == "blocked" and ev["status_code"] == 403
    # a request without the blocked type passes
    assert fw(key, route, "ingest", json={"note": "hello"}).status_code == 200


def test_monitor_mode_computes_but_forwards_original(alpha, up):
    ids = sample_ids()
    key = alpha["admin_key"]
    pol = make_policy(key, pname(), [{"type": "AADHAAR", "action": "block"}, {"type": "MOBILE", "action": "mask"}])
    route = make_route(key, up.url, policy_id=pol["id"])                         # monitor by default
    r = fw(key, route, "ingest", json={"mobile": ids["mobile"], "aadhaar": ids["aadhaar"]})
    assert r.status_code == 200, r.text                                           # a block rule never refuses in monitor mode
    sent = json.loads(up.wait_for(1)[0]["body"])
    assert sent == {"mobile": ids["mobile"], "aadhaar": ids["aadhaar"]}           # the original went through
    assert r.headers["X-Aran-Would-Block"] == "1" and int(r.headers["X-Aran-Would-Protect"]) == 2
    ev = requests.get(f"{CLOUD_URL}/v1/route-events", headers=H(key), params={"route_id": route["id"]}, timeout=10).json()["events"][0]
    assert ev["protected_count"] == 0 and ev["would_protect_count"] == 2 and ev["blocked"] == 0
    st = requests.get(f"{CLOUD_URL}/v1/routes/{route['id']}", headers=H(key), timeout=10).json()["stats_24h"]
    assert st["would_block"] == 1
    # flipping to enforce turns the same rules on
    requests.patch(f"{CLOUD_URL}/v1/routes/{route['id']}", headers=H(key), json={"mode": "enforce"}, timeout=10)
    assert fw(key, route, "ingest", json={"aadhaar": ids["aadhaar"]}).status_code == 403


def test_alert_action_tokenises_and_raises_event(alpha, up):
    ids = sample_ids()
    key = alpha["admin_key"]
    pol = make_policy(key, pname(), [{"type": "MOBILE", "action": "alert"}])
    route = make_route(key, up.url, mode="enforce", policy_id=pol["id"])
    r = fw(key, route, "ingest", json={"mobile": ids["mobile"]})
    assert r.status_code == 200
    assert ids["mobile"] not in up.wait_for(1)[0]["body"]


def test_policy_rollback_changes_live_behaviour(alpha, up):
    ids = sample_ids()
    key = alpha["admin_key"]
    name = pname()
    v1 = make_policy(key, name, [{"type": "MOBILE", "action": "mask"}])
    make_policy(key, name, [{"type": "MOBILE", "action": "block"}])
    route = make_route(key, up.url, mode="enforce", policy_id=v1["id"])           # attached by any version id of the name
    assert fw(key, route, "x", json={"mobile": ids["mobile"]}).status_code == 403
    r = requests.post(f"{CLOUD_URL}/v1/policies/{name}/rollback", headers=H(key), timeout=10)
    assert r.status_code == 200 and r.json()["version"] == 1 and r.json()["active"]
    r = fw(key, route, "x", json={"mobile": ids["mobile"]})
    assert r.status_code == 200 and json.loads(up.wait_for(1)[-1]["body"])["mobile"] == "XXXXXX" + ids["mobile"][-4:]
    # nothing earlier than version 1; unknown version; unknown name
    assert requests.post(f"{CLOUD_URL}/v1/policies/{name}/rollback", headers=H(key), timeout=10).status_code == 409
    assert requests.post(f"{CLOUD_URL}/v1/policies/{name}/rollback", headers=H(key), json={"to_version": 9}, timeout=10).status_code == 404
    assert requests.post(f"{CLOUD_URL}/v1/policies/nosuch/rollback", headers=H(key), timeout=10).status_code == 404
    # to_version moves forward again
    r = requests.post(f"{CLOUD_URL}/v1/policies/{name}/rollback", headers=H(key), json={"to_version": 2}, timeout=10)
    assert r.status_code == 200 and r.json()["version"] == 2


def test_config_audit_chain_and_verify(alpha, up):
    ws = new_workspace("Faas Audit")
    key = ws["admin_key"]
    name = pname()
    make_policy(key, name, [{"type": "*", "action": "mask"}])
    p2 = make_policy(key, name, [{"type": "*", "action": "tokenise"}])
    route = make_route(key, up.url)
    requests.patch(f"{CLOUD_URL}/v1/routes/{route['id']}", headers=H(key), json={"policy_id": p2["id"], "mode": "enforce"}, timeout=10)
    requests.post(f"{CLOUD_URL}/v1/policies/{name}/rollback", headers=H(key), timeout=10)
    requests.delete(f"{CLOUD_URL}/v1/routes/{route['id']}", headers=H(key), timeout=10)
    audit = requests.get(f"{CLOUD_URL}/v1/config-audit", headers=H(key), timeout=10).json()["audit"]
    assert [a["action"] for a in reversed(audit)] == ["policy.create", "policy.create", "route.create", "route.update", "policy.rollback", "route.delete"]
    upd = [a for a in audit if a["action"] == "route.update"][0]
    assert upd["detail"]["changes"]["mode"] == {"from": "monitor", "to": "enforce"}
    v = requests.get(f"{CLOUD_URL}/v1/config-audit/verify", headers=H(key), timeout=10).json()
    assert v["valid"] is True and v["total_rows"] == 6
    # another tenant has its own chain
    other = requests.get(f"{CLOUD_URL}/v1/config-audit", headers=H(alpha["admin_key"]), timeout=10).json()["audit"]
    assert all(a["id"] not in {x["id"] for x in audit} for a in other)
    # tampering is detected (edit a row directly in the database, then restore it)
    conn = sqlite3.connect(CLOUD_DB)
    row = conn.execute("SELECT id, detail_json FROM config_audit WHERE tenant_id=? AND action='route.create'", (ws["tenant_id"],)).fetchone()
    try:
        conn.execute("UPDATE config_audit SET detail_json=? WHERE id=?", (row[1].replace('"monitor"', '"enforce"'), row[0]))
        conn.commit()
        bad = requests.get(f"{CLOUD_URL}/v1/config-audit/verify", headers=H(key), timeout=10).json()
        assert bad["valid"] is False and bad["failed_at_id"] == row[0]
    finally:
        conn.execute("UPDATE config_audit SET detail_json=? WHERE id=?", (row[1], row[0]))
        conn.commit()
        conn.close()
    assert requests.get(f"{CLOUD_URL}/v1/config-audit/verify", headers=H(key), timeout=10).json()["valid"] is True
    # a dashboard-only key can read the audit; a protect-only key cannot
    assert requests.get(f"{CLOUD_URL}/v1/config-audit", headers=H(mint(key, "dash", ["dashboard"])), timeout=10).status_code == 200
    assert requests.get(f"{CLOUD_URL}/v1/config-audit", headers=H(mint(key, "prot", ["protect"])), timeout=10).status_code == 403


def test_no_raw_identifier_stored_with_policies(alpha, up):
    ids = sample_ids()
    key = alpha["admin_key"]
    pol = make_policy(key, pname(), [{"type": "AADHAAR", "action": "block"}, {"type": "MOBILE", "action": "mask"},
                                     {"type": "CARD", "action": "allow"}])
    for mode in ("monitor", "enforce"):
        route = make_route(key, up.url, mode=mode, policy_id=pol["id"])
        fw(key, route, f"look/{ids['mobile']}", json={"aadhaar": ids["aadhaar"], "mobile": ids["mobile"], "card": ids["card"]})
    requests.post(f"{CLOUD_URL}/v1/policies/test", headers=H(key), json={"text": f"{ids['card']} {ids['mobile']}", "rules": []}, timeout=20)
    blob = db_text(alpha["tenant_id"])
    for raw in (ids["mobile"], ids["card"], ids["aadhaar"]):
        assert raw not in blob, raw


# ================================================================ phase 3: webhooks, spikes, export
class Receiver:
    """A webhook receiver. The first `fail_first` calls answer 500; every call is recorded with its raw body."""

    def __init__(self, fail_first=0):
        self.calls = []
        self.fail_first = fail_first
        outer = self

        class Handler(BaseHTTPRequestHandler):
            def do_POST(self):
                n = int(self.headers.get("Content-Length") or 0)
                body = self.rfile.read(n) if n else b""
                outer.calls.append({"at": time.time(), "body": body, "headers": {k.lower(): v for k, v in self.headers.items()}})
                code = 500 if len(outer.calls) <= outer.fail_first else 200
                self.send_response(code)
                self.send_header("Content-Length", "0")
                self.end_headers()

            def log_message(self, *a):
                pass

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.url = f"http://127.0.0.1:{self.server.server_address[1]}/hook"
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def wait_for(self, n=1, timeout=20):
        end = time.time() + timeout
        while time.time() < end and len(self.calls) < n:
            time.sleep(0.2)
        return self.calls

    def close(self):
        self.server.shutdown()
        self.server.server_close()


@pytest.fixture()
def rcv():
    r = Receiver()
    yield r
    r.close()


@pytest.fixture(autouse=True)
def clean_hooks(request):
    """Webhooks are limited per workspace and old ones would receive new events: remove them after each test."""
    yield
    for name in ("alpha", "beta"):
        if name in request.fixturenames:
            key = request.getfixturevalue(name)["admin_key"]
            for w in requests.get(f"{CLOUD_URL}/v1/webhooks", headers=H(key), timeout=10).json().get("webhooks", []):
                requests.delete(f"{CLOUD_URL}/v1/webhooks/{w['id']}", headers=H(key), timeout=10)


def make_hook(key, url, events=None):
    body = {"url": url}
    if events is not None:
        body["events"] = events
    r = requests.post(f"{CLOUD_URL}/v1/webhooks", headers=H(key), json=body, timeout=10)
    assert r.status_code == 201, r.text
    return r.json()


def hook_deliveries(key, hook_id=None):
    q = f"?webhook_id={hook_id}" if hook_id else ""
    return requests.get(f"{CLOUD_URL}/v1/webhook-deliveries{q}", headers=H(key), timeout=10).json()["deliveries"]


def signature_ok(call, secret):
    h = call["headers"]
    return verify_webhook(secret, h["x-aran-timestamp"], call["body"], h["x-aran-signature"])


def test_webhook_crud_and_secret_shown_once(alpha, rcv):
    key = alpha["admin_key"]
    wh = make_hook(key, rcv.url, ["alert", "block"])
    assert wh["id"].startswith("wh_") and wh["secret"].startswith("whsec_") and wh["events"] == ["alert", "block"]
    got = requests.get(f"{CLOUD_URL}/v1/webhooks/{wh['id']}", headers=H(key), timeout=10).json()
    assert "secret" not in got
    lst = requests.get(f"{CLOUD_URL}/v1/webhooks", headers=H(key), timeout=10).json()
    assert wh["id"] in [w["id"] for w in lst["webhooks"]] and all("secret" not in w for w in lst["webhooks"])
    r = requests.patch(f"{CLOUD_URL}/v1/webhooks/{wh['id']}", headers=H(key), json={"events": ["*"], "disabled": True}, timeout=10)
    assert r.status_code == 200 and r.json()["events"] == ["*"] and r.json()["disabled"] is True and "secret" not in r.json()
    assert requests.post(f"{CLOUD_URL}/v1/webhooks", headers=H(key), json={"url": rcv.url, "events": ["nope"]}, timeout=10).status_code == 422
    assert requests.delete(f"{CLOUD_URL}/v1/webhooks/{wh['id']}", headers=H(key), timeout=10).json()["deleted"] is True
    assert requests.get(f"{CLOUD_URL}/v1/webhooks/{wh['id']}", headers=H(key), timeout=10).status_code == 404


def test_webhook_scope(alpha, rcv):
    key = alpha["admin_key"]
    weak = mint(key, "protect only", ["protect"])
    assert requests.post(f"{CLOUD_URL}/v1/webhooks", headers=H(weak), json={"url": rcv.url}, timeout=10).status_code == 403
    assert requests.get(f"{CLOUD_URL}/v1/webhooks", headers=H(weak), timeout=10).status_code == 403
    dash = mint(key, "dashboard only", ["dashboard"])
    assert requests.get(f"{CLOUD_URL}/v1/webhooks", headers=H(dash), timeout=10).status_code == 200
    assert requests.post(f"{CLOUD_URL}/v1/webhooks", headers=H(dash), json={"url": rcv.url}, timeout=10).status_code == 403


@pytest.mark.parametrize("url", [
    "http://169.254.169.254/latest/meta-data/",
    "http://127.0.0.1:8100/hook",
    "http://127.0.0.1:8000/hook",
    "http://[::1]:8100/hook",
    "ftp://example.com/hook",
    "file:///etc/passwd",
    "http://user:pass@127.0.0.1:9/hook",
])
def test_webhook_ssrf_refused(alpha, url):
    key = alpha["admin_key"]
    r = requests.post(f"{CLOUD_URL}/v1/webhooks", headers=H(key), json={"url": url}, timeout=10)
    assert r.status_code == 400, r.text
    wh = make_hook(key, "http://127.0.0.1:9/ok")
    r = requests.patch(f"{CLOUD_URL}/v1/webhooks/{wh['id']}", headers=H(key), json={"url": url}, timeout=10)
    assert r.status_code == 400, r.text


def test_test_endpoint_delivers_a_signed_event(alpha, rcv):
    key = alpha["admin_key"]
    wh = make_hook(key, rcv.url, ["spike"])
    r = requests.post(f"{CLOUD_URL}/v1/webhooks/{wh['id']}/test", headers=H(key), timeout=20)
    assert r.status_code == 200 and r.json()["delivered"] is True and r.json()["status_code"] == 200
    call = rcv.calls[0]
    h = call["headers"]
    assert h["x-aran-event"] == "test" and h["x-aran-delivery"] == r.json()["delivery_id"]
    assert h["x-aran-signature"].startswith("sha256=") and h["x-aran-timestamp"].isdigit()
    assert signature_ok(call, wh["secret"])
    assert not verify_webhook("whsec_wrong", h["x-aran-timestamp"], call["body"], h["x-aran-signature"])
    assert not verify_webhook(wh["secret"], h["x-aran-timestamp"], call["body"] + b" ", h["x-aran-signature"])
    # the recipe in the spec, written out by hand
    import hashlib, hmac
    mac = hmac.new(wh["secret"].encode(), h["x-aran-timestamp"].encode() + b"." + call["body"], hashlib.sha256).hexdigest()
    assert h["x-aran-signature"] == "sha256=" + mac
    body = json.loads(call["body"])
    assert body["type"] == "test" and body["tenant_id"] == alpha["tenant_id"]
    d = [x for x in hook_deliveries(key, wh["id"]) if x["event_type"] == "test"]
    assert d and d[0]["state"] == "delivered"


def test_test_endpoint_reports_a_failing_receiver(alpha):
    key = alpha["admin_key"]
    wh = make_hook(key, f"http://127.0.0.1:{free_port()}/nothing-here")
    r = requests.post(f"{CLOUD_URL}/v1/webhooks/{wh['id']}/test", headers=H(key), timeout=20)
    assert r.status_code == 200 and r.json()["delivered"] is False and r.json()["error"]


def alert_setup(key, up_url, action="alert", mode="enforce"):
    pol = make_policy(key, pname(), [{"type": "MOBILE", "action": action}])
    return make_route(key, up_url, mode=mode, policy_id=pol["id"])


def test_retries_on_500_then_succeeds(alpha, up):
    ids = sample_ids()
    key = alpha["admin_key"]
    r500 = Receiver(fail_first=1)
    try:
        wh = make_hook(key, r500.url, ["alert"])
        route = alert_setup(key, up.url)
        assert fw(key, route, "x", json={"mobile": ids["mobile"]}).status_code == 200
        got = r500.wait_for(2, timeout=30)
        assert len(got) == 2, "no retry after the 500"
        assert got[0]["headers"]["x-aran-delivery"] == got[1]["headers"]["x-aran-delivery"]      # same delivery, second attempt
        assert 0.8 <= got[1]["at"] - got[0]["at"] < 8                                           # first backoff is 1 s
        assert signature_ok(got[0], wh["secret"]) and signature_ok(got[1], wh["secret"])
        time.sleep(1.5)
        d = hook_deliveries(key, wh["id"])
        assert len(d) == 1 and d[0]["state"] == "delivered" and d[0]["attempts"] == 2 and d[0]["status_code"] == 200
        assert len(r500.calls) == 2                                                             # no third attempt
    finally:
        r500.close()


def test_failed_test_delivery_is_recorded(alpha):
    """A dead receiver: the test event is one attempt, recorded as failed with the error."""
    key = alpha["admin_key"]
    wh = make_hook(key, f"http://127.0.0.1:{free_port()}/dead")
    requests.post(f"{CLOUD_URL}/v1/webhooks/{wh['id']}/test", headers=H(key), timeout=20)
    d = hook_deliveries(key, wh["id"])
    assert d[0]["state"] == "failed" and d[0]["attempts"] == 1 and d[0]["error"]


def test_alert_payload_has_types_and_counts_never_raw(alpha, up, rcv):
    ids = sample_ids()
    key = alpha["admin_key"]
    wh = make_hook(key, rcv.url, ["alert"])
    route = alert_setup(key, up.url)
    r = fw(key, route, f"look/{ids['mobile']}", json={"mobile": ids["mobile"], "note": f"card {ids['card']} aadhaar {ids['aadhaar']}"})
    assert r.status_code == 200
    got = rcv.wait_for(1)
    assert got and got[0]["headers"]["x-aran-event"] == "alert" and signature_ok(got[0], wh["secret"])
    body = json.loads(got[0]["body"])
    assert body["type"] == "alert" and body["data"]["route"] == route["name"] and body["data"]["types"] == ["MOBILE"]
    for raw in (ids["mobile"], ids["card"], ids["aadhaar"]):
        assert raw not in got[0]["body"].decode(), raw
    time.sleep(1)
    rows = db_rows("SELECT payload_json FROM webhook_deliveries WHERE webhook_id=?", wh["id"])
    assert rows
    for raw in (ids["mobile"], ids["card"], ids["aadhaar"]):
        assert all(raw not in x["payload_json"] for x in rows)
        assert raw not in db_text(alpha["tenant_id"])


def test_block_event_and_event_filter(alpha, up):
    ids = sample_ids()
    key = alpha["admin_key"]
    only_spike, blocks = Receiver(), Receiver()
    try:
        make_hook(key, only_spike.url, ["spike"])
        wh = make_hook(key, blocks.url, ["block"])
        route = alert_setup(key, up.url, action="block")
        assert fw(key, route, "x", json={"mobile": ids["mobile"]}).status_code == 403
        got = blocks.wait_for(1)
        assert got and json.loads(got[0]["body"])["type"] == "block" and signature_ok(got[0], wh["secret"])
        assert json.loads(got[0]["body"])["data"]["types"] == ["MOBILE"]
        assert ids["mobile"] not in got[0]["body"].decode()
        time.sleep(1.5)
        assert only_spike.calls == []          # not subscribed to 'block'
    finally:
        only_spike.close()
        blocks.close()


def test_monitor_mode_still_raises_alert_but_not_would_events(alpha, up, rcv):
    ids = sample_ids()
    key = alpha["admin_key"]
    make_hook(key, rcv.url, ["*"])
    route = alert_setup(key, up.url, action="tokenise", mode="monitor")        # monitor + tokenise: only 'would_protect' internally
    fw(key, route, "x", json={"mobile": ids["mobile"]})
    time.sleep(2)
    assert rcv.calls == []                  # would_protect is not delivered


def test_route_failure_event(alpha, up, rcv):
    ids = sample_ids()
    key = alpha["admin_key"]
    make_hook(key, rcv.url, ["route_failure"])
    route = make_route(key, up.url, mode="enforce", fail_mode="closed")
    r = fw(key, route, "x", json={"mobile": ids["mobile"]}, headers=core_down_headers(key))
    if r.status_code != 503:
        pytest.skip("server was not started with ARAN_FAAS_TEST_HOOKS=1")
    got = rcv.wait_for(1)
    assert got and json.loads(got[0]["body"])["type"] == "route_failure"
    assert json.loads(got[0]["body"])["data"]["route"] == route["name"]
    assert ids["mobile"] not in got[0]["body"].decode()


def test_webhooks_are_isolated_between_tenants(alpha, beta, up):
    ids = sample_ids()
    ka, kb = alpha["admin_key"], beta["admin_key"]
    ra, rb = Receiver(), Receiver()
    try:
        wa = make_hook(ka, ra.url, ["alert"])
        wb = make_hook(kb, rb.url, ["alert"])
        # B cannot see, change, test or delete A's webhook; it also does not appear in B's list or deliveries
        assert requests.get(f"{CLOUD_URL}/v1/webhooks/{wa['id']}", headers=H(kb), timeout=10).status_code == 404
        assert requests.patch(f"{CLOUD_URL}/v1/webhooks/{wa['id']}", headers=H(kb), json={"disabled": True}, timeout=10).status_code == 404
        assert requests.post(f"{CLOUD_URL}/v1/webhooks/{wa['id']}/test", headers=H(kb), timeout=10).status_code == 404
        assert requests.delete(f"{CLOUD_URL}/v1/webhooks/{wa['id']}", headers=H(kb), timeout=10).status_code == 404
        assert wa["id"] not in [w["id"] for w in requests.get(f"{CLOUD_URL}/v1/webhooks", headers=H(kb), timeout=10).json()["webhooks"]]
        # an alert in A reaches A only
        route = alert_setup(ka, up.url)
        fw(ka, route, "x", json={"mobile": ids["mobile"]})
        assert ra.wait_for(1)
        time.sleep(2)
        assert rb.calls == []
        assert hook_deliveries(kb, wa["id"]) == [] and hook_deliveries(kb) == []
        assert requests.get(f"{CLOUD_URL}/v1/webhooks/{wa['id']}", headers=H(ka), timeout=10).status_code == 200
        assert wb["id"] != wa["id"]
    finally:
        ra.close()
        rb.close()


def test_spike_event_fires_once(alpha, up, rcv):
    ids = sample_ids()
    key = alpha["admin_key"]
    wh = make_hook(key, rcv.url, ["spike"])
    route = make_route(key, up.url, mode="enforce")
    burst = {"values": [f"call {ids['mobile']} " for _ in range(25)]}
    assert fw(key, route, "burst", json=burst).status_code == 200
    got = rcv.wait_for(1)
    assert got, "no spike event"
    body = json.loads(got[0]["body"])
    assert body["type"] == "spike" and body["data"]["route"] == route["name"] and body["data"]["protected_last_minute"] >= 20
    assert signature_ok(got[0], wh["secret"]) and ids["mobile"] not in got[0]["body"].decode()
    fw(key, route, "burst", json=burst)                                   # second burst within 10 minutes: no second event
    time.sleep(2.5)
    assert len(rcv.calls) == 1
    small = make_route(key, up.url, mode="enforce")
    fw(key, small, "x", json={"mobile": ids["mobile"]})                   # below 20: no spike
    time.sleep(2)
    assert len(rcv.calls) == 1


def test_export_json_and_cef(alpha, up):
    ids = sample_ids()
    key = alpha["admin_key"]
    t0 = time.time() - 1
    pol = make_policy(key, pname(), [{"type": "AADHAAR", "action": "block"}])
    ok_route = make_route(key, up.url, mode="enforce")
    blk_route = make_route(key, up.url, mode="enforce", policy_id=pol["id"])
    fw(key, ok_route, f"seen/{ids['mobile']}", json={"mobile": ids["mobile"], "card": ids["card"]})
    assert fw(key, blk_route, "x", json={"aadhaar": ids["aadhaar"]}).status_code == 403
    r = requests.get(f"{CLOUD_URL}/v1/events/export?format=json&since={t0}", headers=H(key), timeout=10)
    assert r.status_code == 200 and "ndjson" in r.headers["content-type"]
    rows = [json.loads(x) for x in r.text.splitlines()]
    assert len(rows) == int(r.headers["X-Aran-Count"]) >= 2
    types = {x["route"]: x for x in rows}
    assert types[ok_route["name"]]["type"] == "route.forwarded" and types[ok_route["name"]]["protected"] >= 2
    assert types[blk_route["name"]]["type"] == "route.blocked" and types[blk_route["name"]]["blocked"] is True
    assert all(x["tenant_id"] == alpha["tenant_id"] for x in rows)
    c = requests.get(f"{CLOUD_URL}/v1/events/export?format=cef&since={t0}", headers=H(key), timeout=10)
    assert c.status_code == 200
    lines = c.text.splitlines()
    assert len(lines) == len(rows) and all(l.startswith("CEF:0|Aran|Aran Cloud|1.0|") for l in lines)
    blocked = [l for l in lines if "|route.blocked|route.blocked|8|" in l]
    assert blocked and "act=blocked" in blocked[0] and f"cs1={blk_route['name']}" in blocked[0] and "cn1Label=protected" in blocked[0]
    for raw in (ids["mobile"], ids["card"], ids["aadhaar"]):
        assert raw not in r.text and raw not in c.text
    # reading on from the last event returns nothing new
    nxt = requests.get(f"{CLOUD_URL}/v1/events/export?format=json&since={r.headers['X-Aran-Next-Since']}", headers=H(key), timeout=10)
    assert nxt.status_code == 200 and nxt.text == ""
    assert requests.get(f"{CLOUD_URL}/v1/events/export?format=xml", headers=H(key), timeout=10).status_code == 422


def test_export_scope_and_isolation(alpha, beta, up):
    ids = sample_ids()
    ka, kb = alpha["admin_key"], beta["admin_key"]
    route = make_route(ka, up.url, mode="enforce")
    fw(ka, route, "x", json={"mobile": ids["mobile"]})
    weak = mint(ka, "protect only", ["protect"])
    assert requests.get(f"{CLOUD_URL}/v1/events/export", headers=H(weak), timeout=10).status_code == 403
    mine = requests.get(f"{CLOUD_URL}/v1/events/export?format=json", headers=H(kb), timeout=10)
    assert mine.status_code == 200 and route["name"] not in mine.text and alpha["tenant_id"] not in mine.text


# ================================================================ phase 4: drop-in AI gateway
AI_MSG = f"{CLOUD_URL}/v1/ai/v1/messages"
AI_CHAT = f"{CLOUD_URL}/v1/ai/v1/chat/completions"


@pytest.fixture(scope="module")
def aiws():
    # own workspace: the per-key rate limit is shared by every call made with one key
    return new_workspace("Faas Ai")


def ai_post(url, key, body, **headers):
    h = {"x-api-key": key} if url == AI_MSG else {"Authorization": f"Bearer {key}"}
    h.update(headers)
    return requests.post(url, headers=h, json=body, timeout=30)


def reply_text(r):
    j = r.json()
    return j["content"][0]["text"] if "content" in j else j["choices"][0]["message"]["content"]


def test_ai_gateway_anthropic_shape_and_cleaning(aiws):
    key = aiws["admin_key"]
    ids = sample_ids()
    body = {"model": "claude-test", "max_tokens": 50, "system": f"Officer note: card {ids['card']}",
            "messages": [{"role": "user", "content": f"Aadhaar {ids['aadhaar']} please"},
                         {"role": "user", "content": [{"type": "text", "text": f"call {ids['mobile']}"}]}]}
    r = ai_post(AI_MSG, key, body)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["type"] == "message" and j["role"] == "assistant" and j["stop_reason"] == "end_turn"
    assert j["id"].startswith("msg_") and j["usage"]["input_tokens"] >= 1
    assert j["content"][0]["type"] == "text"
    text = reply_text(r)
    assert ids["mobile"] not in text and ids["aadhaar"] not in text       # the echo shows what a model would have seen
    assert int(r.headers["X-Aran-Protected"]) == 3 and r.headers["X-Aran-Gateway"] == "echo"


def test_ai_gateway_openai_shape_and_cleaning(aiws):
    key = aiws["admin_key"]
    ids = sample_ids()
    body = {"model": "gpt-test", "messages": [{"role": "system", "content": f"card {ids['card']}"},
                                               {"role": "user", "content": [{"type": "text", "text": f"aadhaar {ids['aadhaar']} here"}]},
                                               {"role": "user", "content": f"mobile {ids['mobile']}"}]}
    r = ai_post(AI_CHAT, key, body)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["object"] == "chat.completion" and j["choices"][0]["message"]["role"] == "assistant"
    assert j["choices"][0]["finish_reason"] == "stop" and j["usage"]["total_tokens"] >= 2
    assert ids["mobile"] not in reply_text(r)
    assert int(r.headers["X-Aran-Protected"]) == 3


def test_ai_gateway_role_restore_or_keep_tokens(aiws):
    key = aiws["admin_key"]
    ids = sample_ids()
    body = {"model": "m", "max_tokens": 50, "messages": [{"role": "user", "content": f"Aadhaar {ids['aadhaar']} mobile {ids['mobile']}"}]}
    none = reply_text(ai_post(AI_MSG, key, body))
    assert ids["aadhaar"] not in none and ids["mobile"] not in none            # no role: tokens stay
    kyc = reply_text(ai_post(AI_MSG, key, body, **{"X-Aran-Role": "kyc-officer"}))
    assert ids["aadhaar"] in kyc and ids["mobile"] in kyc
    care = reply_text(ai_post(AI_CHAT, key, {"model": "m", "messages": body["messages"]}, **{"X-Aran-Role": "customer-care"}))
    assert ids["mobile"] in care and ids["aadhaar"] not in care                # care sees mobiles, not Aadhaar
    ana = reply_text(ai_post(AI_MSG, key, body, **{"X-Aran-Role": "analyst"}))
    assert ids["aadhaar"] not in ana and ids["mobile"] not in ana
    assert ai_post(AI_MSG, key, body, **{"X-Aran-Role": "root"}).status_code == 400


def test_ai_gateway_policy_block_and_alert(aiws):
    key = aiws["admin_key"]
    ids = sample_ids()
    name = pname()
    make_policy(key, name, [{"type": "AADHAAR", "action": "block"}, {"type": "*", "action": "tokenise"}])
    body = {"model": "m", "max_tokens": 20, "messages": [{"role": "user", "content": f"Aadhaar {ids['aadhaar']}"}]}
    r = ai_post(AI_MSG, key, body, **{"X-Aran-Policy": name})
    assert r.status_code == 403 and r.json()["blocked"] is True and "AADHAAR" in r.json()["types"]
    assert ids["aadhaar"] not in r.text
    ok = ai_post(AI_MSG, key, {"model": "m", "max_tokens": 20, "messages": [{"role": "user", "content": f"mobile {ids['mobile']}"}]},
                 **{"X-Aran-Policy": name})
    assert ok.status_code == 200
    assert ai_post(AI_MSG, key, body, **{"X-Aran-Policy": "no-such-policy"}).status_code == 404
    rows = db_rows("SELECT status FROM usage_events WHERE tenant_id=? AND endpoint='/v1/ai'", aiws["tenant_id"])
    assert "blocked" in [x["status"] for x in rows]


def test_ai_gateway_refuses_stream_and_bad_bodies(aiws):
    key = aiws["admin_key"]
    r = ai_post(AI_MSG, key, {"model": "m", "max_tokens": 5, "stream": True, "messages": [{"role": "user", "content": "hi"}]})
    assert r.status_code == 400 and "stream" in r.text
    assert ai_post(AI_CHAT, key, {"model": "m", "stream": True, "messages": [{"role": "user", "content": "hi"}]}).status_code == 400
    assert ai_post(AI_CHAT, key, {"model": "m", "messages": []}).status_code == 400
    assert ai_post(AI_MSG, key, {"model": "m", "messages": [{"role": "user", "content": "hi"}]}).status_code == 400   # no max_tokens
    assert requests.post(AI_MSG, headers={"x-api-key": "bogus"}, json={}, timeout=10).status_code == 401
    assert requests.post(AI_MSG, json={}, timeout=10).status_code == 401


def test_ai_gateway_needs_the_gateway_scope(aiws):
    weak = mint(aiws["admin_key"], "no-gateway", ["protect"])
    r = ai_post(AI_MSG, weak, {"model": "m", "max_tokens": 5, "messages": [{"role": "user", "content": "hi"}]})
    assert r.status_code == 403 and "gateway" in r.text
    ok = mint(aiws["admin_key"], "gw-only", ["gateway"])
    assert ai_post(AI_CHAT, ok, {"model": "m", "messages": [{"role": "user", "content": "hi"}]}).status_code == 200


def test_ai_gateway_meters_without_raw_identifiers(aiws):
    ws = new_workspace("Faas Ai Meter")
    ids = sample_ids()
    body = {"model": "m", "max_tokens": 20, "messages": [{"role": "user", "content": f"Aadhaar {ids['aadhaar']} card {ids['card']}"}]}
    r = ai_post(AI_MSG, ws["admin_key"], body, **{"X-Aran-Role": "kyc-officer"})
    assert r.status_code == 200
    rows = db_rows("SELECT * FROM usage_events WHERE tenant_id=? AND endpoint='/v1/ai'", ws["tenant_id"])
    assert len(rows) == 1 and rows[0]["sink"] == "llm-gateway" and rows[0]["protected_count"] == 2
    stored = db_text(ws["tenant_id"])
    for raw in (ids["aadhaar"], ids["card"]):
        assert raw not in stored
    stats = requests.get(f"{CLOUD_URL}/v1/ai/stats", headers=H(ws["admin_key"]), timeout=10).json()
    assert stats["calls_24h"] == 1 and stats["protected_24h"] == 2 and stats["base_url"].endswith("/v1/ai")


def test_ai_gateway_never_forwards_keys(aiws):
    """The gateway code reads the provider key only from the server environment and never sends the Aran key."""
    src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "faas.py")).read()
    part = src[src.index("def _ai_upstream"):src.index("def _build_ai")]
    assert 'up = {"x-api-key": key' in part and "headers.get(\"x-api-key\")" not in part and "authorization\")" not in part
