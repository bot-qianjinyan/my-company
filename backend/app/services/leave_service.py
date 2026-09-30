from datetime import datetime, timezone

from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import AppException, ForbiddenError, NotFoundError
from app.models import LeaveRequest, User
from app.schemas.leave import LeaveRequestCreate
from app.services.annual_leave import (
    AnnualLeaveBalance,
    AnnualLeaveUsage,
    annual_leave_shortfall,
    company_today,
    project_annual_leave,
)

_WITH_RELATIONS = (joinedload(LeaveRequest.user), joinedload(LeaveRequest.approver))
_BALANCE_STATUSES = ("pending", "approved")


def _fmt_days(days: float) -> str:
    return f"{days:.2f}".rstrip("0").rstrip(".")


def _to_usage(leave: LeaveRequest) -> AnnualLeaveUsage:
    return AnnualLeaveUsage(leave.start_date, leave.end_date, leave.days, leave.id)


def _annual_usages(db: Session, user_id: int, statuses: tuple[str, ...]) -> list[AnnualLeaveUsage]:
    rows = (
        db.query(LeaveRequest)
        .filter(
            LeaveRequest.user_id == user_id,
            LeaveRequest.leave_type == "annual",
            LeaveRequest.status.in_(statuses),
        )
        .all()
    )
    return [_to_usage(row) for row in rows]


def _ensure_annual_balance(existing: list[AnnualLeaveUsage], candidate: AnnualLeaveUsage, hire_date) -> None:
    base_shortfall = annual_leave_shortfall(existing, hire_date)
    next_shortfall = annual_leave_shortfall([*existing, candidate], hire_date)
    caused = round(next_shortfall - base_shortfall, 2)
    if caused <= 0:
        return
    covered = max(0.0, round(candidate.days - caused, 2))
    raise AppException(
        f"年假余额不足：本次申请 {_fmt_days(candidate.days)} 天，最多还能抵扣 {_fmt_days(covered)} 天。"
        "每人每年 14 天年假，最多 5 天可结转至次年 3 月 31 日，逾期未用的结转余额将清零。"
    )


def get_annual_balance(db: Session, user: User) -> AnnualLeaveBalance:
    usages = _annual_usages(db, user.id, _BALANCE_STATUSES)
    return project_annual_leave(usages, hire_date=user.hire_date, as_of=company_today())


def create_leave(db: Session, user: User, payload: LeaveRequestCreate) -> LeaveRequest:
    if payload.end_date < payload.start_date:
        raise AppException("结束日期不能早于开始日期")
    if payload.days <= 0:
        raise AppException("请假天数必须大于0")
    if payload.leave_type == "annual":
        existing = _annual_usages(db, user.id, _BALANCE_STATUSES)
        candidate = AnnualLeaveUsage(payload.start_date, payload.end_date, payload.days)
        _ensure_annual_balance(existing, candidate, user.hire_date)

    leave = LeaveRequest(
        user_id=user.id,
        leave_type=payload.leave_type,
        start_date=payload.start_date,
        end_date=payload.end_date,
        days=payload.days,
        reason=payload.reason,
    )
    db.add(leave)
    db.commit()
    db.refresh(leave)
    return leave


def get_leave_or_404(db: Session, leave_id: int) -> LeaveRequest:
    leave = db.query(LeaveRequest).options(*_WITH_RELATIONS).filter(LeaveRequest.id == leave_id).first()
    if not leave:
        raise NotFoundError("请假记录不存在")
    return leave


def list_my_leaves(db: Session, user: User) -> list[LeaveRequest]:
    return (
        db.query(LeaveRequest)
        .options(*_WITH_RELATIONS)
        .filter(LeaveRequest.user_id == user.id)
        .order_by(LeaveRequest.created_at.desc())
        .all()
    )


def list_leaves(db: Session, status: str | None = None, user_id: int | None = None) -> list[LeaveRequest]:
    query = db.query(LeaveRequest).options(*_WITH_RELATIONS)
    if status:
        query = query.filter(LeaveRequest.status == status)
    if user_id is not None:
        query = query.filter(LeaveRequest.user_id == user_id)
    return query.order_by(LeaveRequest.created_at.desc()).all()


def cancel_leave(db: Session, user: User, leave_id: int) -> LeaveRequest:
    leave = get_leave_or_404(db, leave_id)
    if leave.user_id != user.id:
        raise ForbiddenError("只能取消自己的请假申请")
    if leave.status != "pending":
        raise AppException("只有待审批的申请才能取消")
    leave.status = "cancelled"
    db.add(leave)
    db.commit()
    db.refresh(leave)
    return leave


def approve_leave(db: Session, approver: User, leave_id: int, comment: str | None) -> LeaveRequest:
    leave = get_leave_or_404(db, leave_id)
    if leave.status != "pending":
        raise AppException("该申请已被处理，无法重复操作")
    if leave.leave_type == "annual":
        approved = [
            usage
            for usage in _annual_usages(db, leave.user_id, ("approved",))
            if usage.leave_id != leave.id
        ]
        _ensure_annual_balance(approved, _to_usage(leave), leave.user.hire_date)
    leave.status = "approved"
    leave.approver_id = approver.id
    leave.approve_comment = comment
    leave.approved_at = datetime.now(timezone.utc)
    db.add(leave)
    db.commit()
    db.refresh(leave)
    return leave


def reject_leave(db: Session, approver: User, leave_id: int, comment: str | None) -> LeaveRequest:
    leave = get_leave_or_404(db, leave_id)
    if leave.status != "pending":
        raise AppException("该申请已被处理，无法重复操作")
    leave.status = "rejected"
    leave.approver_id = approver.id
    leave.approve_comment = comment
    leave.approved_at = datetime.now(timezone.utc)
    db.add(leave)
    db.commit()
    db.refresh(leave)
    return leave
