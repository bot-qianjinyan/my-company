import api from './client'
import type { AnnualLeaveBalance, LeaveRequestOut } from './types'

export interface LeaveCreatePayload {
  leave_type: string
  start_date: string
  end_date: string
  days: number
  reason?: string
}

export interface LeaveDecisionPayload {
  comment?: string
}

export const leaveApi = {
  balance: () => api.get<AnnualLeaveBalance>('/leaves/balance'),
  mine: () => api.get<LeaveRequestOut[]>('/leaves/mine'),
  list: (params?: { status?: string; user_id?: number }) => api.get<LeaveRequestOut[]>('/leaves', { params }),
  create: (payload: LeaveCreatePayload) => api.post<LeaveRequestOut>('/leaves', payload),
  cancel: (id: number) => api.post<LeaveRequestOut>(`/leaves/${id}/cancel`),
  approve: (id: number, payload: LeaveDecisionPayload) => api.post<LeaveRequestOut>(`/leaves/${id}/approve`, payload),
  reject: (id: number, payload: LeaveDecisionPayload) => api.post<LeaveRequestOut>(`/leaves/${id}/reject`, payload),
}
