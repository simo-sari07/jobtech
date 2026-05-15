import apiClient from '@/api/client'
import { AI_ENDPOINTS } from '@/api/endpoints'

export const aiApi = {
  /** GET /api/v1/ai/pipeline/?offer_id=N&min_score=X */
  getPipeline: (offerId: number, minScore?: number) => {
    const params: Record<string, string> = { offer_id: String(offerId) }
    if (minScore && minScore > 0) params.min_score = String(minScore)
    return apiClient.get(AI_ENDPOINTS.PIPELINE, { params })
  },

  /** GET /api/v1/ai/offers/ — lightweight offer selector list */
  getOffers: () =>
    apiClient.get(AI_ENDPOINTS.OFFERS),

  /** GET /api/v1/ai/scores/<applicationId>/ */
  getScore: (applicationId: number) =>
    apiClient.get(AI_ENDPOINTS.SCORE(applicationId)),

  /** POST /api/v1/ai/scores/<applicationId>/retry/ */
  retryAnalysis: (applicationId: number) =>
    apiClient.post(AI_ENDPOINTS.RETRY(applicationId)),

  /** POST /api/v1/ai/reports/<offerId>/generate/ — returns a PDF blob */
  generateReport: (offerId: number) =>
    apiClient.post(AI_ENDPOINTS.REPORT(offerId), {}, { responseType: 'blob' }),
}
