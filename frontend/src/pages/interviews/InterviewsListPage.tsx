/**
 * InterviewsListPage — Professional ATS-style interview management.
 *
 * Features:
 *  - Search by candidate / job title
 *  - Filter by status and interview type
 *  - Status-change actions (complete / cancel / no-show) via dropdown
 *  - Detail drawer with evaluation info
 *  - Delete with confirmation modal
 *  - Inline schedule modal with application picker
 */
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  Search, Plus, RefreshCw, MoreHorizontal, X,
  Calendar, Clock, Video, Phone, Users, Code,
  Mail, MapPin, ExternalLink, ClipboardCheck,
  Trash2, CheckCircle2, XCircle, AlertTriangle,
  Eye, ChevronDown, Briefcase, User as UserIcon,
} from 'lucide-react'
import { format, formatDistanceToNow, isPast } from 'date-fns'
import { Badge, Card, Spinner, EmptyState } from '@/components/ui'
import {
  useInterviews,
  useUpdateInterview,
  useDeleteInterview,
} from '@/features/interviews/hooks/useInterviews'
import ScheduleInterviewModal from '@/features/interviews/components/ScheduleInterviewModal'
import { useAuthStore } from '@/store/authStore'
import { ROLES } from '@/utils/constants'
import type { Interview, InterviewStatus, InterviewType, Evaluation } from '@/features/interviews/types'
import toast from 'react-hot-toast'

// ── Config ───────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<InterviewStatus, { label: string; bg: string; text: string; dot: string }> = {
  scheduled: { label: 'Scheduled', bg: 'bg-blue-50',   text: 'text-blue-700',  dot: 'bg-blue-500' },
  completed: { label: 'Completed', bg: 'bg-green-50',  text: 'text-green-700', dot: 'bg-green-500' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-50',    text: 'text-red-700',   dot: 'bg-red-500' },
  no_show:   { label: 'No-show',   bg: 'bg-amber-50',  text: 'text-amber-700', dot: 'bg-amber-500' },
}

const TYPE_CFG: Record<InterviewType, { label: string; icon: typeof Video }> = {
  video:     { label: 'Video',     icon: Video },
  phone:     { label: 'Phone',     icon: Phone },
  onsite:    { label: 'On-site',   icon: Users },
  technical: { label: 'Technical', icon: Code },
}

const STATUS_ACTIONS: Record<InterviewStatus, { value: InterviewStatus; label: string; icon: typeof CheckCircle2; color: string }[]> = {
  scheduled: [
    { value: 'completed', label: 'Mark Completed', icon: CheckCircle2, color: 'text-green-600' },
    { value: 'cancelled', label: 'Cancel',         icon: XCircle,      color: 'text-red-600' },
    { value: 'no_show',   label: 'Mark No-show',   icon: AlertTriangle,color: 'text-amber-600' },
  ],
  completed: [],
  cancelled: [],
  no_show:   [],
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: InterviewStatus }) {
  const c = STATUS_CFG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  )
}

function TypeBadge({ type }: { type: InterviewType }) {
  const c = TYPE_CFG[type]
  const Icon = c.icon
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
      <Icon size={12} />
      {c.label}
    </span>
  )
}

// ── Actions Dropdown ─────────────────────────────────────────────────────────

