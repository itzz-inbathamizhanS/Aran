"""
Comprehensive security and policy tests for Aran Cloud:
1. Scoped API Keys (Item 1)
2. Detokenise Audit (Item 2)
3. Core Lockdown (Item 3)
5. Basic Rate Limits (Item 5)
"""

import hashlib
import json
import os
import sqlite3
import time
import pytest
import requests


CLOUD_URL = os.environ.get("ARAN_CLOUD_URL", "http://127.0.0.1:8100")
CORE_URL = os.environ.get("ARAN_CORE_URL", "http://127.0.0.1:8000")
CLOUD_DB = os.environ.get("ARAN_CLOUD_DB") or os.path.join(os.path.dirname(__file__), "cloud.db")


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
    r = requests.get(f"{CORE_URL}/api/tour/generate", headers={"X-Aran-Internal": secret}, timeout=5)
    r.raise_for_status()
    return r.json()


@pytest.fixture(scope="module")
def tenant_alpha():
    r = requests.post(
        f"{CLOUD_URL}/v1/workspaces",
        headers={"X-Forwarded-For": "10.200.1.1"},
        json={"name": f"Tenant Alpha {time.time()}", "email": f"alpha_{time.time()}@bank.com"},
    )
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="module")
def tenant_beta():
    r = requests.post(
        f"{CLOUD_URL}/v1/workspaces",
        headers={"X-Forwarded-For": "10.200.1.2"},
        json={"name": f"Tenant Beta {time.time()}", "email": f"beta_{time.time()}@bank.com"},
    )
    assert r.status_code == 200, r.text
    return r.json()


# ---------------------------------------------------------------- 1. Scoped API Keys
def test_scoped_api_keys_permissions(tenant_alpha, tenant_beta):
    admin_key = tenant_alpha["api_key"]
    
    # 1. Admin key can mint a protect-only key
    r = requests.post(
        f"{CLOUD_URL}/v1/keys",
        headers={"X-API-Key": admin_key},
        json={"label": "App Ingestion Key", "scopes": ["protect"]},
    )
    assert r.status_code == 200, r.text
    protect_key_info = r.json()
    protect_key = protect_key_info["api_key"]
    protect_key_id = protect_key_info["id"]

    # 2. Admin key can mint a detokenise-only key
    r = requests.post(
        f"{CLOUD_URL}/v1/keys",
        headers={"X-API-Key": admin_key},
        json={"label": "Compliance Audit Key", "scopes": ["detokenise", "dashboard"]},
    )
    assert r.status_code == 200, r.text
    detok_key_info = r.json()
    detok_key = detok_key_info["api_key"]

    sample = get_sample_pii()
    aadhaar = sample["aadhaar"]

    # 3. Protect-only key CAN protect
    r_prot = requests.post(
        f"{CLOUD_URL}/v1/protect",
        headers={"X-API-Key": protect_key},
        json={"text": f"Aadhaar: {aadhaar}", "customer_ref": "ALPHA-CUST-1", "sink": "kyc-archive"},
    )
    assert r_prot.status_code == 200, r_prot.text
    findings = r_prot.json().get("findings", [])
    assert len(findings) > 0, f"Expected protected finding for {aadhaar}: {r_prot.json()}"
    token = findings[0]["token"]

    # 4. Protect-only key CANNOT detokenise (403 with exact error message)
    r_detok_denied = requests.post(
        f"{CLOUD_URL}/v1/detokenise",
        headers={"X-API-Key": protect_key},
        json={"token": token},
    )
    assert r_detok_denied.status_code == 403
    assert r_detok_denied.json()["detail"] == "this key lacks the 'detokenise' scope"

    # 5. Protect-only key CANNOT erase (403)
    r_erase_denied = requests.post(
        f"{CLOUD_URL}/v1/erase",
        headers={"X-API-Key": protect_key},
        json={"customer_ref": "ALPHA-CUST-1", "purpose": "KYC"},
    )
    assert r_erase_denied.status_code == 403
    assert r_erase_denied.json()["detail"] == "this key lacks the 'erase' scope"

    # 6. Detokenise-only key CANNOT protect (403)
    r_prot_denied = requests.post(
        f"{CLOUD_URL}/v1/protect",
        headers={"X-API-Key": detok_key},
        json={"text": f"Aadhaar: {aadhaar}"},
    )
    assert r_prot_denied.status_code == 403
    assert r_prot_denied.json()["detail"] == "this key lacks the 'protect' scope"

    # 7. Detokenise-only key CAN detokenise
    r_detok_allowed = requests.post(
        f"{CLOUD_URL}/v1/detokenise",
        headers={"X-API-Key": detok_key},
        json={"token": token},
    )
    assert r_detok_allowed.status_code == 200
    assert r_detok_allowed.json()["value"] == aadhaar

    # 8. GET /v1/keys lists keys without revealing secrets
    r_keys = requests.get(f"{CLOUD_URL}/v1/keys", headers={"X-API-Key": admin_key})
    assert r_keys.status_code == 200
    keys_list = r_keys.json()["keys"]
    for k in keys_list:
        assert "api_key" not in k
        assert "prefix" in k
        assert "label" in k
        assert "scopes" in k
        assert "created" in k
        assert "revoked" in k

    # 9. Tenant Beta cannot see Tenant Alpha's keys
    beta_admin = tenant_beta["api_key"]
    r_beta_keys = requests.get(f"{CLOUD_URL}/v1/keys", headers={"X-API-Key": beta_admin})
    assert r_beta_keys.status_code == 200
    beta_prefixes = [k["prefix"] for k in r_beta_keys.json()["keys"]]
    alpha_prefixes = [k["prefix"] for k in keys_list]
    for ap in alpha_prefixes:
        assert ap not in beta_prefixes

    # 10. DELETE /v1/keys/{id} revokes; revoked key gets 401
    r_del = requests.delete(f"{CLOUD_URL}/v1/keys/{protect_key_id}", headers={"X-API-Key": admin_key})
    assert r_del.status_code == 200
    r_revoked = requests.post(
        f"{CLOUD_URL}/v1/protect",
        headers={"X-API-Key": protect_key},
        json={"text": "Test after revoke"},
    )
    assert r_revoked.status_code == 401


