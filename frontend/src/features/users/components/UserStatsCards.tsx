/**
 * UserStatsCards — four KPI cards at the top of User Management.
 *
 * Shows: Total Users · Active · Inactive · By-role breakdown
 * Skeleton state while loading; real numbers once stats arrive.
 */
import { Users, UserCheck, UserX, Activity } from 'lucide-react'
import type { UserStats } from '../types'

interface StatCardProps {
  label:     string
  value:     number | string
  icon:      React.ReactNode
  iconBg:    string
  iconColor: string
  isLoading: boolean
}

function StatCard({ label, value, icon, iconBg, iconColor, isLoading }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
      <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}>
        <span className={iconColor}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
        {isLoading
          ? <div className="mt-1 h-6 w-12 bg-slate-200 rounded animate-pulse" />
          : <p className="mt-0.5 text-2xl font-bold text-slate-900">{value}</p>
        }
      </div>
    </div>
  )
}

interface UserStatsCardsProps {
  stats:     UserStats | undefined
  isLoading: boolean
}

export function UserStatsCards({ stats, isLoading }: UserStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Total Users"
        value={stats?.total_users ?? 0}
        icon={<Users size={20} />}
        iconBg="bg-blue-50"
        iconColor="text-blue-600"
        isLoading={isLoading}
      />
      <StatCard
        label="Active"
        value={stats?.active_users ?? 0}
        icon={<UserCheck size={20} />}
        iconBg="bg-green-50"
        iconColor="text-green-600"
        isLoading={isLoading}
      />
      <StatCard
        label="Inactive"
        value={stats?.inactive_users ?? 0}
        icon={<UserX size={20} />}
        iconBg="bg-red-50"
        iconColor="text-red-600"
        isLoading={isLoading}
      />
      <StatCard
        label="Admins"
        value={stats?.by_role?.admin ?? 0}
        icon={<Activity size={20} />}
        iconBg="bg-purple-50"
        iconColor="text-purple-600"
        isLoading={isLoading}
      />
    </div>
  )
}
