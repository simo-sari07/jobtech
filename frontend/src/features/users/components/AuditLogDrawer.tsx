/**
 * AuditLogDrawer — slide-over timeline of admin actions on a user.
 *
 * Shows paginated audit log entries in a reverse-chronological timeline.
 * Filterable by action type. Each entry shows:
 *   - Action icon + label
 *   - Performed by (actor name)
 *   - IP address
 *   - Relative time ("2 hours ago")
 */
import { useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import {
  X, UserPlus, Pencil, Key, CheckCircle, XCircle,
  Shield, LogIn, LogOut, AlertTriangle, ChevronLeft, ChevronRight,
  Activity,
} from 'lucide-react'
import { Spinner } from '@/components/ui'
import { useUserAuditLog } from '../hooks/useUsers'
import { AUDIT_ACTION_LABELS } from '../types'
import type { AuditAction, UserAuditLog } from '../types'

// ─── Action icon map ──────────────────────────────────────────────────────────

const ACTION_ICONS: Record<AuditAction, React.FC<{ size: number; className?: string }>> = {
  created:          UserPlus,
  updated:          Pencil,
  password_changed: Key,
  activated:        CheckCircle,
  deactivated:      XCircle,
  deleted:          XCircle,
  role_changed:     Shield,
  login:            LogIn,
  logout:           LogOut,
  failed_login:     AlertTriangle,
}

const ACTION_COLORS: Record<AuditAction, string> = {
  created:          'bg-green-50  text-green-600  border-green-200',
  updated:          'bg-blue-50   text-blue-600   border-blue-200',
  password_changed: 'bg-orange-50 text-orange-600 border-orange-200',
  activated:        'bg-green-50  text-green-600  border-green-200',
  deactivated:      'bg-red-50    text-red-600    border-red-200',
  deleted:          'bg-red-50    text-red-600    border-red-200',
  role_changed:     'bg-purple-50 text-purple-600 border-purple-200',
  login:            'bg-slate-50  text-slate-600  border-slate-200',
  logout:           'bg-slate-50  text-slate-600  border-slate-200',
  failed_login:     'bg-amber-50  text-amber-600  border-amber-200',
}

// ─── Single timeline entry ────────────────────────────────────────────────────

function AuditEntry({ entry }: { entry: UserAuditLog }) {
  const Icon        = ACTION_ICONS[entry.action] ?? Activity
  const colorClass  = ACTION_COLORS[entry.action] ?? 'bg-slate-50 text-slate-600 border-slate-200'
  const label       = AUDIT_ACTION_LABELS[entry.action] ?? entry.action
  const ts          = new Date(entry.created_at)

  return (
    <div className="flex gap-3 py-3 border-b border-slate-50 last:border-0">
      {/* Icon */}
      <div className={`shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center ${colorClass}`}>
        <Icon size={13} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">{label}</p>

        {entry.actor_display && (
          <p className="text-xs text-slate-500 mt-0.5">
            by <span className="font-medium text-slate-700">{entry.actor_display}</span>
          </p>
        )}

        <div className="flex items-center gap-3 mt-1">
          <span
            className="text-xs text-slate-400"
            title={format(ts, "dd MMM yyyy 'at' HH:mm")}
          >
            {formatDistanceToNow(ts, { addSuffix: true })}
          </span>
          {entry.ip_address && (
            <span className="text-xs text-slate-300 font-mono">{entry.ip_address}</span>
          )}
        </div>

        {/* Metadata diff preview */}
        {entry.metadata && (
          <details className="mt-1">
            <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 select-none">
              View details
            </summary>
            <pre className="mt-1 text-[11px] bg-slate-50 rounded p-2 overflow-x-auto text-slate-600 border border-slate-100">
              {JSON.stringify(entry.metadata, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AuditLogDrawerProps {
  isOpen:   boolean
  onClose:  () => void
  userId:   number
  userName: string
}

const ACTION_OPTIONS: { value: string; label: string }[] = [
  { value: '',                label: 'All actions'     },
  { value: 'created',         label: 'Account created' },
  { value: 'updated',         label: 'Profile updated' },
  { value: 'password_changed',label: 'Password changed'},
  { value: 'activated',       label: 'Activated'       },
  { value: 'deactivated',     label: 'Deactivated'     },
  { value: 'role_changed',    label: 'Role changed'    },
  { value: 'login',           label: 'Login'           },
  { value: 'failed_login',    label: 'Failed login'    },
]

export function AuditLogDrawer({ isOpen, onClose, userId, userName }: AuditLogDrawerProps) {
  const [actionFilter, setActionFilter] = useState('')
  const [page, setPage]                 = useState(1)

  const { data, isLoading, isError } = useUserAuditLog(
    isOpen ? userId : undefined,
    actionFilter || undefined,
    page,
  )

  const totalPages = data ? Math.ceil(data.count / 20) : 1

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Scrim */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer panel */}
      <div className="relative z-10 w-full max-w-lg bg-white h-full flex flex-col shadow-2xl border-l border-slate-200">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Activity size={15} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Audit Log</h2>
              <p className="text-xs text-slate-500">{userName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Filter */}
        <div className="px-5 py-3 border-b border-slate-100">
          <select
            value={actionFilter}
            onChange={e => { setActionFilter(e.target.value); setPage(1) }}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-blue-400"
          >
            {ACTION_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-5 py-2">
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <Spinner size={20} />
            </div>
          )}

          {isError && (
            <div className="py-8 text-center text-sm text-red-500">
              Failed to load audit log.
            </div>
          )}

          {!isLoading && !isError && data?.results.length === 0 && (
            <div className="py-12 text-center">
              <Activity size={32} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">No audit entries found.</p>
            </div>
          )}

          {!isLoading && data?.results.map(entry => (
            <AuditEntry key={entry.id} entry={entry} />
          ))}
        </div>

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="sticky bottom-0 bg-white border-t border-slate-100 px-5 py-3 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages} · {data?.count} entries
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft size={13} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
