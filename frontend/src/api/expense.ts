import api from './client'
import type { ExpenseClaimOut } from './types'

export interface ExpenseClaimCreatePayload {
  title: string
  category: string
  amount: number
  expense_date: string
  description?: string
}

export interface ExpenseDecisionPayload {
  comment?: string
}

export interface ExpenseInvoiceUploadPayload {
  file: File
  invoice_no?: string
  amount?: number
}

export const expenseApi = {
  mine: () => api.get<ExpenseClaimOut[]>('/expenses/mine'),
  list: (params?: { status?: string; user_id?: number }) => api.get<ExpenseClaimOut[]>('/expenses', { params }),
  create: (payload: ExpenseClaimCreatePayload) => api.post<ExpenseClaimOut>('/expenses', payload),
  uploadInvoice: (claimId: number, payload: ExpenseInvoiceUploadPayload) => {
    const formData = new FormData()
    formData.append('file', payload.file)
    if (payload.invoice_no) formData.append('invoice_no', payload.invoice_no)
    if (payload.amount !== undefined) formData.append('amount', String(payload.amount))
    return api.post<ExpenseClaimOut>(`/expenses/${claimId}/invoices`, formData)
  },
  removeInvoice: (invoiceId: number) => api.delete<ExpenseClaimOut>(`/expenses/invoices/${invoiceId}`),
  cancel: (id: number) => api.post<ExpenseClaimOut>(`/expenses/${id}/cancel`),
  approve: (id: number, payload: ExpenseDecisionPayload) => api.post<ExpenseClaimOut>(`/expenses/${id}/approve`, payload),
  reject: (id: number, payload: ExpenseDecisionPayload) => api.post<ExpenseClaimOut>(`/expenses/${id}/reject`, payload),
  markPaid: (id: number) => api.post<ExpenseClaimOut>(`/expenses/${id}/mark-paid`),
}
