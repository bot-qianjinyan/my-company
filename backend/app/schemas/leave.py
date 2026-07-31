from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class LeaveUserBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    display_name: str


class LeaveRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    leave_type: str
    start_date: date
    end_date: date
    days: float
    reason: str | None = None
    status: str
    approve_comment: str | None = None
    approved_at: datetime | None = None
    created_at: datetime
    user: LeaveUserBrief
    approver: LeaveUserBrief | None = None


class LeaveRequestCreate(BaseModel):
    leave_type: str
    start_date: date
    end_date: date
    days: float
    reason: str | None = None


class LeaveDecisionRequest(BaseModel):
    comment: str | None = None
