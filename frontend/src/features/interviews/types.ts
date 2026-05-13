export type InterviewStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';
export type InterviewType = 'phone' | 'video' | 'onsite' | 'technical';
export type Recommendation = 'hire' | 'reject' | 'hold' | 'next_round';

export interface Evaluation {
  id: number;
  technical_score: number;
  communication_score: number;
  motivation_score: number;
  problem_solving_score: number;
  overall_score: number;
  recommendation: Recommendation;
  comments: string;
  evaluator_name: string;
  created_at: string;
  updated_at: string;
}

export interface Interview {
  id: number;
  application_id: number;
  candidate_name: string;
  candidate_email: string;
  job_title: string;
  recruiter_name: string;
  interview_type: InterviewType;
  scheduled_at: string;
  duration_minutes: number;
  location_or_link: string | null;
  status: InterviewStatus;
  notes: string | null;
  has_evaluation: boolean;
  evaluation?: Evaluation | null;
  reminder_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateInterviewRequest {
  application: number;
  interview_type: InterviewType;
  scheduled_at: string;
  duration_minutes: number;
  location_or_link?: string;
  notes?: string;
}

export interface UpdateInterviewRequest {
  status?: InterviewStatus;
  notes?: string;
  location_or_link?: string;
}

export interface CreateEvaluationRequest {
  technical_score: number;
  communication_score: number;
  motivation_score: number;
  problem_solving_score: number;
  recommendation: Recommendation;
  comments?: string;
}

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  phone: 'Phone Call',
  video: 'Video Meeting',
  onsite: 'On-site Interview',
  technical: 'Technical Assessment',
};

export const INTERVIEW_STATUS_LABELS: Record<InterviewStatus, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
};

export const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  hire: 'Hire',
  reject: 'Reject',
  hold: 'On Hold',
  next_round: 'Next Round',
};
