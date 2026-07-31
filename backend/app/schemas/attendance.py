from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class AttendanceUserBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    display_name: str


class AttendanceRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    work_date: date
    clock_in_at: datetime | None = None
    clock_out_at: datetime | None = None
    status: str
    note: str | None = None


class AttendanceRecordWithUserOut(AttendanceRecordOut):
    user: AttendanceUserBrief
