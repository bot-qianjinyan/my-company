from sqlalchemy.orm import Session

from app.core.exceptions import UnauthorizedError
from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from app.core.security import decode_token, JWTError
from app.models import User
from app.schemas.auth import TokenPair


def authenticate_user(db: Session, username: str, password: str) -> User:
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.hashed_password):
        raise UnauthorizedError("用户名或密码错误")
    if not user.is_active:
        raise UnauthorizedError("账号已被停用，请联系管理员")
    return user


def issue_token_pair(user: User) -> TokenPair:
    access_token = create_access_token(subject=str(user.id))
    refresh_token = create_refresh_token(subject=str(user.id))
    return TokenPair(access_token=access_token, refresh_token=refresh_token, user=user)  # type: ignore[arg-type]


def refresh_access_token(db: Session, refresh_token: str) -> str:
    try:
        payload = decode_token(refresh_token)
    except JWTError:
        raise UnauthorizedError("刷新令牌无效或已过期") from None

    if payload.get("type") != "refresh":
        raise UnauthorizedError("无效的刷新令牌")

    user_id = payload.get("sub")
    user = db.get(User, int(user_id)) if user_id else None
    if user is None or not user.is_active:
        raise UnauthorizedError("账号不存在或已停用")

    return create_access_token(subject=str(user.id))


def change_password(db: Session, user: User, old_password: str, new_password: str) -> None:
    if not verify_password(old_password, user.hashed_password):
        raise UnauthorizedError("原密码不正确")
    user.hashed_password = hash_password(new_password)
    db.add(user)
    db.commit()
