/**
 * StatusBadge — dual-axis status indicator.
 *
 * Axis 1 (account level):  is_active → Active | Inactive
 * Axis 2 (session level):  online_status → Online | Away | Offline
 *
 * Display strategy:
 *   - Always show the account status
 *   - Only overlay the session indicator when account is Active,
 *     because an inactive account can never be online.
 */
import type { OnlineStatus } from '../types'

// ── Account status ─────────────────────────────────────────────────────────────

interface AccountStatusProps {
  isActive: boolean
  size?: 'sm' | 'md'
}

export function AccountStatusBadge({ isActive, size = 'sm' }: AccountStatusProps) {
  const textCls = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'

  if (isActive) {
    return (
      <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${textCls} bg-green-50 text-green-700 border-green-200`}>
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
        Active
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${textCls} bg-red-50 text-red-700 border-red-200`}>
      <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
      Inactive
    </span>
  )
}

// ── Online / presence status ───────────────────────────────────────────────────

interface OnlineStatusProps {
  status: OnlineStatus
  /** Show text label alongside the dot */
  showLabel?: boolean
}

const ONLINE_STYLES: Record<OnlineStatus, { dot: string; label: string }> = {
  online:  { dot: 'bg-green-500  ring-2 ring-green-200',  label: 'Online'  },
  away:    { dot: 'bg-amber-400  ring-2 ring-amber-100',  label: 'Away'    },
  offline: { dot: 'bg-slate-300  ring-2 ring-slate-100',  label: 'Offline' },
}

export function OnlineStatusDot({ status, showLabel = false }: OnlineStatusProps) {
  if (status === 'offline') return null

  const styles = ONLINE_STYLES[status]
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full shrink-0 ${styles.dot}`} />
      {showLabel && (
        <span className="text-xs text-slate-500 font-medium">{styles.label}</span>
      )}
    </span>
  )
}

// ── Combined badge (used in the table's Status column) ─────────────────────────

interface StatusBadgeProps {
  isActive:     boolean
  onlineStatus: OnlineStatus
  size?:        'sm' | 'md'
}

export function StatusBadge({ isActive, onlineStatus, size = 'sm' }: StatusBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <AccountStatusBadge isActive={isActive} size={size} />
      {isActive && onlineStatus !== 'offline' && (
        <OnlineStatusDot status={onlineStatus} showLabel />
      )}
    </div>
  )
}
