/**
 * User Management — React Query hooks.
 *
 * Conventions:
 * - Query hooks  → useX()     — read-only, cached, auto-refetched
 * - Mutation hooks → useXY()  — write, invalidates related queries on success
 * - All success/error toasts live here, not in components
 * - Query key factory (USER_KEYS) is the single source of truth for cache keys
 *
 * Every hook is strongly typed:  the component receives T, not any.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { usersApi } from '../api'
import type {
  User,
  UserDetail,
  UserStats,
  UserAuditLog,
  PaginatedResponse,
  UserFilters,
  CreateUserPayload,
  UpdateUserPayload,
  ChangePasswordPayload,
} from '../types'

// ─── Query key factory ────────────────────────────────────────────────────────
//
// Centralised key definitions keep cache invalidation predictable:
//   invalidateQueries({ queryKey: USER_KEYS.all })
//   → clears every users-related entry in the cache.
//
//   invalidateQueries({ queryKey: USER_KEYS.detail(3) })
//   → clears only the cached detail for user #3.

export const USER_KEYS = {
  /** Root key — invalidating this clears ALL users cache. */
  all:     ['users'] as const,

  /** List queries, optionally scoped by serialised filter params. */
  lists:   ()                  => [...USER_KEYS.all, 'list']            as const,
  list:    (f: UserFilters)    => [...USER_KEYS.lists(), f]             as const,

  /** Stats */
  stats:   ()                  => [...USER_KEYS.all, 'stats']           as const,

  /** Single user detail */
  details: ()                  => [...USER_KEYS.all, 'detail']          as const,
  detail:  (id: number)        => [...USER_KEYS.details(), id]          as const,

  /** Audit log for a user, optionally scoped by action filter */
  audits:  ()                  => [...USER_KEYS.all, 'audit']           as const,
  audit:   (id: number)        => [...USER_KEYS.audits(), id]           as const,
} as const

// ─── Helper: extract DRF field error message ──────────────────────────────────
//
// The backend returns errors in the shape:
//   { success: false, error: { code, message, details: { field: [msg] } } }
//
// We want the most useful human-readable string for the toast.

function extractErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { error?: { message?: string; details?: Record<string, string[]> } } } })
    ?.response?.data?.error

  if (!data) return fallback

  // Prefer field-level detail (first one found)
  if (data.details) {
    const firstField = Object.values(data.details)[0]
    if (Array.isArray(firstField) && firstField.length > 0) {
      return firstField[0]
    }
  }

  return data.message ?? fallback
}

// ─── Read hooks ───────────────────────────────────────────────────────────────

/**
 * Fetches the paginated user list.
 *
 * @param filters  Passed as query params to the backend.
 *                 The query re-fetches automatically when filters change.
 *
 * @example
 *   const { data, isLoading } = useUsers({ role: 'recruiter', is_active: 'true' })
 *   data?.results  // User[]
 *   data?.count    // total matching users
 */
export function useUsers(filters: UserFilters = {}) {
  return useQuery<PaginatedResponse<User>>({
    queryKey: USER_KEYS.list(filters),
    queryFn:  () => usersApi.list(filters).then(r => r.data),
    // Keep stale data visible while re-fetching (no flicker on filter change)
    placeholderData: (prev) => prev,
  })
}

/**
 * Fetches full detail for a single user.
 *
 * @param id  User PK.  Pass undefined or 0 to keep the query disabled.
 *
 * @example
 *   const { data, isLoading } = useUserDetail(userId)
 *   data?.data.email
 */
export function useUserDetail(id: number | undefined) {
  return useQuery<{ success: boolean; data: UserDetail }>({
    queryKey: USER_KEYS.detail(id!),
    queryFn:  () => usersApi.detail(id!).then(r => r.data),
    enabled:  !!id,
  })
}

/**
 * Fetches aggregate user statistics.
 *
 * @example
 *   const { data } = useUserStats()
 *   data?.data.total_users
 */
export function useUserStats() {
  return useQuery<{ success: boolean; data: UserStats }>({
    queryKey: USER_KEYS.stats(),
    queryFn:  () => usersApi.stats().then(r => r.data),
    // Stats don't change often — keep for 2 minutes before going stale
    staleTime: 2 * 60 * 1_000,
  })
}

/**
 * Fetches the paginated audit log for a specific user.
 *
 * @param userId      Target user PK.
 * @param actionFilter  Optional action type to filter log entries.
 * @param page          Page number (1-indexed).
 *
 * @example
 *   const { data } = useUserAuditLog(3)
 *   data?.results  // UserAuditLog[]
 */
export function useUserAuditLog(
  userId: number | undefined,
  actionFilter?: string,
  page = 1,
) {
  return useQuery<PaginatedResponse<UserAuditLog>>({
    queryKey: [...USER_KEYS.audit(userId!), { actionFilter, page }],
    queryFn: () =>
      usersApi
        .auditLog(userId!, { action: actionFilter, page })
        .then(r => r.data),
    enabled: !!userId,
  })
}

// ─── Mutation hooks ───────────────────────────────────────────────────────────

/**
 * Creates a new user account.
 *
 * On success: invalidates the user list and stats.
 *
 * @example
 *   const { mutateAsync, isPending } = useCreateUser()
 *   await mutateAsync({ email, password, first_name, last_name, role })
 */
