/**
 * SecurityTab — Shows last login, session info, and account status.
 */
import { ShieldCheck, Clock, Globe, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useUserDetail } from '@/features/users/hooks/useUsers'
import { Card, Badge, Spinner } from '@/components/ui'

export default function SecurityTab() {
  const { user } = useAuthStore()
  const { data: detail, isLoading } = useUserDetail(user?.id)
  const profile = detail?.data

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <Spinner size={24} />
        </div>
      </Card>
    )
  }

  const lastLogin = profile?.last_activity
    ? new Date(profile.last_activity).toLocaleString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short',
        year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : 'Never'

  const joined = user?.date_joined
    ? new Date(user.date_joined).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : '—'

  return (
    <div className="flex flex-col gap-5">

      {/* Account overview */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <ShieldCheck size={16} className="text-blue-600" />
          <h2 className="font-semibold text-slate-900 text-sm">Account Security</h2>
        </div>

        <div className="flex flex-col divide-y divide-slate-100">
          <SecurityRow
            icon={<CheckCircle2 size={16} className={user?.is_active ? 'text-green-500' : 'text-red-400'} />}
            label="Account status"
            value={
              <Badge variant={user?.is_active ? 'green' : 'red'} dot>
                {user?.is_active ? 'Active' : 'Deactivated'}
              </Badge>
            }
          />
          <SecurityRow
            icon={<Clock size={16} className="text-blue-500" />}
            label="Last activity"
            value={<span className="text-sm text-slate-700 font-medium">{lastLogin}</span>}
          />
          <SecurityRow
            icon={<Globe size={16} className="text-slate-400" />}
            label="Member since"
            value={<span className="text-sm text-slate-700 font-medium">{joined}</span>}
          />
          <SecurityRow
            icon={<ShieldCheck size={16} className="text-purple-500" />}
            label="Role"
            value={
              <Badge variant="blue">
                {user?.role?.replace('_', ' ')}
              </Badge>
            }
          />
        </div>
      </Card>

      {/* Security tips */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle size={16} className="text-amber-500" />
          <h2 className="font-semibold text-slate-900 text-sm">Security Recommendations</h2>
        </div>
        <div className="flex flex-col gap-3">
          {[
            { text: 'Use a strong password with at least 12 characters.', done: true },
            { text: 'Never share your credentials with anyone.', done: true },
            { text: 'Sign out of devices you no longer use.', done: false },
            { text: 'Contact your admin to enable two-factor authentication.', done: false },
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-3">
              <CheckCircle2
                size={15}
                className={`mt-0.5 shrink-0 ${tip.done ? 'text-green-500' : 'text-slate-300'}`}
              />
              <p className={`text-sm ${tip.done ? 'text-slate-600' : 'text-slate-400'}`}>{tip.text}</p>
            </div>
          ))}
        </div>
      </Card>

    </div>
  )
}

function SecurityRow({
  icon, label, value,
}: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <span className="shrink-0">{icon}</span>
        <span className="text-sm text-slate-600">{label}</span>
      </div>
      <div>{value}</div>
    </div>
  )
}
