/**
 * Admin Dashboard — light-mode redesign.
 */
import { useAuthStore } from '@/store/authStore'
import { Card, Button, Divider, Badge } from '@/components/ui'
import { 
  Users, Briefcase, UserCheck, Calendar, 
  Settings, Shield, Activity, BarChart,
  PlusCircle, ArrowRight
} from 'lucide-react'
import { Link } from 'react-router-dom'

export default function AdminDashboard() {
  const { user } = useAuthStore()

  const stats = [
    { label: 'Total Users',      value: '24', icon: <Users size={20} className="text-blue-600" />,     bg: 'bg-blue-50' },
    { label: 'Active Jobs',      value: '12', icon: <Briefcase size={20} className="text-emerald-600" />, bg: 'bg-emerald-50' },
    { label: 'Candidate Pool',   value: '158', icon: <UserCheck size={20} className="text-purple-600" />, bg: 'bg-purple-50' },
    { label: 'System Health',    value: '99%', icon: <Activity size={20} className="text-emerald-600" />,  bg: 'bg-emerald-50' },
  ]

  const actions = [
    { icon: <PlusCircle size={18} />, label: 'Create User', desc: 'Add new staff member', to: '/dashboard/admin/users', color: 'text-blue-600 bg-blue-50' },
    { icon: <Settings size={18} />, label: 'Platform Config', desc: 'Global app settings', to: '#', color: 'text-slate-600 bg-slate-50' },
    { icon: <Shield size={18} />, label: 'Security Audit', desc: 'Review system logs', to: '#', color: 'text-red-600 bg-red-50' },
    { icon: <BarChart size={18} />, label: 'Growth Reports', desc: 'Platform usage metrics', to: '#', color: 'text-purple-600 bg-purple-50' },
  ]

  return (
    <div className="flex flex-col gap-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            System Console
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Control center for {user?.first_name}. Monitor platform health and manage user access.
          </p>
        </div>
        <div className="flex gap-2">
           <Button variant="secondary" icon={<Settings size={15} />}>Settings</Button>
           <Link to="/dashboard/admin/users"><Button icon={<PlusCircle size={15} />}>Add User</Button></Link>
        </div>
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
              <p className="text-xs text-slate-500 font-medium">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <h2 className="font-bold text-slate-900 mb-5">Administrator Actions</h2>
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
                    <p className="text-sm font-bold text-slate-800">{a.label}</p>
                    <p className="text-xs text-slate-500">{a.desc}</p>
                  </div>
                  <ArrowRight size={14} className="text-slate-400 group-hover:text-slate-900 transition-colors" />
                </Link>
              ))}
            </div>
          </Card>

          <Card className="bg-slate-900 border-none text-white p-6 shadow-xl">
             <div className="flex items-center gap-2 mb-4">
                <Shield className="text-blue-400" size={20} />
                <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Security Pulse</span>
             </div>
             <p className="text-sm font-medium mb-1">Backup status: OK</p>
             <p className="text-xs text-slate-400">Last full system backup performed 2 hours ago. 0 critical vulnerabilities reported.</p>
          </Card>
        </div>

        {/* Real-time feed placeholder */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-slate-900">Recent System Activity</h2>
              <Badge variant="blue" dot>Live Sync</Badge>
            </div>
            
            <div className="space-y-4">
               {[
                 { user: 'HR Manager', action: 'Published new job: Senior Product Designer', time: '10m ago', icon: <PlusCircle size={14} /> },
                 { user: 'Recruiter', action: 'Scheduled interview with Sarah Connor', time: '1h ago', icon: <Calendar size={14} /> },
                 { user: 'System', action: 'AI analysis completed for 12 new CVs', time: '3h ago', icon: <Activity size={14} /> },
                 { user: 'Admin', action: 'Modified role permissions for candidate group', time: '5h ago', icon: <Shield size={14} /> },
               ].map((log, i) => (
                 <div key={i}>
                    <div className="flex items-start gap-4">
                       <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 shrink-0">
                          {log.icon}
                       </div>
                       <div className="flex-1">
                          <p className="text-sm font-bold text-slate-800 line-clamp-1">{log.action}</p>
                          <p className="text-xs text-slate-500">by {log.user} • {log.time}</p>
                       </div>
                    </div>
                    {i < 3 && <Divider className="mt-4" />}
                 </div>
               ))}
            </div>
            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
               <button className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">View detailed audit logs →</button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
