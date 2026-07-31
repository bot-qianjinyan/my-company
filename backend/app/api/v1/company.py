from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin, require_hr_or_admin
from app.core.database import get_db
from app.models import User
from app.schemas.common import success_response
from app.schemas.company import AnnouncementCreate, CompanyInfoUpdate
from app.services import company_service

router = APIRouter(prefix="/company", tags=["公司信息"])


@router.get("/info")
def get_company_info(_current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    company = company_service.get_company_info(db)
    return success_response(data=_dump_company(company) if company else None)


@router.put("/info", dependencies=[Depends(require_admin)])
def update_company_info(payload: CompanyInfoUpdate, db: Session = Depends(get_db)) -> dict:
    company = company_service.update_company_info(db, payload)
    return success_response(data=_dump_company(company), message="公司信息已更新")


@router.get("/announcements")
def list_announcements(
    _current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    announcements = company_service.list_announcements(db)
    return success_response(data=[_dump_announcement(a) for a in announcements])


@router.post("/announcements", dependencies=[Depends(require_hr_or_admin)])
def create_announcement(
    payload: AnnouncementCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    announcement = company_service.create_announcement(db, payload, current_user)
    return success_response(data=_dump_announcement(announcement), message="公告已发布")


@router.delete("/announcements/{announcement_id}", dependencies=[Depends(require_hr_or_admin)])
def delete_announcement(announcement_id: int, db: Session = Depends(get_db)) -> dict:
    company_service.delete_announcement(db, announcement_id)
    return success_response(message="公告已删除")


def _dump_company(company) -> dict:
    return {
        "id": company.id,
        "name": company.name,
        "slogan": company.slogan,
        "description": company.description,
        "logo_url": company.logo_url,
        "address": company.address,
        "website": company.website,
        "founded_date": company.founded_date,
    }


def _dump_announcement(announcement) -> dict:
    return {
        "id": announcement.id,
        "title": announcement.title,
        "content": announcement.content,
        "pinned": announcement.pinned,
        "created_at": announcement.created_at.isoformat(),
        "created_by_name": announcement.created_by_name,
    }
