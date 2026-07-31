from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_manager_or_above
from app.core.database import get_db
from app.models import AttendanceRecord, User
from app.schemas.attendance import AttendanceRecordOut, AttendanceRecordWithUserOut
from app.schemas.common import success_response
from app.services import attendance_service

router = APIRouter(prefix="/attendance", tags=["签到打卡"])


def _dump(record: AttendanceRecord) -> dict:
    return AttendanceRecordOut.model_validate(record).model_dump(mode="json")


def _dump_with_user(record: AttendanceRecord) -> dict:
    return AttendanceRecordWithUserOut.model_validate(record).model_dump(mode="json")


@router.get("/today")
def get_today(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    record = attendance_service.get_today_record(db, current_user)
    return success_response(data=_dump(record) if record else None)


@router.post("/clock-in")
def clock_in(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    record = attendance_service.clock_in(db, current_user)
    return success_response(data=_dump(record), message="签到成功")


@router.post("/clock-out")
def clock_out(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    record = attendance_service.clock_out(db, current_user)
    return success_response(data=_dump(record), message="签退成功")


@router.get("/mine")
def get_my_records(
    year: int | None = Query(default=None),
    month: int | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    now = datetime.now()
    records = attendance_service.list_my_records(db, current_user, year or now.year, month or now.month)
    return success_response(data=[_dump(item) for item in records])


@router.get("", dependencies=[Depends(require_manager_or_above)])
def get_team_records(
    year: int | None = Query(default=None),
    month: int | None = Query(default=None),
    user_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
) -> dict:
    now = datetime.now()
    records = attendance_service.list_team_records(db, year or now.year, month or now.month, user_id=user_id)
    return success_response(data=[_dump_with_user(item) for item in records])
