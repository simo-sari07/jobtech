/**
 * Candidates & Notifications — API call layer.
 */
import client from '@/api/client'
import type {
  CandidateProfile,
  UpdateProfilePayload,
  SavedJobsResponse,
  SaveToggleResponse,
  NotificationsResponse,
} from './types'

const BASE = '/api/v1/candidates'

export const candidatesApi = {
  // ── Profile ───────────────────────────────────────────────────────────────
  getProfile: () =>
    client.get<CandidateProfile>(`${BASE}/profile/`),

  updateProfile: (payload: UpdateProfilePayload) => {
    // Must use FormData when CV file is included
    const hasFile = payload.cv_file instanceof File
    if (hasFile) {
      const form = new FormData()
      Object.entries(payload).forEach(([key, val]) => {
        if (val === undefined || val === null) return
        if (val instanceof File) {
          form.append(key, val)
        } else if (Array.isArray(val) || typeof val === 'object') {
          form.append(key, JSON.stringify(val))
        } else {
          form.append(key, String(val))
        }
      })
      return client.patch<CandidateProfile>(`${BASE}/profile/`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    }
    return client.patch<CandidateProfile>(`${BASE}/profile/`, payload)
  },

  // ── Saved Jobs ────────────────────────────────────────────────────────────
  getSavedJobs: () =>
    client.get<SavedJobsResponse>(`${BASE}/saved-jobs/`),

  toggleSavedJob: (jobId: number) =>
    client.post<SaveToggleResponse>(`${BASE}/saved-jobs/${jobId}/toggle/`),

  getSavedStatus: (jobId: number) =>
    client.get<SaveToggleResponse>(`${BASE}/saved-jobs/${jobId}/status/`),

  // ── Notifications ─────────────────────────────────────────────────────────
  getNotifications: () =>
    client.get<NotificationsResponse>(`${BASE}/notifications/`),

  markRead: (ids?: number[]) =>
    client.post(`${BASE}/notifications/mark-read/`, ids ? { ids } : { all: true }),

  getUnreadCount: () =>
    client.get<{ unread_count: number }>(`${BASE}/notifications/unread-count/`),

  deleteNotification: (id: number) =>
    client.delete(`${BASE}/notifications/${id}/delete/`),

  bulkDeleteNotifications: (ids?: number[]) =>
    client.delete(`${BASE}/notifications/bulk-delete/`, { data: ids ? { ids } : { all: true } }),
}
