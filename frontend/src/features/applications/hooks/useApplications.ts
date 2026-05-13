/**
 * Applications React Query hooks.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { applicationsApi, type ApplicationFilters } from '@/features/applications/api'

export const APP_KEYS = {
  all:   ['applications'] as const,
  lists: () => [...APP_KEYS.all, 'list'] as const,
  list:  (f: ApplicationFilters) => [...APP_KEYS.lists(), f] as const,
  mine:  ['applications', 'mine'] as const,
}

export function useApplications(filters?: ApplicationFilters) {
  return useQuery({
    queryKey: APP_KEYS.list(filters ?? {}),
    queryFn:  () => applicationsApi.list(filters).then(r => r.data),
  })
}

export function useMyApplications() {
  return useQuery({
    queryKey: APP_KEYS.mine,
    queryFn:  () => applicationsApi.mine().then(r => r.data),
  })
}

export function useSubmitApplication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (formData: FormData) =>
      applicationsApi.submit(formData).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: APP_KEYS.mine }),
  })
}

export function useUpdateApplicationStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, notes }: { id: number | string; status: string; notes?: string }) =>
      applicationsApi.updateStatus(id, status, notes).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: APP_KEYS.lists() }),
  })
}
