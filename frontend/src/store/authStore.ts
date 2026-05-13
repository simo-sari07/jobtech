/**
 * Auth Store (Zustand)
 *
 * Stores:
 *   - user profile (name, email, role)
 *   - accessToken in MEMORY (not localStorage — prevents XSS token theft)
 *   - authentication state
 *
 * The store is registered on window.__authStore so the Axios interceptor
 * can read it without a circular import.
 */
import { create } from 'zustand'
import type { Role } from '@/utils/constants'

export interface UserProfile {
  id: number
  email: string
  first_name: string
  last_name: string
  full_name: string
  role: Role
  phone: string | null
  avatar_url: string | null
  is_active: boolean
  date_joined: string
}

interface AuthState {
  user:          UserProfile | null
  accessToken:   string | null
  isAuthenticated: boolean
  isLoading:     boolean     // true while checking session on app boot
}

interface AuthActions {
  setAuth:        (user: UserProfile, token: string) => void
  setAccessToken: (token: string) => void
  clearAuth:      () => void
  setLoading:     (loading: boolean) => void
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  // ─── State ─────────────────────────────────────────────────────────────────
  user:            null,
  accessToken:     null,
  isAuthenticated: false,
  isLoading:       true,    // Start loading until boot check completes

  // ─── Actions ───────────────────────────────────────────────────────────────
  setAuth: (user, token) => set({
    user,
    accessToken:     token,
    isAuthenticated: true,
    isLoading:       false,
  }),

  setAccessToken: (token) => set({ accessToken: token }),

  clearAuth: () => set({
    user:            null,
    accessToken:     null,
    isAuthenticated: false,
    isLoading:       false,
  }),

  setLoading: (loading) => set({ isLoading: loading }),
}))

// Register store on window so the Axios interceptor can access it
// without creating a circular module dependency
;(window as unknown as Record<string, unknown>).__authStore = useAuthStore
