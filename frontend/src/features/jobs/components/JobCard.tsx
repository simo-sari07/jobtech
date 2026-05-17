/**
 * JobCard — light-mode, premium redesigned card for internal dashboard job list.
 */
import { Link } from 'react-router-dom'
import { MapPin, Clock, Banknote, ArrowRight, Users, Pencil, Trash2 } from 'lucide-react'
import type { Job } from '@/features/jobs/api'
import { Badge } from '@/components/ui'
import { useDeleteJob } from '@/features/jobs/hooks/useJobs'
import toast from 'react-hot-toast'

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
  const deleteMutation = useDeleteJob()

  const isDeadlineSoon =
    job.deadline && new Date(job.deadline).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (window.confirm(`Are you sure you want to delete "${job.title}"? This action cannot be undone.`)) {
      try {
        await deleteMutation.mutateAsync(job.id)
        toast.success(`Job offer "${job.title}" was deleted successfully.`)
      } catch (err) {
        toast.error('Failed to delete the job offer. Please try again.')
      }
    }
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:border-slate-300 hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden group">

      {/* ── Card body ──────────────────────────────────────────────── */}
      <div className="p-6 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-blue-50/50 border border-blue-100 flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-blue-600 font-extrabold text-sm tracking-wide">{initials}</span>
            </div>
            <Badge variant={badge.variant} dot>{badge.label}</Badge>
          </div>

          <h3 className="font-extrabold text-slate-900 text-base leading-snug mb-1 group-hover:text-blue-600 transition-colors line-clamp-2" title={job.title}>
            {job.title}
          </h3>

          <div className="flex flex-wrap gap-x-3 gap-y-2 my-3">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-50/80 px-2 py-1 rounded-md border border-slate-100/60">
              <MapPin size={12} className="text-slate-400 shrink-0" />
              {job.location}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-50/80 px-2 py-1 rounded-md border border-slate-100/60">
              <Clock size={12} className="text-slate-400 shrink-0" />
              {CONTRACT_LABEL[job.contract_type] ?? job.contract_type}
            </span>
            {job.salary_min && job.salary_max && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50/40 px-2 py-1 rounded-md border border-emerald-100/30">
                <Banknote size={12} className="shrink-0" />
                {Number(job.salary_min).toLocaleString()}–{Number(job.salary_max).toLocaleString()} DH
              </span>
            )}
          </div>

          {job.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {job.skills.slice(0, 3).map(s => (
                <span key={s.id} className="text-[11px] font-medium bg-slate-100/80 text-slate-600 px-2 py-0.5 rounded border border-slate-100/30">
                  {s.name}
                </span>
              ))}
              {job.skills.length > 3 && (
                <span className="text-[11px] text-slate-400 font-semibold self-center">+{job.skills.length - 3} skills</span>
              )}
            </div>
          )}
        </div>

        {isDeadlineSoon && job.deadline && (
          <p className="text-xs text-amber-600 font-semibold flex items-center gap-1.5 mt-2 bg-amber-50/40 border border-amber-100/30 px-2.5 py-1 rounded-lg w-max">
            <span>⏰</span> Closes {new Date(job.deadline).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* ── Card footer ────────────────────────────────────────────── */}
      <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
          <Users size={13} className="text-slate-400" />
          <span>{job.application_count ?? 0}</span>
          <span className="text-slate-400 font-medium">applicant{job.application_count !== 1 ? 's' : ''}</span>
        </div>

        <div className="flex items-center gap-3">
          {showActions && (
            <>
              {/* Edit */}
              <Link
                to={`/dashboard/jobs/${job.id}/edit`}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 font-semibold transition-colors"
                title="Edit job offer"
              >
                <Pencil size={12} />
                Edit
              </Link>
              
              {/* Applications */}
              <Link
                to={`/dashboard/applications?job=${job.id}`}
                className="text-xs text-slate-500 hover:text-slate-900 font-semibold transition-colors"
              >
                Applications
              </Link>

              {/* Delete */}
              <button
                onClick={handleDelete}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-600 font-semibold transition-colors disabled:opacity-50 shrink-0"
                title="Delete job offer"
                disabled={deleteMutation.isPending}
              >
                <Trash2 size={12} />
                Delete
              </button>
            </>
          )}

          <Link
            to={`/jobs/${job.slug}`}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-bold transition-colors ml-1"
          >
            View <ArrowRight size={12} />
          </Link>
        </div>
      </div>

    </div>
  )
}
