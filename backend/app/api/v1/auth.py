from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import User
from app.schemas.auth import AccessTokenOnly, ChangePasswordRequest, LoginRequest, RefreshRequest
from app.schemas.common import success_response
from app.schemas.user import UserOut
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["认证"])


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> dict:
    user = auth_service.authenticate_user(db, payload.username, payload.password)
    tokens = auth_service.issue_token_pair(user)
    return success_response(data=tokens.model_dump(), message="登录成功")


@router.post("/refresh")
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> dict:
    access_token = auth_service.refresh_access_token(db, payload.refresh_token)
    return success_response(data=AccessTokenOnly(access_token=access_token).model_dump())


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)) -> dict:
    return success_response(data=UserOut.model_validate(current_user).model_dump(mode="json"))


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    auth_service.change_password(db, current_user, payload.old_password, payload.new_password)
    return success_response(message="密码修改成功")
