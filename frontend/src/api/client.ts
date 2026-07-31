import axios, { type AxiosError, type AxiosRequestConfig } from 'axios'
import { message } from 'antd'
import { useAuthStore } from '../store/auth'

export interface ApiResponse<T = unknown> {
  success: boolean
  code: number
  message: string
  data: T
}

interface RetryableConfig extends AxiosRequestConfig {
  _retry?: boolean
}

const rawClient = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
})

rawClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

let refreshingPromise: Promise<string | null> | null = null

function isAuthFreeEndpoint(url?: string): boolean {
  return !!url && (url.includes('/auth/login') || url.includes('/auth/refresh'))
}

async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = useAuthStore.getState().refreshToken
  if (!refreshToken) return null

  if (!refreshingPromise) {
    refreshingPromise = axios
      .post<ApiResponse<{ access_token: string }>>('/api/v1/auth/refresh', { refresh_token: refreshToken })
      .then((response) => {
        const newToken = response.data.data.access_token
        useAuthStore.getState().setAccessToken(newToken)
        return newToken
      })
      .catch(() => null)
      .finally(() => {
        refreshingPromise = null
      })
  }
  return refreshingPromise
}

function redirectToLogin(errorMessage: string) {
  useAuthStore.getState().logout()
  message.error(errorMessage)
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

rawClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse>) => {
    const status = error.response?.status
    const serverMessage = error.response?.data?.message
    const originalRequest = error.config as RetryableConfig | undefined

    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthFreeEndpoint(originalRequest.url)) {
      originalRequest._retry = true
      const newToken = await tryRefreshToken()
      if (newToken) {
        originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${newToken}` }
        return rawClient.request(originalRequest)
      }
      redirectToLogin(serverMessage || '登录已过期，请重新登录')
      return Promise.reject(error)
    }

    if (status === 401) {
      redirectToLogin(serverMessage || '登录已过期，请重新登录')
    } else {
      message.error(serverMessage || error.message || '请求失败')
    }
    return Promise.reject(error)
  },
)

async function request<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
  const response = await rawClient.request<ApiResponse<T>>(config)
  return response.data
}

export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) => request<T>({ ...config, method: 'GET', url }),
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'POST', url, data }),
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'PUT', url, data }),
  delete: <T>(url: string, config?: AxiosRequestConfig) => request<T>({ ...config, method: 'DELETE', url }),
}

export default api
