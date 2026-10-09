from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class ProjectUserBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    display_name: str
    avatar_url: str | None = None


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    key: str
    name: str
    description: str | None = None
    owner: ProjectUserBrief | None = None
    members: list[ProjectUserBrief] = []
    member_count: int = 0
    issue_count: int = 0


class ProjectCreate(BaseModel):
    key: str
    name: str
    description: str | None = None
    member_ids: list[int] = []


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    owner_id: int | None = None
    member_ids: list[int] | None = None


class IssueOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    title: str
    description: str | None = None
    issue_type: str
    priority: str
    status: str
    due_date: date | None = None
    sort_order: int
    created_at: datetime
    assignee: ProjectUserBrief | None = None
    reporter: ProjectUserBrief | None = None


class IssueCreate(BaseModel):
    title: str
    description: str | None = None
    issue_type: str = "task"
    priority: str = "medium"
    assignee_id: int | None = None
    due_date: date | None = None


class IssueUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    issue_type: str | None = None
    priority: str | None = None
    status: str | None = None
    assignee_id: int | None = None
    due_date: date | None = None
    sort_order: int | None = None
