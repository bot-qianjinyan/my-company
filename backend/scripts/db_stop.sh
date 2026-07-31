#!/usr/bin/env bash
# 停止本地开发用 PostgreSQL
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
PG_BIN="/opt/homebrew/opt/postgresql@16/bin"

export PATH="$PG_BIN:$PATH"

pg_ctl -D "$BACKEND_DIR/pgdata" stop