function ActionsDropdown({
  interview, isStaff, onStatusChange, onEvaluate, onViewDetails, onDelete,
}: {
  interview: Interview
  isStaff: boolean
  onStatusChange: (id: number, status: InterviewStatus) => void
  onEvaluate: (interview: Interview) => void
  onViewDetails: (interview: Interview) => void
  onDelete: (interview: Interview) => void
}) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number; openUpward: boolean }>({
    top: 0,
    left: 0,
    openUpward: false,
  })
  const ref = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        ref.current &&
        !ref.current.contains(target) &&
        !(menuRef.current && menuRef.current.contains(target))
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleToggle = () => {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      // Estimate menu height as 280px (Interviews dropdown has fewer items, so 280px is plenty)
      const menuHeight = 280
      const openUpward = spaceBelow < menuHeight && spaceAbove > spaceBelow

      const top = openUpward
        ? rect.top + window.scrollY - menuHeight - 4
        : rect.bottom + window.scrollY + 4
      const left = rect.right + window.scrollX - 208 // 208px is the width (w-52)

      setCoords({ top, left, openUpward })
    }
    setOpen(o => !o)
  }

  const actions = STATUS_ACTIONS[interview.status] ?? []
  const canEvaluate = interview.status === 'completed' && !interview.has_evaluation && isStaff

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleToggle}
        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
      >
        <MoreHorizontal size={16} />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'absolute',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
            }}
            className={`w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 animate-in fade-in duration-150 ${
              coords.openUpward
                ? 'slide-in-from-bottom-2'
                : 'slide-in-from-top-2'
            } z-[9999]`}
          >
            <button
              onClick={() => { onViewDetails(interview); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Eye size={14} className="text-slate-400" /> View Details
            </button>

            {canEvaluate && (
              <button
                onClick={() => { onEvaluate(interview); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-blue-700 hover:bg-blue-50 transition-colors"
              >
                <ClipboardCheck size={14} /> Submit Evaluation
              </button>
            )}

            {isStaff && actions.length > 0 && (
              <>
                <div className="my-1.5 border-t border-slate-100" />
                <p className="px-3.5 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">Change Status</p>
                {actions.map(a => (
                  <button
                    key={a.value}
                    onClick={() => { onStatusChange(interview.id, a.value); setOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm hover:bg-slate-50 transition-colors"
                  >
                    <a.icon size={14} className={a.color} />
                    <span className={a.color}>{a.label}</span>
                  </button>
                ))}
              </>
            )}

            {isStaff && (
              <>
                <div className="my-1.5 border-t border-slate-100" />
                <button
                  onClick={() => { onDelete(interview); setOpen(false) }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} /> Delete Interview
                </button>
              </>
            )}
          </div>,
          document.body
        )}
    </div>
  )
}

// ── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({
  open, onClose, onConfirm, title, description, confirmLabel, loading,
}: {
  open: boolean; onClose: () => void; onConfirm: () => void
  title: string; description: string; confirmLabel: string; loading?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500 mt-1">{description}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Deleting...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Detail Drawer ────────────────────────────────────────────────────────────

function DetailDrawer({ interview, onClose }: { interview: Interview | null; onClose: () => void }) {
  if (!interview) return null

  const ev = interview.evaluation
  const scheduled = new Date(interview.scheduled_at)
  const isUpcoming = !isPast(scheduled) && interview.status === 'scheduled'

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Interview Details</h2>
            <p className="text-xs text-slate-500">#{interview.id}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status + Type */}
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={interview.status} />
            <TypeBadge type={interview.interview_type} />
            {isUpcoming && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white">
                <Clock size={10} /> Upcoming
              </span>
            )}
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 gap-4">
            <InfoRow icon={<Briefcase size={16} />} label="Position" value={interview.job_title} />
            <InfoRow icon={<UserIcon size={16} />} label="Candidate" value={interview.candidate_name} />
            <InfoRow icon={<Mail size={16} />} label="Email" value={interview.candidate_email} />
            {interview.recruiter_name && (
              <InfoRow icon={<UserIcon size={16} />} label="Interviewer" value={interview.recruiter_name} />
            )}
            <InfoRow
              icon={<Calendar size={16} />}
              label="Date & Time"
              value={`${format(scheduled, 'PPP')} at ${format(scheduled, 'HH:mm')}`}
            />
            <InfoRow icon={<Clock size={16} />} label="Duration" value={`${interview.duration_minutes} minutes`} />
            {interview.location_or_link && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                  {interview.location_or_link.startsWith('http') ? <ExternalLink size={14} className="text-slate-500" /> : <MapPin size={14} className="text-slate-500" />}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Location / Link</p>
                  {interview.location_or_link.startsWith('http') ? (
                    <a href={interview.location_or_link} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-blue-600 font-medium hover:underline break-all">
                      {interview.location_or_link}
                    </a>
                  ) : (
                    <p className="text-sm font-medium text-slate-900">{interview.location_or_link}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          {interview.notes && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Notes</h4>
              <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap border border-slate-100">
                {interview.notes}
              </div>
            </div>
          )}

          {/* Evaluation */}
          {ev && <EvaluationSummary evaluation={ev} />}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5 text-slate-500">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-slate-900">{value}</p>
      </div>
    </div>
  )
}

function EvaluationSummary({ evaluation }: { evaluation: Evaluation }) {
  const scores = [
    { label: 'Technical',      value: evaluation.technical_score,       weight: '40%' },
    { label: 'Communication',  value: evaluation.communication_score,   weight: '25%' },
    { label: 'Problem Solving',value: evaluation.problem_solving_score, weight: '25%' },
    { label: 'Motivation',     value: evaluation.motivation_score,      weight: '10%' },
  ]

  const recColors: Record<string, string> = {
    hire:       'bg-green-100 text-green-700',
    reject:     'bg-red-100 text-red-700',
    hold:       'bg-amber-100 text-amber-700',
    next_round: 'bg-blue-100 text-blue-700',
  }
  const recLabels: Record<string, string> = {
    hire: 'Hire', reject: 'Reject', hold: 'On Hold', next_round: 'Next Round',
  }

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <ClipboardCheck size={14} className="text-blue-600" /> Evaluation Scorecard
        </h4>
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${recColors[evaluation.recommendation] ?? 'bg-slate-100 text-slate-600'}`}>
          {recLabels[evaluation.recommendation] ?? evaluation.recommendation}
        </span>
      </div>
      <div className="p-4 space-y-3">
        {scores.map(s => (
          <div key={s.label} className="flex items-center gap-3">
            <span className="text-xs text-slate-500 w-28 shrink-0">{s.label}</span>
            <div className="flex-1 bg-slate-100 rounded-full h-2">
              <div
                className="bg-blue-500 rounded-full h-2 transition-all"
                style={{ width: `${(s.value / 5) * 100}%` }}
              />
            </div>
            <span className="text-xs font-bold text-slate-700 w-8 text-right">{s.value}/5</span>
          </div>
        ))}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase">Overall</span>
          <span className="text-xl font-black text-blue-600">{evaluation.overall_score}<span className="text-sm text-slate-300 ml-0.5">/5</span></span>
        </div>
        {evaluation.comments && (
          <div className="pt-3 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Feedback</p>
            <p className="text-sm text-slate-600">{evaluation.comments}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function InterviewsListPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isCandidate = user?.role === ROLES.CANDIDATE
  const isStaff = !isCandidate

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  const [drawerInterview, setDrawerInterview] = useState<Interview | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Interview | null>(null)

  const { data, isLoading, isFetching, refetch } = useInterviews({
    status: statusFilter || undefined,
    interview_type: typeFilter || undefined,
    search: searchTerm || undefined,
  })
  const updateMutation = useUpdateInterview()
  const deleteMutation = useDeleteInterview()

  const interviews: Interview[] = data?.results ?? []
  const totalCount = data?.count ?? 0

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleStatusChange = async (id: number, status: InterviewStatus) => {
    try {
      await updateMutation.mutateAsync({ id, payload: { status } })
    } catch { /* toast in hook */ }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
    } catch { /* toast in hook */ }
  }

  // ── Stat counters ────────────────────────────────────────────────────────
  const stats = {
    total: totalCount,
    scheduled: interviews.filter(i => i.status === 'scheduled').length,
    completed: interviews.filter(i => i.status === 'completed').length,
    pending_eval: interviews.filter(i => i.status === 'completed' && !i.has_evaluation).length,
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Interviews</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isCandidate
              ? 'Your upcoming and past interview sessions.'
              : `${totalCount} total interview${totalCount !== 1 ? 's' : ''} — manage scheduling, evaluation and status.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
          {isStaff && (
            <button
              onClick={() => setIsScheduleOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus size={16} /> Schedule Interview
            </button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      {isStaff && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-slate-900', bg: 'bg-white' },
            { label: 'Scheduled', value: stats.scheduled, color: 'text-blue-700', bg: 'bg-blue-50' },
            { label: 'Completed', value: stats.completed, color: 'text-green-700', bg: 'bg-green-50' },
            { label: 'Pending Eval', value: stats.pending_eval, color: 'text-amber-700', bg: 'bg-amber-50' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl border border-slate-200/80 px-4 py-3`}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{s.label}</p>
              <p className={`text-2xl font-black ${s.color} mt-0.5`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search candidate, email, or job..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
          >
            <option value="">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No-show</option>
          </select>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
          >
            <option value="">All Types</option>
            <option value="video">Video</option>
            <option value="phone">Phone</option>
            <option value="onsite">On-site</option>
            <option value="technical">Technical</option>
          </select>
        </div>
      </div>

      {/* Interviews card-based list stack */}
      <div className="space-y-3.5">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 bg-white border border-slate-200/80 rounded-2xl">
            <Spinner size={28} />
          </div>
        ) : interviews.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-16">
            <EmptyState
              icon={<Calendar size={24} />}
              title="No interviews found"
              description={searchTerm || statusFilter || typeFilter
                ? 'Try adjusting your filters.'
                : 'Schedule your first interview to get started.'}
            />
          </div>
        ) : interviews.map(itv => {
          const scheduled = new Date(itv.scheduled_at)
          const isUpcoming = !isPast(scheduled) && itv.status === 'scheduled'
          const TypeIcon = TYPE_CFG[itv.interview_type]?.icon ?? Users
          const cfg = STATUS_CFG[itv.status] ?? STATUS_CFG.scheduled

          return (
            <div key={itv.id} className="bg-white border border-slate-200/85 rounded-2xl p-5 hover:border-slate-300 hover:shadow-md transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-5 relative group">
              
              {/* Column 1: Interview details & Interviewer */}
              <div className="flex items-center gap-4 min-w-0 md:w-1/4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-colors ${isUpcoming ? 'bg-blue-50 text-blue-600 border border-blue-100/50' : 'bg-slate-50 text-slate-500 border border-slate-100/50'}`}>
                  <TypeIcon size={18} />
                </div>
                <div className="min-w-0">
                  <p className="font-extrabold text-slate-900 leading-tight text-sm truncate group-hover:text-blue-600 transition-colors">{itv.job_title}</p>
                  {itv.recruiter_name ? (
                    <p className="text-xs text-slate-500 font-medium mt-1">Interviewer: <span className="text-slate-700 font-semibold">{itv.recruiter_name}</span></p>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1">No interviewer assigned</p>
                  )}
                </div>
              </div>

              {/* Column 2: Candidate details */}
              <div className="flex items-center gap-3 min-w-0 md:w-1/4">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-extrabold shrink-0 shadow-sm">
                  {itv.candidate_name?.charAt(0).toUpperCase() ?? '?'}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 text-sm truncate">{itv.candidate_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1 font-medium truncate">
                    <Mail size={11} className="shrink-0" /> {itv.candidate_email}
                  </p>
                </div>
              </div>

              {/* Column 3: Date & Time */}
              <div className="flex flex-row md:flex-col items-center md:items-start justify-between md:justify-center gap-2 md:w-1/5 shrink-0">
                <div>
                  <p className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <Calendar size={13} className="text-slate-400" />
                    {format(scheduled, 'dd MMM yyyy')}
                  </p>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5 flex items-center gap-1">
                    <Clock size={12} className="text-slate-400 shrink-0" />
                    {format(scheduled, 'HH:mm')} ({itv.duration_minutes}m)
                    {isUpcoming && (
                      <span className="text-blue-600 font-bold ml-1">
                        ({formatDistanceToNow(scheduled, { addSuffix: false })})
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Column 4: Badges & Dropdown */}
              <div className="flex items-center justify-between md:justify-end gap-4 md:w-1/5 shrink-0">
                <div className="flex items-center gap-2">
                  <TypeBadge type={itv.interview_type} />
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-0.5 border ${cfg.bg} ${cfg.text} border-transparent`}>
                    <span className={`w-1 h-1 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </span>
                  {itv.has_evaluation && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-green-700 bg-green-50 border border-green-100/50">
                      <ClipboardCheck size={10} /> Scored
                    </span>
                  )}
                </div>

                <div className="shrink-0">
                  <ActionsDropdown
                    interview={itv}
                    isStaff={isStaff}
                    onStatusChange={handleStatusChange}
                    onEvaluate={i => navigate(`/dashboard/interviews/${i.id}/evaluate`)}
                    onViewDetails={i => setDrawerInterview(i)}
                    onDelete={i => setDeleteTarget(i)}
                  />
                </div>
              </div>

            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center text-xs text-slate-400 px-1">
        <p>Showing {interviews.length} of {totalCount} interviews</p>
        <p>Last synced: {new Date().toLocaleTimeString()}</p>
      </div>

      {/* Schedule Modal */}
      <ScheduleInterviewModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        applicationId={0}
      />

      {/* Detail Drawer */}
      <DetailDrawer
        interview={drawerInterview}
        onClose={() => setDrawerInterview(null)}
      />

      {/* Delete Confirm */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Interview"
        description={`This will permanently delete the interview for "${deleteTarget?.candidate_name}" (${deleteTarget?.job_title}). This action cannot be undone.`}
        confirmLabel="Delete Forever"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
