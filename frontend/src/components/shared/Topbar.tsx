/**
 * Topbar — search, page title, user avatar, notifications.
 */
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { ROLE_LABELS } from '@/utils/constants'
import NotificationBell from '@/features/candidates/components/NotificationBell'

interface TopbarProps {
  title: string
  subtitle?: string
}

const ROLE_COLORS: Record<string, string> = {
  admin:      'text-red-600 bg-red-50',
  hr_manager: 'text-blue-600 bg-blue-50',
  recruiter:  'text-teal-600 bg-teal-50',
  candidate:  'text-green-600 bg-green-50',
}

export default function Topbar({ title, subtitle }: TopbarProps) {
  const { user } = useAuthStore()
  const { sidebarCollapsed } = useUIStore()
  const initials = user ? `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase() : ''

  return (
    <header
      id="topbar"
      className="sticky top-0 z-40 bg-white border-b border-slate-200 flex items-center gap-4 px-6"
      style={{ height: 60 }}
    >
      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold text-slate-900 leading-tight truncate">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 leading-tight">{subtitle}</p>}
      </div>



      {/* Notifications */}
      <NotificationBell />

      {/* User avatar */}
      {user && (
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-800 leading-tight">{user.full_name}</p>
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${ROLE_COLORS[user.role] ?? 'text-slate-500 bg-slate-100'}`}>
              {ROLE_LABELS[user.role]}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <span className="text-blue-700 font-semibold text-xs">{initials}</span>
          </div>
        </div>
      )}
    </header>
  )
}
