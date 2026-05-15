import { useQuery } from '@tanstack/react-query'
import { aiApi } from '../api'

const POLL_INTERVAL_MS = 5000 // 5 seconds

export const AI_KEYS = {
  score: (applicationId: number) => ['ai', 'score', applicationId] as const,
}

export interface AIScoreData {
  processing_status: 'pending' | 'parsing' | 'scoring' | 'done' | 'error'
  score: {
    id: number
    match_score: number
    skills_match: number
    experience_match: number
    keyword_score: number
    extracted_skills: string[]
    extracted_experience: number | null
    strengths: string[]
    gaps: string[]
    reasoning: string
    model_version: string
    error: string
    processed_at: string
    score_label: string
    score_color: string
    candidate_name: string
  } | null
  cv_data: Record<string, unknown> | null
}

/**
 * Fetches AI score for an application.
 * Automatically polls every 5s while processing_status is "parsing" or "scoring".
 */
export function useAIScore(applicationId: number | undefined) {
  return useQuery<AIScoreData>({
    queryKey: AI_KEYS.score(applicationId!),
    queryFn: async () => {
      const res = await aiApi.getScore(applicationId!)
      return res.data as AIScoreData
    },
    enabled: !!applicationId,
    refetchInterval: (query) => {
      const status = query.state.data?.processing_status
      return status === 'parsing' || status === 'scoring' ? POLL_INTERVAL_MS : false
    },
  })
}
