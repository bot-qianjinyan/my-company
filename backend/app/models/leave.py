from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin

LEAVE_TYPES = ["annual", "sick", "personal", "compensatory", "other"]
LEAVE_STATUSES = ["pending", "approved", "rejected", "cancelled"]


class LeaveRequest(Base, TimestampMixin):
    """请假申请单"""

    __tablename__ = "leave_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    leave_type: Mapped[str] = mapped_column(String(32))
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    days: Mapped[float] = mapped_column(Float)
    reason: Mapped[str | None] = mapped_column(Text, default=None)
    status: Mapped[str] = mapped_column(String(16), default="pending")
    approver_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), default=None)
    approve_comment: Mapped[str | None] = mapped_column(Text, default=None)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)

    user: Mapped["User"] = relationship(foreign_keys=[user_id])  # noqa: F821
    approver: Mapped["User | None"] = relationship(foreign_keys=[approver_id])  # noqa: F821
