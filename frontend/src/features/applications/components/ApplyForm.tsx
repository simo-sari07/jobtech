/**
 * ApplyForm — secure multipart CV upload form — Light Mode Redesign
 */
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Upload, FileText, CheckCircle2, X } from 'lucide-react'
import { applySchema, type ApplyFormData } from '@/features/applications/schemas'
import { useSubmitApplication } from '@/features/applications/hooks/useApplications'
import { Button, Spinner } from '@/components/ui'
import toast from 'react-hot-toast'

interface Props {
  jobId: number
  jobTitle: string
  onSuccess: () => void
  onCancel: () => void
}

export default function ApplyForm({ jobId, jobTitle, onSuccess, onCancel }: Props) {
  const [fileName, setFileName] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { mutateAsync, isPending } = useSubmitApplication()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ApplyFormData>({
    resolver: zodResolver(applySchema) as any,
    defaultValues: { job: jobId },
  })

  const onSubmit = async (data: ApplyFormData) => {
    const fd = new FormData()
    fd.append('job', String(data.job))
    fd.append('cv_file', data.cv_file)
    if (data.cover_letter) fd.append('cover_letter', data.cover_letter)

    try {
      await mutateAsync(fd)
      toast.success('Your application was submitted!')
      onSuccess()
    } catch (err: any) {
      const data = err?.response?.data
      if (data?.error?.message) {
        toast.error(data.error.message)
      } else if (!err?.response) {
        toast.error('Network error. Please check your connection.')
      } else {
        toast.error('Failed to submit application. Please try again.')
      }
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-1 shadow-sm animate-fade-in">
      <div className="p-5 space-y-5">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* CV Upload Dropzone area */}
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
              Curriculum Vitae <span className="text-red-500">*</span>
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              className={`
                relative flex flex-col items-center justify-center gap-3 py-8 px-4
                rounded-xl border-2 border-dashed transition-all cursor-pointer
                ${fileName 
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700' 
                  : errors.cv_file 
                    ? 'border-red-300 bg-red-50 text-red-700' 
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-blue-400 hover:bg-white hover:shadow-md'
                }
              `}
            >
              {fileName ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 size={24} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold truncate max-w-[200px]">{fileName}</p>
                    <p className="text-xs opacity-80">Click to change file</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <Upload size={20} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold">Click to upload CV</p>
                    <p className="text-xs">PDF only (max 5MB)</p>
                  </div>
                </>
              )}
              
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setValue('cv_file', file, { shouldValidate: true })
                    setFileName(file.name)
                  }
                }}
              />
            </div>
            {errors.cv_file && (
              <p className="mt-2 text-xs text-red-600 font-medium flex items-center gap-1">
                <X size={12} /> {errors.cv_file.message}
              </p>
            )}
          </div>

          {/* Cover Letter */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 block">
              Cover Letter <span className="text-xs font-normal text-slate-400 ml-1">(Optional)</span>
            </label>
            <textarea
              {...register('cover_letter')}
              rows={4}
              placeholder="Why are you a good fit for this role?"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-blue-500 focus:ring-3 focus:ring-blue-50 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              fullWidth
              loading={isPending}
              icon={!isPending && <CheckCircle2 size={16} />}
            >
              Submit
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel}>
              Back
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
