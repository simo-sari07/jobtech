/**
 * MyApplicationsPage — candidate's personal application tracker — light mode.
 */
import { useMyApplications } from '@/features/applications/hooks/useApplications'
import ApplicationCard from '@/features/applications/components/ApplicationCard'
import { Link } from 'react-router-dom'
import { FileText, Search, TrendingUp, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { Card, Button, Spinner, Divider } from '@/components/ui'

export default function MyApplicationsPage() {
  const { data, isLoading, isError } = useMyApplications()

  const stats = data ? [
    { label: 'Pending',     count: data.results.filter(a => a.status === 'pending').length, color: 'text-slate-400', bg: 'bg-slate-50', icon: <Clock size={16} /> },
    { label: 'In Review',   count: data.results.filter(a => a.status === 'in_review').length, color: 'text-blue-500', bg: 'bg-blue-50', icon: <Search size={16} /> },
    { label: 'Shortlisted', count: data.results.filter(a => a.status === 'shortlisted').length, color: 'text-purple-500', bg: 'bg-purple-50', icon: <TrendingUp size={16} /> },
    { label: 'Hired',       count: data.results.filter(a => a.status === 'hired').length, color: 'text-emerald-500', bg: 'bg-emerald-50', icon: <CheckCircle2 size={16} /> },
    { label: 'Rejected',    count: data.results.filter(a => a.status === 'rejected').length, color: 'text-red-500', bg: 'bg-red-50', icon: <XCircle size={16} /> },
  ] : []

  return (
    <div className="flex flex-col gap-6 animate-fade-up max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Applications</h1>
          <p className="mt-1 text-sm text-slate-500">
            {data ? `Tracking ${data.count} submissions` : 'Retrieving your history…'}
          </p>
        </div>
        <Link to="/jobs">
          <Button variant="primary" icon={<Search size={16} />}>
            Find More Jobs
          </Button>
        </Link>
      </div>

      {/* Summary Chips */}
      {data && data.count > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {stats.map(s => (
            <div key={s.label} className={`flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white shadow-sm`}>
              <div className={`p-2 rounded-lg ${s.bg} ${s.color}`}>{s.icon}</div>
              <div>
                <p className="text-sm font-bold text-slate-900 leading-tight">{s.count}</p>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Divider />

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1,2,3,4].map(i => <div key={i} className="h-48 skeleton" />)}
        </div>
      ) : isError ? (
        <Card className="text-center py-10 border-red-100 bg-red-50">
           <XCircle className="mx-auto text-red-400 mb-2" size={32} />
           <p className="text-sm text-red-600 font-medium">Failed to retrieve applications.</p>
           <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>Retry</Button>
        </Card>
      ) : data && data.count === 0 ? (
        <Card className="text-center py-20 border-dashed">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText size={32} />
            </div>
            <h2 className="text-lg font-bold text-slate-900">No applications found</h2>
            <p className="text-sm text-slate-500 max-w-xs mx-auto mb-6">You haven't applied to any positions yet. Start your journey by browsing open roles.</p>
            <Link to="/jobs">
              <Button>Browse Open Roles</Button>
            </Link>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data?.results.map(app => (
            <ApplicationCard key={app.id} application={app} />
          ))}
        </div>
      )}
    </div>
  )
}
