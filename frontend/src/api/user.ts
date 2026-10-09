import api from './client'
import type { UserOut } from './types'

export interface UserCreatePayload {
  username: string
  password: string
  email?: string
  display_name: string
  phone?: string
  gender?: string
  position?: string
  employee_no?: string
  hire_date?: string
  department_id?: number | null
  role_codes?: string[]
}

export interface UserUpdatePayload {
  email?: string | null
  display_name?: string
  phone?: string | null
  gender?: string | null
  position?: string | null
  employee_no?: string | null
  hire_date?: string | null
  department_id?: number | null
  is_active?: boolean
  role_codes?: string[]
}

export interface ProfileUpdatePayload {
  display_name?: string
  phone?: string | null
  gender?: string | null
}

export const userApi = {
  list: (params?: { department_id?: number; keyword?: string }) => api.get<UserOut[]>('/users', { params }),
  get: (id: number) => api.get<UserOut>(`/users/${id}`),
  create: (payload: UserCreatePayload) => api.post<UserOut>('/users', payload),
  update: (id: number, payload: UserUpdatePayload) => api.put<UserOut>(`/users/${id}`, payload),
  remove: (id: number) => api.delete<null>(`/users/${id}`),
  updateMyProfile: (payload: ProfileUpdatePayload) => api.put<UserOut>('/users/me/profile', payload),
  uploadAvatar: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<UserOut>('/users/me/avatar', formData)
  },
}
