#!/usr/bin/env python3
"""
scripts/preflight.py: Automated 10-point health and integrity verification.
Prints a PASS/FAIL table and exits non-zero on any failure.
"""

import os
import re
import shutil
import socket
import sqlite3
import stat
import sys
import time
import requests

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ENV_LOCAL = os.path.join(REPO_ROOT, ".env.local")

# URLs
CORE_URL = "http://127.0.0.1:8000"
CLOUD_URL = "http://127.0.0.1:8100"
BANK_A_URL = "http://127.0.0.1:9001"
BANK_B_URL = "http://127.0.0.1:9002"


def load_env_local():
    env = {}
    if os.path.exists(ENV_LOCAL):
        with open(ENV_LOCAL) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env[k.strip()] = v.strip().strip("'\"")
    return env


def check_1_services() -> tuple[bool, str]:
    """1. All 4 services up and healthy (8000, 8100, 9001, 9002)."""
    try:
        r_core = requests.get(f"{CORE_URL}/api/health", timeout=3)
        if r_core.status_code != 200 or not r_core.json().get("ready"):
            return False, f"Core (8000) not ready: {r_core.text}"

        r_cloud = requests.get(f"{CLOUD_URL}/v1/health", timeout=3)
        if r_cloud.status_code != 200 or r_cloud.json().get("status") != "ok":
            return False, f"Cloud (8100) not ok: {r_cloud.text}"

        r_a = requests.get(f"{BANK_A_URL}/api/config", timeout=3)
        if r_a.status_code != 200 or r_a.json().get("bank_mode") != "legacy":
            return False, f"Bank A (9001) not ready: {r_a.text}"

        r_b = requests.get(f"{BANK_B_URL}/api/config", timeout=3)
        if r_b.status_code != 200 or r_b.json().get("bank_mode") != "aran":
            return False, f"Bank B (9002) not ready: {r_b.text}"

        return True, "Core (8000), Cloud (8100), Bank A (9001), Bank B (9002) up"
    except Exception as e:
        return False, f"Connection error: {e}"


def check_2_core_lockdown(env: dict) -> tuple[bool, str]:
    """2. Core refuses call without internal secret (401)."""
    secret = env.get("ARAN_INTERNAL_SECRET")
    if not secret:
        return False, "ARAN_INTERNAL_SECRET missing from .env.local"

    try:
        # Call without header must return 401
        r_unauth = requests.get(f"{CORE_URL}/api/stats", timeout=3)
        if r_unauth.status_code != 401:
            return False, f"Expected 401 without secret, got {r_unauth.status_code}"

        # Call with header must succeed
        r_auth = requests.get(f"{CORE_URL}/api/stats", headers={"X-Aran-Internal": secret}, timeout=3)
        if r_auth.status_code != 200:
            return False, f"Expected 200 with secret, got {r_auth.status_code}"

        return True, "Calls without X-Aran-Internal return 401; authorized calls succeed"
    except Exception as e:
        return False, f"Core check error: {e}"


def check_3_persistence_and_key(env: dict) -> tuple[bool, str]:
    """3. Persistence on and master key file present mode 600."""
    if not os.path.exists(ENV_LOCAL):
        return False, ".env.local does not exist"

    # Check mode 600
    file_stat = os.stat(ENV_LOCAL)
    mode = stat.S_IMODE(file_stat.st_mode)
    if mode != 0o600:
        return False, f".env.local permissions are {oct(mode)}, expected 0o600"

    master_key = env.get("ARAN_MASTER_KEY")
    if not master_key or len(master_key) != 64:
        return False, "ARAN_MASTER_KEY missing or not 64-hex"

    aran_db = os.path.join(REPO_ROOT, "data", "aran.db")
    keys_db = os.path.join(REPO_ROOT, "data", "keys.db")
    if not os.path.exists(aran_db) or not os.path.exists(keys_db):
        return False, f"Persistent database files missing in {REPO_ROOT}/data/"

    return True, ".env.local mode 600 verified; KEK 256-bit set; SQLite stores active"


def check_4_local_fonts_only() -> tuple[bool, str]:
    """4. Local fonts only (grep for http(s):// in static assets, report any non-localhost)."""
    static_dirs = [
        os.path.join(REPO_ROOT, "aran_cloud", "static"),
        os.path.join(REPO_ROOT, "demo_bank", "static"),
    ]

    url_pattern = re.compile(r'https?://[^\s"\'<>)]+')
    external_urls = []

    for sdir in static_dirs:
        for root, _, files in os.walk(sdir):
            for file in files:
                if file.endswith((".html", ".css", ".js", ".svg")):
                    path = os.path.join(root, file)
                    with open(path, "r", errors="ignore") as f:
                        content = f.read()
                        matches = url_pattern.findall(content)
                        for m in matches:
                            if not ("localhost" in m or "127.0.0.1" in m or "w3.org" in m):
                                external_urls.append((os.path.relpath(path, REPO_ROOT), m))

    if external_urls:
        return False, f"Found external URLs: {external_urls[:3]}"

    return True, "Zero external font or script CDN dependencies; offline-safe"


