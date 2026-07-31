from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_hr_or_admin, require_manager_or_above
from app.core.database import get_db
from app.models import ExpenseClaim, User
from app.schemas.common import success_response
from app.schemas.expense import ExpenseClaimCreate, ExpenseClaimOut, ExpenseDecisionRequest
from app.services import expense_service

router = APIRouter(prefix="/expenses", tags=["报销"])


def _dump(claim: ExpenseClaim) -> dict:
    return ExpenseClaimOut.model_validate(claim).model_dump(mode="json")


@router.get("/mine")
def get_my_claims(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    claims = expense_service.list_my_claims(db, current_user)
    return success_response(data=[_dump(item) for item in claims])


@router.get("", dependencies=[Depends(require_manager_or_above)])
def get_claims(
    status: str | None = Query(default=None),
    user_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
) -> dict:
    claims = expense_service.list_claims(db, status=status, user_id=user_id)
    return success_response(data=[_dump(item) for item in claims])


@router.post("")
def submit_claim(
    payload: ExpenseClaimCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    claim = expense_service.create_claim(db, current_user, payload)
    return success_response(data=_dump(claim), message="报销申请已提交")


@router.post("/{claim_id}/invoices")
async def upload_invoice(
    claim_id: int,
    file: UploadFile = File(...),
    invoice_no: str | None = Form(default=None),
    amount: float | None = Form(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    claim = await expense_service.add_invoice(db, current_user, claim_id, file, invoice_no, amount)
    return success_response(data=_dump(claim), message="发票已上传")


@router.delete("/invoices/{invoice_id}")
def delete_invoice(
    invoice_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    claim = expense_service.remove_invoice(db, current_user, invoice_id)
    return success_response(data=_dump(claim), message="发票已删除")


@router.post("/{claim_id}/cancel")
def cancel_claim(
    claim_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    claim = expense_service.cancel_claim(db, current_user, claim_id)
    return success_response(data=_dump(claim), message="报销申请已取消")


@router.post("/{claim_id}/approve", dependencies=[Depends(require_manager_or_above)])
def approve_claim(
    claim_id: int,
    payload: ExpenseDecisionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    claim = expense_service.approve_claim(db, current_user, claim_id, payload.comment)
    return success_response(data=_dump(claim), message="报销申请已批准")


@router.post("/{claim_id}/reject", dependencies=[Depends(require_manager_or_above)])
def reject_claim(
    claim_id: int,
    payload: ExpenseDecisionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    claim = expense_service.reject_claim(db, current_user, claim_id, payload.comment)
    return success_response(data=_dump(claim), message="报销申请已拒绝")


@router.post("/{claim_id}/mark-paid", dependencies=[Depends(require_hr_or_admin)])
def mark_paid(
    claim_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    claim = expense_service.mark_paid(db, current_user, claim_id)
    return success_response(data=_dump(claim), message="已标记为已付款")
