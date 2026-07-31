from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import JWTError, decode_token
from app.models import User

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise UnauthorizedError("请先登录")

    try:
        payload = decode_token(credentials.credentials)
    except JWTError:
        raise UnauthorizedError("登录状态无效，请重新登录") from None

    if payload.get("type") != "access":
        raise UnauthorizedError("无效的访问令牌")

    user_id = payload.get("sub")
    user = db.get(User, int(user_id)) if user_id else None
    if user is None or not user.is_active:
        raise UnauthorizedError("账号不存在或已停用")
    return user


def require_roles(*allowed_codes: str):
    """要求当前用户具备指定角色之一（超级管理员始终放行）"""

    def checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.is_superuser:
            return current_user
        if not set(current_user.role_codes).intersection(allowed_codes):
            raise ForbiddenError("没有权限执行此操作")
        return current_user

    return checker


require_admin = require_roles("admin")
require_hr_or_admin = require_roles("admin", "hr")
require_manager_or_above = require_roles("admin", "hr", "manager")
