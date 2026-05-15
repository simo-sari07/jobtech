import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { aiApi } from '../api'
import { AI_KEYS } from './useAIScore'

export function useRetryAnalysis(applicationId: number) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: () => aiApi.retryAnalysis(applicationId),
    onSuccess: () => {
      toast.success('Re-analysis started. Results will update in a few moments.')
      // Invalidate the score query to trigger re-polling
      qc.invalidateQueries({ queryKey: AI_KEYS.score(applicationId) })
    },
    onError: () => {
      toast.error('Failed to start re-analysis. Please try again.')
    },
  })
}
