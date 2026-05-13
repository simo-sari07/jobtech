/**
 * UserDetailCard — full profile card for the admin user detail view.
 *
 * Displays:
 *   - Avatar placeholder with initials
 *   - Name, email, phone
 *   - Role badge + online status
 *   - Key metadata: date joined, last activity
 *   - Action buttons: Edit, Change Password, Activate/Deactivate
 *
 * Props-driven: receives the user object + callbacks — no API calls here.
 */
import { formatDistanceToNow, format } from 'date-fns'
import {
  Mail, Phone, Calendar, Activity,
  Pencil, Lock, UserCheck, UserX, Clock,
} from 'lucide-react'
import { Button, Badge } from '@/components/ui'
import { RoleBadge } from './RoleBadge'
import { OnlineStatusDot, AccountStatusBadge } from './StatusBadge'
import type { UserDetail } from '../types'

interface UserDetailCardProps {
  user:            UserDetail
  onEdit:          () => void
  onChangePassword: () => void
  onToggleActive:  () => void
  isToggling?:     boolean
  /** Disable all action buttons (e.g. while a mutation is in flight) */
  isLoading?:      boolean
}

function Avatar({ user }: { user: UserDetail }) {
  const initials = `${user.first_name[0] ?? ''}${user.last_name[0] ?? ''}`.toUpperCase()

  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.full_name}
        className="w-20 h-20 rounded-2xl object-cover shadow-sm border border-slate-200"
      />
    )
  }

  // Colour is deterministic so the same user always gets the same hue
  const hues  = [210, 160, 280, 330, 30, 190]
  const hue   = hues[user.id % hues.length]

  return (
    <div
      className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-sm select-none"
      style={{ background: `hsl(${hue} 60% 52%)` }}
      aria-label={`${user.full_name} avatar`}
    >
      {initials}
    </div>
  )
}

function MetaRow({ icon, label, value }: {
  icon:  React.ReactNode
  label: string
  value: string | React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="mt-0.5 text-slate-400 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">{label}</p>
        <div className="mt-0.5 text-sm text-slate-800 font-medium">{value}</div>
      </div>
    </div>
  )
}

export function UserDetailCard({
  user,
  onEdit,
  onChangePassword,
  onToggleActive,
  isToggling  = false,
  isLoading   = false,
}: UserDetailCardProps) {
  const joinedDate   = new Date(user.date_joined)
  const lastActivity = user.last_activity ? new Date(user.last_activity) : null

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

      {/* Top colour strip — role-coded */}
      <div className={`h-1.5 w-full ${
        user.role === 'admin'      ? 'bg-gradient-to-r from-red-400    to-red-500'    :
        user.role === 'hr_manager' ? 'bg-gradient-to-r from-blue-400   to-blue-500'   :
        user.role === 'recruiter'  ? 'bg-gradient-to-r from-purple-400 to-purple-500' :
                                     'bg-gradient-to-r from-slate-300  to-slate-400'
      }`} />

      <div className="p-6">
        {/* Profile header */}
        <div className="flex items-start gap-4 mb-6">
          <Avatar user={user} />
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-slate-900 truncate">{user.full_name}</h2>
            <p className="text-sm text-slate-500 truncate">{user.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <RoleBadge role={user.role} showIcon />
              <AccountStatusBadge isActive={user.is_active} />
              {user.is_active && (
                <OnlineStatusDot status={user.online_status} showLabel />
              )}
            </div>
          </div>
        </div>

        {/* Metadata rows */}
        <MetaRow
          icon={<Mail size={14} />}
          label="Email"
          value={user.email}
        />
        {user.phone && (
          <MetaRow
            icon={<Phone size={14} />}
            label="Phone"
            value={user.phone}
          />
        )}
        <MetaRow
          icon={<Calendar size={14} />}
          label="Member since"
          value={format(joinedDate, 'dd MMM yyyy')}
        />
        <MetaRow
          icon={<Activity size={14} />}
          label="Last activity"
          value={
            lastActivity
              ? <span title={format(lastActivity, 'dd MMM yyyy HH:mm')}>
                  {formatDistanceToNow(lastActivity, { addSuffix: true })}
                </span>
              : <span className="text-slate-400 italic">Never active</span>
          }
        />
        {lastActivity && (
          <MetaRow
            icon={<Clock size={14} />}
            label="Exact time"
            value={format(lastActivity, "dd MMM yyyy 'at' HH:mm")}
          />
        )}
      </div>

      {/* Action buttons */}
      <div className="px-6 pb-6 flex flex-col gap-2">
        <Button
          variant="secondary"
          fullWidth
          icon={<Pencil size={14} />}
          onClick={onEdit}
          disabled={isLoading}
        >
          Edit Profile
        </Button>
        <Button
          variant="secondary"
          fullWidth
          icon={<Lock size={14} />}
          onClick={onChangePassword}
          disabled={isLoading}
        >
          Change Password
        </Button>
        <Button
          variant={user.is_active ? 'danger' : 'primary'}
          fullWidth
          icon={user.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
          loading={isToggling}
          disabled={isLoading}
          onClick={onToggleActive}
        >
          {user.is_active ? 'Deactivate Account' : 'Activate Account'}
        </Button>
      </div>
    </div>
  )
}
