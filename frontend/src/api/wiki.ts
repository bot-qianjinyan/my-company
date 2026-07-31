import api from './client'
import type { WikiPageOut, WikiSpaceOut } from './types'

export interface WikiSpaceCreatePayload {
  key: string
  name: string
  description?: string
}

export interface WikiSpaceUpdatePayload {
  name?: string
  description?: string
}

export interface WikiPageCreatePayload {
  title: string
  content?: string
  parent_id?: number | null
}

export interface WikiPageUpdatePayload {
  title?: string
  content?: string
  parent_id?: number | null
  sort_order?: number
}

export const wikiApi = {
  listSpaces: () => api.get<WikiSpaceOut[]>('/wiki/spaces'),
  createSpace: (payload: WikiSpaceCreatePayload) => api.post<WikiSpaceOut>('/wiki/spaces', payload),
  updateSpace: (id: number, payload: WikiSpaceUpdatePayload) => api.put<WikiSpaceOut>(`/wiki/spaces/${id}`, payload),
  removeSpace: (id: number) => api.delete<null>(`/wiki/spaces/${id}`),
  listPages: (spaceId: number) => api.get<WikiPageOut[]>(`/wiki/spaces/${spaceId}/pages`),
  createPage: (spaceId: number, payload: WikiPageCreatePayload) =>
    api.post<WikiPageOut>(`/wiki/spaces/${spaceId}/pages`, payload),
  getPage: (pageId: number) => api.get<WikiPageOut>(`/wiki/pages/${pageId}`),
  updatePage: (pageId: number, payload: WikiPageUpdatePayload) =>
    api.put<WikiPageOut>(`/wiki/pages/${pageId}`, payload),
  removePage: (pageId: number) => api.delete<null>(`/wiki/pages/${pageId}`),
}
