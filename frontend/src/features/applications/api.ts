/**
 * Applications feature — API call functions.
 */
import apiClient from '@/api/client'
import { APPLICATIONS_ENDPOINTS } from '@/api/endpoints'
import type { Job } from '@/features/jobs/api'

export type ApplicationStatus =
  | 'pending' | 'in_review' | 'shortlisted' | 'interview'
  | 'rejected' | 'hired' | 'withdrawn'

export interface Application {
  id: number
  job: Job
  status: ApplicationStatus
  cv_url: string | null
  cover_letter: string | null
  ai_score: number | null
  created_at: string
  is_archived?: boolean
  // Recruiter-only fields
  candidate_id?: number
  candidate_name?: string
  candidate_email?: string
  job_id?: number
  job_title?: string
  job_location?: string
  notes?: string
  updated_at?: string
}

export interface AuditLogEntry {
  id: number
  action: string
  performed_by_name: string
  old_value: string
  new_value: string
  note: string
  created_at: string
}

export interface ApplicationFilters {
  status?: string
  job?: number
  page?: number
  archived?: boolean
  search?: string
}

export const applicationsApi = {
  list: (filters?: ApplicationFilters) =>
    apiClient.get<{ count: number; results: Application[] }>(
      APPLICATIONS_ENDPOINTS.LIST,
      { params: filters },
    ),

  mine: () =>
    apiClient.get<{ count: number; results: Application[] }>(
      APPLICATIONS_ENDPOINTS.MINE,
    ),

  detail: (id: number | string) =>
    apiClient.get<Application>(APPLICATIONS_ENDPOINTS.DETAIL(id)),

  submit: (formData: FormData) =>
    apiClient.post<Application>(APPLICATIONS_ENDPOINTS.LIST, formData),

  updateStatus: (id: number | string, status: string, notes?: string) =>
    apiClient.patch<Application>(APPLICATIONS_ENDPOINTS.STATUS(id), {
      status,
      ...(notes !== undefined && { notes }),
    }),

  archive: (id: number | string) =>
    apiClient.post<Application>(APPLICATIONS_ENDPOINTS.ARCHIVE(id)),

  unarchive: (id: number | string) =>
    apiClient.post<Application>(APPLICATIONS_ENDPOINTS.UNARCHIVE(id)),

  withdraw: (id: number | string) =>
    apiClient.post<Application>(APPLICATIONS_ENDPOINTS.WITHDRAW(id)),

  destroy: (id: number | string) =>
    apiClient.delete(APPLICATIONS_ENDPOINTS.DETAIL(id)),

  auditLog: (id: number | string) =>
    apiClient.get<AuditLogEntry[]>(APPLICATIONS_ENDPOINTS.AUDIT_LOG(id)),

  bulkStatus: (ids: number[], status: string) =>
    apiClient.post<{ updated: number }>(APPLICATIONS_ENDPOINTS.BULK_STATUS, { ids, status }),

  bulkArchive: (ids: number[]) =>
    apiClient.post<{ archived: number }>(APPLICATIONS_ENDPOINTS.BULK_ARCHIVE, { ids }),

  bulkDelete: (ids: number[]) =>
    apiClient.post<{ deleted: number }>(APPLICATIONS_ENDPOINTS.BULK_DELETE, { ids }),
}
