import api from './client'
import type { AttendanceRecordOut, AttendanceRecordWithUserOut } from './types'

export const attendanceApi = {
  today: () => api.get<AttendanceRecordOut | null>('/attendance/today'),
  clockIn: () => api.post<AttendanceRecordOut>('/attendance/clock-in'),
  clockOut: () => api.post<AttendanceRecordOut>('/attendance/clock-out'),
  mine: (params?: { year?: number; month?: number }) =>
    api.get<AttendanceRecordOut[]>('/attendance/mine', { params }),
  team: (params?: { year?: number; month?: number; user_id?: number }) =>
    api.get<AttendanceRecordWithUserOut[]>('/attendance', { params }),
}
