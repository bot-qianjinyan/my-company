from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin


class WikiSpace(Base, TimestampMixin):
    """知识库空间，类似 Confluence 的 Space"""

    __tablename__ = "wiki_spaces"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(128))
    description: Mapped[str | None] = mapped_column(String(255), default=None)
    owner_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), default=None)

    owner: Mapped["User | None"] = relationship()  # noqa: F821
    pages: Mapped[list["WikiPage"]] = relationship(back_populates="space", cascade="all, delete-orphan")

    @property
    def page_count(self) -> int:
        return len(self.pages)


class WikiPage(Base, TimestampMixin):
    """知识库文档，支持通过 parent_id 构建文档树"""

    __tablename__ = "wiki_pages"

    id: Mapped[int] = mapped_column(primary_key=True)
    space_id: Mapped[int] = mapped_column(ForeignKey("wiki_spaces.id", ondelete="CASCADE"))
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("wiki_pages.id"), default=None)
    title: Mapped[str] = mapped_column(String(255))
    content: Mapped[str] = mapped_column(Text, default="")
    sort_order: Mapped[int] = mapped_column(default=0)
    creator_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), default=None)
    updated_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), default=None)

    space: Mapped["WikiSpace"] = relationship(back_populates="pages")
    parent: Mapped["WikiPage | None"] = relationship(remote_side="WikiPage.id", back_populates="children")
    children: Mapped[list["WikiPage"]] = relationship(back_populates="parent")
    creator: Mapped["User | None"] = relationship(foreign_keys=[creator_id])  # noqa: F821
    updated_by: Mapped["User | None"] = relationship(foreign_keys=[updated_by_id])  # noqa: F821
