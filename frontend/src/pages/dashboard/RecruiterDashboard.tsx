/**
 * Recruiter Dashboard — light-mode redesign.
 */
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useJobs } from '@/features/jobs/hooks/useJobs'
import { useApplications } from '@/features/applications/hooks/useApplications'
import { Card, Button, Divider } from '@/components/ui'
import { Briefcase, Calendar, Star, CheckCircle, PlusCircle, ArrowRight, UserCheck } from 'lucide-react'

export default function RecruiterDashboard() {
  const { user } = useAuthStore()
  const { data: jobsData } = useJobs({})
  const { data: appsData } = useApplications({})

  const myJobs      = jobsData?.count ?? 0
  const totalApps   = appsData?.count ?? 0
  const pending     = appsData?.results.filter(a => a.status === 'pending').length ?? 0
  const hired       = appsData?.results.filter(a => a.status === 'hired').length ?? 0

  const stats = [
    { label: 'My Job Offers',  value: myJobs,  icon: <Briefcase size={20} className="text-blue-600" />,  bg: 'bg-blue-50',   sub: 'Active postings' },
    { label: 'Total Apps',     value: totalApps, icon: <UserCheck size={20} className="text-purple-600" />, bg: 'bg-purple-50', sub: `${pending} need review` },
    { label: 'Interviews',     value: '—',       icon: <Calendar size={20} className="text-amber-600" />,  bg: 'bg-amber-50',  sub: 'Scheduled today' },
    { label: 'Placements',    value: hired,     icon: <CheckCircle size={20} className="text-green-600" />, bg: 'bg-green-50', sub: 'Total hired' },
  ]

  const actions = [
    { icon: <PlusCircle size={18} />, label: 'New Job Offer', desc: 'Create and publish', to: '/dashboard/jobs/create', color: 'text-blue-600 bg-blue-50' },
    { icon: <Calendar size={18} />, label: 'Scheduler', desc: 'Manage your time', to: '#', color: 'text-amber-600 bg-amber-50' },
    { icon: <Star size={18} />, label: 'Evaluations', desc: 'Review candidates', to: '/dashboard/applications', color: 'text-teal-600 bg-teal-50' },
  ]

  return (
    <div className="flex flex-col gap-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Hey, {user?.first_name} 👋
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Track your candidate pipeline and prepare for upcoming interviews.
          </p>
        </div>
        <Link to="/dashboard/jobs/create">
          <Button icon={<PlusCircle size={15} />}>Post a Job</Button>
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
              <p className="text-[10px] text-slate-400 mt-0.5 uppercase font-bold tracking-tight">{s.sub}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <Card className="flex flex-col h-full">
          <h2 className="font-bold text-slate-900 mb-5">Recruiter Hub</h2>
          <div className="flex flex-col gap-2 flex-1">
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
                  <p className="text-sm font-bold text-slate-800">{a.label}</p>
                  <p className="text-xs text-slate-500">{a.desc}</p>
                </div>
                <ArrowRight size={14} className="text-slate-400 group-hover:text-slate-900 transition-colors" />
              </Link>
            ))}
          </div>
          <div className="mt-6 pt-5 border-t border-slate-100">
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3 px-1">Upcoming for you</p>
             <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 italic text-xs text-slate-500 text-center">
                Sync your calendar to see meetings here.
             </div>
          </div>
        </Card>

        {/* Applications table summary */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-slate-900">Pipeline Pulse</h2>
              <Link to="/dashboard/applications" className="text-xs font-bold text-blue-600 hover:text-blue-800">
                Full list →
              </Link>
            </div>
            
            {appsData && appsData.results.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-3">
                 <UserCheck size={40} className="mx-auto opacity-20" />
                 <p className="text-sm font-medium">No active applications to manage.</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                      <th className="px-5 py-2 text-left">Candidate</th>
                      <th className="px-5 py-2 text-left">Job</th>
                      <th className="px-5 py-2 text-center">Score</th>
                      <th className="px-5 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {appsData?.results.slice(0, 6).map(app => (
                      <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 whitespace-nowrap">
                          <p className="font-bold text-slate-800">{app.candidate_name}</p>
                          <p className="text-[10px] text-slate-400">{app.candidate_email}</p>
                        </td>
                        <td className="px-5 py-3 text-slate-500 max-w-[140px] truncate">{app.job_title}</td>
                        <td className="px-5 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            Number(app.ai_score) >= 70 ? 'bg-emerald-50 text-emerald-600' : 
                            Number(app.ai_score) >= 40 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'
                          }`}>
                            {app.ai_score ?? '--'}%
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link to={`/dashboard/applications?job=${app.job?.id}`} className="p-1 rounded bg-slate-100 text-slate-400 hover:bg-blue-600 hover:text-white transition-all inline-block">
                             <ArrowRight size={12} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
