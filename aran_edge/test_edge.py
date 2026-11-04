"""
Tests for aran_edge, the self-hosted data plane.

They run against a live Aran Cloud (ARAN_CLOUD_URL, default http://127.0.0.1:8100) and a live core (ARAN_CORE_URL,
default :8000), started the way scripts/run_demo.sh starts them. The edge itself runs in-process (FastAPI TestClient)
with its own temporary SQLite file, so the tests can look at exactly what it sends to Cloud. A small upstream server
records what it receives. All identifiers are generated.
"""

import base64
import json
import os
import random
import sqlite3
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest
import requests
from fastapi.testclient import TestClient

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "aran_cloud"))
import edge as edge_mod  # noqa: E402
import fw_core  # noqa: E402

CLOUD_URL = os.environ.get("ARAN_CLOUD_URL", "http://127.0.0.1:8100")
CORE_URL = os.environ.get("ARAN_CORE_URL", "http://127.0.0.1:8000")
LOCAL_KEY = "local-test-key-123"


def internal_secret():
    s = os.environ.get("ARAN_INTERNAL_SECRET", "")
    if not s:
        env_local = os.path.join(HERE, "..", ".env.local")
        if os.path.exists(env_local):
            for line in open(env_local):
                if line.startswith("ARAN_INTERNAL_SECRET="):
                    s = line.strip().split("=", 1)[1]
    return s


def sample_ids():
    r = requests.get(f"{CORE_URL}/api/tour/generate", headers={"X-Aran-Internal": internal_secret()}, timeout=5)
    r.raise_for_status()
    return r.json()


def new_workspace(label):
    body = {"name": f"{label} {time.time()}", "email": f"{label.lower().replace(' ', '')}_{random.randint(1, 10**9)}@bank.test"}
    r = requests.post(f"{CLOUD_URL}/v1/workspaces", json=body, timeout=10)
    assert r.status_code == 200, r.text
    return r.json()


def H(key):
    return {"X-API-Key": key}


def mint(admin_key, label, scopes):
    r = requests.post(f"{CLOUD_URL}/v1/keys", headers=H(admin_key), json={"label": label, "scopes": scopes}, timeout=10)
    assert r.status_code == 200, r.text
    return r.json()["api_key"]


class Upstream:
    def __init__(self):
        self.received = []
        outer = self

        class Handler(BaseHTTPRequestHandler):
            def _do(self):
                n = int(self.headers.get("Content-Length") or 0)
                body = self.rfile.read(n) if n else b""
                outer.received.append({"method": self.command, "path": self.path, "body": body.decode("utf-8", "replace")})
                out = b'{"ok":true}'
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(out)))
                self.end_headers()
                self.wfile.write(out)

            do_GET = do_POST = do_PUT = do_PATCH = do_DELETE = _do

            def log_message(self, *a):
                pass

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.url = f"http://127.0.0.1:{self.server.server_address[1]}"
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def close(self):
        self.server.shutdown()
        self.server.server_close()


class Recorder:
    """Stands in for `requests` in the edge's calls to Cloud and keeps everything the edge sends."""

    def __init__(self):
        self.sent = []

    def _call(self, method, url, **kw):
        self.sent.append({"method": method, "url": url, "json": kw.get("json"), "data": kw.get("data"), "params": kw.get("params")})
        return getattr(requests, method)(url, **kw)

    def get(self, url, **kw):
        return self._call("get", url, **kw)

    def post(self, url, **kw):
        return self._call("post", url, **kw)


@pytest.fixture(scope="module")
def alpha():
    return new_workspace("Edge Alpha")


@pytest.fixture(scope="module")
def beta():
    return new_workspace("Edge Beta")


@pytest.fixture(scope="module")
def up():
    u = Upstream()
    yield u
    u.close()


def make_route(key, upstream_url, name, **kw):
    body = dict({"name": name, "upstream_url": upstream_url}, **kw)
    r = requests.post(f"{CLOUD_URL}/v1/routes", headers=H(key), json=body, timeout=10)
    assert r.status_code == 201, r.text
    return r.json()


def patch_route(key, rid, **kw):
    r = requests.patch(f"{CLOUD_URL}/v1/routes/{rid}", headers=H(key), json=kw, timeout=10)
    assert r.status_code == 200, r.text
    return r.json()


def public_key():
    return requests.get(f"{CLOUD_URL}/v1/edge/public-key", timeout=10).json()["public_key"]


