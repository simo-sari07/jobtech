/**
 * UsersTable — paginated user list with skeleton loading and empty state.
 *
 * Design decisions:
 * - No API calls. Receives data, isLoading, and callbacks as props.
 * - Skeleton rows match the exact column layout to prevent layout shift.
 * - "Actions" column uses icon buttons to keep rows compact.
 * - Row click → view detail (separate from action buttons).
 * - Pagination is rendered by the parent — this component receives
 *   currentPage / totalPages / onPageChange so it stays reusable.
 */
import { formatDistanceToNow } from 'date-fns'
import {
  Users, Pencil, PowerOff, PowerCircle, ChevronLeft, ChevronRight,
  ArrowUpDown,
} from 'lucide-react'
import { EmptyState, Spinner } from '@/components/ui'
import { RoleBadge } from './RoleBadge'
import { StatusBadge } from './StatusBadge'
import { OnlineStatusDot } from './StatusBadge'
import type { User } from '../types'

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100 animate-pulse">
      {/* Avatar + name */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
          <div className="space-y-1.5">
            <div className="h-3 w-28 bg-slate-200 rounded-full" />
            <div className="h-2.5 w-36 bg-slate-100 rounded-full" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3"><div className="h-3 w-20 bg-slate-200 rounded-full" /></td>
      <td className="px-4 py-3"><div className="h-5 w-24 bg-slate-200 rounded-full" /></td>
      <td className="px-4 py-3"><div className="h-3 w-24 bg-slate-200 rounded-full" /></td>
      <td className="px-4 py-3"><div className="h-3 w-16 bg-slate-200 rounded-full" /></td>
      <td className="px-4 py-3"><div className="h-6 w-16 bg-slate-200 rounded-lg" /></td>
    </tr>
  )
}

// ─── User initials avatar ─────────────────────────────────────────────────────

function RowAvatar({ user }: { user: User }) {
  const initials = `${user.first_name[0] ?? ''}${user.last_name[0] ?? ''}`.toUpperCase()
  const hues     = [210, 160, 280, 330, 30, 190]
  const hue      = hues[user.id % hues.length]

  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 select-none"
      style={{ background: `hsl(${hue} 60% 52%)` }}
    >
      {initials}
    </div>
  )
}

// ─── Sortable column header ───────────────────────────────────────────────────

function SortableHeader({ label, field, currentOrdering, onSort }: {
  label:           string
  field:           string
  currentOrdering: string
  onSort:          (field: string) => void
}) {
  const isActive = currentOrdering.replace('-', '') === field
  const isDesc   = currentOrdering.startsWith('-') && isActive

  return (
    <th
      scope="col"
      className="px-4 py-3 text-left cursor-pointer select-none group"
      onClick={() => onSort(isActive && !isDesc ? `-${field}` : field)}
    >
      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide group-hover:text-slate-700 transition-colors">
        {label}
        <ArrowUpDown
          size={11}
          className={isActive ? 'text-blue-500' : 'text-slate-300 group-hover:text-slate-400'}
        />
      </div>
    </th>
  )
}

// ─── Pagination controls ──────────────────────────────────────────────────────

function Pagination({ current, total, onPage }: {
  current: number
  total:   number
  onPage:  (p: number) => void
}) {
  if (total <= 1) return null

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
      <p className="text-xs text-slate-500">
        Page <span className="font-medium text-slate-700">{current}</span> of{' '}
        <span className="font-medium text-slate-700">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPage(current - 1)}
          disabled={current === 1}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </button>
        <button
          onClick={() => onPage(current + 1)}
          disabled={current === total}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface UsersTableProps {
  users:        User[]
  isLoading:    boolean
  currentPage:  number
  totalPages:   number
  totalCount:   number
  ordering:     string
  onPageChange: (page: number) => void
  onSort:       (field: string) => void
  onEdit:       (user: User) => void
  onToggle:     (user: User) => void
  onRowClick:   (user: User) => void
  toggleLoadingId?: number | null
  // Bulk selection props
  selectedIds:  number[]
  onSelectId:   (id: number) => void
  onSelectAll:  () => void
  bulkActions?: React.ReactNode
}


