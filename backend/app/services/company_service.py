from sqlalchemy.orm import Session

from app.models import Announcement, CompanyInfo, User
from app.schemas.company import AnnouncementCreate, CompanyInfoUpdate


def get_company_info(db: Session) -> CompanyInfo | None:
    return db.query(CompanyInfo).first()


def update_company_info(db: Session, payload: CompanyInfoUpdate) -> CompanyInfo:
    company = get_company_info(db)
    if not company:
        company = CompanyInfo(name=payload.name or "My Company")
        db.add(company)
        db.flush()

    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(company, field, value)

    db.add(company)
    db.commit()
    db.refresh(company)
    return company


def list_announcements(db: Session) -> list[Announcement]:
    return db.query(Announcement).order_by(Announcement.pinned.desc(), Announcement.created_at.desc()).all()


def create_announcement(db: Session, payload: AnnouncementCreate, created_by: User) -> Announcement:
    announcement = Announcement(**payload.model_dump(), created_by_id=created_by.id)
    db.add(announcement)
    db.commit()
    db.refresh(announcement)
    return announcement


def delete_announcement(db: Session, announcement_id: int) -> None:
    announcement = db.get(Announcement, announcement_id)
    if announcement:
        db.delete(announcement)
        db.commit()
