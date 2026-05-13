import { format } from 'date-fns';
import { 
  Calendar, 
  ExternalLink, 
  ClipboardCheck, 
  MoreHorizontal,
  Mail,
  User as UserIcon,
  Briefcase
} from 'lucide-react';
import { 
  Button, 
  Badge, 
  Spinner, 
  EmptyState, 
  Card 
} from '@/components/ui';
import type { Interview } from '../types';
import InterviewStatusBadge from './InterviewStatusBadge';
import InterviewTypeIcon from './InterviewTypeIcon';

interface InterviewsTableProps {
  interviews: Interview[];
  isLoading: boolean;
  onEvaluate?: (interview: Interview) => void;
  onViewDetails?: (interview: Interview) => void;
}

export function InterviewsTable({ 
  interviews, 
  isLoading, 
  onEvaluate,
  onViewDetails 
}: InterviewsTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size={32} />
      </div>
    );
  }

  if (interviews.length === 0) {
    return (
      <EmptyState
        icon={<Calendar size={24} />}
        title="No interviews found"
        description="Schedule a new interview to get started."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm text-left bg-white">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-5 py-3 font-semibold text-slate-700">Interview</th>
            <th className="px-5 py-3 font-semibold text-slate-700">Candidate</th>
            <th className="px-5 py-3 font-semibold text-slate-700">Type</th>
            <th className="px-5 py-3 font-semibold text-slate-700">Status</th>
            <th className="px-5 py-3 font-semibold text-slate-700">Date & Time</th>
            <th className="px-5 py-3 font-semibold text-slate-700 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {interviews.map((interview) => (
            <tr key={interview.id} className="hover:bg-slate-50 transition-colors group">
              <td className="px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <InterviewTypeIcon type={interview.interview_type} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 leading-tight">
                      {interview.job_title}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <UserIcon size={10} /> {interview.recruiter_name}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-4">
                <div>
                  <p className="font-medium text-slate-900 leading-tight">
                    {interview.candidate_name}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Mail size={10} /> {interview.candidate_email}
                  </p>
                </div>
              </td>
              <td className="px-5 py-4">
                <span className="capitalize text-slate-600">
                  {interview.interview_type}
                </span>
              </td>
              <td className="px-5 py-4">
                <InterviewStatusBadge status={interview.status} />
              </td>
              <td className="px-5 py-4">
                <div>
                  <p className="text-slate-900 font-medium">
                    {format(new Date(interview.scheduled_at), 'dd MMM yyyy')}
                  </p>
                  <p className="text-xs text-slate-500">
                    {format(new Date(interview.scheduled_at), 'HH:mm')} ({interview.duration_minutes}m)
                  </p>
                </div>
              </td>
              <td className="px-5 py-4 text-right">
                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {interview.status === 'completed' && !interview.has_evaluation && onEvaluate && (
                    <Button 
                      variant="primary" 
                      size="sm" 
                      onClick={() => onEvaluate(interview)}
                      icon={<ClipboardCheck size={14} />}
                    >
                      Evaluate
                    </Button>
                  )}
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => onViewDetails?.(interview)}
                    icon={<MoreHorizontal size={14} />}
                  >
                    Details
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
