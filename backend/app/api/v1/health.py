from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.schemas.common import success_response

router = APIRouter(tags=["系统"])


@router.get("/health")
def health_check(db: Session = Depends(get_db)) -> dict:
    db.execute(text("SELECT 1"))
    return success_response(
        data={"app_name": settings.app_name, "env": settings.app_env, "database": "connected"}
    )
