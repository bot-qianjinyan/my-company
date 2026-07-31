from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin
from app.models.role import user_roles


class User(Base, TimestampMixin):
    """员工账号"""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    email: Mapped[str | None] = mapped_column(String(128), unique=True, index=True, default=None)
    hashed_password: Mapped[str] = mapped_column(String(255))

    display_name: Mapped[str] = mapped_column(String(64))
    phone: Mapped[str | None] = mapped_column(String(32), default=None)
    avatar_url: Mapped[str | None] = mapped_column(String(255), default=None)
    gender: Mapped[str | None] = mapped_column(String(8), default=None)
    position: Mapped[str | None] = mapped_column(String(64), default=None)
    employee_no: Mapped[str | None] = mapped_column(String(32), unique=True, default=None)
    hire_date: Mapped[date | None] = mapped_column(Date, default=None)

    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), default=None)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)

    department: Mapped["Department | None"] = relationship(  # noqa: F821
        back_populates="members", foreign_keys=[department_id]
    )
    roles: Mapped[list["Role"]] = relationship(secondary=user_roles, back_populates="users")  # noqa: F821

    @property
    def role_codes(self) -> list[str]:
        return [role.code for role in self.roles]
