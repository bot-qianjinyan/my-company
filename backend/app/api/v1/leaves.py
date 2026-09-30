from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_manager_or_above
from app.core.database import get_db
from app.models import LeaveRequest, User
from app.schemas.common import success_response
from app.schemas.leave import AnnualLeaveBalanceOut, LeaveDecisionRequest, LeaveRequestCreate, LeaveRequestOut
from app.services import leave_service

router = APIRouter(prefix="/leaves", tags=["请假"])


def _dump(leave: LeaveRequest) -> dict:
    return LeaveRequestOut.model_validate(leave).model_dump(mode="json")


@router.get("/balance")
def get_annual_balance(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    balance = leave_service.get_annual_balance(db, current_user)
    return success_response(data=AnnualLeaveBalanceOut.model_validate(balance).model_dump(mode="json"))


@router.get("/mine")
def get_my_leaves(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    leaves = leave_service.list_my_leaves(db, current_user)
    return success_response(data=[_dump(item) for item in leaves])


@router.get("", dependencies=[Depends(require_manager_or_above)])
def get_leaves(
    status: str | None = Query(default=None),
    user_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
) -> dict:
    leaves = leave_service.list_leaves(db, status=status, user_id=user_id)
    return success_response(data=[_dump(item) for item in leaves])


@router.post("")
def submit_leave(
    payload: LeaveRequestCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    leave = leave_service.create_leave(db, current_user, payload)
    return success_response(data=_dump(leave), message="请假申请已提交")


@router.post("/{leave_id}/cancel")
def cancel_leave(
    leave_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    leave = leave_service.cancel_leave(db, current_user, leave_id)
    return success_response(data=_dump(leave), message="请假申请已取消")


@router.post("/{leave_id}/approve", dependencies=[Depends(require_manager_or_above)])
def approve_leave(
    leave_id: int,
    payload: LeaveDecisionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    leave = leave_service.approve_leave(db, current_user, leave_id, payload.comment)
    return success_response(data=_dump(leave), message="请假申请已批准")


@router.post("/{leave_id}/reject", dependencies=[Depends(require_manager_or_above)])
def reject_leave(
    leave_id: int,
    payload: LeaveDecisionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    leave = leave_service.reject_leave(db, current_user, leave_id, payload.comment)
    return success_response(data=_dump(leave), message="请假申请已拒绝")
