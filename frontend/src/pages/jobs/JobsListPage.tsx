/**
 * JobsListPage — light-mode, role-aware job listing.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Filter, PlusCircle, Briefcase } from 'lucide-react'
import { useJobs } from '@/features/jobs/hooks/useJobs'
import { useAuthStore } from '@/store/authStore'
import { Button, Card, EmptyState, Spinner } from '@/components/ui'
import JobCard from '@/features/jobs/components/JobCard'

const CONTRACT_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'cdi', label: 'Permanent (CDI)' },
  { value: 'cdd', label: 'Fixed-term (CDD)' },
  { value: 'internship', label: 'Internship' },
  { value: 'freelance', label: 'Freelance' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'draft', label: 'Draft' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'closed', label: 'Closed' },
]

export default function JobsListPage() {
  const { user } = useAuthStore()
  const isManager = user?.role && ['admin', 'hr_manager', 'recruiter'].includes(user.role)

  const [search, setSearch]             = useState('')
  const [contractType, setContractType] = useState('')
  const [status, setStatus]             = useState('')
  const [page, setPage]                 = useState(1)

  const { data, isLoading, isError } = useJobs({
    search:        search || undefined,
    contract_type: contractType || undefined,
    status:        status || undefined,
    page,
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {isManager ? 'Job Offers' : 'Browse Jobs'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {data ? `${data.count} position${data.count !== 1 ? 's' : ''} found` : 'Loading positions…'}
          </p>
        </div>
          {isManager && (
          <Link to="/dashboard/jobs/create">
            <Button icon={<PlusCircle size={15} />}>Post a Job</Button>
          </Link>
        )}

      </div>

      {/* Filter bar */}
      <Card padding="sm" className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title or location…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400 flex-shrink-0" />
          <select
            value={contractType}
            onChange={e => { setContractType(e.target.value); setPage(1) }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-blue-400 pr-8 transition-all"
          >
            {CONTRACT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {isManager && (
            <select
              value={status}
              onChange={e => { setStatus(e.target.value); setPage(1) }}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-blue-400 pr-8 transition-all"
            >
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}
        </div>
      </Card>

      {/* Loading */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 rounded-xl skeleton" />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <Card className="text-center py-8">
          <p className="text-sm text-red-600 font-medium">Failed to load jobs. Please try again.</p>
        </Card>
      )}

      {/* Empty */}
      {data && data.results.length === 0 && !isLoading && (
        <Card>
          <EmptyState
            icon={<Briefcase size={20} />}
            title="No jobs found"
            description="Try adjusting your filters or search term."
            action={isManager ? (
              <Link to="/dashboard/jobs/create">
                <Button size="sm" variant="secondary">Post a Job</Button>
              </Link>
            ) : undefined}
          />
        </Card>
      )}

      {/* Grid */}
      {data && data.results.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.results.map(job => (
              <JobCard key={job.id} job={job} showActions={!!isManager} />
            ))}
          </div>

          {/* Pagination */}
          {(data.previous || data.next) && (
            <div className="flex justify-center items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                disabled={!data.previous}
                onClick={() => setPage(p => p - 1)}
              >
                ← Previous
              </Button>
              <span className="text-sm text-slate-500 px-2">Page {page}</span>
              <Button
                variant="secondary"
                size="sm"
                disabled={!data.next}
                onClick={() => setPage(p => p + 1)}
              >
                Next →
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
