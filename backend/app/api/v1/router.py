from fastapi import APIRouter

from app.api.v1 import (
    attendance,
    auth,
    company,
    departments,
    expenses,
    health,
    leaves,
    mails,
    projects,
    search,
    users,
    wiki,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(departments.router)
api_router.include_router(company.router)
api_router.include_router(leaves.router)
api_router.include_router(attendance.router)
api_router.include_router(projects.router)
api_router.include_router(wiki.router)
api_router.include_router(mails.router)
api_router.include_router(expenses.router)
api_router.include_router(search.router)
