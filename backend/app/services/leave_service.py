from datetime import datetime, timezone

from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import AppException, ForbiddenError, NotFoundError
from app.models import LeaveRequest, User
from app.schemas.leave import LeaveRequestCreate

_WITH_RELATIONS = (joinedload(LeaveRequest.user), joinedload(LeaveRequest.approver))


def create_leave(db: Session, user: User, payload: LeaveRequestCreate) -> LeaveRequest:
    if payload.end_date < payload.start_date:
        raise AppException("结束日期不能早于开始日期")
    if payload.days <= 0:
        raise AppException("请假天数必须大于0")

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
