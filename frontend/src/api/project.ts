import api from './client'
import type { IssueOut, ProjectOut } from './types'

export interface ProjectCreatePayload {
  key: string
  name: string
  description?: string
  member_ids?: number[]
}

export interface ProjectUpdatePayload {
  name?: string
  description?: string
  owner_id?: number
  member_ids?: number[]
}

export interface IssueCreatePayload {
  title: string
  description?: string
  issue_type?: string
  priority?: string
  assignee_id?: number | null
  due_date?: string | null
}

export interface IssueUpdatePayload {
  title?: string
  description?: string
  issue_type?: string
  priority?: string
  status?: string
  assignee_id?: number | null
  due_date?: string | null
  sort_order?: number
}

export const projectApi = {
  list: () => api.get<ProjectOut[]>('/projects'),
  myIssues: () => api.get<IssueOut[]>('/projects/issues/mine'),
  get: (id: number) => api.get<ProjectOut>(`/projects/${id}`),
  create: (payload: ProjectCreatePayload) => api.post<ProjectOut>('/projects', payload),
  update: (id: number, payload: ProjectUpdatePayload) => api.put<ProjectOut>(`/projects/${id}`, payload),
  remove: (id: number) => api.delete<null>(`/projects/${id}`),
  listIssues: (projectId: number) => api.get<IssueOut[]>(`/projects/${projectId}/issues`),
  createIssue: (projectId: number, payload: IssueCreatePayload) =>
    api.post<IssueOut>(`/projects/${projectId}/issues`, payload),
  updateIssue: (issueId: number, payload: IssueUpdatePayload) =>
    api.put<IssueOut>(`/projects/issues/${issueId}`, payload),
  removeIssue: (issueId: number) => api.delete<null>(`/projects/issues/${issueId}`),
}
