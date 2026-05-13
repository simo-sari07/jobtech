/**
 * RoleBadge — visual pill for a user's role.
 *
 * Color system:
 *   admin      → red   (elevated privileges, demands attention)
 *   hr_manager → blue  (internal staff)
 *   recruiter  → purple (talent acquisition)
 *   candidate  → slate  (external users)
 */
import type { Role } from '@/utils/constants'
import { ROLE_LABELS } from '@/utils/constants'
import { Shield, Users, Briefcase, User } from 'lucide-react'

interface RoleBadgeProps {
  role: Role
  /** 'sm' for table rows, 'md' for detail cards */
  size?: 'sm' | 'md'
  /** Show the role icon alongside the label */
  showIcon?: boolean
}

const ROLE_STYLES: Record<Role, { pill: string; icon: string; dot: string }> = {
  admin:      { pill: 'bg-red-50    text-red-700    border-red-200    ring-red-100',    icon: 'text-red-500',    dot: 'bg-red-400'    },
  hr_manager: { pill: 'bg-blue-50   text-blue-700   border-blue-200   ring-blue-100',   icon: 'text-blue-500',   dot: 'bg-blue-400'   },
  recruiter:  { pill: 'bg-purple-50 text-purple-700 border-purple-200 ring-purple-100', icon: 'text-purple-500', dot: 'bg-purple-400' },
  candidate:  { pill: 'bg-slate-100 text-slate-600  border-slate-200  ring-slate-100',  icon: 'text-slate-400',  dot: 'bg-slate-400'  },
}

const ROLE_ICONS: Record<Role, React.FC<{ size: number; className?: string }>> = {
  admin:      Shield,
  hr_manager: Users,
  recruiter:  Briefcase,
  candidate:  User,
}

export function RoleBadge({ role, size = 'sm', showIcon = false }: RoleBadgeProps) {
  const styles  = ROLE_STYLES[role]
  const Icon    = ROLE_ICONS[role]
  const iconPx  = size === 'sm' ? 10 : 12
  const textCls = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full border
        ${textCls} ${styles.pill}
      `}
    >
      {showIcon
        ? <Icon size={iconPx} className={styles.icon} />
        : <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`} />
      }
      {ROLE_LABELS[role]}
    </span>
  )
}