export function UsersTable({
  users,
  isLoading,
  currentPage,
  totalPages,
  totalCount,
  ordering,
  onPageChange,
  onSort,
  onEdit,
  onToggle,
  onRowClick,
  toggleLoadingId = null,
  selectedIds,
  onSelectId,
  onSelectAll,
  bulkActions,
}: UsersTableProps) {
  const allSelected = users.length > 0 && users.every(u => selectedIds.includes(u.id))
  const someSelected = users.some(u => selectedIds.includes(u.id)) && !allSelected
  const hasSelection = selectedIds.length > 0

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300">

      {/* Table header row with count or bulk actions */}
      <div className="min-h-[56px] border-b border-slate-100 flex items-center overflow-hidden">
        {hasSelection && bulkActions ? (
          <div className="flex-1 animate-in slide-in-from-left-4 duration-300">
            {bulkActions}
          </div>
        ) : (
          <div className="px-6 py-4 flex items-center justify-between w-full">
            <p className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">
              {isLoading
                ? <span className="inline-flex items-center gap-2"><Spinner size={14} /> Loading records...</span>
                : <><span className="text-slate-900">{totalCount}</span> total users</>
              }
            </p>
          </div>
        )}
      </div>


      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-4 py-3 text-left w-10">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  checked={allSelected}
                  ref={el => { if (el) el.indeterminate = someSelected }}
                  onChange={onSelectAll}
                />
              </th>
              <SortableHeader label="User"        field="last_name"     currentOrdering={ordering} onSort={onSort} />
              <SortableHeader label="Role"        field="role"          currentOrdering={ordering} onSort={onSort} />
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Status
              </th>
              <SortableHeader label="Last active" field="last_activity" currentOrdering={ordering} onSort={onSort} />
              <SortableHeader label="Joined"      field="date_joined"   currentOrdering={ordering} onSort={onSort} />
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon={<Users size={20} />}
                    title="No users found"
                    description="Try adjusting your search or filter criteria."
                  />
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const isSelected = selectedIds.includes(user.id)
                return (
                  <tr
                    key={user.id}
                    onClick={() => onRowClick(user)}
                    className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors cursor-pointer group ${isSelected ? 'bg-blue-50/30' : ''}`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        checked={isSelected}
                        onChange={() => onSelectId(user.id)}
                      />
                    </td>

                    {/* User name + email */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <RowAvatar user={user} />
                          <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                            !user.is_active       ? 'bg-slate-300' :
                            user.online_status === 'online' ? 'bg-green-500' :
                            user.online_status === 'away'   ? 'bg-amber-400' :
                                                              'bg-slate-300'
                          }`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                            {user.full_name}
                          </p>
                          <p className="text-xs text-slate-400 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <RoleBadge role={user.role} />
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge
                        isActive={user.is_active}
                        onlineStatus={user.online_status}
                      />
                    </td>

                    {/* Last activity */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {user.is_active && user.online_status !== 'offline' && (
                          <OnlineStatusDot status={user.online_status} />
                        )}
                        <span className="text-xs text-slate-500">
                          {user.last_activity
                            ? formatDistanceToNow(new Date(user.last_activity), { addSuffix: true })
                            : <span className="italic text-slate-400">Never</span>
                          }
                        </span>
                      </div>
                    </td>

                    {/* Date joined */}
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(user.date_joined).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()} // Don't trigger row click
                      >
                        {/* Edit */}
                        <button
                          onClick={() => onEdit(user)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit user"
                          aria-label={`Edit ${user.full_name}`}
                        >
                          <Pencil size={14} />
                        </button>

                        {/* Activate / Deactivate */}
                        <button
                          onClick={() => onToggle(user)}
                          disabled={toggleLoadingId === user.id}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                            user.is_active
                              ? 'text-slate-400 hover:text-red-600   hover:bg-red-50'
                              : 'text-slate-400 hover:text-green-600 hover:bg-green-50'
                          }`}
                          title={user.is_active ? 'Deactivate' : 'Activate'}
                          aria-label={user.is_active ? `Deactivate ${user.full_name}` : `Activate ${user.full_name}`}
                        >
                          {toggleLoadingId === user.id
                            ? <Spinner size={14} />
                            : user.is_active
                              ? <PowerOff   size={14} />
                              : <PowerCircle size={14} />
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!isLoading && (
        <Pagination
          current={currentPage}
          total={totalPages}
          onPage={onPageChange}
        />
      )}
    </div>
  )
}

