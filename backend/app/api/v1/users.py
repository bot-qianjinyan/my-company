from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_hr_or_admin
from app.core.database import get_db
from app.core.exceptions import ForbiddenError
from app.models import User
from app.schemas.common import success_response
from app.schemas.user import ProfileUpdate, UserCreate, UserOut, UserUpdate
from app.services import user_service

router = APIRouter(prefix="/users", tags=["员工"])


def _dump(user: User) -> dict:
    return UserOut.model_validate(user).model_dump(mode="json")


@router.get("")
def list_users(
    department_id: int | None = Query(default=None),
    keyword: str | None = Query(default=None),
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    users = user_service.list_users(db, department_id=department_id, keyword=keyword)
    return success_response(data=[_dump(u) for u in users])


@router.put("/me/profile")
def update_my_profile(
    payload: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    user = user_service.update_profile(db, current_user, payload)
    return success_response(data=_dump(user), message="个人信息已更新")


@router.get("/{user_id}")
def get_user(
    user_id: int, _current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    user = user_service.get_user_or_404(db, user_id)
    return success_response(data=_dump(user))


@router.post("", dependencies=[Depends(require_hr_or_admin)])
def create_user(payload: UserCreate, db: Session = Depends(get_db)) -> dict:
    user = user_service.create_user(db, payload)
    return success_response(data=_dump(user), message="员工创建成功")


@router.put("/{user_id}", dependencies=[Depends(require_hr_or_admin)])
def update_user(user_id: int, payload: UserUpdate, db: Session = Depends(get_db)) -> dict:
    user = user_service.update_user(db, user_id, payload)
    return success_response(data=_dump(user), message="员工信息已更新")


@router.delete("/{user_id}")
def delete_user(
    user_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    if not current_user.is_superuser and "admin" not in current_user.role_codes:
        raise ForbiddenError("仅系统管理员可删除员工账号")
    user_service.delete_user(db, user_id)
    return success_response(message="员工已删除")