def make_edge(tmp_path, edge_key, name="test-edge", **kw):
    rec = Recorder()
    cfg = edge_mod.Settings(cloud_url=CLOUD_URL, edge_key=edge_key, core_url=CORE_URL, public_key=public_key(),
                            local_key=LOCAL_KEY, db_path=str(tmp_path / f"{name}.db"), name=name, allow_private=True,
                            test_hooks=True, background=False, internal_secret=internal_secret(), core_timeout_ms=2000, **kw)
    app = edge_mod.create_app(cfg, rec)
    e = app.state.edge
    e.register()
    return e, TestClient(app), rec


def get_envelope(edge_key, applied=0):
    r = requests.get(f"{CLOUD_URL}/v1/edge/config?applied={applied}", headers=H(edge_key), timeout=10)
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="module")
def world(alpha, up):
    """An enforce route and a monitor route on Cloud, an edge key, and an edge that has pulled its config."""
    admin = alpha["admin_key"]
    enf = make_route(admin, up.url, "edge-enf", mode="enforce", sink="vendor-enf")
    mon = make_route(admin, up.url, "edge-mon", mode="monitor", sink="vendor-mon")
    ekey = mint(admin, "edge-1", ["edge"])
    return {"admin": admin, "enf": enf, "mon": mon, "ekey": ekey}


@pytest.fixture()
def edge(tmp_path, world):
    e, client, rec = make_edge(tmp_path, world["ekey"])
    e.pull_config()
    return e, client, rec


def post(client, route, body, **kw):
    headers = kw.pop("headers", {"X-API-Key": LOCAL_KEY})
    return client.post(f"/fw/{route}/ingest", headers=headers, json=body, **kw)


# ---------------------------------------------------------------- the signed config
def test_scope_and_public_key(alpha, world):
    assert "edge" in alpha["scopes"]
    pk = requests.get(f"{CLOUD_URL}/v1/edge/public-key", timeout=10).json()
    assert pk["alg"] == "Ed25519" and len(pk["public_key"]) >= 40
    assert requests.get(f"{CLOUD_URL}/v1/edge/config", timeout=10).status_code == 401
    protect_only = mint(world["admin"], "p", ["protect"])
    assert requests.get(f"{CLOUD_URL}/v1/edge/config", headers=H(protect_only), timeout=10).status_code == 403
    assert requests.post(f"{CLOUD_URL}/v1/edge/report", headers=H(protect_only), json={}, timeout=10).status_code == 403


def test_config_content_has_no_secrets(alpha, world):
    hook = requests.post(f"{CLOUD_URL}/v1/webhooks", headers=H(world["admin"]), json={"url": "https://example.com/h", "events": ["block"]}, timeout=10)
    secret = hook.json().get("secret", "") if hook.status_code == 201 else ""
    env = get_envelope(world["ekey"])
    assert env["alg"] == "Ed25519" and env["signature"]
    p = json.loads(env["payload"])
    assert p["tenant_id"] == alpha["tenant_id"] and p["edge_id"].startswith("edg_")
    assert 590 <= p["expires_at"] - p["issued_at"] <= 610
    assert {r["name"] for r in p["routes"]} >= {"edge-enf", "edge-mon"}
    text = env["payload"]
    for secret_value in (world["admin"], world["ekey"], secret):
        if secret_value:
            assert secret_value not in text
    assert "key_hash" not in text and "secret" not in text.lower()


def test_edge_applies_good_config(edge, world):
    e, client, _ = edge
    assert e.config["version"] >= 1 and e.active_config() is not None
    st = client.get("/edge/status", headers={"X-API-Key": LOCAL_KEY}).json()
    assert st["config_valid"] and "edge-enf" in st["routes"] and st["tenant_id"] == e.tenant_id


def test_tampered_signature_refused(edge, world):
    e, client, _ = edge
    good = get_envelope(world["ekey"])
    v = e.config["version"]
    # change a route's upstream inside the signed text
    payload = json.loads(good["payload"])
    payload["routes"][0]["upstream_url"] = "http://evil.example/steal"
    tampered = dict(good, payload=json.dumps(payload, sort_keys=True, separators=(",", ":")))
    with pytest.raises(fw_core.ConfigRejected, match="signature"):
        e.apply_envelope(tampered)
    # a flipped signature, a missing one and a payload swapped in from a longer text
    sig = bytearray(base64.b64decode(good["signature"]))
    sig[0] ^= 1
    with pytest.raises(fw_core.ConfigRejected):
        e.apply_envelope(dict(good, signature=base64.b64encode(bytes(sig)).decode()))
    with pytest.raises(fw_core.ConfigRejected, match="not signed"):
        e.apply_envelope({"payload": good["payload"]})
    with pytest.raises(fw_core.ConfigRejected):
        e.apply_envelope("not an envelope")
    # the old config is still in force and still serves
    assert e.config["version"] == v
    assert all(r["upstream_url"] != "http://evil.example/steal" for r in e.config["routes"])
    assert post(client, "edge-mon", {"a": "b"}).status_code == 200


