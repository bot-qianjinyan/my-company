import api from './client'
import type { InboxMailOut, SentMailOut } from './types'

export interface MailCreatePayload {
  subject: string
  content: string
  recipient_ids: number[]
}

export const mailApi = {
  inbox: () => api.get<InboxMailOut[]>('/mails/inbox'),
  sent: () => api.get<SentMailOut[]>('/mails/sent'),
  unreadCount: () => api.get<{ count: number }>('/mails/unread-count'),
  send: (payload: MailCreatePayload) => api.post<SentMailOut>('/mails', payload),
  get: (id: number) => api.get<InboxMailOut | SentMailOut>(`/mails/${id}`),
  remove: (id: number) => api.delete<null>(`/mails/${id}`),
}
