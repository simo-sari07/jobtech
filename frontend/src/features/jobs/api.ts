/**
 * Jobs feature — API call functions.
 * All calls go through the shared apiClient (JWT interceptors included).
 */
import apiClient from '@/api/client'
import { JOBS_ENDPOINTS } from '@/api/endpoints'

export interface Skill {
  id: number
  name: string
  slug: string
}

export interface Job {
  id: number
  slug: string
  title: string
  description: string
  contract_type: 'cdi' | 'cdd' | 'internship' | 'freelance'
  location: string
  experience_years: number
  salary_min: number | null
  salary_max: number | null
  deadline: string | null
  status: 'draft' | 'open' | 'in_progress' | 'closed'
  skills: Skill[]
  created_by_name: string | null
  application_count: number
  created_at: string
  updated_at: string
}

export interface JobFilters {
  status?: string
  contract_type?: string
  location?: string
  search?: string
  page?: number
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface CreateJobPayload {
  title: string
  description: string
  contract_type: string
  location: string
  experience_years: number
  salary_min?: number | null
  salary_max?: number | null
  deadline?: string | null
  status?: string
  skill_ids?: number[]
}

export const jobsApi = {
  list: (filters?: JobFilters) =>
    apiClient.get<PaginatedResponse<Job>>(JOBS_ENDPOINTS.LIST, { params: filters }),

  detail: (id: number | string) =>
    apiClient.get<Job>(JOBS_ENDPOINTS.DETAIL(id)),

  create: (payload: CreateJobPayload) =>
    apiClient.post<Job>(JOBS_ENDPOINTS.LIST, payload),

  update: (id: number | string, payload: Partial<CreateJobPayload>) =>
    apiClient.patch<Job>(JOBS_ENDPOINTS.DETAIL(id), payload),

  delete: (id: number | string) =>
    apiClient.delete(JOBS_ENDPOINTS.DETAIL(id)),

  skills: () =>
    apiClient.get<Skill[]>(JOBS_ENDPOINTS.SKILLS),
}
