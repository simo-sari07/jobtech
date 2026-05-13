/**
 * JobCard (Public) — Indeed-style job card for the public surface.
 * Clean, scannable, minimal.
 */
import { Link } from 'react-router-dom'
import { MapPin, Briefcase, Clock, Heart } from 'lucide-react'
import type { PublicJob } from '../api'
import { useAuthStore } from '@/store/authStore'
import { useSavedJobStatus, useToggleSavedJob } from '@/features/candidates/hooks'

const CONTRACT_LABELS: Record<string, string> = {
  cdi:        'Full-time (CDI)',
  cdd:        'Fixed-term (CDD)',
  internship: 'Internship',
  freelance:  'Freelance',
}

function formatPostedDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${diffDays >= 14 ? 's' : ''} ago`
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
}

interface JobCardProps {
  job: PublicJob
  compact?: boolean
}

function SaveButton({ jobId }: { jobId: number }) {
  const { data: saved, isLoading } = useSavedJobStatus(jobId)
  const toggle = useToggleSavedJob()

  return (
    <button
      onClick={e => { e.preventDefault(); e.stopPropagation(); toggle.mutate(jobId) }}
      disabled={isLoading || toggle.isPending}
      title={saved ? 'Remove from saved' : 'Save job'}
      className={`p-1.5 rounded-lg transition-all duration-150 ${
        saved
          ? 'text-red-500 bg-red-50 hover:bg-red-100'
          : 'text-gray-400 hover:text-red-400 hover:bg-red-50'
      }`}
    >
      <Heart size={15} fill={saved ? 'currentColor' : 'none'} />
    </button>
  )
}

export default function JobCard({ job, compact }: JobCardProps) {
  const { user } = useAuthStore()
  const isCandidate = user?.role === 'candidate'
  const initials = job.title.slice(0, 2).toUpperCase()

  return (
    <Link
      to={`/jobs/${job.slug}`}
      className="group block bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all duration-150 cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0 group-hover:bg-blue-700 transition-colors">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-base leading-tight group-hover:text-blue-600 transition-colors truncate">
            {job.title}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">{job.company_name}</p>
        </div>
        {isCandidate && <SaveButton jobId={job.id} />}
      </div>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mb-3">
        <span className="flex items-center gap-1">
          <MapPin size={13} className="text-gray-400 shrink-0" />
          {job.location}
        </span>
        <span className="flex items-center gap-1">
          <Briefcase size={13} className="text-gray-400 shrink-0" />
          {CONTRACT_LABELS[job.contract_type] ?? job.contract_type}
        </span>
        {job.experience_years > 0 && (
          <span className="text-gray-400">{job.experience_years}+ yrs exp</span>
        )}
      </div>

      {!compact && (
        <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 mb-3">
          {job.description}
        </p>
      )}

      {job.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {job.skills.slice(0, 4).map(s => (
            <span key={s.id} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-md border border-blue-100">
              {s.name}
            </span>
          ))}
          {job.skills.length > 4 && (
            <span className="px-2 py-0.5 bg-gray-50 text-gray-500 text-xs rounded-md border border-gray-100">
              +{job.skills.length - 4} more
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-gray-50">
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <Clock size={11} />
          {formatPostedDate(job.created_at)}
        </span>
        {job.salary_min && job.salary_max && (
          <span className="text-xs font-medium text-gray-600">
            {job.salary_min.toLocaleString()}–{job.salary_max.toLocaleString()} DH
          </span>
        )}
        <span className="text-xs font-semibold text-blue-600 group-hover:underline">
          View job →
        </span>
      </div>
    </Link>
  )
}
