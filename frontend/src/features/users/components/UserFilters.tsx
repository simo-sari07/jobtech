/**
 * UserFilters — reusable filter bar for User Management.
 *
 * Encapsulates search, role dropdown, status dropdown, and clear functionality.
 */
import { Search } from 'lucide-react'
import { Button } from '@/components/ui'
import { ROLE_LABELS } from '@/utils/constants'
import type { Role } from '@/utils/constants'
import type { UserFilters as FilterType } from '../types'

interface UserFiltersProps {
  filters:      FilterType
  onUpdate:     (patch: Partial<FilterType>) => void
  onClear:      () => void
}

export function UserFilters({ filters, onUpdate, onClear }: UserFiltersProps) {
  const hasFilters = filters.search || filters.role || filters.is_active

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search by name or email…"
            value={filters.search ?? ''}
            onChange={e => onUpdate({ search: e.target.value })}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-50 transition-all font-medium placeholder:text-slate-400"
          />
        </div>

        {/* Role filter */}
        <div className="min-w-[140px]">
          <select
            value={filters.role ?? ''}
            onChange={e => onUpdate({ role: e.target.value as Role | '' })}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-blue-400 font-medium appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2394a3b8%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22m19%209-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
          >
            <option value="">All Roles</option>
            {(Object.entries(ROLE_LABELS) as [Role, string][]).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <div className="min-w-[140px]">
          <select
            value={filters.is_active ?? ''}
            onChange={e => onUpdate({ is_active: e.target.value as '' | 'true' | 'false' })}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-blue-400 font-medium appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2394a3b8%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22m19%209-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
          >
            <option value="">All Statuses</option>
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
          </select>
        </div>

        {/* Reset */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="md"
            onClick={onClear}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-semibold"
          >
            Clear filters
          </Button>
        )}
      </div>
    </div>
  )
}
