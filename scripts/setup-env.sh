#!/usr/bin/env bash
# Create .env from .env.example (first run only).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"
EXAMPLE="$ROOT/.env.example"

if [[ ! -f "$EXAMPLE" ]]; then
  echo "Missing $EXAMPLE" >&2
  exit 1
fi

if [[ -f "$ENV_FILE" ]]; then
  echo ".env already exists — leaving it unchanged."
else
  cp "$EXAMPLE" "$ENV_FILE"
  echo "Created .env from .env.example"
  echo "Edit .env with the shared team Supabase anon key if you use AI Analysis / Runs pages."
fi