export function useCreateUser() {
  const qc = useQueryClient()

  return useMutation<{ success: boolean; data: UserDetail }, unknown, CreateUserPayload>({
    mutationFn: (payload) => usersApi.create(payload).then(r => r.data),

    onSuccess: (res) => {
      toast.success(`User "${res.data.full_name}" created successfully.`)
      qc.invalidateQueries({ queryKey: USER_KEYS.lists() })
      qc.invalidateQueries({ queryKey: USER_KEYS.stats() })
    },

    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Failed to create user.'))
    },
  })
}

/**
 * Partially updates a user's profile.
 *
 * On success: updates the detail cache for that user and invalidates the list.
 *
 * @example
 *   const { mutateAsync } = useUpdateUser()
 *   await mutateAsync({ id: 5, payload: { first_name: 'Alice' } })
 */
export function useUpdateUser() {
  const qc = useQueryClient()

  return useMutation<
    { success: boolean; data: UserDetail },
    unknown,
    { id: number; payload: UpdateUserPayload }
  >({
    mutationFn: ({ id, payload }) => usersApi.update(id, payload).then(r => r.data),

    onSuccess: (res, { id }) => {
      toast.success('User profile updated successfully.')
      // Update the detail entry directly so the UI reflects immediately
      qc.setQueryData(USER_KEYS.detail(id), res)
      qc.invalidateQueries({ queryKey: USER_KEYS.lists() })
    },

    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Failed to update user.'))
    },
  })
}

/**
 * Admin force-sets a user's password.
 *
 * On success: shows a warning-style toast (the user is now logged out everywhere).
 *
 * @example
 *   const { mutateAsync } = useChangePassword()
 *   await mutateAsync({ id: 5, payload: { new_password: 'Str0ng!Pass' } })
 */
export function useChangePassword() {
  const qc = useQueryClient()

  return useMutation<
    { success: boolean; message: string },
    unknown,
    { id: number; payload: ChangePasswordPayload }
  >({
    mutationFn: ({ id, payload }) =>
      usersApi.changePassword(id, payload).then(r => r.data),

    onSuccess: (_res, { id }) => {
      toast.success('Password changed. The user has been logged out of all devices.')
      // Invalidate audit log — a new password_changed entry was created
      qc.invalidateQueries({ queryKey: USER_KEYS.audit(id) })
    },

    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Failed to change password.'))
    },
  })
}

/**
 * Toggles a user's is_active status (activate ↔ deactivate).
 *
 * On deactivation, the backend blacklists all of the user's refresh tokens.
 * On success: updates the detail cache and invalidates the list + stats.
 *
 * @example
 *   const { mutate } = useToggleUser()
 *   mutate(5)   // toggles user #5
 */
export function useToggleUser() {
  const qc = useQueryClient()

  return useMutation<
    { success: boolean; message: string; data: UserDetail },
    unknown,
    number  // user id
  >({
    mutationFn: (id) =>
      usersApi.toggleActive(id).then(r => r.data as { success: boolean; message: string; data: UserDetail }),

    onSuccess: (res, id) => {
      const action = res.data.is_active ? 'activated' : 'deactivated'
      toast.success(`Account ${action} successfully.`)
      qc.setQueryData(USER_KEYS.detail(id), { success: true, data: res.data })
      qc.invalidateQueries({ queryKey: USER_KEYS.lists() })
      qc.invalidateQueries({ queryKey: USER_KEYS.stats() })
      qc.invalidateQueries({ queryKey: USER_KEYS.audit(id) })
    },

    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Failed to update account status.'))
    },
  })
}

/**
 * Bulk updates multiple users (activate or deactivate).
 * Runs sequential calls to the individual toggle endpoint.
 *
 * @example
 *   const { mutate } = useBulkToggleUsers()
 *   mutate({ ids: [1, 2, 3], action: 'activate' })
 */
export function useBulkToggleUsers() {
  const qc = useQueryClient()

  return useMutation<
    { successCount: number; failCount: number },
    unknown,
    { ids: number[]; action: 'activate' | 'deactivate' }
  >({
    mutationFn: async ({ ids, action }) => {
      let successCount = 0
      let failCount    = 0

      // Run sequentially to avoid rate-limit / DB lock issues in simple setups
      for (const id of ids) {
        try {
          const res = await usersApi.detail(id)
          const user = res.data.data
          // Only toggle if status doesn't match target action
          if ((action === 'activate' && !user.is_active) || (action === 'deactivate' && user.is_active)) {
            await usersApi.toggleActive(id)
          }
          successCount++
        } catch (err) {
          failCount++
        }
      }
      return { successCount, failCount }
    },

    onSuccess: (res, { action }) => {
      const verb = action === 'activate' ? 'activated' : 'deactivated'
      if (res.failCount === 0) {
        toast.success(`Successfully ${verb} ${res.successCount} users.`)
      } else {
        toast.success(`${res.successCount} users ${verb}. ${res.failCount} failed.`)
      }
      qc.invalidateQueries({ queryKey: USER_KEYS.all })
    },

    onError: () => {
      toast.error('Bulk action failed.')
    },
  })
}

/**
 * Legacy alias — UsersManagePage (placeholder) imports useDeleteUser.
 * Maps to useToggleUser until that page is replaced in the next step.
 * @deprecated Use useToggleUser() directly.
 */
export const useDeleteUser = useToggleUser