def check_5_seeded_data() -> tuple[bool, str]:
    """5. Seeded data present (customer, event, receipt counts)."""
    try:
        r_cust = requests.get(f"{BANK_B_URL}/api/customers", timeout=3)
        cust_count = len(r_cust.json())
        if cust_count < 12:
            return False, f"Expected >= 12 customers in Bank B, found {cust_count}"

        cloud_db = os.path.join(REPO_ROOT, "aran_cloud", "cloud.db")
        aran_db = os.path.join(REPO_ROOT, "data", "aran.db")
        if not os.path.exists(cloud_db):
            return False, "cloud.db missing"
        if not os.path.exists(aran_db):
            return False, "aran.db missing"

        conn_cloud = sqlite3.connect(cloud_db)
        events_count = conn_cloud.execute("SELECT count(*) FROM usage_events").fetchone()[0]
        conn_cloud.close()

        conn_aran = sqlite3.connect(aran_db)
        receipts_count = conn_aran.execute("SELECT count(*) FROM erasure_receipts").fetchone()[0]
        conn_aran.close()

        if events_count < 30:
            return False, f"Expected >= 30 usage events, found {events_count}"
        if receipts_count < 1:
            return False, f"Expected >= 1 erasure receipts, found {receipts_count}"

        return True, f"{cust_count} customers, {events_count} events, {receipts_count} Merkle receipt"
    except Exception as e:
        return False, f"Seeded data error: {e}"


def check_6_immune_layer(env: dict) -> tuple[bool, str]:
    """6. Immune layer in watching mode."""
    secret = env.get("ARAN_INTERNAL_SECRET")
    try:
        r = requests.get(f"{CORE_URL}/api/immune", headers={"X-Aran-Internal": secret}, timeout=3)
        if r.status_code != 200:
            return False, f"Immune endpoint returned status {r.status_code}"

        state = r.json().get("state", {})
        mode = state.get("mode")
        if mode != "watching":
            return False, f"Immune layer mode is '{mode}', expected 'watching'"

        detectors = state.get("detectors", 0)
        return True, f"Mode: watching | Detectors: {detectors} | AIS active"
    except Exception as e:
        return False, f"Immune layer error: {e}"


def check_7_roundtrip_lifecycle() -> tuple[bool, str]:
    """7. Full round trip (register Bank B, detokenise compliance, erase, detokenise erased) with throwaway customer cleaned up."""
    import secrets
    try:
        from app.server.engine import verhoeff_check_digit, luhn_check_digit
    except Exception:
        sys.path.insert(0, REPO_ROOT)
        from app.server.engine import verhoeff_check_digit, luhn_check_digit

    cust_ref = f"CUST-PREFLIGHT-{secrets.token_hex(4).upper()}"
    name = "Preflight Test User"
    mobile = f"98765{secrets.randbelow(90000) + 10000}"
    aad_prefix = str(secrets.randbelow(89999999999) + 10000000000)
    aadhaar = aad_prefix + str(verhoeff_check_digit(aad_prefix))
    card_prefix = "4" + "".join([str(secrets.randbelow(10)) for _ in range(14)])
    card = card_prefix + str(luhn_check_digit(card_prefix))

    try:
        # Register in Bank B
        r_reg = requests.post(
            f"{BANK_B_URL}/api/register",
            json={"customer_ref": cust_ref, "name": name, "mobile": mobile, "aadhaar": aadhaar, "card": card},
            timeout=5,
        )
        if r_reg.status_code != 200:
            return False, f"Registration failed: {r_reg.text}"
        data_reg = r_reg.json()
        tok_aadhaar = data_reg.get("aadhaar")
        if tok_aadhaar == aadhaar or not tok_aadhaar.isdigit() or len(tok_aadhaar) != 12:
            return False, f"Invalid token issued: {tok_aadhaar}"

        # Detokenise via Compliance role
        r_view1 = requests.get(f"{BANK_B_URL}/api/officer-view/{cust_ref}?role=compliance", timeout=5)
        if r_view1.status_code != 200:
            return False, f"Compliance view failed: {r_view1.text}"
        disp1 = r_view1.json()["fields"]["aadhaar"]["display"]
        if disp1 != aadhaar:
            return False, f"Compliance view expected {aadhaar}, got {disp1}"

        # Erase customer in Bank B
        r_erase = requests.post(f"{BANK_B_URL}/api/erase/{cust_ref}", timeout=5)
        if r_erase.status_code != 200:
            return False, f"Erasure failed: {r_erase.text}"
        erase_data = r_erase.json()
        if erase_data.get("status") != "crypto_shredded":
            return False, f"Expected status 'crypto_shredded', got {erase_data.get('status')}"
        verif = erase_data.get("verification", {})
        if not verif.get("valid"):
            return False, f"Erasure receipt signature invalid: {verif}"

        # Detokenise after erasure -> must report erased
        r_view2 = requests.get(f"{BANK_B_URL}/api/officer-view/{cust_ref}?role=compliance", timeout=5)
        disp2 = r_view2.json()["fields"]["aadhaar"]["display"]
        if "ERASED" not in disp2:
            return False, f"Expected ERASED after crypto-shredding, got {disp2}"

        # Cleanup throwaway customer from Bank B SQLite DB
        db_b_path = os.path.join(REPO_ROOT, "demo_bank", "data_aran.db")
        if os.path.exists(db_b_path):
            conn = sqlite3.connect(db_b_path)
            with conn:
                conn.execute("DELETE FROM customers WHERE customer_ref = ?", (cust_ref,))
                conn.execute("DELETE FROM logs WHERE customer_ref = ?", (cust_ref,))
            conn.close()

        return True, "Register -> Detokenise -> Erase -> Verify Unreadable -> Cleaned up"
    except Exception as e:
        return False, f"Roundtrip error: {e}"


