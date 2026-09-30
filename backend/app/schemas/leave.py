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


class AnnualLeaveBalanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    year: int
    grant_days: float
    used_days: float
    remaining_days: float
    carryover_from_year: int | None = None
    carryover_limit_days: float
    carryover_days: float
    carryover_used_days: float
    carryover_expired_days: float
    carryover_deadline: date
    carryover_active: bool
    total_available: float
