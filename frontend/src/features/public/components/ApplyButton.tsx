/**
 * ApplyButton — context-aware apply CTA.
 *
 * 4 states:
 *   1. Unauthenticated     → "Sign in to Apply" → /login (preserves location)
 *   2. Candidate, open     → "Apply Now" → triggers apply action
 *   3. Staff role          → disabled "Staff account"
 *   4. Job not open        → null (handled by parent)
 */
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import type { PublicJob } from '../api'

interface ApplyButtonProps {
  job: PublicJob
  onApply: () => void
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

const SIZE_CLASSES = {
  sm:  'px-4 py-2 text-sm',
  md:  'px-5 py-2.5 text-sm',
  lg:  'px-8 py-3.5 text-base',
}

export default function ApplyButton({ job, onApply, size = 'md', fullWidth }: ApplyButtonProps) {
  const { isAuthenticated, user } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const base = `font-semibold rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 ${SIZE_CLASSES[size]} ${fullWidth ? 'w-full justify-center' : ''}`

  if (!isAuthenticated) {
    return (
      <button
        onClick={() => navigate('/login', { state: { from: location } })}
        className={`${base} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500`}
      >
        Sign in to Apply
      </button>
    )
  }

  if (user?.role !== 'candidate') {
    return (
      <button
        disabled
        className={`${base} bg-gray-100 text-gray-400 cursor-not-allowed`}
        title="Staff accounts cannot apply to jobs"
      >
        Staff account — cannot apply
      </button>
    )
  }

  // Candidate: open job
  return (
    <button
      onClick={onApply}
      className={`${base} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 flex items-center gap-2`}
    >
      Apply Now
    </button>
  )
}
