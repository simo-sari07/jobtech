/**
 * User Management — TypeScript types.
 *
 * These types mirror the backend serializer output exactly.
 * If a backend field changes, update here first, then fix any
 * resulting TypeScript errors across the feature.
 *
 * Import pattern:
 *   import type { User, UserStats, UserAuditLog } from '@/features/users/types'
 */

import type { Role } from '@/utils/constants'

// ─── Online status ────────────────────────────────────────────────────────────

/** Three-state online indicator derived from last_activity. */
export type OnlineStatus = 'online' | 'away' | 'offline'

// ─── Core user types ──────────────────────────────────────────────────────────

/**
 * Lightweight user shape returned by the list endpoint.
 * Used in tables, dropdowns, and anywhere a summary is enough.
 */
export interface User {
  id:            number
  email:         string
  first_name:    string
  last_name:     string
  full_name:     string
  role:          Role
  is_active:     boolean
  is_online:     boolean
  online_status: OnlineStatus
  /** ISO 8601 datetime string | null */
  last_activity: string | null
  /** ISO 8601 datetime string */
  date_joined:   string
}

/**
 * Full user detail — returned by GET /users/<id>/.
 * Extends User with optional profile fields.
 */
export interface UserDetail extends User {
  phone:  string | null
  avatar: string | null
}

// ─── Payloads (request bodies) ────────────────────────────────────────────────

export interface CreateUserPayload {
  email:      string
  password:   string
  first_name: string
  last_name:  string
  role:       Role
  phone?:     string | null
}

export interface UpdateUserPayload {
  first_name?: string
  last_name?:  string
  email?:      string
  role?:       Role
  phone?:      string | null
}

export interface ChangePasswordPayload {
  new_password: string
}

// ─── Stats ────────────────────────────────────────────────────────────────────

/**
 * Returned by GET /users/stats/.
 * Powers the 4 stat cards at the top of the User Management page.
 */
export interface UserStats {
  total_users:    number
  active_users:   number
  inactive_users: number
  by_role:        Record<Role, number>
}

// ─── Audit log ────────────────────────────────────────────────────────────────

export type AuditAction =
  | 'created'
  | 'updated'
  | 'password_changed'
  | 'activated'
  | 'deactivated'
  | 'deleted'
  | 'role_changed'
  | 'login'
  | 'logout'
  | 'failed_login'

/** Human-readable labels for audit action codes. */
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  created:          'Account Created',
  updated:          'Profile Updated',
  password_changed: 'Password Changed',
  activated:        'Account Activated',
  deactivated:      'Account Deactivated',
  deleted:          'Account Deleted',
  role_changed:     'Role Changed',
  login:            'Logged In',
  logout:           'Logged Out',
  failed_login:     'Failed Login Attempt',
}

export interface UserAuditLog {
  /** UUID string */
  id:              string
  action:          AuditAction
  /** "Full Name <email>" or null if the actor's account was deleted */
  actor_display:   string | null
  /** "Full Name <email>" or null if the subject's account was deleted */
  subject_display: string | null
  ip_address:      string | null
  /** Arbitrary before/after snapshot — never contains passwords */
  metadata:        Record<string, unknown> | null
  /** ISO 8601 datetime string */
  created_at:      string
}

// ─── Paginated API response shape ─────────────────────────────────────────────

/**
 * Standard paginated envelope returned by the backend.
 * Matches StandardResultsPagination in core/pagination.py.
 */
export interface PaginatedResponse<T> {
  success:  boolean
  count:    number
  next:     string | null
  previous: string | null
  results:  T[]
}

// ─── User list filter params ──────────────────────────────────────────────────

export interface UserFilters {
  role?:      Role | ''
  is_active?: 'true' | 'false' | ''
  search?:    string
  ordering?:  string
  page?:      number
  page_size?: number
}
