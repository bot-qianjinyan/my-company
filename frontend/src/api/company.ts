import api from './client'
import type { AnnouncementOut, CompanyInfoOut } from './types'

export interface CompanyInfoUpdatePayload {
  name?: string
  slogan?: string
  description?: string
  logo_url?: string
  address?: string
  website?: string
  founded_date?: string
}

export interface AnnouncementCreatePayload {
  title: string
  content: string
  pinned?: boolean
}

export const companyApi = {
  getInfo: () => api.get<CompanyInfoOut | null>('/company/info'),
  updateInfo: (payload: CompanyInfoUpdatePayload) => api.put<CompanyInfoOut>('/company/info', payload),
  listAnnouncements: () => api.get<AnnouncementOut[]>('/company/announcements'),
  createAnnouncement: (payload: AnnouncementCreatePayload) =>
    api.post<AnnouncementOut>('/company/announcements', payload),
  deleteAnnouncement: (id: number) => api.delete<null>(`/company/announcements/${id}`),
}
