/**
 * Applications feature — API call functions.
 */
import apiClient from '@/api/client'
import { APPLICATIONS_ENDPOINTS } from '@/api/endpoints'
import type { Job } from '@/features/jobs/api'

export interface Application {
  id: number
  job: Job
  status: 'pending' | 'in_review' | 'shortlisted' | 'rejected' | 'hired'
  cv_url: string | null
  cover_letter: string | null
  ai_score: number | null
  created_at: string
  // Recruiter-only fields
  candidate_name?: string
  candidate_email?: string
  job_title?: string
  notes?: string
  updated_at?: string
}

export interface ApplicationFilters {
  status?: string
  job?: number
  page?: number
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
}
