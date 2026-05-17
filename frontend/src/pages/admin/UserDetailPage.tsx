/**
 * UserDetailPage — full detail view for a single admin-managed user.
 *
 * Route: /admin/users/:id
 */
import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ChevronRight, ChevronLeft, Users, Briefcase } from "lucide-react";
import { Spinner } from "@/components/ui";
import {
  useUserDetail,
  useUpdateUser,
  useChangePassword,
  useToggleUser,
  useUserAuditLog,
} from "@/features/users/hooks/useUsers";
import {
  useApplications,
  useUpdateApplicationStatus,
} from "@/features/applications/hooks/useApplications";
import toast from "react-hot-toast";
import { UserDetailCard } from "@/features/users/components/UserDetailCard";
import { UserFormModal } from "@/features/users/components/UserFormModal";
import { ChangePasswordModal } from "@/features/users/components/ChangePasswordModal";
import { ConfirmDialog } from "@/features/users/components/ConfirmDialog";
import type {
  CreateUserPayload,
  UpdateUserPayload,
  UserAuditLog,
} from "@/features/users/types";

// ── Status Config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<
  string,
  {
    label: string;
    bg: string;
    text: string;
    dot: string;
  }
> = {
  pending: {
    label: "Pending",
    bg: "bg-slate-50",
    text: "text-slate-600",
    dot: "bg-slate-400",
  },
  in_review: {
    label: "In Review",
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-500",
  },
  shortlisted: {
    label: "Shortlisted",
    bg: "bg-purple-50",
    text: "text-purple-700",
    dot: "bg-purple-500",
  },
  interview: {
    label: "Interview",
    bg: "bg-teal-50",
    text: "text-teal-700",
    dot: "bg-teal-500",
  },
  hired: {
    label: "Hired",
    bg: "bg-green-50",
    text: "text-green-700",
    dot: "bg-green-500",
  },
  rejected: {
    label: "Rejected",
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-500",
  },
  withdrawn: {
    label: "Withdrawn",
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-500",
  },
};

// ── Score Helpers ─────────────────────────────────────────────────────────────

function scoreColor(s: number): string {
  if (s >= 80) return "bg-green-500";
  if (s >= 60) return "bg-blue-500";
  if (s >= 40) return "bg-amber-500";
  return "bg-red-400";
}

function scoreTextColor(s: number): string {
  if (s >= 80) return "text-green-700";
  if (s >= 60) return "text-blue-700";
  if (s >= 40) return "text-amber-700";
  return "text-red-600";
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const userId = id ? parseInt(id, 10) : undefined;

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data: detailData, isLoading, isError } = useUserDetail(userId);
  const user = detailData?.data;

  // ── Modal state ────────────────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const updateUser = useUpdateUser();
  const changePw = useChangePassword();
  const toggleUser = useToggleUser();

  const handleUpdate = async (data: CreateUserPayload | UpdateUserPayload) => {
    if (!userId) return;
    await updateUser.mutateAsync({
      id: userId,
      payload: data as UpdateUserPayload,
    });
    setEditOpen(false);
  };

  const handlePasswordChange = async (newPassword: string) => {
    if (!userId) return;
    await changePw.mutateAsync({
      id: userId,
      payload: { new_password: newPassword },
    });
    setPwOpen(false);
  };

  const handleToggle = async () => {
    if (!userId) return;
    await toggleUser.mutateAsync(userId);
    setConfirmOpen(false);
  };

  // ── Loading / error states ─────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={28} />
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500 text-sm">
          User not found or you don't have permission to view this profile.
        </p>
        <button
          onClick={() => navigate("/dashboard/admin/users")}
          className="mt-3 text-sm text-blue-600 hover:underline"
        >
          ← Back to User Management
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-1.5 text-sm mb-6">
        <Link
          to="/dashboard/admin/users"
          className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 transition-colors group"
        >
          <ChevronLeft
            size={16}
            className="text-slate-400 group-hover:text-blue-600 transition-colors"
          />
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

        {/* Right — Applications & Inline audit log */}
        <div className="lg:col-span-2 space-y-6">
          {user.role === "candidate" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
              <div className="border-b border-slate-100 pb-4 mb-5">
                <h2 className="text-base font-bold text-slate-900">
                  Submitted Job Applications
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  List of applications and recruiting funnel status
                </p>
              </div>
              <CandidateApplicationsList candidateId={user.id} />
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Audit History
              </h2>
              <span className="text-xs text-slate-400">
                All admin actions on this account
              </span>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "600px" }}>
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
        intent={user.is_active ? "danger" : "warning"}
        title={user.is_active ? "Deactivate Account" : "Activate Account"}
        description={
          user.is_active
            ? `This will immediately log ${user.first_name} out of all active sessions.`
            : `This will restore ${user.first_name}'s access to the platform.`
        }
        confirmLabel={user.is_active ? "Deactivate" : "Activate"}
        isLoading={toggleUser.isPending}
      />
    </div>
  );
}