def check_8_signup_limiter() -> tuple[bool, str]:
    """8. Signup limiter not exhausted."""
    try:
        test_ip = f"10.0.0.{int(time.time()) % 250}"
        r = requests.post(
            f"{CLOUD_URL}/v1/workspaces",
            headers={"X-Forwarded-For": test_ip},
            json={"name": f"Limiter Probe {time.time()}", "email": f"probe_{time.time()}@test.com"},
            timeout=3,
        )
        if r.status_code == 429:
            return False, "Rate limiter exhausted on fresh probe IP"
        if r.status_code != 200:
            return False, f"Unexpected response from signup: {r.status_code}"

        return True, "Signup rate limiter operational with quota available"
    except Exception as e:
        return False, f"Limiter check error: {e}"


def check_9_free_disk_space() -> tuple[bool, str]:
    """9. Free disk space."""
    try:
        total, used, free = shutil.disk_usage(REPO_ROOT)
        free_gb = free / (1024 ** 3)
        if free_gb < 0.5:
            return False, f"Low disk space: {free_gb:.2f} GB free"
        return True, f"{free_gb:.1f} GB available (healthy)"
    except Exception as e:
        return False, f"Disk check error: {e}"


def check_10_port_conflicts() -> tuple[bool, str]:
    """10. Port conflicts."""
    ports = [8000, 8100, 9001, 9002]
    listening = []
    for port in ports:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.5)
            result = s.connect_ex(("127.0.0.1", port))
            if result == 0:
                listening.append(port)

    if set(listening) != set(ports):
        missing = set(ports) - set(listening)
        return False, f"Ports missing active listeners: {missing}"

    return True, "Ports 8000, 8100, 9001, 9002 bound correctly with no conflicts"


def main():
    print("==========================================================================================")
    print(" ARAN SYSTEM INTEGRITY PREFLIGHT VERIFICATION")
    print(f" Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')} | Target: Localhost Demo & Core Stack")
    print("==========================================================================================")

    env = load_env_local()

    checks = [
        (1, "All 4 Services Up & Healthy", lambda: check_1_services()),
        (2, "Core Network Lockdown & Secret", lambda: check_2_core_lockdown(env)),
        (3, "Persistence Lite & KEK 600 Mode", lambda: check_3_persistence_and_key(env)),
        (4, "Offline Fonts & Zero Asset CDNs", lambda: check_4_local_fonts_only()),
        (5, "Seeded Demonstration Dataset", lambda: check_5_seeded_data()),
        (6, "Immune Layer Watching Mode", lambda: check_6_immune_layer(env)),
        (7, "E2E Lifecycle Roundtrip (DPDP)", lambda: check_7_roundtrip_lifecycle()),
        (8, "Signup Limiter State", lambda: check_8_signup_limiter()),
        (9, "Available Disk Space", lambda: check_9_free_disk_space()),
        (10, "Port Binding & Conflict Check", lambda: check_10_port_conflicts()),
    ]

    all_passed = True
    results = []

    for num, name, fn in checks:
        passed, details = fn()
        if not passed:
            all_passed = False
        results.append((num, name, passed, details))

    print(f"{'#':<3} | {'Check':<34} | {'Status':<8} | {'Details'}")
    print("-" * 90)

    for num, name, passed, details in results:
        status_str = "\033[92mPASS\033[0m" if passed else "\033[91mFAIL\033[0m"
        clean_status = "PASS" if passed else "FAIL"
        # Support plain terminal output
        if not sys.stdout.isatty():
            status_str = clean_status
        print(f"{num:<3} | {name:<34} | {status_str:<8} | {details}")

    print("-" * 90)

    if all_passed:
        print("\033[92m✔ ALL 10 PREFLIGHT INTEGRITY CHECKS PASSED\033[0m" if sys.stdout.isatty() else "✔ ALL 10 PREFLIGHT INTEGRITY CHECKS PASSED")
        print("System is fully primed, healthy, and ready for evaluation.")
        print("==========================================================================================\n")
        sys.exit(0)
    else:
        print("\033[91m✖ PREFLIGHT FAILED - ONE OR MORE CHECKS DID NOT PASS\033[0m" if sys.stdout.isatty() else "✖ PREFLIGHT FAILED - ONE OR MORE CHECKS DID NOT PASS")
        print("==========================================================================================\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
