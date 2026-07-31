from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CompanyInfoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slogan: str | None = None
    description: str | None = None
    logo_url: str | None = None
    address: str | None = None
    website: str | None = None
    founded_date: str | None = None


class CompanyInfoUpdate(BaseModel):
    name: str | None = None
    slogan: str | None = None
    description: str | None = None
    logo_url: str | None = None
    address: str | None = None
    website: str | None = None
    founded_date: str | None = None


class AnnouncementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    content: str
    pinned: bool
    created_at: datetime
    created_by_name: str | None = None


class AnnouncementCreate(BaseModel):
    title: str
    content: str
    pinned: bool = False
