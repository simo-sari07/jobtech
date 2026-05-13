/**
 * usePublicJobs — React Query hook for the public job listing.
 */
import { useQuery } from '@tanstack/react-query'
import { publicApi, type PublicJobFilters, type PublicJob } from '../api'
import type { PaginatedResponse } from '@/features/jobs/api'

export function usePublicJobs(filters: PublicJobFilters = {}) {
  return useQuery<PaginatedResponse<PublicJob>>({
    queryKey: ['public', 'jobs', filters],
    queryFn:  () => publicApi.getJobs(filters).then(r => r.data),
    staleTime: 2 * 60 * 1000, // 2 min — public data doesn't change often
  })
}
