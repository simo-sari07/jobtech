/**
 * Jobs React Query hooks.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { jobsApi, type JobFilters, type CreateJobPayload, type Skill, type Job, type PaginatedResponse } from '@/features/jobs/api'

export const JOB_KEYS = {
  all:    ['jobs'] as const,
  lists:  () => [...JOB_KEYS.all, 'list'] as const,
  list:   (f: JobFilters) => [...JOB_KEYS.lists(), f] as const,
  detail: (id: number | string) => [...JOB_KEYS.all, 'detail', id] as const,
  skills: ['skills'] as const,
}

export function useJobs(filters?: JobFilters) {
  return useQuery<PaginatedResponse<Job>>({
    queryKey: JOB_KEYS.list(filters ?? {}),
    queryFn:  () => jobsApi.list(filters).then(r => r.data),
  })
}

export function useJob(id: number | string | undefined) {
  return useQuery<Job>({
    queryKey: JOB_KEYS.detail(id!),
    queryFn:  () => jobsApi.detail(id!).then(r => r.data),
    enabled:  !!id,
  })
}

export function useSkills() {
  return useQuery<Skill[]>({
    queryKey: JOB_KEYS.skills,
    queryFn:  () => jobsApi.skills().then(r => {
      // Handle both raw arrays and paginated objects for resilience
      if (Array.isArray(r.data)) return r.data
      return (r.data as any).results || []
    }),
    staleTime: 10 * 60 * 1000, // Skills rarely change — cache 10 min
  })
}

export function useCreateJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateJobPayload) => jobsApi.create(payload).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: JOB_KEYS.lists() }),
  })
}

export function useUpdateJob(id: number | string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<CreateJobPayload>) =>
      jobsApi.update(id, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: JOB_KEYS.detail(id) })
      qc.invalidateQueries({ queryKey: JOB_KEYS.lists() })
    },
  })
}

export function useDeleteJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => jobsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: JOB_KEYS.lists() }),
  })
}
