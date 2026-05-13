/**
 * ActivityTab — Paginated audit log for the current user.
 * Reuses the existing useUserAuditLog hook and AUDIT_ACTION_LABELS.
 */
import { useState } from 'react'
import { Activity, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useUserAuditLog } from '@/features/users/hooks/useUsers'
import { AUDIT_ACTION_LABELS, type AuditAction, type UserAuditLog } from '@/features/users/types'
import { Card, Spinner, Button, EmptyState } from '@/components/ui'

const ACTION_COLORS: Record<AuditAction, string> = {
  created:          'bg-blue-500',
  updated:          'bg-blue-400',
  password_changed: 'bg-purple-500',
  activated:        'bg-green-500',
  deactivated:      'bg-red-500',
  deleted:          'bg-red-600',
  role_changed:     'bg-amber-500',
  login:            'bg-teal-500',
  logout:           'bg-slate-400',
  failed_login:     'bg-red-400',
}

const ACTION_OPTIONS: { value: string; label: string }[] = [
  { value: '',                 label: 'All activity' },
  { value: 'login',            label: 'Login' },
  { value: 'logout',           label: 'Logout' },
  { value: 'failed_login',     label: 'Failed login' },
  { value: 'updated',          label: 'Profile updated' },
  { value: 'password_changed', label: 'Password changed' },
]

export default function ActivityTab() {
  const { user } = useAuthStore()
  const [action, setAction] = useState('')
  const [page,   setPage]   = useState(1)

  const { data, isLoading } = useUserAuditLog(user?.id, action || undefined, page)

  const entries   = data?.results ?? []
  const totalPages = data ? Math.ceil((data.count ?? 0) / 15) : 1

  return (
    <Card>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-blue-600" />
          <h2 className="font-semibold text-slate-900 text-sm">Account Activity</h2>
          {data && (
            <span className="text-xs text-slate-400 ml-1">
              ({data.count ?? 0} events)
            </span>
          )}
        </div>
        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-slate-400" />
          <select
            value={action}
            onChange={e => { setAction(e.target.value); setPage(1) }}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-blue-400 transition-all"
          >
            {ACTION_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Spinner size={22} />
        </div>
      )}

      {/* Empty */}
      {!isLoading && entries.length === 0 && (
        <EmptyState
          icon={<Activity size={18} />}
          title="No activity yet"
          description="Events will appear here as you use the platform."
        />
      )}

      {/* Timeline */}
      {!isLoading && entries.length > 0 && (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-3.5 top-0 bottom-0 w-px bg-slate-100" />

          <div className="flex flex-col gap-0">
            {entries.map((entry: UserAuditLog, idx: number) => (
              <div key={entry.id} className="relative flex gap-4 pb-5 last:pb-0">
                {/* Dot */}
                <div className={`
                  relative z-10 w-7 h-7 rounded-full flex items-center justify-center shrink-0
                  ${ACTION_COLORS[entry.action] ?? 'bg-slate-300'}
                `}>
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-slate-800">
                      {AUDIT_ACTION_LABELS[entry.action] ?? entry.action}
                    </p>
                    <time className="text-xs text-slate-400 shrink-0 mt-0.5">
                      {new Date(entry.created_at).toLocaleString('en-GB', {
                        day: 'numeric', month: 'short',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </time>
                  </div>
                  {entry.actor_display && (
                    <p className="text-xs text-slate-500 mt-0.5">by {entry.actor_display}</p>
                  )}
                  {entry.ip_address && (
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">{entry.ip_address}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
          <Button
            variant="secondary"
            size="sm"
            icon={<ChevronLeft size={14} />}
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next <ChevronRight size={14} />
          </Button>
        </div>
      )}
    </Card>
  )
}
