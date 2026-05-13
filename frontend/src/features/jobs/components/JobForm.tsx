/**
 * JobForm — shared form component used by BOTH CreateJobPage and EditJobPage.
 *
 * RULES:
 *   ✅  Accepts optional `defaultValues` to pre-fill in edit mode
 *   ✅  Accepts `onSubmit`, `isPending`, `mode` props — zero business logic inside
 *   ❌  NEVER fetches data itself — caller handles data fetching
 *   ❌  NEVER navigates — caller handles post-submit navigation
 */
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import {
  Briefcase, MapPin, Calendar, Banknote,
  PlusCircle, Check, Save,
} from 'lucide-react'
import { createJobSchema, type CreateJobFormData } from '@/features/jobs/schemas'
import { useSkills } from '@/features/jobs/hooks/useJobs'
import { type Skill } from '@/features/jobs/api'
import { Button, Input, Card, Spinner } from '@/components/ui'

interface JobFormProps {
  /** 'create' shows "Publish" CTA; 'edit' shows "Save Changes" CTA */
  mode: 'create' | 'edit'
  /** Pre-filled values when editing an existing job */
  defaultValues?: Partial<CreateJobFormData>
  /** Called with validated form data on submit */
  onSubmit: (data: CreateJobFormData) => Promise<void>
  /** Disables submit button and shows spinner while saving */
  isPending: boolean
  /** Called when user clicks Discard / Cancel */
  onCancel: () => void
}

