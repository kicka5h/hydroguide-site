#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo ""
  echo "Shutting down..."
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null
  [ -n "$BACKEND_PID" ]  && kill "$BACKEND_PID"  2>/dev/null
  wait 2>/dev/null
  echo "Done."
}
trap cleanup EXIT INT TERM

# ── 1. Backend setup ────────────────────────────────────────────────
echo "==> Setting up backend..."
cd "$ROOT/backend"

if [ ! -d ".venv" ]; then
  echo "    Creating Python venv..."
  python3 -m venv .venv
fi

source .venv/bin/activate
pip install -q -r requirements.txt

echo "==> Starting backend (uvicorn :8000)..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# ── 2. Frontend setup ──────────────────────────────────────────────
echo "==> Setting up frontend..."
cd "$ROOT/frontend"

if [ ! -d "node_modules" ]; then
  echo "    Installing npm dependencies..."
  npm install
fi

echo "==> Starting frontend (vite :5173)..."
npm run dev &
FRONTEND_PID=$!

# ── 3. Wait ────────────────────────────────────────────────────────
echo ""
echo "============================================"
echo "  Backend  → http://localhost:8000"
echo "  Frontend → http://localhost:5173"
echo "  Press Ctrl+C to stop both."
echo "============================================"
echo ""

wait