def test_wrong_signing_key_refused(edge, world):
    e, _, _ = edge
    good = get_envelope(world["ekey"])
    other = fw_core.sign_config(os.urandom(32), json.loads(good["payload"]))      # right content, someone else's key
    with pytest.raises(fw_core.ConfigRejected, match="signature"):
        e.apply_envelope(other)


def test_expired_config_refused_and_edge_stops(edge, world):
    e, client, _ = edge
    env = get_envelope(world["ekey"], e.config["version"])
    pub = e.public_raw
    with pytest.raises(fw_core.ConfigRejected, match="expired"):
        fw_core.verify_config(env, pub, e.tenant_id, e.edge_id, now=time.time() + 700)
    # a config that has run out is not used: the edge refuses traffic until a fresh one is pulled
    e.config = dict(e.config, expires_at=time.time() - 1)
    r = post(client, "edge-mon", {"a": "b"})
    assert r.status_code == 503 and r.json()["error"] == "no_valid_config"
    assert client.get("/edge/health").json()["config_valid"] is False
    e.pull_config()
    assert post(client, "edge-mon", {"a": "b"}).status_code == 200


def test_last_good_config_kept_until_expiry(edge, world, tmp_path):
    e, client, _ = edge
    v = e.config["version"]
    with pytest.raises(fw_core.ConfigRejected):
        e.apply_envelope({"payload": "{}", "signature": "AAAA"})
    assert e.config["version"] == v and e.active_config() is not None
    assert post(client, "edge-mon", {"a": "b"}).status_code == 200
    # a restart re-checks the saved config and keeps using it
    cfg2 = edge_mod.Settings(cloud_url=CLOUD_URL, edge_key=world["ekey"], core_url=CORE_URL, public_key=public_key(),
                             local_key=LOCAL_KEY, db_path=e.cfg.db_path, background=False)
    e2 = edge_mod.Edge(cfg2)
    assert e2.config and e2.config["version"] == v


def test_other_tenant_config_refused(edge, beta):
    e, _, _ = edge
    bkey = mint(beta["admin_key"], "edge-b", ["edge"])
    foreign = get_envelope(bkey)            # genuinely signed by Cloud, but for another tenant
    v = e.config["version"]
    with pytest.raises(fw_core.ConfigRejected, match="another tenant"):
        e.apply_envelope(foreign)
    assert e.config["version"] == v


def test_other_edge_config_refused(edge, world, tmp_path):
    e, _, _ = edge
    second = mint(world["admin"], "edge-2", ["edge"])
    env2 = get_envelope(second)             # same tenant, other edge id
    with pytest.raises(fw_core.ConfigRejected, match="another edge"):
        e.apply_envelope(env2)


def test_older_version_refused(edge, world):
    e, client, _ = edge
    old = get_envelope(world["ekey"], e.config["version"])
    v_old = json.loads(old["payload"])["version"]
    tmp = make_route(world["admin"], "http://127.0.0.1:9/x", f"edge-bump-{random.randint(1, 10**6)}")
    new = get_envelope(world["ekey"], v_old)
    assert json.loads(new["payload"])["version"] > v_old
    e.apply_envelope(new)
    v_new = e.config["version"]
    with pytest.raises(fw_core.ConfigRejected, match="older"):
        e.apply_envelope(old)               # valid signature, not expired, but a rollback
    assert e.config["version"] == v_new
    requests.delete(f"{CLOUD_URL}/v1/routes/{tmp['id']}", headers=H(world["admin"]), timeout=10)


def test_same_version_different_content_refused(edge, world):
    e, _, _ = edge
    env = get_envelope(world["ekey"], e.config["version"])
    p = json.loads(env["payload"])
    p["routes"] = []
    forged = fw_core.sign_config(os.urandom(32), p)    # would need Cloud's key; shows the digest rule on its own
    with pytest.raises(fw_core.ConfigRejected):
        e.apply_envelope(forged)
    # the digest rule itself, with a payload signed by the real key and a mismatching stored digest
    with pytest.raises(fw_core.ConfigRejected, match="same version"):
        fw_core.verify_config(env, e.public_raw, e.tenant_id, e.edge_id, e.config["version"], "0" * 64)


