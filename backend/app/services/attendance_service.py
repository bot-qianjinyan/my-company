from calendar import monthrange
from datetime import date, datetime, time

from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import AppException
from app.models import AttendanceRecord, User

WORK_START = time(9, 30)
WORK_END = time(18, 0)


def _today() -> date:
    return datetime.now().date()


def get_today_record(db: Session, user: User) -> AttendanceRecord | None:
    return (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.user_id == user.id, AttendanceRecord.work_date == _today())
        .first()
    )


def clock_in(db: Session, user: User) -> AttendanceRecord:
    record = get_today_record(db, user)
    if record and record.clock_in_at:
        raise AppException("今天已经签到过了")

    now = datetime.now()
    if not record:
        record = AttendanceRecord(user_id=user.id, work_date=_today())
    record.clock_in_at = now
    record.status = "late" if now.time() > WORK_START else "normal"
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def clock_out(db: Session, user: User) -> AttendanceRecord:
    record = get_today_record(db, user)
    if not record or not record.clock_in_at:
        raise AppException("请先完成签到")
    if record.clock_out_at:
        raise AppException("今天已经签退过了")

    now = datetime.now()
    record.clock_out_at = now
    if now.time() < WORK_END and record.status == "normal":
        record.status = "early_leave"
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def list_my_records(db: Session, user: User, year: int, month: int) -> list[AttendanceRecord]:
    start = date(year, month, 1)
    end = date(year, month, monthrange(year, month)[1])
    return (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.user_id == user.id, AttendanceRecord.work_date.between(start, end))
        .order_by(AttendanceRecord.work_date.desc())
        .all()
    )


def list_team_records(db: Session, year: int, month: int, user_id: int | None = None) -> list[AttendanceRecord]:
    start = date(year, month, 1)
    end = date(year, month, monthrange(year, month)[1])
    query = (
        db.query(AttendanceRecord)
        .options(joinedload(AttendanceRecord.user))
        .filter(AttendanceRecord.work_date.between(start, end))
    )
    if user_id is not None:
        query = query.filter(AttendanceRecord.user_id == user_id)
    return query.order_by(AttendanceRecord.work_date.desc(), AttendanceRecord.user_id).all()
