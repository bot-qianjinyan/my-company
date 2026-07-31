from datetime import date

from sqlalchemy import Column, Date, ForeignKey, String, Table, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin

ISSUE_STATUSES = ["todo", "in_progress", "done"]
ISSUE_TYPES = ["task", "bug", "story"]
ISSUE_PRIORITIES = ["low", "medium", "high", "urgent"]

project_members = Table(
    "project_members",
    Base.metadata,
    Column("project_id", ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
)


class Project(Base, TimestampMixin):
    """Jira 风格项目，包含一个固定三列（待办/进行中/已完成）看板"""

    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(16), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(128))
    description: Mapped[str | None] = mapped_column(Text, default=None)
    owner_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), default=None)

    owner: Mapped["User | None"] = relationship(foreign_keys=[owner_id])  # noqa: F821
    members: Mapped[list["User"]] = relationship(secondary=project_members)  # noqa: F821
    issues: Mapped[list["Issue"]] = relationship(back_populates="project", cascade="all, delete-orphan")

    @property
    def member_count(self) -> int:
        return len(self.members)

    @property
    def issue_count(self) -> int:
        return len(self.issues)


class Issue(Base, TimestampMixin):
    """项目下的工单/任务卡片"""

    __tablename__ = "issues"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, default=None)
    issue_type: Mapped[str] = mapped_column(String(16), default="task")
    priority: Mapped[str] = mapped_column(String(16), default="medium")
    status: Mapped[str] = mapped_column(String(16), default="todo")
    assignee_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), default=None)
    reporter_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), default=None)
    due_date: Mapped[date | None] = mapped_column(Date, default=None)
    sort_order: Mapped[int] = mapped_column(default=0)

    project: Mapped["Project"] = relationship(back_populates="issues")
    assignee: Mapped["User | None"] = relationship(foreign_keys=[assignee_id])  # noqa: F821
    reporter: Mapped["User | None"] = relationship(foreign_keys=[reporter_id])  # noqa: F821
