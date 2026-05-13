/**
 * UserDetailPage — full detail view for a single admin-managed user.
 *
 * Route: /admin/users/:id
 *
 * Layout:
 *   ┌────────────────────────────────────────────────────────────┐
 *   │  Breadcrumb: User Management > John Doe                    │
 *   ├───────────────────┬────────────────────────────────────────┤
 *   │  UserDetailCard   │  AuditLogDrawer (inline, not slide-over│
 *   │  (left 1/3)       │  — right 2/3)                          │
 *   └───────────────────┴────────────────────────────────────────┘
 */
import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Users } from 'lucide-react'
import { Spinner } from '@/components/ui'
import {
  useUserDetail, useUpdateUser,
  useChangePassword, useToggleUser,
  useUserAuditLog,
} from '@/features/users/hooks/useUsers'
import { UserDetailCard }        from '@/features/users/components/UserDetailCard'
import { UserFormModal }         from '@/features/users/components/UserFormModal'
import { ChangePasswordModal }   from '@/features/users/components/ChangePasswordModal'
import { ConfirmDialog }         from '@/features/users/components/ConfirmDialog'
import type { CreateUserPayload, UpdateUserPayload, UserAuditLog } from '@/features/users/types'

export default function UserDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const userId   = id ? parseInt(id, 10) : undefined

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data: detailData, isLoading, isError } = useUserDetail(userId)
  const user = detailData?.data

  // ── Modal state ────────────────────────────────────────────────────────────
  const [editOpen,    setEditOpen]    = useState(false)
  const [pwOpen,      setPwOpen]      = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [auditOpen,   setAuditOpen]   = useState(true)  // inline — open by default

  // ── Mutations ──────────────────────────────────────────────────────────────
  const updateUser  = useUpdateUser()
  const changePw    = useChangePassword()
  const toggleUser  = useToggleUser()

  const handleUpdate = async (data: CreateUserPayload | UpdateUserPayload) => {
    if (!userId) return
    await updateUser.mutateAsync({ id: userId, payload: data as UpdateUserPayload })
    setEditOpen(false)
  }

  const handlePasswordChange = async (newPassword: string) => {
    if (!userId) return
    await changePw.mutateAsync({ id: userId, payload: { new_password: newPassword } })
    setPwOpen(false)
  }

  const handleToggle = async () => {
    if (!userId) return
    await toggleUser.mutateAsync(userId)
    setConfirmOpen(false)
  }

  // ── Loading / error states ─────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={28} />
      </div>
    )
  }

  if (isError || !user) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500 text-sm">User not found or you don't have permission to view this profile.</p>
        <button
          onClick={() => navigate('/dashboard/admin/users')}
          className="mt-3 text-sm text-blue-600 hover:underline"
        >
          ← Back to User Management
        </button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-1.5 text-sm mb-6">
        <Link
          to="/dashboard/admin/users"
          className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 transition-colors group"
        >
          <ChevronLeft size={16} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
          <Users size={14} />
          User Management
        </Link>
        <ChevronRight size={14} className="text-slate-300" />
        <span className="text-slate-900 font-medium">{user.full_name}</span>
      </nav>

      {/* ── Main layout ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left — UserDetailCard */}
        <div className="lg:col-span-1">
          <UserDetailCard
            user={user}
            onEdit={() => setEditOpen(true)}
            onChangePassword={() => setPwOpen(true)}
            onToggleActive={() => setConfirmOpen(true)}
            isToggling={toggleUser.isPending}
            isLoading={updateUser.isPending || changePw.isPending}
          />
        </div>

        {/* Right — Inline audit log */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Audit History</h2>
              <span className="text-xs text-slate-400">All admin actions on this account</span>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: '600px' }}>
              <InlineAuditLog userId={user.id} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}

      <UserFormModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleUpdate}
        initialValues={user}
        isLoading={updateUser.isPending}
      />

      <ChangePasswordModal
        isOpen={pwOpen}
        onClose={() => setPwOpen(false)}
        onSubmit={handlePasswordChange}
        user={user}
        isLoading={changePw.isPending}
      />

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleToggle}
        intent={user.is_active ? 'danger' : 'warning'}
        title={user.is_active ? 'Deactivate Account' : 'Activate Account'}
        description={
          user.is_active
            ? `This will immediately log ${user.first_name} out of all active sessions.`
            : `This will restore ${user.first_name}'s access to the platform.`
        }
        confirmLabel={user.is_active ? 'Deactivate' : 'Activate'}
        isLoading={toggleUser.isPending}
      />
    </div>
  )
}

// ─── Inline audit log (clean timeline without drawer chrome) ─────────────────

function InlineAuditLog({ userId }: { userId: number }) {
  const [actionFilter, setActionFilter] = useState('')
  const [page, setPage]                 = useState(1)

  const { data, isLoading } = useUserAuditLog(userId, actionFilter || undefined, page)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner size={20} />
      </div>
    )
  }

  if (!data?.results?.length) {
    return (
      <div className="p-8 text-center text-sm text-slate-400">No audit entries yet.</div>
    )
  }

  return (
    <div className="divide-y divide-slate-50">
      {data.results.map((entry: UserAuditLog) => (
        <div key={entry.id} className="px-5 py-3 flex items-start gap-3">
          <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 shrink-0" />
          <div>
            <p className="text-sm font-medium text-slate-800">
              {entry.action.replace(/_/g, ' ')}
            </p>
            {entry.actor_display && (
              <p className="text-xs text-slate-500">by {entry.actor_display}</p>
            )}
            <p className="text-xs text-slate-400 mt-0.5">
              {new Date(entry.created_at).toLocaleString()}
              {entry.ip_address && ` · ${entry.ip_address}`}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
