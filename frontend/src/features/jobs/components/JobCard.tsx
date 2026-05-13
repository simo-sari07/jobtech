/**
 * JobCard — light-mode card for the internal dashboard job list.
 * Used in: JobsListPage (staff view)
 *
 * showActions=true  → shows Edit + Applications links (staff only)
 * showActions=false → public-safe view link only
 */
import { Link } from 'react-router-dom'
import { MapPin, Clock, Banknote, ArrowRight, Users, Pencil } from 'lucide-react'
import type { Job } from '@/features/jobs/api'
import { Badge } from '@/components/ui'

interface Props {
  job: Job
  showActions?: boolean
}

const STATUS_BADGE: Record<string, { variant: 'green' | 'blue' | 'amber' | 'default' | 'red'; label: string }> = {
  open:        { variant: 'green',   label: 'Open' },
  draft:       { variant: 'default', label: 'Draft' },
  in_progress: { variant: 'blue',    label: 'In Progress' },
  closed:      { variant: 'red',     label: 'Closed' },
}

const CONTRACT_LABEL: Record<string, string> = {
  cdi: 'Permanent', cdd: 'Fixed-term', internship: 'Internship', freelance: 'Freelance',
}

export default function JobCard({ job, showActions }: Props) {
  const badge    = STATUS_BADGE[job.status] ?? { variant: 'default' as const, label: job.status }
  const initials = job.title.slice(0, 2).toUpperCase()

  const isDeadlineSoon =
    job.deadline && new Date(job.deadline).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:border-blue-300 hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group">

      {/* ── Card body ──────────────────────────────────────────────── */}
      <div className="p-5 flex-1">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <span className="text-blue-600 font-bold text-xs">{initials}</span>
          </div>
          <Badge variant={badge.variant} dot>{badge.label}</Badge>
        </div>

        <h3 className="font-semibold text-slate-900 text-base leading-tight mb-1 group-hover:text-blue-600 transition-colors">
          {job.title}
        </h3>

        <div className="flex flex-wrap gap-3 my-3">
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <MapPin size={12} className="text-slate-400" /> {job.location}
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Clock size={12} className="text-slate-400" /> {CONTRACT_LABEL[job.contract_type] ?? job.contract_type}
          </span>
          {job.salary_min && job.salary_max && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <Banknote size={12} /> {Number(job.salary_min).toLocaleString()}–{Number(job.salary_max).toLocaleString()}
            </span>
          )}
        </div>

        {job.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {job.skills.slice(0, 4).map(s => (
              <span key={s.id} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                {s.name}
              </span>
            ))}
            {job.skills.length > 4 && (
              <span className="text-xs text-slate-400">+{job.skills.length - 4}</span>
            )}
          </div>
        )}

        {isDeadlineSoon && job.deadline && (
          <p className="text-xs text-amber-600 font-medium">
            ⏰ Closes {new Date(job.deadline).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* ── Card footer ────────────────────────────────────────────── */}
      <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Users size={12} /> {job.application_count ?? 0} applicants
        </div>

        <div className="flex items-center gap-3">
          {showActions && (
            <>
              {/* Edit — staff only, links to dashboard edit route */}
              <Link
                to={`/dashboard/jobs/${job.id}/edit`}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 font-medium transition-colors"
                title="Edit job offer"
              >
                <Pencil size={12} /> Edit
              </Link>
              <Link
                to={`/dashboard/applications?job=${job.id}`}
                className="text-xs text-slate-500 hover:text-slate-700 font-medium transition-colors"
              >
                Applications
              </Link>
            </>
          )}
          <Link
            to={`/jobs/${job.slug}`}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold transition-colors"
          >
            View <ArrowRight size={11} />
          </Link>
        </div>
      </div>

    </div>
  )
}
