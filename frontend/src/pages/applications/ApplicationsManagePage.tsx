/**
 * ApplicationsManagePage — clean table with inline status controls.
 */
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileText, Download, ChevronRight, Calendar } from 'lucide-react'
import { useApplications, useUpdateApplicationStatus } from '@/features/applications/hooks/useApplications'
import { Badge, Card, Button, EmptyState, Spinner } from '@/components/ui'
import ScheduleInterviewModal from '@/features/interviews/components/ScheduleInterviewModal'
import toast from 'react-hot-toast'

const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending:     ['in_review', 'rejected'],
  in_review:   ['shortlisted', 'rejected'],
  shortlisted: ['hired', 'rejected'],
  hired: [], rejected: [],
}

const STATUS_BADGE: Record<string, { variant: 'default' | 'blue' | 'purple' | 'green' | 'red' | 'amber'; label: string }> = {
  pending:     { variant: 'default', label: 'Pending' },
  in_review:   { variant: 'blue',    label: 'In Review' },
  shortlisted: { variant: 'purple',  label: 'Shortlisted' },
  hired:       { variant: 'green',   label: 'Hired' },
  rejected:    { variant: 'red',     label: 'Rejected' },
}

export default function ApplicationsManagePage() {
  const [searchParams]   = useSearchParams()
  const jobFilter        = searchParams.get('job') ?? ''
  const [statusFilter, setStatusFilter] = useState('')
  const [updatingId, setUpdatingId]     = useState<number | null>(null)
  const [schedulingApp, setSchedulingApp] = useState<{ id: number; name: string; job: string } | null>(null)

  const { data, isLoading } = useApplications({
    status: statusFilter || undefined,
    job:    jobFilter ? Number(jobFilter) : undefined,
  })
  const { mutateAsync: updateStatus } = useUpdateApplicationStatus()

  const handleAdvance = async (appId: number, newStatus: string) => {
    setUpdatingId(appId)
    try {
      await updateStatus({ id: appId, status: newStatus })
      toast.success(`Moved to ${newStatus.replace('_', ' ')}`)
    } catch {
      toast.error('Failed to update status')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Applications</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {data ? `${data.count} total application${data.count !== 1 ? 's' : ''}` : 'Loading…'}
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-blue-400 pr-8"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_review">In Review</option>
          <option value="shortlisted">Shortlisted</option>
          <option value="hired">Hired</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Table */}
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {['Candidate', 'Job', 'Status', 'Score', 'Applied', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3.5">
                      <div className="h-4 rounded skeleton w-24" />
                    </td>
                  ))}
                </tr>
              ))}

              {data?.results.map(app => {
                const nextStatuses = STATUS_TRANSITIONS[app.status] ?? []
                const isUpdating   = updatingId === app.id
                const sbadge       = STATUS_BADGE[app.status] ?? { variant: 'default' as const, label: app.status }

                return (
                  <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                          <span className="text-blue-700 font-semibold text-xs">
                            {app.candidate_name?.charAt(0) ?? '?'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{app.candidate_name}</p>
                          <p className="text-xs text-slate-400">{app.candidate_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 max-w-40 truncate">
                      {app.job_title}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={sbadge.variant} dot>{sbadge.label}</Badge>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-500 text-xs">
                      {app.ai_score != null ? `${app.ai_score}%` : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(app.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        {app.cv_url && (
                          <a
                            href={app.cv_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            title="Download CV"
                          >
                            <Download size={14} />
                          </a>
                        )}
                        {nextStatuses.map(ns => (
                          <button
                            key={ns}
                            disabled={isUpdating}
                            onClick={() => handleAdvance(app.id, ns)}
                            className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50 ${
                              ns === 'rejected'
                                ? 'text-red-600 bg-red-50 hover:bg-red-100'
                                : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                            }`}
                          >
                            {isUpdating ? <Spinner size={11} /> : <ChevronRight size={11} />}
                            {ns.replace('_', ' ')}
                          </button>
                        ))}
                        {app.status === 'shortlisted' && (
                          <button
                            onClick={() => setSchedulingApp({ 
                              id: app.id, 
                              name: app.candidate_name ?? '', 
                              job: app.job_title ?? '' 
                            })}
                            className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors text-purple-600 bg-purple-50 hover:bg-purple-100"
                          >
                            <Calendar size={11} />
                            Schedule
                          </button>
                        )}
                        {nextStatuses.length === 0 && app.status !== 'shortlisted' && (
                          <span className="text-xs text-slate-400 italic">Final</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}

              {data && data.results.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="py-1">
                    <EmptyState
                      icon={<FileText size={20} />}
                      title="No applications yet"
                      description="Applications will appear here once candidates apply."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <ScheduleInterviewModal
        isOpen={!!schedulingApp}
        onClose={() => setSchedulingApp(null)}
        applicationId={schedulingApp?.id || 0}
        candidateName={schedulingApp?.name}
        jobTitle={schedulingApp?.job}
      />
    </div>
  )
}
