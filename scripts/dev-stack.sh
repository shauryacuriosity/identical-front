#!/usr/bin/env bash
# Start or attach to the full Lotus dev stack (API :8000 + frontend :8080).
# If both ports are already in use, prints status and exits (continue existing session).
set -euo pipefail

FRONTEND_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_ROOT="${LOTUS_BACKEND:-$(dirname "$FRONTEND_ROOT")/CSIT321_Project}"

port_listen() {
  lsof -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

api_up=false
fe_up=false
port_listen 8000 && api_up=true
port_listen 8080 && fe_up=true

if $api_up && $fe_up; then
  echo "Lotus dev stack already running:"
  echo "  Frontend  → http://localhost:8080"
  echo "  API       → http://localhost:8000"
  if curl -sf "http://localhost:8000/health" >/dev/null 2>&1; then
    echo "  Health    → $(curl -sf http://localhost:8000/health)"
  fi
  echo
  echo "Nothing to start. Stop existing processes or use another port if you need a fresh server."
  exit 0
fi

if $api_up || $fe_up; then
  echo "Partial stack detected:"
  $api_up && echo "  API       → listening on :8000"
  $fe_up && echo "  Frontend  → listening on :8080"
  ! $api_up && echo "  API       → not running"
  ! $fe_up && echo "  Frontend  → not running"
  echo
  echo "Stop the running service(s) first, then re-run: ./scripts/dev-stack.sh"
  exit 1
fi

if [[ ! -d "$BACKEND_ROOT" ]]; then
  echo "Backend repo not found at: $BACKEND_ROOT" >&2
  echo "Set LOTUS_BACKEND=/path/to/CSIT321_Project or clone repos side by side." >&2
  exit 1
fi

if [[ ! -x "$BACKEND_ROOT/scripts/dev-stack.sh" ]]; then
  echo "Missing $BACKEND_ROOT/scripts/dev-stack.sh" >&2
  exit 1
fi

export FRONTEND_DIR="$FRONTEND_ROOT"
exec "$BACKEND_ROOT/scripts/dev-stack.sh"
