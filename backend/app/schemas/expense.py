from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class ExpenseUserBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    display_name: str


class ExpenseInvoiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    file_name: str
    file_url: str
    invoice_no: str | None = None
    amount: float | None = None
    created_at: datetime


class ExpenseClaimOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    category: str
    amount: float
    expense_date: date
    description: str | None = None
    status: str
    approve_comment: str | None = None
    approved_at: datetime | None = None
    paid_at: datetime | None = None
    created_at: datetime
    user: ExpenseUserBrief
    approver: ExpenseUserBrief | None = None
    invoices: list[ExpenseInvoiceOut] = Field(default_factory=list)


class ExpenseClaimCreate(BaseModel):
    title: str
    category: str
    amount: float
    expense_date: date
    description: str | None = None


class ExpenseDecisionRequest(BaseModel):
    comment: str | None = None
