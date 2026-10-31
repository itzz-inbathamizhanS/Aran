#!/usr/bin/env bash
set -e

# scripts/preflight.sh: Unified 10-point health and integrity verification
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

VENV_PYTHON="$REPO_ROOT/.venv/bin/python3"
if [ ! -f "$VENV_PYTHON" ]; then
    VENV_PYTHON="python3"
fi

exec "$VENV_PYTHON" "$SCRIPT_DIR/preflight.py" "$@"