# ---------------------------------------------------------------- traffic through the edge
def test_edge_needs_local_key(edge):
    _, client, _ = edge
    assert client.post("/fw/edge-enf/ingest", json={}).status_code == 401
    assert client.post("/fw/edge-enf/ingest", json={}, headers={"X-API-Key": "wrong"}).status_code == 401
    assert client.get("/edge/status").status_code == 401


def test_clean_and_forward_through_route(edge, up):
    e, client, _ = edge
    ids = sample_ids()
    up.received.clear()
    r = post(client, "edge-enf", {"note": f"aadhaar {ids['aadhaar']} card {ids['card']}", "nested": {"phone": ids["mobile"]}, "n": 5})
    assert r.status_code == 200, r.text
    assert int(r.headers["X-Aran-Protected"]) >= 3
    assert r.headers["X-Aran-Route"] == "edge-enf" and r.headers["X-Aran-Edge"] == e.edge_id
    got = up.received[-1]
    for raw in ids.values():
        assert raw not in got["body"]
    sent = json.loads(got["body"])
    assert sent["n"] == 5 and sent["note"] != f"aadhaar {ids['aadhaar']} card {ids['card']}"


def test_unknown_route_and_unsupported_media(edge):
    _, client, _ = edge
    assert post(client, "nope", {}).status_code == 404
    r = client.post("/fw/edge-enf/x", headers={"X-API-Key": LOCAL_KEY, "Content-Type": "application/octet-stream"}, content=b"\x00\x01")
    assert r.status_code == 415


def test_monitor_mode_forwards_original(edge, up):
    _, client, _ = edge
    ids = sample_ids()
    up.received.clear()
    r = post(client, "edge-mon", {"note": f"aadhaar {ids['aadhaar']}"})
    assert r.status_code == 200
    assert ids["aadhaar"] in up.received[-1]["body"]            # monitor never changes the request
    assert int(r.headers["X-Aran-Would-Protect"]) >= 1 and r.headers["X-Aran-Protected"] == "0"


def test_policy_block_and_mask_from_signed_config(alpha, world, up, tmp_path):
    admin = world["admin"]
    name = f"edge-pol-{random.randint(1, 10**6)}"
    pol = requests.post(f"{CLOUD_URL}/v1/policies", headers=H(admin), json={"name": name, "rules": [
        {"type": "AADHAAR", "action": "block"}, {"type": "CARD", "action": "mask"}]}, timeout=10)
    assert pol.status_code == 201, pol.text
    route = make_route(admin, up.url, f"edge-pr-{random.randint(1, 10**6)}", mode="enforce")
    patch_route(admin, route["id"], policy_id=pol.json()["id"])
    e, client, _ = make_edge(tmp_path, world["ekey"], name="pol-edge")
    e.pull_config()
    ids = sample_ids()
    up.received.clear()
    r = post(client, route["name"], {"a": f"aadhaar {ids['aadhaar']}"})
    assert r.status_code == 403 and r.json()["blocked"] is True and "AADHAAR" in r.json()["types"]
    assert not up.received
    r = post(client, route["name"], {"c": f"card {ids['card']}"})
    assert r.status_code == 200
    assert ids["card"] not in up.received[-1]["body"] and ids["card"][-4:] in up.received[-1]["body"]
    requests.delete(f"{CLOUD_URL}/v1/routes/{route['id']}", headers=H(admin), timeout=10)


def test_hold_when_core_down_masks_and_queues(edge, up):
    e, client, _ = edge
    ids = sample_ids()
    up.received.clear()
    r = post(client, "edge-enf", {"note": f"card {ids['card']}"}, headers={"X-API-Key": LOCAL_KEY, "X-Aran-Test-Fault": "core-down"})
    assert r.status_code == 202 and r.json()["held"] is True
    assert not up.received
    conn = sqlite3.connect(e.cfg.db_path)
    rows = conn.execute("SELECT body_protected FROM outbox").fetchall()
    conn.close()
    assert rows and all(ids["card"] not in b for (b,) in rows)       # the outbox never holds a raw value
    assert e.outbox_depth() >= 1
    c = sqlite3.connect(e.cfg.db_path)
    with c:
        c.execute("UPDATE outbox SET next_at=0")
    c.close()
    assert e.sweep_outbox()["sent"] >= 1
    assert up.received and ids["card"] not in up.received[-1]["body"]


