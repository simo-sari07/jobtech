/**
 * AccountTab — Email display + Change Password.
 */
import { useState } from 'react'
import { Mail, Lock, Eye, EyeOff, Key } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useChangePassword } from '@/features/auth/hooks/useChangePassword'
import { Button, Input, Card } from '@/components/ui'
import { StatusAlert } from '../components/StatusAlert'
import { PasswordStrengthMeter } from '@/components/ui/PasswordStrengthMeter'

export default function AccountTab() {
  const { user } = useAuthStore()
  const changePw = useChangePassword()

  const [currentPw, setCurrentPw] = useState('')
  const [newPw,     setNewPw]     = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showNew,   setShowNew]   = useState(false)
  const [showConf,  setShowConf]  = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const mismatch = confirmPw.length > 0 && newPw !== confirmPw
  const canSubmit = currentPw.length >= 8 && newPw.length >= 8 && newPw === confirmPw

  const handleChangePw = async () => {
    if (!user || !canSubmit) return
    setAlert(null)
    try {
      await changePw.mutateAsync({
        current_password: currentPw,
        new_password: newPw,
      })
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      setAlert({ type: 'success', msg: 'Password changed successfully. Use the new password on your next login.' })
    } catch {
      setAlert({ type: 'error', msg: 'Failed to change password. Please try again.' })
    }
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Email (read-only) */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <Mail size={16} className="text-blue-600" />
          <h2 className="font-semibold text-slate-900 text-sm">Email Address</h2>
        </div>
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <Mail size={15} className="text-slate-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-slate-800">{user?.email}</p>
            <p className="text-xs text-slate-400 mt-0.5">Contact your administrator to change your email address.</p>
          </div>
        </div>
      </Card>

      {/* Change password */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <Key size={16} className="text-blue-600" />
          <h2 className="font-semibold text-slate-900 text-sm">Change Password</h2>
        </div>

        {alert && <StatusAlert type={alert.type} message={alert.msg} className="mb-4" />}

        <div className="flex flex-col gap-4">
          <Input
            id="settings-current-pw"
            label="Current password"
            type="password"
            value={currentPw}
            onChange={e => setCurrentPw(e.target.value)}
            placeholder="Your current password"
            leftIcon={<Lock size={14} />}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">New password</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock size={14} />
              </div>
              <input
                id="settings-new-pw"
                type={showNew ? 'text' : 'password'}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-blue-500 focus:ring-3 focus:ring-blue-50 pl-9 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {newPw && <PasswordStrengthMeter password={newPw} />}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Confirm new password</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock size={14} />
              </div>
              <input
                id="settings-confirm-pw"
                type={showConf ? 'text' : 'password'}
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="Repeat new password"
                className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all pl-9 pr-10
                  ${mismatch
                    ? 'border-red-400 focus:border-red-500 focus:ring-3 focus:ring-red-50'
                    : 'border-slate-200 focus:border-blue-500 focus:ring-3 focus:ring-blue-50'}`}
              />
              <button
                type="button"
                onClick={() => setShowConf(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConf ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {mismatch && <p className="text-xs text-red-600">Passwords do not match.</p>}
          </div>
        </div>

        <div className="flex justify-end mt-5 pt-4 border-t border-slate-100">
          <Button
            icon={<Key size={14} />}
            loading={changePw.isPending}
            disabled={!canSubmit}
            onClick={handleChangePw}
          >
            Update password
          </Button>
        </div>
      </Card>
    </div>
  )
}
