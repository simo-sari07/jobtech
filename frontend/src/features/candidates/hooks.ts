/**
 * Candidates & Notifications — React Query hooks.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { candidatesApi } from './api'
import type { UpdateProfilePayload } from './types'
import { useAuthStore } from '@/store/authStore'

// ── Query keys ─────────────────────────────────────────────────────────────────
export const CANDIDATE_KEYS = {
  profile:       ['candidate', 'profile']           as const,
  savedJobs:     ['candidate', 'saved-jobs']        as const,
  savedStatus:   (jobId: number) => ['candidate', 'saved-status', jobId] as const,
  notifications: ['candidate', 'notifications']     as const,
  unreadCount:   ['candidate', 'unread-count']      as const,
}

// ── Profile ────────────────────────────────────────────────────────────────────

export function useCandidateProfile() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: CANDIDATE_KEYS.profile,
    queryFn:  () => candidatesApi.getProfile().then(r => r.data),
    staleTime: 5 * 60 * 1000,
    enabled: user?.role === 'candidate',
  })
}

export function useUpdateCandidateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) =>
      candidatesApi.updateProfile(payload).then(r => r.data),
    onSuccess: (data) => {
      qc.setQueryData(CANDIDATE_KEYS.profile, data)
      toast.success('Profile updated successfully.')
    },
    onError: () => {
      toast.error('Failed to update profile. Please try again.')
    },
  })
}

// ── Saved Jobs ──────────────────────────────────────────────────────────────────

export function useSavedJobs() {
  return useQuery({
    queryKey: CANDIDATE_KEYS.savedJobs,
    queryFn:  () => candidatesApi.getSavedJobs().then(r => r.data),
  })
}

export function useSavedJobStatus(jobId: number) {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: CANDIDATE_KEYS.savedStatus(jobId),
    queryFn:  () => candidatesApi.getSavedStatus(jobId).then(r => r.data.saved),
    enabled:  !!jobId && user?.role === 'candidate',
    staleTime: 30 * 1000,
  })
}

export function useToggleSavedJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (jobId: number) => candidatesApi.toggleSavedJob(jobId).then(r => r.data),
    onSuccess: (data, jobId) => {
      // Update individual status cache
      qc.setQueryData(CANDIDATE_KEYS.savedStatus(jobId), data.saved)
      // Invalidate saved jobs list
      qc.invalidateQueries({ queryKey: CANDIDATE_KEYS.savedJobs })
      toast.success(data.saved ? 'Job saved to bookmarks.' : 'Job removed from bookmarks.')
    },
    onError: () => {
      toast.error('Could not update saved jobs. Please try again.')
    },
  })
}

// ── Notifications ───────────────────────────────────────────────────────────────

export function useNotifications() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: CANDIDATE_KEYS.notifications,
    queryFn:  () => candidatesApi.getNotifications().then(r => r.data),
    refetchInterval: user?.role === 'candidate' ? 30 * 1000 : false,
    enabled: !!user,
  })
}

export function useUnreadCount() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: CANDIDATE_KEYS.unreadCount,
    queryFn:  () => candidatesApi.getUnreadCount().then(r => r.data.unread_count),
    refetchInterval: user?.role === 'candidate' ? 30 * 1000 : false,
    enabled: !!user,
  })
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids?: number[]) => candidatesApi.markRead(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CANDIDATE_KEYS.notifications })
      qc.invalidateQueries({ queryKey: CANDIDATE_KEYS.unreadCount })
    },
  })
}

export function useDeleteNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => candidatesApi.deleteNotification(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CANDIDATE_KEYS.notifications })
      qc.invalidateQueries({ queryKey: CANDIDATE_KEYS.unreadCount })
    },
  })
}

export function useBulkDeleteNotifications() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids?: number[]) => candidatesApi.bulkDeleteNotifications(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CANDIDATE_KEYS.notifications })
      qc.invalidateQueries({ queryKey: CANDIDATE_KEYS.unreadCount })
    },
  })
}
