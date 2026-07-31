from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin

EXPENSE_CATEGORIES = ["traffic", "meal", "accommodation", "office", "communication", "other"]
EXPENSE_STATUSES = ["pending", "approved", "rejected", "paid", "cancelled"]


class ExpenseClaim(Base, TimestampMixin):
    """报销申请单"""

    __tablename__ = "expense_claims"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(32))
    amount: Mapped[float] = mapped_column(Float)
    expense_date: Mapped[date] = mapped_column(Date)
    description: Mapped[str | None] = mapped_column(Text, default=None)
    status: Mapped[str] = mapped_column(String(16), default="pending")
    approver_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), default=None)
    approve_comment: Mapped[str | None] = mapped_column(Text, default=None)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)

    user: Mapped["User"] = relationship(foreign_keys=[user_id])  # noqa: F821
    approver: Mapped["User | None"] = relationship(foreign_keys=[approver_id])  # noqa: F821
    invoices: Mapped[list["ExpenseInvoice"]] = relationship(back_populates="claim", cascade="all, delete-orphan")


class ExpenseInvoice(Base):
    """报销单关联的发票附件"""

    __tablename__ = "expense_invoices"

    id: Mapped[int] = mapped_column(primary_key=True)
    claim_id: Mapped[int] = mapped_column(ForeignKey("expense_claims.id", ondelete="CASCADE"))
    file_name: Mapped[str] = mapped_column(String(255))
    file_path: Mapped[str] = mapped_column(String(255))
    invoice_no: Mapped[str | None] = mapped_column(String(64), default=None)
    amount: Mapped[float | None] = mapped_column(Float, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    claim: Mapped["ExpenseClaim"] = relationship(back_populates="invoices")