def test_upstream_down_queues_protected_body(edge, world, tmp_path):
    e, client, _ = edge
    dead = make_route(world["admin"], "http://127.0.0.1:9", f"edge-dead-{random.randint(1, 10**6)}", mode="enforce")
    e.pull_config()
    ids = sample_ids()
    r = post(client, dead["name"], {"c": f"card {ids['card']}"})
    assert r.status_code == 202 and r.json()["reason"] == "upstream_unavailable"
    conn = sqlite3.connect(e.cfg.db_path)
    bodies = [b for (b,) in conn.execute("SELECT body_protected FROM outbox").fetchall()]
    conn.close()
    assert bodies and all(ids["card"] not in b for b in bodies)
    requests.delete(f"{CLOUD_URL}/v1/routes/{dead['id']}", headers=H(world["admin"]), timeout=10)


# ---------------------------------------------------------------- reports and what Cloud sees
def test_report_counts_only_and_listed(edge, world, up):
    e, client, _ = edge
    ids = sample_ids()
    for _ in range(3):
        post(client, "edge-enf", {"note": f"aadhaar {ids['aadhaar']}"})
    assert post(client, "edge-mon", {"x": 1}).status_code == 200
    out = e.report()
    assert out["sent"] == 2 and out["failed"] == 0
    listing = requests.get(f"{CLOUD_URL}/v1/edges", headers=H(world["admin"]), timeout=10).json()["edges"]
    mine = next(x for x in listing if x["id"] == e.edge_id)
    assert mine["name"] == "test-edge" and mine["online"] is True
    assert mine["applied_version"] == e.config["version"]
    assert mine["last_report"] and set(mine["last_report"]) <= {"route_id", "window_start", "calls", "protected", "blocked", "held", "p50_ms", "p95_ms", "applied_version"}
    assert mine["totals_24h"]["calls"] >= 4 and mine["totals_24h"]["protected"] >= 3
    # a key with only the dashboard scope may look, a key without it may not
    dash = mint(world["admin"], "d", ["dashboard"])
    assert requests.get(f"{CLOUD_URL}/v1/edges", headers=H(dash), timeout=10).status_code == 200
    assert requests.get(f"{CLOUD_URL}/v1/edges", headers=H(mint(world["admin"], "p2", ["protect"])), timeout=10).status_code == 403


def test_cloud_rejects_anything_but_counts(world, beta):
    ekey, rid = world["ekey"], world["enf"]["id"]
    ok = {"route_id": rid, "calls": 1, "protected": 1, "blocked": 0, "held": 0, "p50_ms": 1.5, "p95_ms": 2.5}

    def send(body):
        return requests.post(f"{CLOUD_URL}/v1/edge/report", headers=H(ekey), json=body, timeout=10)

    assert send(ok).status_code == 200
    ids = sample_ids()
    for bad in (dict(ok, text=f"aadhaar {ids['aadhaar']}"),                    # an extra field
                dict(ok, calls=f"{ids['aadhaar']}"),                            # a string where a count belongs
                dict(ok, calls={"n": 1}), dict(ok, protected=[1]),             # nested values
                dict(ok, calls=-1), dict(ok, p50_ms=True), dict(ok, calls=1.5),
                dict(ok, route_id=f"rt_{ids['aadhaar']}x"), dict(ok, route_id=ids["card"]),
                {"route_id": rid, "note": "hi"}, [ok], "text"):
        r = send(bad)
        assert r.status_code == 422, (bad, r.status_code, r.text)
    # a route of another tenant is not accepted
    other = make_route(beta["admin_key"], "http://127.0.0.1:9/x", f"edge-other-{random.randint(1, 10**6)}")
    assert send(dict(ok, route_id=other["id"])).status_code == 404
    assert requests.post(f"{CLOUD_URL}/v1/edge/report", json=ok, timeout=10).status_code == 401


