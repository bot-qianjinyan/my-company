from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import User
from app.schemas.common import success_response
from app.schemas.mail import MailCreate
from app.services import mail_service

router = APIRouter(prefix="/mails", tags=["站内邮件"])


@router.get("/inbox")
def list_inbox(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    return success_response(data=mail_service.list_inbox(db, current_user))


@router.get("/sent")
def list_sent(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    return success_response(data=mail_service.list_sent(db, current_user))


@router.get("/unread-count")
def unread_count(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    return success_response(data={"count": mail_service.get_unread_count(db, current_user)})


@router.post("")
def send_mail(
    payload: MailCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    mail = mail_service.send_mail(db, current_user, payload)
    return success_response(data=mail_service.dump_sent(mail), message="邮件已发送")


@router.get("/{mail_id}")
def get_mail(
    mail_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    return success_response(data=mail_service.get_mail_detail(db, current_user, mail_id))


@router.delete("/{mail_id}")
def delete_mail(
    mail_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    mail_service.delete_mail_for_user(db, current_user, mail_id)
    return success_response(message="邮件已删除")
