/**
 * CreateJobPage — post a new job offer.
 *
 * Route:  /dashboard/jobs/create
 * Access: admin | hr_manager | recruiter
 *
 * Delegates all form UI to shared <JobForm> — no duplication.
 */
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useCreateJob } from '@/features/jobs/hooks/useJobs'
import { type CreateJobFormData } from '@/features/jobs/schemas'
import JobForm from '@/features/jobs/components/JobForm'

export default function CreateJobPage() {
  const navigate  = useNavigate()
  const { mutateAsync, isPending } = useCreateJob()

  const handleSubmit = async (data: CreateJobFormData) => {
    try {
      await mutateAsync(data)
      toast.success('Job position published!')
      navigate('/dashboard/jobs')
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        'Failed to create job.'
      toast.error(detail)
    }
  }

  return (
    <JobForm
      mode="create"
      onSubmit={handleSubmit}
      isPending={isPending}
      onCancel={() => navigate('/dashboard/jobs')}
    />
  )
}
