/**
 * Candidates & Notifications — TypeScript types.
 */

// ── Candidate Profile ─────────────────────────────────────────────────────────

export interface Experience {
  title:       string
  company:     string
  start_date:  string
  end_date?:   string | null
  description?: string
}

export interface Education {
  degree: string
  school: string
  year?:  string | number
}

export interface CandidateProfile {
  id:           number
  bio:          string | null
  location:     string | null
  linkedin_url: string | null
  github_url:   string | null
  skills:       string[]
  experience:   Experience[]
  education:    Education[]
  cv_url:       string | null
  created_at:   string
  updated_at:   string
}

export interface UpdateProfilePayload {
  bio?:          string
  location?:     string
  linkedin_url?: string
  github_url?:   string
  skills?:       string[]
  experience?:   Experience[]
  education?:    Education[]
  cv_file?:      File | null
}

// ── Saved Jobs ────────────────────────────────────────────────────────────────

export interface SavedJob {
  id:         number
  job:        import('@/features/jobs/api').Job
  created_at: string
}

export interface SavedJobsResponse {
  count:   number
  results: SavedJob[]
}

export interface SaveToggleResponse {
  saved: boolean
}

// ── Notifications ─────────────────────────────────────────────────────────────

export type NotificationType = 'app_submitted' | 'status_changed' | 'job_posted' | 'interview'

export interface Notification {
  id:          number
  type:        NotificationType
  message:     string
  is_read:     boolean
  related_url: string | null
  created_at:  string
}

export interface NotificationsResponse {
  unread_count: number
  results:      Notification[]
}
