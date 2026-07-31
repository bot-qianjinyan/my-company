from fastapi import APIRouter

from app.api.v1 import auth, company, departments, health, users

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(departments.router)
api_router.include_router(company.router)

# 后续阶段将在此处依次挂载：leaves、attendance、
# projects（Jira看板）、wiki（知识库）、mails（站内邮件）等子路由
