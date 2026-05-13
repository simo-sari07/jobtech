import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Calendar, User as UserIcon, Briefcase, ExternalLink } from 'lucide-react';
import { Button, Card, Spinner, Badge } from '@/components/ui';
import { useInterviewDetail } from '@/features/interviews/hooks/useInterviews';
import EvaluationForm from '@/features/interviews/components/EvaluationForm';
import { format } from 'date-fns';

export default function EvaluationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: interview, isLoading, error } = useInterviewDetail(id);

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Spinner size={40} />
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">Interview not found or access denied.</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Back button */}
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium"
      >
        <ChevronLeft size={16} /> Back to Interviews
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Context Card */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="sticky top-6">
            <h3 className="font-bold text-slate-900 mb-4">Session Info</h3>
            
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <UserIcon size={18} className="text-slate-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Candidate</p>
                  <p className="font-medium text-slate-900">{interview.candidate_name}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Briefcase size={18} className="text-slate-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Position</p>
                  <p className="font-medium text-slate-900">{interview.job_title}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Calendar size={18} className="text-slate-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Date</p>
                  <p className="font-medium text-slate-900">
                    {format(new Date(interview.scheduled_at), 'PPP')}
                  </p>
                  <p className="text-xs text-slate-500">
                    {format(new Date(interview.scheduled_at), 'HH:mm')} ({interview.duration_minutes}m)
                  </p>
                </div>
              </div>

              {interview.location_or_link && (
                <div className="pt-2">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Meeting Asset</p>
                  {interview.location_or_link.startsWith('http') ? (
                    <a 
                      href={interview.location_or_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 font-medium hover:underline"
                    >
                      Join Meeting <ExternalLink size={14} />
                    </a>
                  ) : (
                    <p className="text-sm text-slate-700">{interview.location_or_link}</p>
                  )}
                </div>
              )}
            </div>
            
            {interview.notes && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Pre-interview Notes</p>
                <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg italic">
                  "{interview.notes}"
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Scorecard */}
        <div className="lg:col-span-2">
          {interview.has_evaluation ? (
            <Card className="flex flex-col items-center justify-center py-12 gap-4 border-green-200 bg-green-50/20">
               <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                 <Badge variant="green" size="md">Completed</Badge>
               </div>
               <div className="text-center">
                 <h3 className="text-xl font-bold text-slate-900">Evaluation Submitted</h3>
                 <p className="text-slate-500 text-sm mt-1">This candidate has already been scored for this session.</p>
               </div>
               <Button variant="secondary" onClick={() => navigate('/dashboard/interviews')}>Return to List</Button>
            </Card>
          ) : (
            <EvaluationForm 
              interviewId={interview.id} 
              candidateName={interview.candidate_name}
              onSuccess={() => navigate('/dashboard/interviews')}
            />
          )}
        </div>
      </div>
    </div>
  );
}
