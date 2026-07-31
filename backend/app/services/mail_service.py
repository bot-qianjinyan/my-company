from datetime import datetime, timezone

from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import AppException, NotFoundError
from app.models import Mail, MailRecipient, User
from app.schemas.mail import MailCreate


def _dump_user(user: User | None) -> dict | None:
    if not user:
        return None
    return {"id": user.id, "display_name": user.display_name}


def dump_inbox_item(item: MailRecipient) -> dict:
    mail = item.mail
    return {
        "id": mail.id,
        "subject": mail.subject,
        "content": mail.content,
        "created_at": mail.created_at.isoformat(),
        "sender": _dump_user(mail.sender),
        "is_read": item.is_read,
        "read_at": item.read_at.isoformat() if item.read_at else None,
    }


def dump_sent(mail: Mail) -> dict:
    return {
        "id": mail.id,
        "subject": mail.subject,
        "content": mail.content,
        "created_at": mail.created_at.isoformat(),
        "sender": _dump_user(mail.sender),
        "recipients": [_dump_user(r.user) for r in mail.recipients],
    }


def send_mail(db: Session, sender: User, payload: MailCreate) -> Mail:
    if not payload.recipient_ids:
        raise AppException("请至少选择一位收件人")
    recipients = db.query(User).filter(User.id.in_(payload.recipient_ids)).all()
    if not recipients:
        raise AppException("收件人不存在")

    mail = Mail(sender_id=sender.id, subject=payload.subject, content=payload.content)
    mail.recipients = [MailRecipient(user_id=u.id) for u in recipients]
    db.add(mail)
    db.commit()
    db.refresh(mail)
    return mail


def list_inbox(db: Session, user: User) -> list[dict]:
    items = (
        db.query(MailRecipient)
        .options(joinedload(MailRecipient.mail).joinedload(Mail.sender))
        .filter(MailRecipient.user_id == user.id, MailRecipient.is_deleted.is_(False))
        .order_by(MailRecipient.id.desc())
        .all()
    )
    return [dump_inbox_item(item) for item in items]


def list_sent(db: Session, user: User) -> list[dict]:
    mails = (
        db.query(Mail)
        .options(joinedload(Mail.sender), joinedload(Mail.recipients).joinedload(MailRecipient.user))
        .filter(Mail.sender_id == user.id, Mail.is_deleted_by_sender.is_(False))
        .order_by(Mail.id.desc())
        .all()
    )
    return [dump_sent(m) for m in mails]


def get_unread_count(db: Session, user: User) -> int:
    return (
        db.query(MailRecipient)
        .filter(
            MailRecipient.user_id == user.id,
            MailRecipient.is_read.is_(False),
            MailRecipient.is_deleted.is_(False),
        )
        .count()
    )


def get_mail_detail(db: Session, user: User, mail_id: int) -> dict:
    recipient_row = (
        db.query(MailRecipient)
        .options(joinedload(MailRecipient.mail).joinedload(Mail.sender))
        .filter(MailRecipient.mail_id == mail_id, MailRecipient.user_id == user.id)
        .first()
    )
    if recipient_row:
        if not recipient_row.is_read:
            recipient_row.is_read = True
            recipient_row.read_at = datetime.now(timezone.utc)
            db.add(recipient_row)
            db.commit()
            db.refresh(recipient_row)
        return dump_inbox_item(recipient_row)

    mail = (
        db.query(Mail)
        .options(joinedload(Mail.sender), joinedload(Mail.recipients).joinedload(MailRecipient.user))
        .filter(Mail.id == mail_id, Mail.sender_id == user.id)
        .first()
    )
    if mail:
        return dump_sent(mail)

    raise NotFoundError("邮件不存在")


def delete_mail_for_user(db: Session, user: User, mail_id: int) -> None:
    recipient_row = (
        db.query(MailRecipient)
        .filter(MailRecipient.mail_id == mail_id, MailRecipient.user_id == user.id)
        .first()
    )
    if recipient_row:
        recipient_row.is_deleted = True
        db.add(recipient_row)
        db.commit()
        return

    mail = db.query(Mail).filter(Mail.id == mail_id, Mail.sender_id == user.id).first()
    if mail:
        mail.is_deleted_by_sender = True
        db.add(mail)
        db.commit()
        return

    raise NotFoundError("邮件不存在")