# ---------------------------------------------------------------- 2. Detokenise Audit
def test_detokenise_audit_and_no_plaintext(tenant_alpha):
    admin_key = tenant_alpha["api_key"]

    # Mint Key 1: compliance key
    r = requests.post(
        f"{CLOUD_URL}/v1/keys",
        headers={"X-API-Key": admin_key},
        json={"label": "Auditor Key 1", "scopes": ["detokenise", "dashboard"]},
    )
    key1 = r.json()["api_key"]

    # Mint Key 2: ops key (no detokenise scope)
    r = requests.post(
        f"{CLOUD_URL}/v1/keys",
        headers={"X-API-Key": admin_key},
        json={"label": "Ops Key 2", "scopes": ["protect", "dashboard"]},
    )
    key2 = r.json()["api_key"]

    sample = get_sample_pii()
    raw_aadhaar = sample["aadhaar"]

    # Protect a test record
    r_prot = requests.post(
        f"{CLOUD_URL}/v1/protect",
        headers={"X-API-Key": admin_key},
        json={"text": f"Aadhaar {raw_aadhaar}", "customer_ref": "AUDIT-CUST-1", "sink": "kyc-archive"},
    )
    findings = r_prot.json().get("findings", [])
    assert len(findings) > 0
    token = findings[0]["token"]

    # Call 1: Success with Key 1
    r1 = requests.post(f"{CLOUD_URL}/v1/detokenise", headers={"X-API-Key": key1}, json={"token": token})
    assert r1.status_code == 200
    assert r1.json()["value"] == raw_aadhaar

    # Call 2: Denied with Key 2
    r2 = requests.post(f"{CLOUD_URL}/v1/detokenise", headers={"X-API-Key": key2}, json={"token": token})
    assert r2.status_code == 403

    # Call 3: Unknown token with Key 1
    r3 = requests.post(f"{CLOUD_URL}/v1/detokenise", headers={"X-API-Key": key1}, json={"token": "TKN_UNKNOWN_12345"})
    assert r3.status_code == 200
    assert r3.json()["status"] == "unknown"

    # Verify GET /v1/audit returns rows with right labels and results
    r_audit = requests.get(f"{CLOUD_URL}/v1/audit", headers={"X-API-Key": admin_key})
    assert r_audit.status_code == 200
    audit_rows = r_audit.json()["audit"]
    
    # Filter for our test token calls
    test_events = [row for row in audit_rows if row["token"] in (token, "TKN_UNKNOWN_12345")]
    assert len(test_events) >= 3

    results = {e["result"] for e in test_events}
    assert "ok" in results
    assert "denied" in results
    assert "unknown" in results

    labels = {e["key_label"] for e in test_events}
    assert "Auditor Key 1" in labels
    assert "Ops Key 2" in labels

    # Check dashboard metric "plaintext reads"
    r_dash = requests.get(f"{CLOUD_URL}/v1/dashboard", headers={"X-API-Key": admin_key})
    assert r_dash.status_code == 200
    metrics = r_dash.json()["metrics"]
    assert "plaintext_reads" in metrics or "plaintext reads" in metrics
    reads_count = metrics.get("plaintext_reads", metrics.get("plaintext reads"))
    assert reads_count >= 1

    # Verify hash chain on untampered audit log
    r_verify = requests.get(f"{CLOUD_URL}/v1/audit/verify", headers={"X-API-Key": admin_key})
    assert r_verify.status_code == 200
    verify_data = r_verify.json()
    assert verify_data["valid"] is True
    assert verify_data["total_rows"] >= 3

    # Tamper with an audit entry in the database
    conn = sqlite3.connect(CLOUD_DB)
    row_to_tamper = conn.execute(
        "SELECT id, result FROM detokenise_audit WHERE tenant_id = ? ORDER BY id DESC LIMIT 1",
        (tenant_alpha["tenant_id"],),
    ).fetchone()
    assert row_to_tamper is not None
    tamper_id, orig_result = row_to_tamper
    with conn:
        conn.execute("UPDATE detokenise_audit SET result = 'tampered_result' WHERE id = ?", (tamper_id,))
    conn.close()

    # Re-verify should now FAIL
    r_tampered = requests.get(f"{CLOUD_URL}/v1/audit/verify", headers={"X-API-Key": admin_key})
    assert r_tampered.status_code == 200
    tampered_data = r_tampered.json()
    assert tampered_data["valid"] is False
    assert "Tampered" in tampered_data.get("error", "") or "Broken" in tampered_data.get("error", "")
    assert tampered_data["failed_at_id"] == tamper_id

    # Restore original row so state remains clean
    conn = sqlite3.connect(CLOUD_DB)
    with conn:
        conn.execute("UPDATE detokenise_audit SET result = ? WHERE id = ?", (orig_result, tamper_id))
    conn.close()

    # Re-verify returns True again
    r_restored = requests.get(f"{CLOUD_URL}/v1/audit/verify", headers={"X-API-Key": admin_key})
    assert r_restored.json()["valid"] is True

    # Scan cloud.db byte content to ensure raw plaintext is NEVER stored in cloud.db
    with open(CLOUD_DB, "rb") as f:
        db_bytes = f.read()
    assert raw_aadhaar.encode() not in db_bytes
    assert raw_aadhaar.replace(" ", "").encode() not in db_bytes


