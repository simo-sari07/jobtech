/**
 * useAuth — global auth hook.
 * Thin wrapper over authStore + session bootstrap logic.
 */
import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import apiClient from '@/api/client'
import { AUTH_ENDPOINTS } from '@/api/endpoints'

export function useAuth() {
  const { user, isAuthenticated, isLoading, setAuth, clearAuth, setLoading } =
    useAuthStore()

  /**
   * On app boot: try to restore the session by hitting /me with the
   * refresh token cookie. If the cookie is valid, the server will issue
   * a new access token and we can restore state silently.
   */
  useEffect(() => {
    let cancelled = false

    async function restoreSession() {
      try {
        // First try to refresh — our interceptor will use the cookie
        const refreshRes = await apiClient.post(AUTH_ENDPOINTS.TOKEN_REFRESH)
        const newToken = refreshRes.data?.data?.access_token
        useAuthStore.getState().setAccessToken(newToken)

        // Then fetch user profile
        const meRes = await apiClient.get(AUTH_ENDPOINTS.ME)
        if (!cancelled) {
          setAuth(meRes.data.data, newToken)
        }
      } catch {
        if (!cancelled) {
          clearAuth()
        }
      }
    }

    restoreSession()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { user, isAuthenticated, isLoading }
}
