from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin

ATTENDANCE_STATUSES = ["normal", "late", "early_leave", "absent"]


class AttendanceRecord(Base, TimestampMixin):
    """员工每日签到打卡记录，每人每天一条"""

    __tablename__ = "attendance_records"
    __table_args__ = (UniqueConstraint("user_id", "work_date", name="uq_attendance_user_date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    work_date: Mapped[date] = mapped_column(Date)
    clock_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    clock_out_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    status: Mapped[str] = mapped_column(String(16), default="normal")
    note: Mapped[str | None] = mapped_column(String(255), default=None)

    user: Mapped["User"] = relationship()  # noqa: F821
