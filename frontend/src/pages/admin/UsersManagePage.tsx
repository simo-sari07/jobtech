/**
 * UsersManagePage — full admin user management dashboard.
 *
 * Layout:
 *   ┌─────────────────────────────────────────────────────────┐
 *   │  Header: title + [+ Add User] button                    │
 *   ├─────────────────────────────────────────────────────────┤
 *   │  UserStatsCards (4 KPI tiles)                           │
 *   ├─────────────────────────────────────────────────────────┤
 *   │  Filter bar: search · role · status · ordering          │
 *   ├─────────────────────────────────────────────────────────┤
 *   │  UsersTable (paginated, sortable)                       │
 *   └─────────────────────────────────────────────────────────┘
 *
 * Modals (state-driven, not routed):
 *   - UserFormModal   (create / edit)
 *   - ChangePasswordModal
 *   - ConfirmDialog   (toggle active)
 *   - AuditLogDrawer  (per-user history)
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui";
import { ROLE_LABELS } from "@/utils/constants";
import type { Role } from "@/utils/constants";
import {
  useUsers,
  useUserStats,
  useCreateUser,
  useUpdateUser,
  useChangePassword,
  useToggleUser,
  useBulkToggleUsers,
} from "@/features/users/hooks/useUsers";
import {
  UsersTable,
  UserFormModal,
  UserStatsCards,
  ConfirmDialog,
  AuditLogDrawer,
  UserFilters,
  BulkActionBar,
} from "@/features/users/components";
import { ChangePasswordModal } from "@/features/users/components/ChangePasswordModal";
import type {
  User,
  UserFilters as UserFilterParams,
  CreateUserPayload,
  UpdateUserPayload,
} from "@/features/users/types";

const PAGE_SIZE = 20;

export default function UsersManagePage() {
  const navigate = useNavigate();

  const [filters, setFilters] = useState<UserFilterParams>({
    role: "",
    is_active: "",
    search: "",
    ordering: "-date_joined",
    page: 1,
  });

  const updateFilter = (patch: Partial<UserFilterParams>) =>
    setFilters((f: UserFilterParams) => ({ ...f, ...patch, page: 1 }));

  // ── Modal / drawer state ────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [confirmUser, setConfirmUser] = useState<User | null>(null);
  const [auditUser, setAuditUser] = useState<User | null>(null);
  const [toggleLoadId, setToggleLoadId] = useState<number | null>(null);

  // ── Selection state ────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // ── Data hooks ──────────────────────────────────────────────────────────────
  const { data: usersData, isLoading: usersLoading } = useUsers({
    role: filters.role || undefined,
    is_active: filters.is_active || undefined,
    search: filters.search || undefined,
    ordering: filters.ordering,
    page: filters.page,
    page_size: PAGE_SIZE,
  });

  const { data: statsData, isLoading: statsLoading } = useUserStats();

  // ── Mutation hooks ──────────────────────────────────────────────────────────
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const changePw = useChangePassword();
  const toggleUser = useToggleUser();
  const bulkToggle = useBulkToggleUsers();

  // ── Derived ─────────────────────────────────────────────────────────────────
  const users = usersData?.results ?? [];
  const totalCount = usersData?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleCreate = async (data: CreateUserPayload | UpdateUserPayload) => {
    await createUser.mutateAsync(data as CreateUserPayload);
    setCreateOpen(false);
  };

  const handleUpdate = async (data: CreateUserPayload | UpdateUserPayload) => {
    if (!editingUser) return;
    await updateUser.mutateAsync({
      id: editingUser.id,
      payload: data as UpdateUserPayload,
    });
    setEditingUser(null);
  };

  const handlePasswordChange = async (newPassword: string) => {
    if (!passwordUser) return;
    await changePw.mutateAsync({
      id: passwordUser.id,
      payload: { new_password: newPassword },
    });
    setPasswordUser(null);
  };

  const handleToggleConfirm = async () => {
    if (!confirmUser) return;
    setToggleLoadId(confirmUser.id);
    await toggleUser.mutateAsync(confirmUser.id);
    setToggleLoadId(null);
    setConfirmUser(null);
  };

  // ── Selection Handlers ────────────────────────────────────────────────────
  const handleSelectId = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    const allOnPage = users.map((u) => u.id);
    const allSelected = allOnPage.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !allOnPage.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...allOnPage])]);
    }
  };

  const handleBulkAction = async (action: "activate" | "deactivate") => {
    await bulkToggle.mutateAsync({ ids: selectedIds, action });
    setSelectedIds([]);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto pb-24">
      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage accounts, roles, and access across the platform.
          </p>
        </div>
        <Button
          variant="primary"
          icon={<UserPlus size={16} />}
          onClick={() => setCreateOpen(true)}
        >
          Add User
        </Button>
      </div>

      {/* ── Stats cards ───────────────────────────────────────────────── */}
      <UserStatsCards stats={statsData?.data} isLoading={statsLoading} />

      {/* ── Filter bar ────────────────────────────────────────────────── */}
      <UserFilters
        filters={filters}
        onUpdate={updateFilter}
        onClear={() => updateFilter({ search: "", role: "", is_active: "" })}
      />

      {/* ── Users table ───────────────────────────────────────────────── */}
      <UsersTable
        users={users}
        isLoading={usersLoading}
        currentPage={filters.page ?? 1}
        totalPages={totalPages}
        totalCount={totalCount}
        ordering={filters.ordering ?? "-date_joined"}
        selectedIds={selectedIds}
        onSelectId={handleSelectId}
        onSelectAll={handleSelectAll}
        onPageChange={(page) =>
          setFilters((f: UserFilterParams) => ({ ...f, page }))
        }
        onSort={(ordering) => updateFilter({ ordering })}
        onEdit={(user) => setEditingUser(user)}
        onToggle={(user) => setConfirmUser(user)}
        onRowClick={(user) => navigate(`/dashboard/admin/users/${user.id}`)}
        toggleLoadingId={toggleLoadId}
        bulkActions={
          <BulkActionBar
            selectedCount={selectedIds.length}
            onClear={() => setSelectedIds([])}
            onActivate={() => handleBulkAction("activate")}
            onDeactivate={() => handleBulkAction("deactivate")}
            isLoading={bulkToggle.isPending}
          />
        }
      />


      {/* ── Modals ────────────────────────────────────────────────────── */}

      {/* Create */}
      <UserFormModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        isLoading={createUser.isPending}
      />

      {/* Edit */}
      <UserFormModal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        onSubmit={handleUpdate}
        initialValues={editingUser ?? undefined}
        isLoading={updateUser.isPending}
      />

      {/* Change password */}
      {passwordUser && (
        <ChangePasswordModal
          isOpen={!!passwordUser}
          onClose={() => setPasswordUser(null)}
          onSubmit={handlePasswordChange}
          user={passwordUser}
          isLoading={changePw.isPending}
        />
      )}

      {/* Toggle active confirm */}
      {confirmUser && (
        <ConfirmDialog
          isOpen={!!confirmUser}
          onClose={() => setConfirmUser(null)}
          onConfirm={handleToggleConfirm}
          intent={confirmUser.is_active ? "danger" : "warning"}
          title={
            confirmUser.is_active ? "Deactivate Account" : "Activate Account"
          }
          description={
            confirmUser.is_active
              ? `This will immediately log ${confirmUser.first_name} out of all active sessions and disable their access.`
              : `This will restore ${confirmUser.first_name}'s access to the platform.`
          }
          confirmLabel={confirmUser.is_active ? "Deactivate" : "Activate"}
          isLoading={toggleUser.isPending}
        />
      )}

      {/* Audit log drawer */}
      {auditUser && (
        <AuditLogDrawer
          isOpen={!!auditUser}
          onClose={() => setAuditUser(null)}
          userId={auditUser.id}
          userName={auditUser.full_name}
        />
      )}
    </div>
  );
}
