from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import User
from app.schemas.common import success_response
from app.services import search_service

router = APIRouter(prefix="/search", tags=["全局搜索"])


@router.get("")
def search(
    q: str = Query(default=""), _current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    return success_response(data=search_service.global_search(db, q))
