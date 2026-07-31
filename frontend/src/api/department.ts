import api from './client'
import type { DepartmentOut, DepartmentTreeNode } from './types'

export interface DepartmentPayload {
  name: string
  parent_id?: number | null
  leader_id?: number | null
  sort_order?: number
}

export const departmentApi = {
  list: () => api.get<DepartmentOut[]>('/departments'),
  tree: () => api.get<DepartmentTreeNode[]>('/departments/tree'),
  create: (payload: DepartmentPayload) => api.post<DepartmentOut>('/departments', payload),
  update: (id: number, payload: Partial<DepartmentPayload>) => api.put<DepartmentOut>(`/departments/${id}`, payload),
  remove: (id: number) => api.delete<null>(`/departments/${id}`),
}
