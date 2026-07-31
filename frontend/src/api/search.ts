import api from './client'

export interface SearchResultItem {
  type: string
  id: number
  title: string
  subtitle?: string | null
  link: string
}

export const searchApi = {
  search: (q: string) => api.get<SearchResultItem[]>('/search', { params: { q } }),
}
