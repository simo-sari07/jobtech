/**
 * JobDetailPage (Public) — /jobs/:slug
 * Full job offer detail for candidates.
 *
 * Layout: 2-column
 *   LEFT  — job title, description, skills, details
 *   RIGHT — sticky apply card
 */
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { ArrowLeft, MapPin, Briefcase, Award, Banknote, Calendar, Clock } from 'lucide-react'
import { usePublicJob } from '@/features/public/hooks/usePublicJob'
import { useAuthStore } from '@/store/authStore'
import ApplyButton from '@/features/public/components/ApplyButton'
import ApplyModal from '@/features/public/components/ApplyModal'
import toast from 'react-hot-toast'

const CONTRACT_LABELS: Record<string, string> = {
  cdi: 'Permanent (CDI)', cdd: 'Fixed-term (CDD)',
  internship: 'Internship', freelance: 'Freelance',
}

function JobDetailSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      <div className="h-4 w-32 bg-gray-200 rounded mb-6" />
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-4">
          <div className="h-8 w-3/4 bg-gray-200 rounded" />
          <div className="h-4 w-1/2 bg-gray-100 rounded" />
          <div className="h-48 bg-gray-100 rounded-xl mt-6" />
        </div>
        <div className="lg:w-72 h-64 bg-gray-100 rounded-xl" />
      </div>
    </div>
  )
}

export default function JobDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, user } = useAuthStore()
  const [applyOpen, setApplyOpen] = useState(false)

  const { data: job, isLoading, isError } = usePublicJob(slug)

  if (isLoading) return <JobDetailSkeleton />

  if (isError || !job) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Briefcase size={28} className="text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Position not found</h1>
        <p className="text-gray-500 mb-6">This job may have been removed or is no longer accepting applications.</p>
        <Link 
          to={isAuthenticated && user?.role !== 'candidate' ? "/dashboard/jobs" : "/jobs"} 
          className="inline-flex items-center gap-2 text-blue-600 font-medium hover:underline"
        >
          <ArrowLeft size={16} /> Browse all jobs
        </Link>
      </div>
    )
  }

  const handleApply = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } })
      return
    }
    setApplyOpen(true)
  }

  const isStaff = isAuthenticated && user?.role !== 'candidate'
  const postedDate = new Date(job.created_at).toLocaleDateString('en-GB', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <Link
        to={isStaff ? "/dashboard/jobs" : "/jobs"}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors mb-6"
      >
        <ArrowLeft size={15} /> Back to jobs
      </Link>

      <div className="flex flex-col lg:flex-row gap-8">

        {/* ── Left: Main Content ── */}
        <div className="flex-1 min-w-0">

          {/* Job header */}
          <div className="mb-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0">
                {job.title.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                  {job.title}
                </h1>
                <p className="text-gray-500 mt-0.5">{job.company_name}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600">
              <span className="flex items-center gap-1.5">
                <MapPin size={14} className="text-gray-400" /> {job.location}
              </span>
              <span className="flex items-center gap-1.5">
                <Briefcase size={14} className="text-gray-400" />
                {CONTRACT_LABELS[job.contract_type] ?? job.contract_type}
              </span>
              {job.experience_years > 0 && (
                <span className="flex items-center gap-1.5">
                  <Award size={14} className="text-gray-400" />
                  {job.experience_years}+ years experience
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-gray-400" />
                Posted {postedDate}
              </span>
            </div>
          </div>

          {/* Skills */}
          {job.skills.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Required Skills</h2>
              <div className="flex flex-wrap gap-2">
                {job.skills.map(s => (
                  <span
                    key={s.id}
                    className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full border border-blue-100"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <h2 className="font-bold text-gray-900 mb-4">Job Description</h2>
            <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
              {job.description}
            </div>
          </div>

          {/* Mobile apply button */}
          <div className="lg:hidden mt-6">
            <ApplyButton job={job} onApply={handleApply} size="lg" fullWidth />
            {isStaff && (
              <p className="text-xs text-center text-gray-400 mt-2">
                Signed in as {user?.role?.replace('_', ' ')} — switch to a candidate account to apply.
              </p>
            )}
          </div>
        </div>

        {/* ── Right: Sticky Apply Card ── */}
        <aside className="lg:w-72 shrink-0">
          <div className="sticky top-20 space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-4">Job Summary</h2>

              <div className="space-y-3 mb-5">
                {job.salary_min && job.salary_max && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
                      <Banknote size={15} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium">Salary</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {job.salary_min.toLocaleString()}–{job.salary_max.toLocaleString()} DH/month
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center shrink-0">
                    <Calendar size={15} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Deadline</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {job.deadline
                        ? new Date(job.deadline).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'Open until filled'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                    <Award size={15} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Experience</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {job.experience_years > 0 ? `${job.experience_years}+ years` : 'Not specified'}
                    </p>
                  </div>
                </div>
              </div>

              <hr className="border-gray-100 mb-4" />

              <ApplyButton job={job} onApply={handleApply} size="lg" fullWidth />

              {!isAuthenticated && (
                <p className="text-xs text-center text-gray-400 mt-3">
                  Already have an account?{' '}
                  <Link to="/login" state={{ from: location }} className="text-blue-600 hover:underline">
                    Sign in
                  </Link>
                </p>
              )}

              {isStaff && (
                <p className="text-xs text-center text-gray-400 mt-3">
                  Signed in as {user?.role?.replace('_', ' ')}. Candidates only can apply.
                </p>
              )}
            </div>

            {/* Tip card */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-700 mb-1">💡 Pro Tip</p>
              <p className="text-xs text-blue-600 leading-relaxed">
                Tailor your CV to the skills listed. AI-matched profiles are 3× more likely to be shortlisted.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Apply Modal */}
      <ApplyModal
        isOpen={applyOpen}
        onClose={() => setApplyOpen(false)}
        job={job}
        onSuccess={() => {
          toast.success('Application submitted successfully!')
        }}
      />
    </div>
  )
}
