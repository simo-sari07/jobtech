/**
 * Application-wide constants.
 */

export const ROLES = {
  ADMIN:      'admin',
  HR_MANAGER: 'hr_manager',
  RECRUITER:  'recruiter',
  CANDIDATE:  'candidate',
} as const

export type Role = typeof ROLES[keyof typeof ROLES]

export const ROLE_LABELS: Record<Role, string> = {
  admin:      'Administrator',
  hr_manager: 'HR Manager',
  recruiter:  'Recruiter',
  candidate:  'Candidate',
}

export const ROLE_COLORS: Record<Role, string> = {
  admin:      'badge-admin',
  hr_manager: 'badge-hr',
  recruiter:  'badge-recruiter',
  candidate:  'badge-candidate',
}
