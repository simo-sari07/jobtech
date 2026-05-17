/**
 * Admin Dashboard — light-mode redesign with real data integration.
 */
import { useAuthStore } from '@/store/authStore'
import { Card, Button, Badge } from '@/components/ui'
import { 
  Users, Briefcase, UserCheck, Settings, 
  PlusCircle, Eye, AlertCircle
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useUserStats } from '@/features/users/hooks/useUsers'
import { useJobs } from '@/features/jobs/hooks/useJobs'
import { useApplications } from '@/features/applications/hooks/useApplications'

// ── Status Config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, {
  label: string
  bg: string
  text: string
  dot: string
}> = {
  pending:     { label: 'Pending',     bg: 'bg-slate-50',  text: 'text-slate-600', dot: 'bg-slate-400' },
  in_review:   { label: 'In Review',   bg: 'bg-blue-50',   text: 'text-blue-700',  dot: 'bg-blue-500' },
  shortlisted: { label: 'Shortlisted', bg: 'bg-purple-50', text: 'text-purple-700',dot: 'bg-purple-500' },
  interview:   { label: 'Interview',   bg: 'bg-teal-50',   text: 'text-teal-700',  dot: 'bg-teal-500' },
  hired:       { label: 'Hired',       bg: 'bg-green-50',  text: 'text-green-700', dot: 'bg-green-500' },
  rejected:    { label: 'Rejected',    bg: 'bg-red-50',    text: 'text-red-700',   dot: 'bg-red-500' },
  withdrawn:   { label: 'Withdrawn',   bg: 'bg-amber-50',  text: 'text-amber-700', dot: 'bg-amber-500' },
}

// ── Score Helpers ─────────────────────────────────────────────────────────────

function scoreColor(s: number): string {
  if (s >= 80) return 'bg-green-500'
  if (s >= 60) return 'bg-blue-500'
  if (s >= 40) return 'bg-amber-500'
  return 'bg-red-400'
}

function scoreTextColor(s: number): string {
  if (s >= 80) return 'text-green-700'
  if (s >= 60) return 'text-blue-700'
  if (s >= 40) return 'text-amber-700'
  return 'text-red-600'
}

export default function AdminDashboard() {
  const { user } = useAuthStore()

  // Real data fetching hooks
  const { data: userStats, isLoading: statsLoading } = useUserStats()
  const { data: jobsData, isLoading: jobsLoading } = useJobs()
  const { data: appsData, isLoading: appsLoading } = useApplications()

  const realStats = [
    { 
      label: 'Total Users', 
      value: userStats?.data?.total_users ?? 0, 
      icon: <Users size={20} className="text-blue-600" />, 
      bg: 'bg-blue-50', 
      loading: statsLoading 
    },
    { 
      label: 'Active Jobs', 
      value: jobsData?.count ?? 0, 
      icon: <Briefcase size={20} className="text-emerald-600" />, 
      bg: 'bg-emerald-50', 
      loading: jobsLoading 
    },
    { 
      label: 'Total Applications', 
      value: appsData?.count ?? 0, 
      icon: <UserCheck size={20} className="text-purple-600" />, 
      bg: 'bg-purple-50', 
      loading: appsLoading 
    },
  ]

  const recentApps = appsData?.results?.slice(0, 5) || []

  return (
    <div className="flex flex-col gap-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            System Console
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Control center for {user?.first_name}. Monitor platform metrics and manage user applications.
          </p>
        </div>
        <div className="flex gap-2">
           <Button variant="secondary" icon={<Settings size={15} />}>Settings</Button>
           <Link to="/dashboard/admin/users"><Button icon={<PlusCircle size={15} />}>Add User</Button></Link>
        </div>
      </div>

      {/* Real Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {realStats.map(s => (
          <Card key={s.label} className="flex items-center gap-4 p-5 hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>
              {s.icon}
            </div>
            <div className="flex-1 min-w-0">
              {s.loading ? (
                <div className="h-7 w-12 bg-slate-100 animate-pulse rounded-md mb-1" />
              ) : (
                <p className="text-2xl font-extrabold text-slate-900">{s.value}</p>
              )}
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Real Job Applications Feed */}
      <Card className="w-full p-6 shadow-sm border border-slate-200/60">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-bold text-slate-900 text-lg">Recent Job Applications</h2>
            <p className="text-xs text-slate-500 mt-0.5">Real-time candidate submissions and system analysis</p>
          </div>
          <Badge variant="blue" dot>Live Sync</Badge>
        </div>
        
        {appsLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-full" />
                  <div className="space-y-2">
                    <div className="h-4 w-28 bg-slate-100 rounded-md" />
                    <div className="h-3 w-40 bg-slate-100 rounded-md" />
                  </div>
                </div>
                <div className="h-6 w-20 bg-slate-100 rounded-full" />
              </div>
            ))}
          </div>
        ) : recentApps.length > 0 ? (
          <div className="space-y-3">
            {recentApps.map(app => {
              const cfg = STATUS_CFG[app.status] ?? STATUS_CFG.pending
              const score = app.ai_score != null ? Math.round(Number(app.ai_score)) : null

              return (
                <div 
                  key={app.id} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl hover:bg-slate-50/80 transition-colors border border-slate-100"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 text-white font-bold text-sm shadow-sm">
                      {app.candidate_name?.charAt(0)?.toUpperCase() ?? '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate text-sm">{app.candidate_name}</p>
                      <p className="text-xs text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                        <Briefcase size={12} className="text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-600">{app.job_title}</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    {/* AI Score */}
                    {score != null ? (
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${scoreTextColor(score)}`}>
                          AI: {score}%
                        </span>
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${scoreColor(score)}`} style={{ width: `${score}%` }} />
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-150 font-medium">AI Processing</span>
                    )}
                    
                    {/* Status Badge */}
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-0.5 border ${cfg.bg} ${cfg.text} border-transparent`}>
                      <span className={`w-1 h-1 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>

                    {/* View Details button */}
                    <Link to={`/dashboard/users/${app.candidate_id}`}>
                      <Button variant="secondary" size="sm" className="gap-1.5 items-center hidden sm:flex">
                        <Eye size={12} />
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="p-3 bg-slate-50 rounded-full text-slate-400 mb-3 border border-slate-100">
              <AlertCircle size={24} />
            </div>
            <h3 className="font-semibold text-slate-800 text-sm">No applications found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">Applications submitted by candidates will appear here automatically.</p>
          </div>
        )}

        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
           <Link to="/dashboard/applications">
              <button className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
                Manage all job applications →
              </button>
           </Link>
        </div>
      </Card>
    </div>
  )
}