export default function JobForm({
  mode,
  defaultValues,
  onSubmit,
  isPending,
  onCancel,
}: JobFormProps) {
  const { data: skills, isLoading: loadingSkills } = useSkills()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateJobFormData>({
    resolver: zodResolver(createJobSchema) as any,
    defaultValues: {
      status: 'open',
      skill_ids: [],
      ...defaultValues,
    },
  })

  // Re-populate form when defaultValues arrive asynchronously (edit mode)
  useEffect(() => {
    if (defaultValues) {
      reset({
        status: 'open',
        skill_ids: [],
        ...defaultValues,
      })
    }
  }, [defaultValues, reset])

  const selectedSkillIds = watch('skill_ids') ?? []

  const toggleSkill = (id: number) => {
    const curr = selectedSkillIds
    setValue(
      'skill_ids',
      curr.includes(id) ? curr.filter(s => s !== id) : [...curr, id],
      { shouldValidate: true }
    )
  }

  const isEdit = mode === 'edit'

  return (
    <div className="max-w-4xl mx-auto pb-20">

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 px-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">
            <Briefcase size={12} />
            <span>Recruitment Suite</span>
          </div>
          <h1 className="text-3xl font-black text-slate-950 tracking-tight">
            {isEdit ? 'Edit Job Position' : 'Post a New Position'}
          </h1>
          <p className="text-slate-500 text-sm mt-1 max-w-md">
            {isEdit
              ? 'Update the details below. Changes are saved immediately.'
              : 'Reach thousands of qualified candidates by defining your ideal role.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={onCancel}
            className="font-bold text-slate-500"
          >
            {isEdit ? 'Cancel' : 'Discard'}
          </Button>
          <Button
            variant="dark"
            icon={isEdit ? <Save size={16} /> : <Check size={18} />}
            loading={isPending}
            onClick={handleSubmit(onSubmit)}
          >
            {isEdit ? 'Save Changes' : 'Publish Job'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

        {/* ── Section 1: Role Identification ───────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:py-4">
            <h3 className="text-base font-bold text-slate-900">Role Identification</h3>
            <p className="text-sm text-slate-500 mt-1">Basic details help candidates find your job in search results.</p>
          </div>
          <div className="lg:col-span-2">
            <Card className="space-y-6 shadow-sm border-slate-200/60">
              <Input
                label="Job Title"
                placeholder="e.g. Senior Full-stack Developer"
                error={errors.title?.message}
                {...register('title')}
                className="text-lg font-semibold h-12"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-slate-900 ml-1">Location</label>
                  <Input
                    placeholder="Casablanca / Remote"
                    leftIcon={<MapPin size={15} />}
                    error={errors.location?.message}
                    {...register('location')}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-slate-900 ml-1">Contract Type</label>
                  <select
                    {...register('contract_type')}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:ring-4 focus:ring-blue-100/50 focus:border-blue-500 transition-all cursor-pointer hover:bg-slate-50"
                  >
                    <option value="">Select type...</option>
                    <option value="cdi">CDI (Permanent)</option>
                    <option value="cdd">CDD (Fixed-term)</option>
                    <option value="freelance">Freelance / Project</option>
                    <option value="internship">Internship</option>
                  </select>
                  {errors.contract_type && (
                    <p className="text-[11px] font-bold text-red-500 ml-1">{errors.contract_type.message}</p>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* ── Section 2: Job Description ───────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:py-4">
            <h3 className="text-base font-bold text-slate-900">Role Insight</h3>
            <p className="text-sm text-slate-500 mt-1">Describe the daily mission, tools, and technical environment.</p>
          </div>
          <div className="lg:col-span-2">
            <Card className="shadow-sm border-slate-200/60">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-900 ml-1">Job Description</label>
                <textarea
                  {...register('description')}
                  rows={10}
                  placeholder="Outline responsibilities, daily tasks, and company values..."
                  className={`w-full rounded-2xl border bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:ring-4 focus:ring-blue-100/50 focus:border-blue-600 ${
                    errors.description ? 'border-red-400' : 'border-slate-200'
                  }`}
                />
                {errors.description ? (
                  <p className="text-[11px] font-bold text-red-500 ml-1">{errors.description.message}</p>
                ) : (
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Markdown supported</p>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* ── Section 3: Talent Profile (Experience + Skills) ──────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:py-4">
            <h3 className="text-base font-bold text-slate-900">Talent Profile</h3>
            <p className="text-sm text-slate-500 mt-1">Specify technical requirements and experience levels.</p>
          </div>
          <div className="lg:col-span-2 space-y-4">
            <Card className="shadow-sm border-slate-200/60 space-y-6">
              <div className="max-w-xs">
                <Input
                  label="Minimum Experience (Years)"
                  type="number"
                  min={0}
                  placeholder="e.g. 3"
                  error={errors.experience_years?.message}
                  {...register('experience_years', { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-900 ml-1">Required Technical Stack</label>
                {loadingSkills ? (
                  <div className="flex items-center gap-3 p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Spinner size={16} />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading skills…</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2.5 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                    {(skills ?? []).map((skill: Skill) => {
                      const active = selectedSkillIds.includes(skill.id)
                      return (
                        <button
                          key={skill.id}
                          type="button"
                          onClick={() => toggleSkill(skill.id)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all border ${
                            active
                              ? 'bg-slate-950 border-slate-950 text-white shadow-md'
                              : 'bg-white border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-600'
                          }`}
                        >
                          {active && <Check size={12} strokeWidth={3} />}
                          {skill.name}
                        </button>
                      )
                    })}
                    {(skills ?? []).length === 0 && (
                      <p className="text-xs text-slate-400">No skills available yet.</p>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* ── Section 4: Logistics & Compensation ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:py-4">
            <h3 className="text-base font-bold text-slate-900">Logistics & Value</h3>
            <p className="text-sm text-slate-500 mt-1">Set the budget and closing date for this recruitment cycle.</p>
          </div>
          <div className="lg:col-span-2">
            <Card className="shadow-sm border-slate-200/60 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Salary Min (DH)"
                  type="number"
                  placeholder="12,000"
                  leftIcon={<Banknote size={15} />}
                  error={errors.salary_min?.message}
                  {...register('salary_min', { valueAsNumber: true })}
                />
                <Input
                  label="Salary Max (DH)"
                  type="number"
                  placeholder="25,000"
                  leftIcon={<Banknote size={15} />}
                  error={errors.salary_max?.message}
                  {...register('salary_max', { valueAsNumber: true })}
                />
              </div>
              <div className="max-w-xs">
                <Input
                  label="Application Deadline"
                  type="date"
                  leftIcon={<Calendar size={15} />}
                  error={errors.deadline?.message}
                  {...register('deadline')}
                />
              </div>
            </Card>
          </div>
        </div>

        {/* ── Sticky Footer Actions ───────────────────────────────────── */}
        <div className="sticky bottom-6 z-10 p-2 bg-white/80 backdrop-blur-md rounded-3xl border border-slate-200 shadow-xl flex items-center justify-between gap-4 max-w-lg mx-auto">
          <div className="px-6 py-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visibility</p>
            <div className="flex gap-4 mt-1">
              {(['open', 'draft'] as const).map(s => (
                <label key={s} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    {...register('status')}
                    type="radio"
                    value={s}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span className="text-xs font-bold text-slate-600 group-hover:text-blue-600 capitalize transition-colors">{s}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 pr-2">
            <Button
              type="submit"
              variant="dark"
              loading={isPending}
              icon={isEdit ? <Save size={16} /> : <PlusCircle size={18} />}
              className="px-8"
            >
              {isEdit ? 'Save Changes' : 'Publish Position'}
            </Button>
          </div>
        </div>

      </form>
    </div>
  )
}
