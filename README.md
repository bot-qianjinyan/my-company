# 公司内部管理平台

前后端分离的企业内部管理系统，涵盖：公司信息、员工信息管理、请假、签到、Jira 风格看板与工单、Confluence 风格知识库、站内邮件。

## 技术栈

- 后端：Python 3 + FastAPI + SQLAlchemy 2.0 + Alembic + PostgreSQL
- 前端：React 18 + TypeScript + Vite + Ant Design + React Router + Zustand
- 认证：JWT

## 目录结构

```
my-company/
├── backend/            # FastAPI 后端
│   ├── app/
│   │   ├── core/        # 配置、数据库、安全（JWT/密码）、统一异常处理
│   │   ├── models/       # SQLAlchemy ORM 模型
│   │   ├── schemas/      # Pydantic 请求/响应模型
│   │   ├── api/v1/        # 路由（按模块拆分）
│   │   ├── services/      # 业务逻辑
│   │   └── main.py
│   ├── alembic/            # 数据库迁移脚本
│   ├── scripts/             # 本地开发用 PostgreSQL 启停脚本
│   ├── pgdata/pgsock/pglogs/ # 本地 PostgreSQL 数据/socket/日志（已 gitignore）
│   ├── requirements.txt
│   └── .venv/               # Python 虚拟环境
├── frontend/            # React 前端
│   └── src/
│       ├── api/          # axios 请求封装（统一响应处理）
│       ├── store/         # zustand 状态管理（登录态等）
│       ├── router/         # 路由与登录守卫
│       ├── layouts/         # 整体布局（侧边栏+顶部栏）
│       └── pages/            # 各业务模块页面
└── docs/                # 项目文档
```

## 本地开发环境启动

### 1. 启动数据库（PostgreSQL，本地独立实例，端口 5433）

首次使用前已完成 `initdb` 初始化，日常开发只需启停：

```bash
cd backend
./scripts/db_start.sh   # 启动
./scripts/db_stop.sh    # 停止
```

> 说明：为了不影响你电脑上可能已有的其他 PostgreSQL 服务，本项目使用了独立的数据目录（`backend/pgdata`）和端口（`5433`），与系统全局 PostgreSQL 完全隔离。

### 2. 启动后端

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

- API 文档（Swagger）：http://127.0.0.1:8000/docs
- 健康检查：http://127.0.0.1:8000/api/v1/health

首次初始化数据库表结构（后续阶段引入模型后执行）：

```bash
alembic revision --autogenerate -m "init tables"
alembic upgrade head
```

### 3. 启动前端

```bash
cd frontend
npm install   # 仅首次
npm run dev
```

访问 http://localhost:5173 ，Vite 已配置 `/api` 请求代理到后端 `http://127.0.0.1:8000`。

## 环境变量

后端配置见 `backend/.env`（首次使用请从 `backend/.env.example` 复制），包含数据库连接、JWT 密钥、CORS 等配置。

## 开发路线图

项目按阶段推进，当前状态：

- [x] 阶段0：项目基础设施（本文档对应阶段）
- [x] 阶段1：用户认证与组织架构
- [ ] 阶段2：请假模块
- [ ] 阶段3：签到模块
- [ ] 阶段4：Jira 看板模块
- [ ] 阶段5：Confluence 知识库模块
- [ ] 阶段6：站内邮件系统
- [ ] 阶段7：整合打磨（Dashboard、全局搜索、通知、测试）