# ---------------------------------------------------------------- 3. Core Lockdown
def test_core_lockdown():
    internal_secret = get_internal_secret()
    assert internal_secret, "ARAN_INTERNAL_SECRET must be set for lockdown testing"

    # 1. /api/health is open without header
    r_health = requests.get(f"{CORE_URL}/api/health")
    assert r_health.status_code == 200
    assert r_health.json().get("ready") is True

    # 2. Direct core calls without X-Aran-Internal return 401
    r_stats = requests.get(f"{CORE_URL}/api/stats")
    assert r_stats.status_code == 401

    r_process = requests.post(f"{CORE_URL}/api/process", json={"text": "Test Aadhaar 1234"})
    assert r_process.status_code == 401

    # 3. Direct core calls with valid X-Aran-Internal succeed
    r_stats_authed = requests.get(f"{CORE_URL}/api/stats", headers={"X-Aran-Internal": internal_secret})
    assert r_stats_authed.status_code == 200

    # 4. Calls forwarded through Aran Cloud still work
    # (Aran Cloud passes X-Aran-Internal)
    r_cloud_health = requests.get(f"{CLOUD_URL}/v1/health")
    assert r_cloud_health.status_code == 200
    assert r_cloud_health.json()["status"] == "ok"


# ---------------------------------------------------------------- 5. Basic Rate Limits
def test_rate_limits():
    # Test 1: Workspace signup rate limit (5 per hour per IP)
    test_ip = f"192.168.{int(time.time()) % 250}.{int(time.time() * 10) % 250}"
    for i in range(5):
        r = requests.post(
            f"{CLOUD_URL}/v1/workspaces",
            headers={"X-Forwarded-For": test_ip},
            json={"name": f"Rate Limit Test {i}_{time.time()}", "email": f"rl_{i}_{time.time()}@test.com"},
        )
        assert r.status_code == 200, r.text

    # 6th signup must return 429 Too Many Requests with Retry-After header
    r_blocked = requests.post(
        f"{CLOUD_URL}/v1/workspaces",
        headers={"X-Forwarded-For": test_ip},
        json={"name": "Blocked Tenant", "email": f"blocked_{time.time()}@test.com"},
    )
    assert r_blocked.status_code == 429
    assert "Retry-After" in r_blocked.headers
    assert int(r_blocked.headers["Retry-After"]) > 0

    # Test 2: Per key rate limit (300 requests per minute)
    raw_key = f"aran_live_ratelimit_{os.urandom(8).hex()}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    conn = sqlite3.connect(CLOUD_DB)
    with conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO tenants (id, name, email, created_at, plan)
            VALUES ('t_ratelimit', 'Rate Limit Tenant', 'rl@tenant.com', '2026-10-30', 'free')
            """
        )
        conn.execute(
            """
            INSERT OR REPLACE INTO api_keys (id, tenant_id, key_hash, prefix, label, scopes, created_at, revoked)
            VALUES (99999, 't_ratelimit', ?, 'aran_live_rate', 'Rate Key', 'dashboard', '2026-10-30', 0)
            """,
            (key_hash,)
        )
    conn.close()

    session = requests.Session()
    headers = {"X-API-Key": raw_key}
    
    # Send requests to exceed 300
    hit_429 = False
    for req_idx in range(305):
        resp = session.get(f"{CLOUD_URL}/v1/dashboard", headers=headers)
        if resp.status_code == 429:
            hit_429 = True
            assert "Retry-After" in resp.headers
            assert int(resp.headers["Retry-After"]) > 0
            break

    assert hit_429, "Expected 429 rate limit exceeded on exceeding 300 req/min"


def test_demo_mode_localhost_exemption_and_reset():
    # The reset endpoint is operator-only: no token, no reset
    r_anon = requests.post(f"{CLOUD_URL}/v1/internal/reset-limiters")
    assert r_anon.status_code in (401, 403)
    r_wrong = requests.post(f"{CLOUD_URL}/v1/internal/reset-limiters", headers={"X-Admin-Token": "wrong"})
    assert r_wrong.status_code in (401, 403)

    # Reset limiters with the operator token (ARAN_ADMIN_TOKEN, same value the cloud runs with)
    admin_token = os.environ.get("ARAN_ADMIN_TOKEN")
    if not admin_token:
        pytest.skip("ARAN_ADMIN_TOKEN not set; reset endpoint is disabled")
    r_reset = requests.post(f"{CLOUD_URL}/v1/internal/reset-limiters", headers={"X-Admin-Token": admin_token})
    assert r_reset.status_code == 200
    assert r_reset.json().get("cleared") is True

    # In demo mode, signups from localhost (127.0.0.1, ::1) are exempt from 429
    for i in range(10):
        r = requests.post(
            f"{CLOUD_URL}/v1/workspaces",
            json={"name": f"Demo Tenant {i}_{time.time()}", "email": f"demo_{i}_{time.time()}@test.com"},
        )
        assert r.status_code == 200, f"Expected 200 on localhost in demo mode, got {r.status_code}: {r.text}"



# ---------------------------------------------------------------- 6. Cross-tenant identifier isolation
def test_same_identifier_at_two_banks_reveals_nothing(tenant_alpha, tenant_beta):
    """Audit item 5: Bank B enrolling an Aadhaar that Bank A already holds must not learn
    that the person banks elsewhere, and the token must belong to Bank B's own customer."""
    raw = get_sample_pii()["aadhaar"]
    text = f"KYC for new customer, Aadhaar {raw}"
    r_a = requests.post(f"{CLOUD_URL}/v1/protect", headers={"X-API-Key": tenant_alpha["api_key"]},
                        json={"text": text, "customer_ref": "SHARED-1", "sink": "kyc-archive"})
    r_b = requests.post(f"{CLOUD_URL}/v1/protect", headers={"X-API-Key": tenant_beta["api_key"]},
                        json={"text": text, "customer_ref": "SHARED-9", "sink": "kyc-archive"})
    assert r_a.status_code == 200 and r_b.status_code == 200, (r_a.text, r_b.text)
    body_b = r_b.json()
    assert not any("elsewhere" in n or "owner_conflict" in n for n in body_b.get("notes", [])), body_b["notes"]
    f_b = [f for f in body_b["findings"] if f["type"] == "AADHAAR"][0]
    assert not f_b.get("owner_conflict")
    assert f_b["customer_ref"] == "SHARED-9"
    assert raw not in body_b["after"]

    # Bank B erasing its customer does not touch Bank A's record, and the reverse
    tok_a = [f for f in r_a.json()["findings"] if f["type"] == "AADHAAR"][0]["token"]
    r_tr = requests.post(f"{CLOUD_URL}/v1/trace", headers={"X-API-Key": tenant_beta["api_key"]}, json={"dump": tok_a})
    assert r_tr.status_code in (200, 403)
    if r_tr.status_code == 200:
        assert r_tr.json().get("matched", 0) == 0, "Bank B must not trace Bank A's token"
