from datetime import datetime

from pydantic import BaseModel, ConfigDict


class WikiUserBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    display_name: str


class WikiSpaceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    key: str
    name: str
    description: str | None = None
    owner: WikiUserBrief | None = None
    page_count: int = 0


class WikiSpaceCreate(BaseModel):
    key: str
    name: str
    description: str | None = None


class WikiSpaceUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class WikiPageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    space_id: int
    parent_id: int | None = None
    title: str
    content: str
    sort_order: int
    creator: WikiUserBrief | None = None
    updated_by: WikiUserBrief | None = None
    updated_at: datetime


class WikiPageCreate(BaseModel):
    title: str
    content: str = ""
    parent_id: int | None = None


class WikiPageUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    parent_id: int | None = None
    sort_order: int | None = None
