/**
 * HR Manager Dashboard — light-mode redesign.
 */
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useJobs } from '@/features/jobs/hooks/useJobs'
import { useApplications } from '@/features/applications/hooks/useApplications'
import { Card } from '@/components/ui'
import { Briefcase, FileText, Users, PlusCircle, ArrowRight, TrendingUp, Clock } from 'lucide-react'

export default function HRDashboard() {
  const { user } = useAuthStore()
  const { data: jobsData } = useJobs({})
  const { data: appsData } = useApplications({})

  const openJobs    = jobsData?.results.filter(j => j.status === 'open').length ?? 0
  const totalApps   = appsData?.count ?? 0
  const pending     = appsData?.results.filter(a => a.status === 'pending').length ?? 0
  const hired       = appsData?.results.filter(a => a.status === 'hired').length ?? 0

  const stats = [
    { label: 'Open Positions', value: openJobs,  icon: <Briefcase size={20} className="text-blue-600" />,  bg: 'bg-blue-50',   change: '+2 this week' },
    { label: 'Applications',   value: totalApps, icon: <FileText size={20} className="text-purple-600" />, bg: 'bg-purple-50', change: `${pending} pending` },
    { label: 'Hired',          value: hired,     icon: <Users size={20} className="text-green-600" />,     bg: 'bg-green-50',  change: 'this month' },
    { label: 'In Review',      value: appsData?.results.filter(a => a.status === 'in_review').length ?? 0,
      icon: <Clock size={20} className="text-amber-600" />, bg: 'bg-amber-50', change: 'need attention' },
  ]

  const actions = [
    { icon: <PlusCircle size={18} />, label: 'Post a Job', desc: 'Create a new job offer', to: '/dashboard/jobs/create', color: 'text-blue-600 bg-blue-50' },
    { icon: <FileText size={18} />, label: 'Review Applications', desc: 'Process pending submissions', to: '/dashboard/applications', color: 'text-purple-600 bg-purple-50' },
    { icon: <TrendingUp size={18} />, label: 'View All Jobs', desc: 'Manage existing positions', to: '/dashboard/jobs', color: 'text-green-600 bg-green-50' },
  ]

  return (
    <div className="flex flex-col gap-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {user?.first_name}
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Manage your organisation's recruitment pipeline end-to-end.
          </p>
        </div>
        <Link
          to="/dashboard/jobs/create"
          className="hidden sm:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <PlusCircle size={15} /> Post a Job
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label} className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>
              {s.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.change}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <Card>
          <h2 className="font-semibold text-slate-900 mb-4">Quick Actions</h2>
          <div className="flex flex-col gap-2">
            {actions.map(a => (
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

        {/* Recent jobs */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">Recent Job Offers</h2>
              <Link to="/dashboard/jobs" className="text-xs text-blue-600 hover:text-blue-700 font-medium">View all →</Link>
            </div>
            {(jobsData?.results ?? []).length === 0 ? (
              <div className="py-8 text-center">
                <Briefcase size={28} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No jobs posted yet</p>
                <Link to="/dashboard/jobs/create" className="text-xs text-blue-600 font-medium mt-1 inline-block">Post your first job →</Link>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-slate-100">
                {(jobsData?.results ?? []).slice(0, 5).map(job => (
                  <Link
                    key={job.id}
                    to={`/jobs/${job.slug}`}
                    className="flex items-center gap-3 py-3 hover:bg-slate-50 -mx-1 px-1 rounded transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <Briefcase size={15} className="text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{job.title}</p>
                      <p className="text-xs text-slate-500">{job.location} · {job.contract_type.toUpperCase()}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${job.status === 'open' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                      {job.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
