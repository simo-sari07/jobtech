/**
 * All API endpoint URL constants.
 * Single source of truth — never hardcode URLs in components.
 */
export const API_BASE = '/api/v1'

export const AUTH_ENDPOINTS = {
  LOGIN:         `${API_BASE}/auth/login/`,
  REGISTER:      `${API_BASE}/auth/register/`,
  LOGOUT:        `${API_BASE}/auth/logout/`,
  ME:            `${API_BASE}/auth/me/`,
  ME_AVATAR:     `${API_BASE}/auth/me/avatar/`,
  TOKEN_REFRESH: `${API_BASE}/auth/token/refresh/`,
} as const

export const JOBS_ENDPOINTS = {
  LIST:   `${API_BASE}/jobs/offers/`,
  DETAIL: (id: number | string) => `${API_BASE}/jobs/offers/${id}/`,
  SKILLS: `${API_BASE}/jobs/skills/`,
} as const

export const APPLICATIONS_ENDPOINTS = {
  LIST:         `${API_BASE}/applications/`,
  MINE:         `${API_BASE}/applications/mine/`,
  DETAIL:       (id: number | string) => `${API_BASE}/applications/${id}/`,
  STATUS:       (id: number | string) => `${API_BASE}/applications/${id}/`,
  ARCHIVE:      (id: number | string) => `${API_BASE}/applications/${id}/archive/`,
  UNARCHIVE:    (id: number | string) => `${API_BASE}/applications/${id}/unarchive/`,
  WITHDRAW:     (id: number | string) => `${API_BASE}/applications/${id}/withdraw/`,
  AUDIT_LOG:    (id: number | string) => `${API_BASE}/applications/${id}/audit-log/`,
  BULK_STATUS:  `${API_BASE}/applications/bulk-status/`,
  BULK_ARCHIVE: `${API_BASE}/applications/bulk-archive/`,
  BULK_DELETE:  `${API_BASE}/applications/bulk-delete/`,
} as const

export const PUBLIC_ENDPOINTS = {
  JOBS:       `${API_BASE}/public/jobs/`,
  JOB_DETAIL: (slug: string) => `${API_BASE}/public/jobs/${slug}/`,
} as const

export const USERS_ENDPOINTS = {
  /** GET (paginated list) + POST (create) */
  LIST:          `${API_BASE}/users/`,

  /** GET /users/stats/ — aggregate counts for the dashboard */
  STATS:         `${API_BASE}/users/stats/`,

  /** GET + PATCH /users/<id>/ */
  DETAIL:        (id: number | string) => `${API_BASE}/users/${id}/`,

  /** PATCH /users/<id>/password/ — admin force-sets password */
  PASSWORD:      (id: number | string) => `${API_BASE}/users/${id}/password/`,

  /** PATCH /users/<id>/toggle-active/ — activate / deactivate */
  TOGGLE_ACTIVE: (id: number | string) => `${API_BASE}/users/${id}/toggle-active/`,

  /** GET /users/<id>/audit-log/ — paginated audit history */
  AUDIT_LOG:     (id: number | string) => `${API_BASE}/users/${id}/audit-log/`,
} as const

export const INTERVIEWS_ENDPOINTS = {
  LIST:       `${API_BASE}/interviews/`,
  DETAIL:     (id: number | string) => `${API_BASE}/interviews/${id}/`,
  EVALUATE:   (id: number | string) => `${API_BASE}/interviews/${id}/evaluate/`,
  EVALUATION: (id: number | string) => `${API_BASE}/interviews/${id}/evaluation/`,
  DELETE:     (id: number | string) => `${API_BASE}/interviews/${id}/`,
} as const

export const AI_ENDPOINTS = {
  /** GET ?offer_id=N&status=X&min_score=Y → ranked pipeline for one offer */
  PIPELINE: `${API_BASE}/ai/pipeline/`,
  /** POST { offer_id } → auto-process unscored applications for an offer */
  PROCESS:  `${API_BASE}/ai/pipeline/process/`,
  /** GET → lightweight offer list for the selector dropdown */
  OFFERS:   `${API_BASE}/ai/offers/`,
  SCORE:    (id: number | string) => `${API_BASE}/ai/scores/${id}/`,
  RETRY:    (id: number | string) => `${API_BASE}/ai/scores/${id}/retry/`,
  REPORT:   (id: number | string) => `${API_BASE}/ai/reports/${id}/generate/`,
} as const
