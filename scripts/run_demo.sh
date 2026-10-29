#!/usr/bin/env bash
set -e

# scripts/run_demo.sh: Start Aran Core (8000), Aran Cloud (8100), Bank A (9001), and Bank B (9002)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VENV_PYTHON="$REPO_ROOT/.venv/bin/python3"

echo "=========================================================="
echo " Starting Aran Data-Flow Firewall, Aran Cloud & Demo Banks"
echo "=========================================================="

# 1. Start Aran Core on Port 8000
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo "✔ Aran core already running on port 8000"
else
    echo "▶ Starting Aran core on port 8000..."
    (cd "$REPO_ROOT/app/server" && "$VENV_PYTHON" -m uvicorn main:app --port 8000 > /tmp/aran_server.log 2>&1 &)
fi

# 2. Start Aran Cloud SaaS on Port 8100
if lsof -Pi :8100 -sTCP:LISTEN -t >/dev/null ; then
    echo "✔ Aran Cloud already running on port 8100"
else
    echo "▶ Starting Aran Cloud SaaS on port 8100..."
    (cd "$REPO_ROOT/aran_cloud" && PORT=8100 "$VENV_PYTHON" -m uvicorn main:app --port 8100 > /tmp/aran_cloud.log 2>&1 &)
fi

# Wait for core health
for i in {1..30}; do
    HEALTH=$(curl -s http://127.0.0.1:8000/api/health || echo "")
    if [[ "$HEALTH" =~ "\"ready\":true" ]]; then
        echo "✔ Aran core is healthy"
        break
    fi
    sleep 1
done

# Wait for cloud health
for i in {1..30}; do
    if curl -s http://127.0.0.1:8100/ >/dev/null 2>&1 ; then
        echo "✔ Aran Cloud is healthy"
        break
    fi
    sleep 1
done

# Provision "Demo Bank Ltd" workspace in Aran Cloud
echo "▶ Provisioning 'Demo Bank Ltd' workspace in Aran Cloud..."
WS_JSON=$(curl -s -X POST http://127.0.0.1:8100/v1/workspaces \
  -H "Content-Type: application/json" \
  -d '{"name": "Demo Bank Ltd", "email": "security@demobank.com"}')
DEMO_API_KEY=$(echo "$WS_JSON" | grep -o '"api_key":"[^"]*"' | cut -d':' -f2 | tr -d '"')

if [ -z "$DEMO_API_KEY" ]; then
    echo "Notice: Workspace already created or key exists in cloud.db"
    DEMO_API_KEY="aran_live_82feb50527d08b91a8f0b8a04a840526"
else
    echo "✔ Created workspace with key: $DEMO_API_KEY"
fi

# 3. Start Bank A (Legacy) on Port 9001
if lsof -Pi :9001 -sTCP:LISTEN -t >/dev/null ; then
    echo "✔ Bank A (Legacy) already running on port 9001"
else
    echo "▶ Starting Bank A (Legacy) on port 9001..."
    (cd "$REPO_ROOT/demo_bank" && BANK_MODE=legacy PORT=9001 "$VENV_PYTHON" -m uvicorn app:app --port 9001 > /tmp/bank_a.log 2>&1 &)
fi

# 4. Start Bank B (Aran Cloud Connected) on Port 9002
if lsof -Pi :9002 -sTCP:LISTEN -t >/dev/null ; then
    echo "✔ Bank B already running on port 9002"
else
    echo "▶ Starting Bank B connected to Aran Cloud (8100)..."
    (cd "$REPO_ROOT/demo_bank" && BANK_MODE=aran PORT=9002 ARAN_URL=http://127.0.0.1:8100 ARAN_API_KEY="$DEMO_API_KEY" "$VENV_PYTHON" -m uvicorn app:app --port 9002 > /tmp/bank_b.log 2>&1 &)
fi

echo ""
echo "=========================================================="
echo " All services running and ready for demonstration:"
echo " 1. Bank A (Legacy Unprotected):     http://127.0.0.1:9001"
echo " 2. Bank B (Aran Cloud Connected):   http://127.0.0.1:9002"
echo " 3. Side-by-Side Compare View:       http://127.0.0.1:9002/compare"
echo " 4. Aran Cloud Dashboard:            http://127.0.0.1:8100/dashboard"
echo "    -> Pre-loaded API Key:           $DEMO_API_KEY"
echo " 5. Aran Cloud Quick Connect:        http://127.0.0.1:8100/connect"
echo " 6. Aran Core Engine:                http://127.0.0.1:8000"
echo "=========================================================="
