from datetime import datetime, timezone

from fastapi import UploadFile
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import AppException, ForbiddenError, NotFoundError
from app.core.storage import delete_invoice_file, save_invoice_file
from app.models import ExpenseClaim, ExpenseInvoice, User
from app.schemas.expense import ExpenseClaimCreate

_WITH_RELATIONS = (
    joinedload(ExpenseClaim.user),
    joinedload(ExpenseClaim.approver),
    joinedload(ExpenseClaim.invoices),
)


def create_claim(db: Session, user: User, payload: ExpenseClaimCreate) -> ExpenseClaim:
    if payload.amount <= 0:
        raise AppException("报销金额必须大于0")

    claim = ExpenseClaim(
        user_id=user.id,
        title=payload.title,
        category=payload.category,
        amount=payload.amount,
        expense_date=payload.expense_date,
        description=payload.description,
    )
    db.add(claim)
    db.commit()
    db.refresh(claim)
    return get_claim_or_404(db, claim.id)


def get_claim_or_404(db: Session, claim_id: int) -> ExpenseClaim:
    claim = db.query(ExpenseClaim).options(*_WITH_RELATIONS).filter(ExpenseClaim.id == claim_id).first()
    if not claim:
        raise NotFoundError("报销记录不存在")
    return claim


def list_my_claims(db: Session, user: User) -> list[ExpenseClaim]:
    return (
        db.query(ExpenseClaim)
        .options(*_WITH_RELATIONS)
        .filter(ExpenseClaim.user_id == user.id)
        .order_by(ExpenseClaim.created_at.desc())
        .all()
    )


def list_claims(db: Session, status: str | None = None, user_id: int | None = None) -> list[ExpenseClaim]:
    query = db.query(ExpenseClaim).options(*_WITH_RELATIONS)
    if status:
        query = query.filter(ExpenseClaim.status == status)
    if user_id is not None:
        query = query.filter(ExpenseClaim.user_id == user_id)
    return query.order_by(ExpenseClaim.created_at.desc()).all()


async def add_invoice(
    db: Session,
    user: User,
    claim_id: int,
    file: UploadFile,
    invoice_no: str | None,
    amount: float | None,
) -> ExpenseClaim:
    claim = get_claim_or_404(db, claim_id)
    if claim.user_id != user.id:
        raise ForbiddenError("只能为自己的报销单上传发票")
    if claim.status != "pending":
        raise AppException("只有待审批的报销单可以添加发票")

    relative_path, original_name = await save_invoice_file(file)
    invoice = ExpenseInvoice(
        claim_id=claim.id,
        file_name=original_name,
        file_path=relative_path,
        invoice_no=invoice_no,
        amount=amount,
    )
    db.add(invoice)
    db.commit()
    return get_claim_or_404(db, claim_id)


def remove_invoice(db: Session, user: User, invoice_id: int) -> ExpenseClaim:
    invoice = db.query(ExpenseInvoice).options(joinedload(ExpenseInvoice.claim)).filter(ExpenseInvoice.id == invoice_id).first()
    if not invoice:
        raise NotFoundError("发票记录不存在")
    claim = invoice.claim
    if claim.user_id != user.id:
        raise ForbiddenError("只能删除自己报销单中的发票")
    if claim.status != "pending":
        raise AppException("只有待审批的报销单可以删除发票")

    delete_invoice_file(invoice.file_path)
    db.delete(invoice)
    db.commit()
    return get_claim_or_404(db, claim.id)


def cancel_claim(db: Session, user: User, claim_id: int) -> ExpenseClaim:
    claim = get_claim_or_404(db, claim_id)
    if claim.user_id != user.id:
        raise ForbiddenError("只能取消自己的报销申请")
    if claim.status != "pending":
        raise AppException("只有待审批的申请才能取消")
    claim.status = "cancelled"
    db.add(claim)
    db.commit()
    db.refresh(claim)
    return claim


def approve_claim(db: Session, approver: User, claim_id: int, comment: str | None) -> ExpenseClaim:
    claim = get_claim_or_404(db, claim_id)
    if claim.status != "pending":
        raise AppException("该申请已被处理，无法重复操作")
    claim.status = "approved"
    claim.approver_id = approver.id
    claim.approve_comment = comment
    claim.approved_at = datetime.now(timezone.utc)
    db.add(claim)
    db.commit()
    db.refresh(claim)
    return claim


def reject_claim(db: Session, approver: User, claim_id: int, comment: str | None) -> ExpenseClaim:
    claim = get_claim_or_404(db, claim_id)
    if claim.status != "pending":
        raise AppException("该申请已被处理，无法重复操作")
    claim.status = "rejected"
    claim.approver_id = approver.id
    claim.approve_comment = comment
    claim.approved_at = datetime.now(timezone.utc)
    db.add(claim)
    db.commit()
    db.refresh(claim)
    return claim


def mark_paid(db: Session, operator: User, claim_id: int) -> ExpenseClaim:
    claim = get_claim_or_404(db, claim_id)
    if claim.status != "approved":
        raise AppException("只有已批准的报销单才能标记为已付款")
    claim.status = "paid"
    claim.paid_at = datetime.now(timezone.utc)
    db.add(claim)
    db.commit()
    db.refresh(claim)
    return claim
