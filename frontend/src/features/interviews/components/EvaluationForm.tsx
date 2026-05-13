import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ClipboardCheck, Star, MessageSquare } from 'lucide-react';
import { Button, Card, Divider } from '@/components/ui';
import { useSubmitEvaluation } from '../hooks/useInterviews';
import { RECOMMENDATION_LABELS } from '../types';
import type { Recommendation } from '../types';

const schema = z.object({
  technical_score: z.coerce.number().min(1).max(5),
  communication_score: z.coerce.number().min(1).max(5),
  motivation_score: z.coerce.number().min(1).max(5),
  problem_solving_score: z.coerce.number().min(1).max(5),
  recommendation: z.enum(['hire', 'reject', 'hold', 'next_round']),
  comments: z.string().min(10, 'Please provide more detailed comments'),
});

type FormData = z.infer<typeof schema>;

interface Props {
  interviewId: number;
  candidateName: string;
  onSuccess?: () => void;
}

export default function EvaluationForm({ interviewId, candidateName, onSuccess }: Props) {
  const { mutateAsync: submit, isPending } = useSubmitEvaluation();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as any, // Cast to avoid resolver type mismatch in some versions
    defaultValues: {
      technical_score: 3,
      communication_score: 3,
      motivation_score: 3,
      problem_solving_score: 3,
      recommendation: 'hold',
      comments: '',
    },
  });

  const scores = watch();

  // Weighted score preview (matches backend logic)
  const calculatePreview = () => {
    const weights = { tech: 0.4, comm: 0.25, prob: 0.25, moti: 0.1 };
    const score = 
      (Number(scores.technical_score) || 0) * weights.tech +
      (Number(scores.communication_score) || 0) * weights.comm +
      (Number(scores.problem_solving_score) || 0) * weights.prob +
      (Number(scores.motivation_score) || 0) * weights.moti;
    return score.toFixed(2);
  };

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    await submit({ id: interviewId, payload: data });
    onSuccess?.();
  };

  return (
    <Card className="max-w-2xl mx-auto shadow-lg border-blue-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
          <ClipboardCheck size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Interview Evaluation</h2>
          <p className="text-sm text-slate-500">Evaluating {candidateName}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Scores Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            { id: 'technical_score', label: 'Technical Ability', weight: '40%' },
            { id: 'problem_solving_score', label: 'Problem Solving', weight: '25%' },
            { id: 'communication_score', label: 'Communication', weight: '25%' },
            { id: 'motivation_score', label: 'Cultural Fit / Motivation', weight: '10%' },
          ].map((field) => (
            <div key={field.id} className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-700">{field.label}</label>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Weight: {field.weight}</span>
              </div>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((val) => (
                  <label 
                    key={val}
                    className={`
                      flex-1 h-10 rounded-lg border flex items-center justify-center cursor-pointer transition-all font-bold text-sm
                      ${watch(field.id as any) === val 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md transform scale-105' 
                        : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'}
                    `}
                  >
                    <input type="radio" value={val} className="hidden" {...register(field.id as any)} />
                    {val}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-slate-50 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between border border-slate-100 border-dashed">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Calculated Score</p>
            <p className="text-4xl font-black text-blue-600 tracking-tighter">{calculatePreview()}<span className="text-lg text-slate-300 ml-1">/ 5.00</span></p>
          </div>
          
          <div className="mt-4 md:mt-0 w-full md:w-auto">
             <label className="text-sm font-semibold text-slate-700 block mb-2">Final Recommendation</label>
             <div className="flex flex-wrap gap-2">
               {(Object.keys(RECOMMENDATION_LABELS) as Recommendation[]).map((rec) => (
                 <label 
                  key={rec}
                  className={`
                    px-3 py-1.5 rounded-full border text-xs font-bold cursor-pointer transition-all
                    ${watch('recommendation') === rec 
                      ? 'bg-slate-900 border-slate-900 text-white' 
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'}
                  `}
                 >
                   <input type="radio" value={rec} className="hidden" {...register('recommendation')} />
                   {RECOMMENDATION_LABELS[rec]}
                 </label>
               ))}
             </div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <MessageSquare size={16} className="text-slate-400" />
            Detailed Feedback
          </label>
          <textarea
            className="w-full rounded-xl border border-slate-200 p-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all min-h-[150px] bg-slate-50/30"
            placeholder="Strengths, weaknesses, and rationale for the decision..."
            {...register('comments')}
          />
          {errors.comments && <p className="text-xs text-red-600">{errors.comments.message}</p>}
        </div>

        <Divider />

        <div className="flex justify-end pt-2">
          <Button type="submit" size="lg" className="px-12 rounded-xl h-12" loading={isPending}>
            Submit Scorecard
          </Button>
        </div>
      </form>
    </Card>
  );
}
