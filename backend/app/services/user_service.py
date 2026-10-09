from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.core.security import hash_password
from app.core.storage import save_avatar_file
from app.models import Role, User
from app.schemas.user import ProfileUpdate, UserCreate, UserUpdate


def list_users(db: Session, department_id: int | None = None, keyword: str | None = None) -> list[User]:
    query = db.query(User)
    if department_id is not None:
        query = query.filter(User.department_id == department_id)
    if keyword:
        like = f"%{keyword}%"
        query = query.filter((User.display_name.ilike(like)) | (User.username.ilike(like)))
    return query.order_by(User.id).all()


def get_user_or_404(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if not user:
        raise NotFoundError("员工不存在")
    return user


def _resolve_roles(db: Session, role_codes: list[str]) -> list[Role]:
    if not role_codes:
        return []
    roles = db.query(Role).filter(Role.code.in_(role_codes)).all()
    return roles


def create_user(db: Session, payload: UserCreate) -> User:
    if db.query(User).filter(User.username == payload.username).first():
        raise ConflictError("用户名已存在")

    user = User(
        username=payload.username,
        hashed_password=hash_password(payload.password),
        email=payload.email,
        display_name=payload.display_name,
        phone=payload.phone,
        gender=payload.gender,
        position=payload.position,
        employee_no=payload.employee_no,
        hire_date=payload.hire_date,
        department_id=payload.department_id,
    )
    user.roles = _resolve_roles(db, payload.role_codes) or _resolve_roles(db, ["employee"])
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user(db: Session, user_id: int, payload: UserUpdate) -> User:
    user = get_user_or_404(db, user_id)
    data = payload.model_dump(exclude_unset=True, exclude={"role_codes"})
    for field, value in data.items():
        setattr(user, field, value)

    if payload.role_codes is not None:
        user.roles = _resolve_roles(db, payload.role_codes)

    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_profile(db: Session, user: User, payload: ProfileUpdate) -> User:
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(user, field, value)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


async def update_avatar(db: Session, user: User, file: UploadFile) -> User:
    user.avatar_url = await save_avatar_file(user.id, file)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user_id: int) -> None:
    user = get_user_or_404(db, user_id)
    db.delete(user)
    db.commit()
