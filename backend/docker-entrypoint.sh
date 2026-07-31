#!/bin/bash
# 容器启动入口：等待数据库可用 -> 执行 alembic 迁移 -> 首次部署自动 seed -> 启动应用
set -euo pipefail

echo "[entrypoint] 等待数据库就绪..."
python - <<'PY'
import time
import sys
from sqlalchemy import create_engine, text
from app.core.config import settings

for i in range(30):
    try:
        engine = create_engine(settings.database_url)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("[entrypoint] 数据库已就绪")
        sys.exit(0)
    except Exception as exc:  # noqa: BLE001
        print(f"[entrypoint] 数据库未就绪，重试中... ({i + 1}/30): {exc}")
        time.sleep(2)
print("[entrypoint] 数据库连接超时", file=sys.stderr)
sys.exit(1)
PY

echo "[entrypoint] 执行数据库迁移..."
alembic upgrade head

if [ "${AUTO_SEED:-false}" = "true" ]; then
    echo "[entrypoint] 检测到 AUTO_SEED=true，执行初始化数据填充..."
    python -m app.seed || echo "[entrypoint] seed 已存在数据或执行失败，跳过"
fi

echo "[entrypoint] 启动应用: $*"
exec "$@"
