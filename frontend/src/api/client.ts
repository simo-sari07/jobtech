/**
 * Axios client with JWT interceptors.
 *
 * Strategy:
 * - Access token stored in memory (authStore) — never in localStorage.
 * - Refresh token lives in httpOnly cookie — handled server-side automatically.
 * - On 401: pause all requests, refresh once, replay queue.
 * - On refresh failure: clear auth state and redirect to /login.
 */
import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios'
import { AUTH_ENDPOINTS } from './endpoints'

// ─── Create instance ─────────────────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: '/',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,   // Always send cookies (refresh token)
  timeout: 10_000,
})

// ─── Token refresh state ──────────────────────────────────────────────────────
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token!)
  })
  failedQueue = []
}

/**
 * Lazy store getters — avoids circular import (store imports apiClient).
 * We read from the zustand store at call-time, not at module import time.
 */
function getAccessToken(): string | null {
  // Dynamic import-style: access window-scoped store reference set at boot
  const store = (window as unknown as { __authStore?: { getState: () => { accessToken: string | null; setAccessToken: (t: string) => void; clearAuth: () => void } } }).__authStore
  return store?.getState().accessToken ?? null
}

function setAccessToken(token: string): void {
  const store = (window as unknown as { __authStore?: { getState: () => { setAccessToken: (t: string) => void } } }).__authStore
  store?.getState().setAccessToken(token)
}

function clearAuth(): void {
  const store = (window as unknown as { __authStore?: { getState: () => { clearAuth: () => void } } }).__authStore
  store?.getState().clearAuth()
}

// ─── Request interceptor — attach access token + fix FormData Content-Type ───
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // When sending FormData (file uploads), remove the Content-Type header
    // so the browser sets it automatically with the correct multipart boundary.
    // Without this, the instance default 'application/json' is sent, breaking file uploads.
    if (config.data instanceof FormData && config.headers) {
      config.headers.set('Content-Type', false as any)
    }
    return config
  },
  (error) => Promise.reject(error),
)

// ─── Response interceptor — handle 401 + auto-refresh ────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }

    // Only intercept 401 errors on non-refresh endpoints
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes(AUTH_ENDPOINTS.TOKEN_REFRESH)
    ) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      // Queue subsequent requests while refresh is in flight
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`
        return apiClient(originalRequest)
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const { data } = await apiClient.post(AUTH_ENDPOINTS.TOKEN_REFRESH)
      const newAccessToken = data?.data?.access_token

      setAccessToken(newAccessToken)
      processQueue(null, newAccessToken)

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
      return apiClient(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)
      clearAuth()
      window.location.replace('/login')
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

export default apiClient
