from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.models import User, WikiPage, WikiSpace
from app.schemas.wiki import WikiPageCreate, WikiPageUpdate, WikiSpaceCreate, WikiSpaceUpdate

_SPACE_RELATIONS = (joinedload(WikiSpace.owner), joinedload(WikiSpace.pages))
_PAGE_RELATIONS = (joinedload(WikiPage.creator), joinedload(WikiPage.updated_by))


def _is_admin(user: User) -> bool:
    return user.is_superuser or "admin" in user.role_codes


def _require_admin(user: User) -> None:
    if not _is_admin(user):
        raise ForbiddenError("只有系统管理员可以管理知识库")


def list_spaces(db: Session) -> list[WikiSpace]:
    return db.query(WikiSpace).options(*_SPACE_RELATIONS).order_by(WikiSpace.id).all()


def get_space_or_404(db: Session, space_id: int) -> WikiSpace:
    space = db.query(WikiSpace).options(*_SPACE_RELATIONS).filter(WikiSpace.id == space_id).first()
    if not space:
        raise NotFoundError("知识库空间不存在")
    return space


def create_space(db: Session, payload: WikiSpaceCreate, owner: User) -> WikiSpace:
    _require_admin(owner)
    key = payload.key.strip().upper()
    if db.query(WikiSpace).filter(WikiSpace.key == key).first():
        raise ConflictError("空间编号已存在")
    space = WikiSpace(key=key, name=payload.name, description=payload.description, owner_id=owner.id)
    db.add(space)
    db.commit()
    db.refresh(space)
    return space


def update_space(db: Session, space_id: int, payload: WikiSpaceUpdate, current_user: User) -> WikiSpace:
    space = get_space_or_404(db, space_id)
    _require_admin(current_user)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(space, field, value)
    db.add(space)
    db.commit()
    db.refresh(space)
    return space


def delete_space(db: Session, space_id: int, current_user: User) -> None:
    space = get_space_or_404(db, space_id)
    _require_admin(current_user)
    db.delete(space)
    db.commit()


def list_pages(db: Session, space_id: int) -> list[WikiPage]:
    get_space_or_404(db, space_id)
    return (
        db.query(WikiPage)
        .options(*_PAGE_RELATIONS)
        .filter(WikiPage.space_id == space_id)
        .order_by(WikiPage.sort_order, WikiPage.id)
        .all()
    )


def get_page_or_404(db: Session, page_id: int) -> WikiPage:
    page = db.query(WikiPage).options(*_PAGE_RELATIONS).filter(WikiPage.id == page_id).first()
    if not page:
        raise NotFoundError("文档不存在")
    return page


def create_page(db: Session, space_id: int, payload: WikiPageCreate, creator: User) -> WikiPage:
    _require_admin(creator)
    get_space_or_404(db, space_id)
    max_order = (
        db.query(WikiPage)
        .filter(WikiPage.space_id == space_id, WikiPage.parent_id == payload.parent_id)
        .count()
    )
    page = WikiPage(
        space_id=space_id,
        parent_id=payload.parent_id,
        title=payload.title,
        content=payload.content,
        sort_order=max_order,
        creator_id=creator.id,
        updated_by_id=creator.id,
    )
    db.add(page)
    db.commit()
    db.refresh(page)
    return page


def update_page(db: Session, page_id: int, payload: WikiPageUpdate, updater: User) -> WikiPage:
    _require_admin(updater)
    page = get_page_or_404(db, page_id)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(page, field, value)
    page.updated_by_id = updater.id
    db.add(page)
    db.commit()
    db.refresh(page)
    return page


def delete_page(db: Session, page_id: int, current_user: User) -> None:
    _require_admin(current_user)
    page = get_page_or_404(db, page_id)
    db.delete(page)
    db.commit()
