/**
 * usePublicJob — React Query hook for a single public job detail (by slug).
 */
import { useQuery } from '@tanstack/react-query'
import { publicApi, type PublicJob } from '../api'

export function usePublicJob(slug: string | undefined) {
  return useQuery<PublicJob>({
    queryKey: ['public', 'job', slug],
    queryFn:  () => publicApi.getJob(slug!).then(r => r.data),
    enabled:  !!slug,
    staleTime: 5 * 60 * 1000,
  })
}
