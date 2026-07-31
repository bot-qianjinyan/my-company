from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin


class CompanyInfo(Base, TimestampMixin):
    """公司基础信息，采用单行记录模式"""

    __tablename__ = "company_info"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(128))
    slogan: Mapped[str | None] = mapped_column(String(255), default=None)
    description: Mapped[str | None] = mapped_column(Text, default=None)
    logo_url: Mapped[str | None] = mapped_column(String(255), default=None)
    address: Mapped[str | None] = mapped_column(String(255), default=None)
    website: Mapped[str | None] = mapped_column(String(255), default=None)
    founded_date: Mapped[str | None] = mapped_column(String(32), default=None)


class Announcement(Base, TimestampMixin):
    """公司公告"""

    __tablename__ = "announcements"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(128))
    content: Mapped[str] = mapped_column(Text)
    pinned: Mapped[bool] = mapped_column(default=False)
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), default=None)

    created_by: Mapped["User | None"] = relationship()  # noqa: F821

    @property
    def created_by_name(self) -> str | None:
        return self.created_by.display_name if self.created_by else None