// ─── Inline audit log (clean timeline without drawer chrome) ─────────────────

function InlineAuditLog({ userId }: { userId: number }) {
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useUserAuditLog(
    userId,
    actionFilter || undefined,
    page,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner size={20} />
      </div>
    );
  }

  if (!data?.results?.length) {
    return (
      <div className="p-8 text-center text-sm text-slate-400">
        No audit entries yet.
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-50">
      {data.results.map((entry: UserAuditLog) => (
        <div key={entry.id} className="px-5 py-3 flex items-start gap-3">
          <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 shrink-0" />
          <div>
            <p className="text-sm font-medium text-slate-800">
              {entry.action.replace(/_/g, " ")}
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
  );
}

// ─── Candidate Applications List ─────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in_review", label: "In Review" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "interview", label: "Interview" },
  { value: "hired", label: "Hired" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
];

function CandidateApplicationsList({ candidateId }: { candidateId: number }) {
  const { data: appsData, isLoading } = useApplications();
  const updateStatusMutation = useUpdateApplicationStatus();

  const candidateApps =
    appsData?.results?.filter((app) => app.candidate_id === candidateId) || [];

  const handleStatusChange = async (appId: number, newStatus: string) => {
    try {
      await updateStatusMutation.mutateAsync({ id: appId, status: newStatus });
      toast.success(`Application status updated successfully!`);
    } catch (err) {
      toast.error("Failed to update status.");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-4 border border-slate-100 rounded-xl animate-pulse"
          >
            <div className="space-y-2">
              <div className="h-4 w-32 bg-slate-100 rounded-md" />
              <div className="h-3 w-48 bg-slate-100 rounded-md" />
            </div>
            <div className="h-6 w-20 bg-slate-100 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (candidateApps.length === 0) {
    return (
      <div className="text-center py-6 text-slate-400 text-sm">
        This candidate hasn't submitted any job applications yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {candidateApps.map((app) => {
        const cfg = STATUS_CFG[app.status] ?? STATUS_CFG.pending;
        const score =
          app.ai_score != null ? Math.round(Number(app.ai_score)) : null;

        return (
          <div
            key={app.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-100 hover:bg-slate-50/50 transition-colors"
          >
            <div className="min-w-0">
              <p className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Briefcase size={14} className="text-slate-400 shrink-0" />
                {app.job_title}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Applied on {new Date(app.created_at).toLocaleDateString()}
              </p>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
              {/* AI Score */}
              {score != null ? (
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold ${scoreTextColor(score)}`}
                  >
                    AI: {score}%
                  </span>
                  <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${scoreColor(score)}`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              ) : (
                <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-150 font-medium">
                  AI Processing
                </span>
              )}

              {/* Status Badge Dropdown */}
              <div className="relative inline-block shrink-0">
                <select
                  value={app.status}
                  onChange={(e) => handleStatusChange(app.id, e.target.value)}
                  disabled={updateStatusMutation.isPending}
                  className={`text-[11px] font-bold rounded-full px-3 py-1 border cursor-pointer outline-none transition-all ${cfg.bg} ${cfg.text} hover:opacity-85 border-slate-200/60 appearance-none pr-6`}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option
                      key={opt.value}
                      value={opt.value}
                      className="bg-white text-slate-700 font-semibold"
                    >
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-slate-400">
                  <svg
                    className="fill-current h-3 w-3"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
