#!/bin/sh
# Start Aran Cloud, Bank A and Bank B in one container behind scripts/apps_proxy.py
# (the hosted "aran-apps" service; see artifacts/SaaS platform for the design).
set -e
cd /srv
D=${APPS_DATA_DIR:-/tmp/aran-apps}; mkdir -p "$D/cloud" "$D/bank-a" "$D/bank-b"
export ARAN_INTERNAL_SECRET="${ARAN_INTERNAL_SECRET:-$(python3 -c 'import secrets; print(secrets.token_hex(32))')}"
CORE=${ARAN_CORE_URL:-https://aran-console.onrender.com}
ARAN_CORE_URL=$CORE ARAN_CLOUD_DB=$D/cloud/cloud.db ARAN_DEMO_MODE=1 ARAN_TRUSTED_PROXIES=127.0.0.1 PORT=8100 \
  python3 -m uvicorn aran_cloud.main:app --host 127.0.0.1 --port 8100 --proxy-headers --forwarded-allow-ips 127.0.0.1 &
for i in $(seq 60); do python3 -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8100/v1/health', timeout=2)" 2>/dev/null && break; sleep 1; done
BANK_MODE=legacy PORT=9001 BANK_DATA_DIR=$D/bank-a BANK_AUTO_TRAFFIC=${BANK_AUTO_TRAFFIC:-4} \
  python3 -m uvicorn demo_bank.app:app --host 127.0.0.1 --port 9001 &
BANK_MODE=aran PORT=9002 BANK_DATA_DIR=$D/bank-b ARAN_URL=http://127.0.0.1:8100 ARAN_AUTO_WORKSPACE=1 BANK_AUTO_TRAFFIC=${BANK_AUTO_TRAFFIC:-4} \
  python3 -m uvicorn demo_bank.app:app --host 127.0.0.1 --port 9002 &
exec python3 -m uvicorn scripts.apps_proxy:app --host 0.0.0.0 --port "${PORT:-10000}" --proxy-headers --forwarded-allow-ips '*'
