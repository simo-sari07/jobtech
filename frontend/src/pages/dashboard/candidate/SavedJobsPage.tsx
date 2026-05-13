/**
 * SavedJobsPage — /dashboard/candidate/saved-jobs
 * Lists all bookmarked jobs with apply + remove actions.
 */
import { Heart, Briefcase, MapPin, Clock, ArrowRight, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSavedJobs, useToggleSavedJob } from '@/features/candidates/hooks'
import { Card, Spinner, EmptyState, Button } from '@/components/ui'
import type { SavedJob } from '@/features/candidates/types'

export default function SavedJobsPage() {
  const { data, isLoading } = useSavedJobs()
  const toggle = useToggleSavedJob()

  const saved = data?.results ?? []

  if (isLoading) {
    return <div className="flex items-center justify-center h-48"><Spinner size={28} /></div>
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-5 animate-fade-up">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Saved Jobs</h1>
        <p className="text-sm text-slate-500 mt-1">
          {saved.length > 0
            ? `${saved.length} job${saved.length === 1 ? '' : 's'} saved — apply when you're ready.`
            : 'Browse open positions and save the ones you like.'}
        </p>
      </div>

      {/* Empty */}
      {saved.length === 0 && (
        <Card>
          <EmptyState
            icon={<Heart size={20} />}
            title="No saved jobs yet"
            description="Browse open jobs and click the heart icon to save them here."
            action={
              <Link to="/jobs">
                <Button variant="secondary" size="sm" icon={<Briefcase size={14} />}>
                  Browse Jobs
                </Button>
              </Link>
            }
          />
        </Card>
      )}

      {/* Job cards */}
      {saved.map(s => (
        <SavedJobCard
          key={s.id}
          savedJob={s}
          onRemove={() => toggle.mutate(s.job.id)}
          isRemoving={toggle.isPending}
        />
      ))}
    </div>
  )
}

function SavedJobCard({
  savedJob,
  onRemove,
  isRemoving,
}: {
  savedJob: SavedJob
  onRemove: () => void
  isRemoving: boolean
}) {
  const { job } = savedJob
  const savedDate = new Date(savedJob.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <Card>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
          <Briefcase size={18} className="text-blue-600" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">{job.title}</h3>
              {job.location && (
                <div className="flex items-center gap-1.5 mt-1">
                  <MapPin size={12} className="text-slate-400" />
                  <span className="text-xs text-slate-500">{job.location}</span>
                </div>
              )}
            </div>
            <button
              onClick={onRemove}
              disabled={isRemoving}
              title="Remove from saved"
              className="text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50 shrink-0"
            >
              <Trash2 size={15} />
            </button>
          </div>

          <div className="flex items-center gap-1.5 mt-2">
            <Clock size={11} className="text-slate-400" />
            <span className="text-xs text-slate-400">Saved {savedDate}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
        <Link
          to={`/jobs/${job.slug}`}
          className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 transition-colors"
        >
          View details <ArrowRight size={12} />
        </Link>
        <div className="flex-1" />
        <Link to={`/jobs/${job.slug}`}>
          <Button size="sm" icon={<ArrowRight size={13} />}>
            Apply Now
          </Button>
        </Link>
      </div>
    </Card>
  )
}
