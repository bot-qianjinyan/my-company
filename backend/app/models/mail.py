from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin


class Mail(Base, TimestampMixin):
    """站内信"""

    __tablename__ = "mails"

    id: Mapped[int] = mapped_column(primary_key=True)
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    subject: Mapped[str] = mapped_column(String(255))
    content: Mapped[str] = mapped_column(Text)
    is_deleted_by_sender: Mapped[bool] = mapped_column(Boolean, default=False)

    sender: Mapped["User"] = relationship()  # noqa: F821
    recipients: Mapped[list["MailRecipient"]] = relationship(back_populates="mail", cascade="all, delete-orphan")


class MailRecipient(Base):
    """站内信收件记录，每个收件人一条，独立维护已读/删除状态"""

    __tablename__ = "mail_recipients"

    id: Mapped[int] = mapped_column(primary_key=True)
    mail_id: Mapped[int] = mapped_column(ForeignKey("mails.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)

    mail: Mapped["Mail"] = relationship(back_populates="recipients")
    user: Mapped["User"] = relationship()  # noqa: F821
