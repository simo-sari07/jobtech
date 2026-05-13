/**
 * Public API — no authentication required.
 * These endpoints are AllowAny on the backend.
 * The shared Axios client is used; if the user IS logged in, that's fine too.
 */
import apiClient from '@/api/client'
import { PUBLIC_ENDPOINTS } from '@/api/endpoints'
import type { PaginatedResponse } from '@/features/jobs/api'

export interface PublicSkill {
  id: number
  name: string
  slug: string
}

export interface PublicJob {
  id: number
  slug: string
  title: string
  description: string
  contract_type: 'cdi' | 'cdd' | 'internship' | 'freelance'
  location: string
  experience_years: number
  salary_min: number | null
  salary_max: number | null
  skills: PublicSkill[]
  deadline: string | null
  company_name: string
  created_at: string
}

export interface PublicJobFilters {
  search?: string
  location?: string
  contract_type?: string
  skills?: string        // comma-separated skill IDs
  ordering?: string
  page?: number
  page_size?: number
}

export const publicApi = {
  getJobs: (params: PublicJobFilters = {}) =>
    apiClient.get<PaginatedResponse<PublicJob>>(PUBLIC_ENDPOINTS.JOBS, { params }),

  getJob: (slug: string) =>
    apiClient.get<PublicJob>(PUBLIC_ENDPOINTS.JOB_DETAIL(slug)),
}
