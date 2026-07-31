import { create } from 'zustand'
import type { UserOut } from '../api/types'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: UserOut | null
  setAuth: (tokens: { accessToken: string; refreshToken?: string }, user: UserOut) => void
  setAccessToken: (accessToken: string) => void
  setUser: (user: UserOut) => void
  logout: () => void
}

const STORAGE_ACCESS_KEY = 'my_company_access_token'
const STORAGE_REFRESH_KEY = 'my_company_refresh_token'
const STORAGE_USER_KEY = 'my_company_user'

function loadInitialUser(): UserOut | null {
  const raw = localStorage.getItem(STORAGE_USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as UserOut
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: localStorage.getItem(STORAGE_ACCESS_KEY),
  refreshToken: localStorage.getItem(STORAGE_REFRESH_KEY),
  user: loadInitialUser(),
  setAuth: ({ accessToken, refreshToken }, user) => {
    localStorage.setItem(STORAGE_ACCESS_KEY, accessToken)
    if (refreshToken) {
      localStorage.setItem(STORAGE_REFRESH_KEY, refreshToken)
    }
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user))
    set({ accessToken, refreshToken: refreshToken ?? null, user })
  },
  setAccessToken: (accessToken) => {
    localStorage.setItem(STORAGE_ACCESS_KEY, accessToken)
    set({ accessToken })
  },
  setUser: (user) => {
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user))
    set({ user })
  },
  logout: () => {
    localStorage.removeItem(STORAGE_ACCESS_KEY)
    localStorage.removeItem(STORAGE_REFRESH_KEY)
    localStorage.removeItem(STORAGE_USER_KEY)
    set({ accessToken: null, refreshToken: null, user: null })
  },
}))

export function getRoleCodes(user: UserOut | null): string[] {
  return user?.roles.map((role) => role.code) ?? []
}

export function hasAnyRole(user: UserOut | null, ...codes: string[]): boolean {
  if (!user) return false
  if (user.is_superuser) return true
  const roleCodes = getRoleCodes(user)
  return codes.some((code) => roleCodes.includes(code))
}

export function isAdmin(user: UserOut | null): boolean {
  return hasAnyRole(user, 'admin')
}

export function isHrOrAdmin(user: UserOut | null): boolean {
  return hasAnyRole(user, 'admin', 'hr')
}

export function isManagerOrAbove(user: UserOut | null): boolean {
  return hasAnyRole(user, 'admin', 'hr', 'manager')
}
