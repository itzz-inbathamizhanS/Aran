#!/usr/bin/env bash
set -e

# scripts/run_demo.sh: Start Aran, Bank A (Legacy), and Bank B (Aran Protected)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VENV_PYTHON="$REPO_ROOT/.venv/bin/python3"

echo "=========================================================="
echo " Starting Aran Data-Flow Firewall & Demo Banks"
echo "=========================================================="

# 1. Start Aran Server on Port 8000 if not already running
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo "✔ Aran server already running on port 8000"
else
    echo "▶ Starting Aran server on port 8000..."
    (cd "$REPO_ROOT/app/server" && "$VENV_PYTHON" -m uvicorn main:app --port 8000 > /tmp/aran_server.log 2>&1 &)
fi

# 2. Start Bank A (Legacy) on Port 9001 if not already running
if lsof -Pi :9001 -sTCP:LISTEN -t >/dev/null ; then
    echo "✔ Bank A (Legacy) already running on port 9001"
else
    echo "▶ Starting Bank A (Legacy) on port 9001..."
    (cd "$REPO_ROOT/demo_bank" && BANK_MODE=legacy PORT=9001 "$VENV_PYTHON" -m uvicorn app:app --port 9001 > /tmp/bank_a.log 2>&1 &)
fi

# 3. Start Bank B (Aran Protected) on Port 9002 if not already running
if lsof -Pi :9002 -sTCP:LISTEN -t >/dev/null ; then
    echo "✔ Bank B (Aran) already running on port 9002"
else
    echo "▶ Starting Bank B (Aran Protected) on port 9002..."
    (cd "$REPO_ROOT/demo_bank" && BANK_MODE=aran PORT=9002 "$VENV_PYTHON" -m uvicorn app:app --port 9002 > /tmp/bank_b.log 2>&1 &)
fi

echo ""
echo "Waiting for Aran server health and immune layer readiness..."

# Poll Aran /api/health
for i in {1..30}; do
    HEALTH=$(curl -s http://127.0.0.1:8000/api/health || echo "")
    if [[ "$HEALTH" =~ "\"ready\":true" ]]; then
        echo "✔ Aran server is healthy"
        break
    fi
    sleep 1
done

# Poll Aran /api/immune until mode is not learning
for i in {1..90}; do
    IMMUNE_MODE=$(curl -s http://127.0.0.1:8000/api/immune | grep -o '"mode":"[^"]*"' | cut -d':' -f2 | tr -d '"' || echo "")
    if [[ "$IMMUNE_MODE" != "learning" && -n "$IMMUNE_MODE" ]]; then
        echo "✔ Immune layer is ready (mode: $IMMUNE_MODE)"
        break
    fi
    echo -n "."
    sleep 2
done
echo ""

echo "=========================================================="
echo " All services running and ready for demonstration:"
echo " 1. Bank A (Legacy Unprotected):   http://127.0.0.1:9001"
echo " 2. Bank B (Aran Protected):       http://127.0.0.1:9002"
echo " 3. Side-by-Side Compare View:     http://127.0.0.1:9002/compare"
echo " 4. Aran Core Console:             http://127.0.0.1:8000"
echo "=========================================================="