def test_edge_never_sends_raw_identifiers_to_cloud(tmp_path, world, up):
    e, client, rec = make_edge(tmp_path, world["ekey"], name="inspect-edge")
    e.pull_config()
    ids = sample_ids()
    for route in ("edge-enf", "edge-mon"):
        post(client, route, {"note": f"aadhaar {ids['aadhaar']} card {ids['card']} phone {ids['mobile']}"})
        client.post(f"/fw/{route}/lookup/{ids['mobile']}?aadhaar={ids['aadhaar']}", headers={"X-API-Key": LOCAL_KEY, "X-Aran-Customer-Ref": "CUST-9"}, json={})
    post(client, "edge-enf", {"c": ids["card"]}, headers={"X-API-Key": LOCAL_KEY, "X-Aran-Test-Fault": "core-down"})
    e.report()
    assert rec.sent, "the edge should have talked to Cloud"
    allowed_paths = {"/v1/edge/register", "/v1/edge/config", "/v1/edge/report"}
    for call in rec.sent:
        path = call["url"].replace(CLOUD_URL, "").split("?")[0]
        assert path in allowed_paths
        dump = json.dumps(call, default=str)
        for raw in ids.values():
            assert raw not in dump, f"raw value sent to Cloud in {path}"
        if path == "/v1/edge/report":
            assert set(call["json"]) <= {"route_id", "window_start", "calls", "protected", "blocked", "held", "p50_ms", "p95_ms", "applied_version"}
            assert all(isinstance(v, (int, float)) for k, v in call["json"].items() if k != "route_id")
    assert any(c["url"].endswith("/v1/edge/report") for c in rec.sent)
    # and nothing raw sits in the edge's own database either
    conn = sqlite3.connect(e.cfg.db_path)
    text = json.dumps([list(r) for r in conn.execute("SELECT * FROM outbox").fetchall()])
    conn.close()
    for raw in ids.values():
        assert raw not in text


def test_failed_report_keeps_counts(tmp_path, world):
    e, client, _ = make_edge(tmp_path, world["ekey"], name="flaky-edge")
    e.pull_config()
    post(client, "edge-mon", {"x": 1})
    good = e.http
    e.http = type("Down", (), {"post": staticmethod(lambda *a, **k: (_ for _ in ()).throw(requests.exceptions.ConnectionError())),
                                "get": staticmethod(lambda *a, **k: None)})()
    assert e.report()["failed"] == 1
    e.http = good
    assert e.report() == {"sent": 1, "failed": 0}


# ---------------------------------------------------------------- security review regressions
def _settings(tmp_path, edge_key, **kw):
    return edge_mod.Settings(cloud_url=CLOUD_URL, edge_key=edge_key, core_url=CORE_URL, local_key=LOCAL_KEY,
                             db_path=str(tmp_path / "tofu.db"), background=False, internal_secret=internal_secret(), **kw)


def test_no_pinned_key_is_refused_by_default(tmp_path, world):
    """Without ARAN_EDGE_PUBLIC_KEY the edge does not learn a key from the network, so it never trusts configs."""
    rec = Recorder()
    e = edge_mod.Edge(_settings(tmp_path, world["ekey"], public_key=""), rec)
    with pytest.raises(fw_core.ConfigRejected, match="pinned"):
        e.register()
    assert e.public_raw is None and e._meta("public_key") is None and rec.sent == []
    with pytest.raises(fw_core.ConfigRejected):
        e.apply_envelope(get_envelope(world["ekey"]))


def test_trust_on_first_use_only_when_opted_in(tmp_path, world, capsys):
    e = edge_mod.Edge(_settings(tmp_path, world["ekey"], public_key="", trust_on_first_use=True), Recorder())
    e.register()
    assert e.public_raw == base64.b64decode(public_key())
    assert "WARNING" in capsys.readouterr().out
    assert e.apply_envelope(get_envelope(world["ekey"]))["version"] >= 1


def test_edge_forward_connects_to_the_checked_address(monkeypatch, tmp_path, world, up):
    """DNS rebinding: the edge connects to the address it checked, not to a second DNS answer."""
    import socket
    real = socket.getaddrinfo
    calls = {"n": 0}

    def fake(host, *a, **kw):
        if host == "rebind.test":
            calls["n"] += 1
            return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1" if calls["n"] == 1 else "10.255.255.1", 0))]
        return real(host, *a, **kw)
    monkeypatch.setattr(socket, "getaddrinfo", fake)
    e = edge_mod.Edge(_settings(tmp_path, world["ekey"], public_key=public_key(), allow_private=True), Recorder())
    port = up.server.server_address[1]
    status, _, _ = e.forward({"upstream_url": f"http://rebind.test:{port}"}, "GET", "x", "", {}, b"")
    assert status == 200 and calls["n"] == 1

