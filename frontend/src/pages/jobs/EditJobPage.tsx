/**
 * EditJobPage — edit an existing job offer.
 *
 * Route:  /dashboard/jobs/:id/edit
 * Access: admin | hr_manager | recruiter  (enforced by ProtectedRoute in router)
 *
 * Flow:
 *   1. Read :id from URL params
 *   2. Fetch job via useJob(id)
 *   3. Show skeleton while loading
 *   4. Pre-fill shared <JobForm> with fetched data
 *   5. On submit → PATCH /api/v1/jobs/offers/:id/
 *   6. Success → toast + redirect to /dashboard/jobs
 */
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useJob, useUpdateJob } from '@/features/jobs/hooks/useJobs'
import { type CreateJobFormData } from '@/features/jobs/schemas'
import JobForm from '@/features/jobs/components/JobForm'

// ── Loading skeleton that mirrors the form layout ───────────────────────────
function EditJobSkeleton() {
  return (
    <div className="max-w-4xl mx-auto animate-pulse space-y-8 pb-20">
      {/* Header skeleton */}
      <div className="flex items-end justify-between gap-6 mb-8 px-2">
        <div className="space-y-3">
          <div className="h-3 w-32 bg-slate-200 rounded-full" />
          <div className="h-8 w-72 bg-slate-200 rounded-xl" />
          <div className="h-3 w-56 bg-slate-200 rounded-full" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-24 bg-slate-100 rounded-xl" />
          <div className="h-10 w-36 bg-slate-200 rounded-xl" />
        </div>
      </div>
      {/* Section skeletons */}
      {[1, 2, 3].map(i => (
        <div key={i} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-2">
            <div className="h-4 w-36 bg-slate-200 rounded-full" />
            <div className="h-3 w-48 bg-slate-100 rounded-full" />
          </div>
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
            <div className="h-10 bg-slate-100 rounded-xl" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-10 bg-slate-100 rounded-xl" />
              <div className="h-10 bg-slate-100 rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function EditJobPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // ── Data fetching ─────────────────────────────────────────────────────────
  const { data: job, isLoading, isError } = useJob(id)
  const { mutateAsync, isPending } = useUpdateJob(id!)

  // ── Error state ───────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={24} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Job not found</h2>
        <p className="text-sm text-slate-500 mb-6">
          This job offer may have been deleted or you don't have permission to edit it.
        </p>
        <button
          onClick={() => navigate('/dashboard/jobs')}
          className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors"
        >
          ← Back to Jobs
        </button>
      </div>
    )
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading || !job) {
    return <EditJobSkeleton />
  }

  // ── Map Job → form default values ─────────────────────────────────────────
  const defaultValues: Partial<CreateJobFormData> = {
    title:            job.title,
    description:      job.description,
    contract_type:    job.contract_type,
    location:         job.location,
    experience_years: job.experience_years,
    salary_min:       job.salary_min ?? undefined,
    salary_max:       job.salary_max ?? undefined,
    deadline:         job.deadline ?? undefined,
    status:           job.status === 'open' || job.status === 'draft' ? job.status : 'open',
    skill_ids:        job.skills.map(s => s.id),
  }

  // ── Submit handler ────────────────────────────────────────────────────────
  const handleSubmit = async (data: CreateJobFormData) => {
    try {
      await mutateAsync(data)
      toast.success('Job updated successfully!')
      navigate('/dashboard/jobs')
    } catch (err: any) {
      // Surface field-level errors from Django if available
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        'Failed to update job. Please check your inputs.'
      toast.error(detail)
    }
  }

  return (
    <JobForm
      mode="edit"
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isPending={isPending}
      onCancel={() => navigate('/dashboard/jobs')}
    />
  )
}
