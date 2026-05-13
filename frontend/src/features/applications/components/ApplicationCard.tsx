/**
 * ApplicationCard — card for candidate's application tracker — light mode.
 */
import type { Application } from '@/features/applications/api'
import { Badge, Card, Divider } from '@/components/ui'
import { MapPin, Calendar, FileText, ExternalLink, Info } from 'lucide-react'

interface Props {
  application: Application
}

const STATUS_STEPS = ['pending', 'in_review', 'shortlisted', 'hired']

const STATUS_CONFIG: Record<string, { variant: 'default' | 'blue' | 'purple' | 'green' | 'red'; label: string }> = {
  pending:     { variant: 'default', label: 'Pending' },
  in_review:   { variant: 'blue',    label: 'In Review' },
  shortlisted: { variant: 'purple',  label: 'Shortlisted' },
  hired:       { variant: 'green',   label: 'Hired' },
  rejected:    { variant: 'red',     label: 'Not Selected' },
}

export default function ApplicationCard({ application }: Props) {
  const stepIndex = STATUS_STEPS.indexOf(application.status)
  const isTerminal = ['hired', 'rejected'].includes(application.status)
  const conf       = STATUS_CONFIG[application.status] ?? { variant: 'default', label: application.status }

  return (
    <Card hover className="flex flex-col gap-4">
      {/* Top Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1 overflow-hidden">
          <h3 className="font-bold text-slate-900 truncate pr-2">
            {application.job?.title ?? 'Position'}
          </h3>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="flex items-center gap-1"><MapPin size={12} /> {application.job?.location ?? 'Remote'}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(application.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <Badge variant={conf.variant} dot>{conf.label}</Badge>
      </div>

      <Divider />

      {/* Progress Tracker */}
      {!isTerminal ? (
        <div className="space-y-3">
          <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
            <span>Applied</span>
            <span>Review</span>
            <span>Shortlist</span>
            <span>Final</span>
          </div>
          <div className="flex items-center gap-1 px-1">
            {STATUS_STEPS.map((step, i) => (
              <div key={step} className="flex items-center gap-1 flex-1 last:flex-none last:w-1.5">
                <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i <= stepIndex ? 'bg-blue-600' : 'bg-slate-100'}`} />
                {i < STATUS_STEPS.length - 1 && (
                   <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${i < stepIndex ? 'bg-blue-600' : 'bg-slate-100'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={`flex items-start gap-3 p-3 rounded-lg border shadow-sm ${application.status === 'hired' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
          <div className="pt-0.5"><Info size={14} /></div>
          <p className="text-xs leading-relaxed">
            {application.status === 'hired' 
              ? 'Congratulations! You have been selected for this position. The HR team will contact you shortly.' 
              : 'Thank you for your interest. We have decided to move forward with other candidates at this time.'
            }
          </p>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between mt-auto pt-1">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
           <FileText size={14} /> 
           <span className="font-medium">My Submission</span>
        </div>
        {application.cv_url && (
          <a
            href={application.cv_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
          >
            Review CV <ExternalLink size={12} />
          </a>
        )}
      </div>
    </Card>
  )
}
