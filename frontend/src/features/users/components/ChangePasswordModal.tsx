/**
 * ChangePasswordModal — admin force-sets a user's password.
 *
 * Shows a strong warning that the user will be logged out of all devices.
 * Uses the PasswordStrengthMeter for live feedback.
 * Confirm password field ensures no accidental typo.
 */
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { PasswordStrengthMeter } from '@/components/ui/PasswordStrengthMeter'
import type { User } from '../types'

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  new_password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/, 'Must contain a special character'),
  confirm_password: z.string(),
}).refine(d => d.new_password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

type FormData = z.infer<typeof schema>

// ─── Component ────────────────────────────────────────────────────────────────

interface ChangePasswordModalProps {
  isOpen:    boolean
  onClose:   () => void
  onSubmit:  (newPassword: string) => Promise<void>
  user:      User
  isLoading: boolean
}

export function ChangePasswordModal({
  isOpen,
  onClose,
  onSubmit,
  user,
  isLoading,
}: ChangePasswordModalProps) {
  const [showNew,     setShowNew]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const newPassword = watch('new_password', '')

  useEffect(() => {
    if (isOpen) { reset(); setShowNew(false); setShowConfirm(false) }
  }, [isOpen, reset])

  useEffect(() => {
    if (!isOpen) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !isLoading) onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [isOpen, isLoading, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isLoading && onClose()} />

      <div
        className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-1 w-full bg-orange-400" />

        <div className="px-6 py-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
                <Lock size={16} className="text-orange-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Change Password</h2>
                <p className="text-xs text-slate-500">{user.full_name}</p>
              </div>
            </div>
            <button onClick={onClose} disabled={isLoading} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Warning banner */}
          <div className="flex gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 mb-5">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              Changing the password will <strong>immediately log out {user.first_name}</strong> from all active sessions and devices.
            </p>
          </div>

          {/* Form */}
          <form id="change-pw-form" onSubmit={handleSubmit(d => onSubmit(d.new_password))} className="space-y-4" noValidate>
            {/* New password */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">New password</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  placeholder="Minimum 8 characters"
                  className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm outline-none transition-all focus:ring-3 focus:ring-blue-50 ${errors.new_password ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'}`}
                  {...register('new_password')}
                />
                <button type="button" onClick={() => setShowNew(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errors.new_password && <p className="text-xs text-red-600">{errors.new_password.message}</p>}
              <PasswordStrengthMeter password={newPassword} />
            </div>

            {/* Confirm */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Confirm password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repeat new password"
                  className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm outline-none transition-all focus:ring-3 focus:ring-blue-50 ${errors.confirm_password ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'}`}
                  {...register('confirm_password')}
                />
                <button type="button" onClick={() => setShowConfirm(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errors.confirm_password && <p className="text-xs text-red-600">{errors.confirm_password.message}</p>}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex justify-end gap-3">
          <Button variant="secondary" size="md" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button variant="danger" size="md" form="change-pw-form" type="submit" loading={isLoading}>
            Change Password
          </Button>
        </div>
      </div>
    </div>
  )
}
