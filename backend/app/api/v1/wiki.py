from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.core.database import get_db
from app.models import User, WikiPage, WikiSpace
from app.schemas.common import success_response
from app.schemas.wiki import (
    WikiPageCreate,
    WikiPageOut,
    WikiPageUpdate,
    WikiSpaceCreate,
    WikiSpaceOut,
    WikiSpaceUpdate,
)
from app.services import wiki_service

router = APIRouter(prefix="/wiki", tags=["知识库"])


def _dump_space(space: WikiSpace) -> dict:
    return WikiSpaceOut.model_validate(space).model_dump(mode="json")


def _dump_page(page: WikiPage) -> dict:
    return WikiPageOut.model_validate(page).model_dump(mode="json")


@router.get("/spaces")
def list_spaces(_current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    spaces = wiki_service.list_spaces(db)
    return success_response(data=[_dump_space(s) for s in spaces])


@router.post("/spaces", dependencies=[Depends(require_admin)])
def create_space(
    payload: WikiSpaceCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    space = wiki_service.create_space(db, payload, current_user)
    return success_response(data=_dump_space(space), message="知识库空间创建成功")


@router.put("/spaces/{space_id}", dependencies=[Depends(require_admin)])
def update_space(
    space_id: int,
    payload: WikiSpaceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    space = wiki_service.update_space(db, space_id, payload, current_user)
    return success_response(data=_dump_space(space), message="空间信息已更新")


@router.delete("/spaces/{space_id}", dependencies=[Depends(require_admin)])
def delete_space(
    space_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    wiki_service.delete_space(db, space_id, current_user)
    return success_response(message="空间已删除")


@router.get("/spaces/{space_id}/pages")
def list_pages(
    space_id: int, _current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    pages = wiki_service.list_pages(db, space_id)
    return success_response(data=[_dump_page(p) for p in pages])


@router.post("/spaces/{space_id}/pages", dependencies=[Depends(require_admin)])
def create_page(
    space_id: int,
    payload: WikiPageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    page = wiki_service.create_page(db, space_id, payload, current_user)
    return success_response(data=_dump_page(page), message="文档创建成功")


@router.get("/pages/{page_id}")
def get_page(page_id: int, _current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    page = wiki_service.get_page_or_404(db, page_id)
    return success_response(data=_dump_page(page))


@router.put("/pages/{page_id}", dependencies=[Depends(require_admin)])
def update_page(
    page_id: int,
    payload: WikiPageUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    page = wiki_service.update_page(db, page_id, payload, current_user)
    return success_response(data=_dump_page(page), message="文档已保存")


@router.delete("/pages/{page_id}", dependencies=[Depends(require_admin)])
def delete_page(
    page_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    wiki_service.delete_page(db, page_id, current_user)
    return success_response(message="文档已删除")
