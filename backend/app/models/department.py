from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin


class Department(Base, TimestampMixin):
    """部门，支持通过 parent_id 构建组织架构树"""

    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(128))
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), default=None)
    leader_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), default=None)
    sort_order: Mapped[int] = mapped_column(default=0)

    parent: Mapped["Department | None"] = relationship(remote_side="Department.id", back_populates="children")
    children: Mapped[list["Department"]] = relationship(back_populates="parent")

    members: Mapped[list["User"]] = relationship(  # noqa: F821
        back_populates="department", foreign_keys="User.department_id"
    )
    leader: Mapped["User | None"] = relationship(  # noqa: F821
        foreign_keys=[leader_id], post_update=True
    )
