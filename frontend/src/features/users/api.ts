/**
 * User Management — API call layer.
 *
 * Rules:
 * - Every function returns the Axios promise directly.
 *   Callers (hooks) handle loading, error, and success states.
 * - All payloads and responses are typed via types.ts.
 * - No try/catch here — errors propagate to React Query's onError.
 * - Endpoint URLs come exclusively from USERS_ENDPOINTS — never hardcoded.
 */
import client from '@/api/client'
import { USERS_ENDPOINTS } from '@/api/endpoints'
import type {
  User,
  UserDetail,
  UserStats,
  UserAuditLog,
  CreateUserPayload,
  UpdateUserPayload,
  ChangePasswordPayload,
  PaginatedResponse,
  UserFilters,
} from './types'

// ─── Wrapper type for typed Axios responses ───────────────────────────────────

/** Backend success envelope: { success: true, data: T } */
type ApiResponse<T> = { success: boolean; data: T }

// ─── API surface ──────────────────────────────────────────────────────────────

export const usersApi = {
  /**
   * GET /api/v1/users/
   * Returns a paginated list of all users.
   * Accepts standard filter params (role, is_active, search, ordering, page).
   */
  list: (filters?: UserFilters) =>
    client.get<PaginatedResponse<User>>(USERS_ENDPOINTS.LIST, {
      params: filters,
    }),

  /**
   * GET /api/v1/users/stats/
   * Returns aggregate user statistics for the admin dashboard.
   */
  stats: () =>
    client.get<ApiResponse<UserStats>>(USERS_ENDPOINTS.STATS),

  /**
   * GET /api/v1/users/<id>/
   * Returns full detail for a single user.
   */
  detail: (id: number) =>
    client.get<ApiResponse<UserDetail>>(USERS_ENDPOINTS.DETAIL(id)),

  /**
   * POST /api/v1/users/
   * Admin creates a new user account.
   */
  create: (payload: CreateUserPayload) =>
    client.post<ApiResponse<UserDetail>>(USERS_ENDPOINTS.LIST, payload),

  /**
   * PATCH /api/v1/users/<id>/
   * Partial update — only the fields included in the payload are changed.
   */
  update: (id: number, payload: UpdateUserPayload) =>
    client.patch<ApiResponse<UserDetail>>(USERS_ENDPOINTS.DETAIL(id), payload),

  /**
   * PATCH /api/v1/users/<id>/password/
   * Admin force-sets a user's password.
   * Side effect: all of the user's refresh tokens are blacklisted.
   */
  changePassword: (id: number, payload: ChangePasswordPayload) =>
    client.patch<{ success: boolean; message: string }>(
      USERS_ENDPOINTS.PASSWORD(id),
      payload,
    ),

  /**
   * PATCH /api/v1/users/<id>/toggle-active/
   * Flips is_active.  No request body required.
   * On deactivation, all refresh tokens are blacklisted (forced logout).
   */
  toggleActive: (id: number) =>
    client.patch<ApiResponse<UserDetail>>(USERS_ENDPOINTS.TOGGLE_ACTIVE(id)),

  /**
   * GET /api/v1/users/<id>/audit-log/
   * Paginated audit event history for a specific user.
   * Optional ?action=<action_type> filter.
   */
  auditLog: (id: number, params?: { action?: string; page?: number; page_size?: number }) =>
    client.get<PaginatedResponse<UserAuditLog>>(USERS_ENDPOINTS.AUDIT_LOG(id), {
      params,
    }),
}
