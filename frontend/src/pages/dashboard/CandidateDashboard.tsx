/**
 * Candidate Dashboard — light-mode redesign.
 */
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useMyApplications } from '@/features/applications/hooks/useApplications'
import { useJobs } from '@/features/jobs/hooks/useJobs'
import { Card, Badge } from '@/components/ui'
import {
  Briefcase, FileText, Clock, CheckCircle2,
  ArrowRight, Search, TrendingUp,
} from 'lucide-react'

export default function CandidateDashboard() {
  const { user } = useAuthStore()
  const { data: appsData } = useMyApplications()
  const { data: jobsData } = useJobs({ status: 'open' })

  const apps = appsData?.results ?? []
  const stats = [
    { label: 'Total Applied', value: apps.length, icon: <FileText size={20} className="text-blue-600" />, color: 'bg-blue-50' },
    { label: 'In Review',     value: apps.filter(a => a.status === 'in_review').length, icon: <Clock size={20} className="text-amber-600" />, color: 'bg-amber-50' },
    { label: 'Shortlisted',  value: apps.filter(a => a.status === 'shortlisted').length, icon: <TrendingUp size={20} className="text-purple-600" />, color: 'bg-purple-50' },
    { label: 'Open Positions', value: jobsData?.count ?? 0, icon: <Briefcase size={20} className="text-green-600" />, color: 'bg-green-50' },
  ]

  const quickActions = [
    { icon: <Search size={18} />, label: 'Browse Jobs', desc: 'Explore all open positions', to: '/jobs', color: 'text-blue-600 bg-blue-50' },
    { icon: <FileText size={18} />, label: 'My Applications', desc: 'Track your submissions', to: '/dashboard/candidate/applications', color: 'text-purple-600 bg-purple-50' },
    { icon: <CheckCircle2 size={18} />, label: 'Profile',       desc: 'Update your information', to: '#', color: 'text-green-600 bg-green-50' },
  ]


  return (
    <div className="flex flex-col gap-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Good morning, {user?.first_name} 👋
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Browse open positions and track your application progress.
          </p>
        </div>
        <Link
          to="/jobs"
          className="hidden sm:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Search size={15} /> Browse Jobs
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label} className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.color}`}>
              {s.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <div className="lg:col-span-1">
          <Card>
            <h2 className="font-semibold text-slate-900 mb-4">Quick Actions</h2>
            <div className="flex flex-col gap-2">
              {quickActions.map(a => (
                <Link
                  key={a.label}
                  to={a.to}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${a.color}`}>
                    {a.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{a.label}</p>
                    <p className="text-xs text-slate-500">{a.desc}</p>
                  </div>
                  <ArrowRight size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                </Link>
              ))}
            </div>
          </Card>
        </div>

        {/* Recent applications */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">Recent Applications</h2>
              <Link to="/dashboard/candidate/applications" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                View all →
              </Link>
            </div>
            {apps.length === 0 ? (
              <div className="py-10 text-center">
                <FileText size={32} className="text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500 font-medium">No applications yet</p>
                <p className="text-xs text-slate-400 mt-1">Browse open jobs and apply today</p>
                <Link to="/jobs" className="mt-3 inline-block text-xs text-blue-600 hover:text-blue-700 font-medium">
                  Browse Jobs →
                </Link>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-slate-100">
                {apps.slice(0, 4).map(app => (
                  <div key={app.id} className="flex items-center gap-3 py-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <Briefcase size={16} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {app.job?.title ?? 'Position'}
                      </p>
                      <p className="text-xs text-slate-500">{new Date(app.created_at).toLocaleDateString()}</p>
                    </div>
                    <AppStatusBadge status={app.status} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

function AppStatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: 'blue' | 'amber' | 'green' | 'red' | 'default' | 'purple'; label: string }> = {
    pending:     { variant: 'default', label: 'Pending' },
    in_review:   { variant: 'blue',    label: 'In Review' },
    shortlisted: { variant: 'purple',  label: 'Shortlisted' },
    hired:       { variant: 'green',   label: 'Hired' },
    rejected:    { variant: 'red',     label: 'Rejected' },
  }
  const c = config[status] ?? { variant: 'default' as const, label: status }
  return <Badge variant={c.variant} dot>{c.label}</Badge>
}
