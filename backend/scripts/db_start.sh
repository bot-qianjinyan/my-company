#!/usr/bin/env bash
# 启动本地开发用 PostgreSQL（数据存放在 backend/pgdata，端口 5433，不影响系统全局 PostgreSQL）
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
PG_BIN="/opt/homebrew/opt/postgresql@16/bin"

export PATH="$PG_BIN:$PATH"

pg_ctl -D "$BACKEND_DIR/pgdata" -l "$BACKEND_DIR/pglogs/server.log" \
  -o "-p 5433 -k $BACKEND_DIR/pgsock" start

pg_isready -h 127.0.0.1 -p 5433
