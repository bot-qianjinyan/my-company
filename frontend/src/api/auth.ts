import api from './client'
import type { TokenPair, UserOut } from './types'

export const authApi = {
  login: (username: string, password: string) => api.post<TokenPair>('/auth/login', { username, password }),
  refresh: (refreshToken: string) =>
    api.post<{ access_token: string; token_type: string }>('/auth/refresh', { refresh_token: refreshToken }),
  getMe: () => api.get<UserOut>('/auth/me'),
  changePassword: (oldPassword: string, newPassword: string) =>
    api.post<null>('/auth/change-password', { old_password: oldPassword, new_password: newPassword }),
}
