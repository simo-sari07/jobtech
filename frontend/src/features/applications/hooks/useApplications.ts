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

function useInvalidateApps() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: APP_KEYS.all })
    qc.invalidateQueries({ queryKey: APP_KEYS.mine })
  }
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
  const invalidate = useInvalidateApps()
  return useMutation({
    mutationFn: (formData: FormData) =>
      applicationsApi.submit(formData).then(r => r.data),
    onSuccess: invalidate,
  })
}

export function useUpdateApplicationStatus() {
  const invalidate = useInvalidateApps()
  return useMutation({
    mutationFn: ({ id, status, notes }: { id: number | string; status: string; notes?: string }) =>
      applicationsApi.updateStatus(id, status, notes).then(r => r.data),
    onSuccess: invalidate,
  })
}

export function useArchiveApplication() {
  const invalidate = useInvalidateApps()
  return useMutation({
    mutationFn: (id: number | string) => applicationsApi.archive(id).then(r => r.data),
    onSuccess: invalidate,
  })
}

export function useUnarchiveApplication() {
  const invalidate = useInvalidateApps()
  return useMutation({
    mutationFn: (id: number | string) => applicationsApi.unarchive(id).then(r => r.data),
    onSuccess: invalidate,
  })
}

export function useDeleteApplication() {
  const invalidate = useInvalidateApps()
  return useMutation({
    mutationFn: (id: number | string) => applicationsApi.destroy(id),
    onSuccess: invalidate,
  })
}

export function useBulkUpdateStatus() {
  const invalidate = useInvalidateApps()
  return useMutation({
    mutationFn: ({ ids, status }: { ids: number[]; status: string }) =>
      applicationsApi.bulkStatus(ids, status).then(r => r.data),
    onSuccess: invalidate,
  })
}

export function useBulkArchive() {
  const invalidate = useInvalidateApps()
  return useMutation({
    mutationFn: (ids: number[]) => applicationsApi.bulkArchive(ids).then(r => r.data),
    onSuccess: invalidate,
  })
}

export function useBulkDelete() {
  const invalidate = useInvalidateApps()
  return useMutation({
    mutationFn: (ids: number[]) => applicationsApi.bulkDelete(ids).then(r => r.data),
    onSuccess: invalidate,
  })
}

export function useAuditLog(id: number | string | null) {
  return useQuery({
    queryKey: ['application-audit-log', id],
    queryFn: () => applicationsApi.auditLog(id!).then(r => r.data),
    enabled: !!id,
  })
}
