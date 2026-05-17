/**
 * ApplicationsManagePage — ATS-style workflow with role-based actions.
 */
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  FileText,
  Download,
  Calendar,
  MoreHorizontal,
  Search,
  Archive,
  ArchiveRestore,
  Trash2,
  Eye,
  CheckSquare,
  Square,
  X,
  Clock,
  History,
  AlertTriangle,
  Mail,
  MapPin,
  Briefcase,
  ExternalLink,
} from "lucide-react";
import {
  useApplications,
  useUpdateApplicationStatus,
  useArchiveApplication,
  useUnarchiveApplication,
  useDeleteApplication,
  useBulkUpdateStatus,
  useBulkArchive,
  useBulkDelete,
  useAuditLog,
} from "@/features/applications/hooks/useApplications";
import type { Application } from "@/features/applications/api";
import { Badge, Card, EmptyState, Spinner } from "@/components/ui";
import ScheduleInterviewModal from "@/features/interviews/components/ScheduleInterviewModal";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["in_review", "rejected"],
  in_review: ["shortlisted", "rejected"],
  shortlisted: ["interview", "hired", "rejected"],
  interview: ["hired", "rejected"],
  hired: [],
  rejected: [],
  withdrawn: [],
};

const STATUS_CFG: Record<
  string,
  {
    variant: "default" | "blue" | "purple" | "green" | "red" | "amber" | "teal";
    label: string;
    bg: string;
    text: string;
    dot: string;
  }
> = {
  pending: {
    variant: "default",
    label: "Pending",
    bg: "bg-slate-50",
    text: "text-slate-600",
    dot: "bg-slate-400",
  },
  in_review: {
    variant: "blue",
    label: "In Review",
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-500",
  },
  shortlisted: {
    variant: "purple",
    label: "Shortlisted",
    bg: "bg-purple-50",
    text: "text-purple-700",
    dot: "bg-purple-500",
  },
  interview: {
    variant: "teal",
    label: "Interview",
    bg: "bg-teal-50",
    text: "text-teal-700",
    dot: "bg-teal-500",
  },
  hired: {
    variant: "green",
    label: "Hired",
    bg: "bg-green-50",
    text: "text-green-700",
    dot: "bg-green-500",
  },
  rejected: {
    variant: "red",
    label: "Rejected",
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-500",
  },
  withdrawn: {
    variant: "amber",
    label: "Withdrawn",
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-500",
  },
};

const STATUS_LABELS: Record<string, string> = {
  in_review: "In Review",
  shortlisted: "Shortlisted",
  interview: "Interview",
  hired: "Hired",
  rejected: "Rejected",
};

// ── Score helpers ─────────────────────────────────────────────────────────────

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

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Actions Dropdown ──────────────────────────────────────────────────────────

function ActionsDropdown({
  app,
  userRole,
  onStatusChange,
  onArchive,
  onUnarchive,
  onDelete,
  onSchedule,
  onViewDetails,
  onOpenChange,
}: {
  app: Application;
  userRole: string;
  onStatusChange: (id: number, status: string) => void;
  onArchive: (id: number) => void;
  onUnarchive: (id: number) => void;
  onDelete: (id: number) => void;
  onSchedule: (app: Application) => void;
  onViewDetails: (app: Application) => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; openUpward: boolean }>({
    top: 0,
    left: 0,
    openUpward: false,
  });
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        ref.current &&
        !ref.current.contains(target) &&
        !(menuRef.current && menuRef.current.contains(target))
      ) {
        setOpen(false);
        onOpenChange?.(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onOpenChange]);

  const handleToggle = () => {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      // Estimate menu height as 360px
      const menuHeight = 360;
      const openUpward = spaceBelow < menuHeight && spaceAbove > spaceBelow;

      const top = openUpward
        ? rect.top + window.scrollY - menuHeight - 4
        : rect.bottom + window.scrollY + 4;
      const left = rect.right + window.scrollX - 208; // 208px is the width (w-52)

      setCoords({ top, left, openUpward });
    }
    const next = !open;
    setOpen(next);
    onOpenChange?.(next);
  };

  const nextStatuses = STATUS_TRANSITIONS[app.status] ?? [];
  const isAdmin = userRole === "admin";
  const isHROrAdmin = userRole === "admin" || userRole === "hr_manager";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleToggle}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
      >
        <MoreHorizontal size={16} />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "absolute",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
            }}
            className={`w-52 bg-white border border-slate-200 rounded-xl shadow-lg z-[9999] py-1 animate-in fade-in duration-150 ${
              coords.openUpward
                ? "slide-in-from-bottom-1"
                : "slide-in-from-top-1"
            }`}
          >
            {/* View details */}
            <button
              onClick={() => {
                onViewDetails(app);
                setOpen(false);
                onOpenChange?.(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Eye size={14} className="text-slate-400" />
              View Details
            </button>

            {/* Download CV */}
            {app.cv_url && (
              <a
                href={app.cv_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  setOpen(false);
                  onOpenChange?.(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Download size={14} className="text-slate-400" />
                Download CV
              </a>
            )}

            {/* View Profile */}
            {app.candidate_id && (
              <button
                onClick={() => {
                  navigate(`/dashboard/users/${app.candidate_id}`);
                  setOpen(false);
                  onOpenChange?.(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <ExternalLink size={14} className="text-slate-400" />
                View Profile
              </button>
            )}

            {/* Status transitions */}
            {nextStatuses.length > 0 && (
              <>
                <div className="border-t border-slate-100 my-1" />
                <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Move to
                </div>
                {nextStatuses.map((ns) => {
                  const cfg = STATUS_CFG[ns];
                  return (
                    <button
                      key={ns}
                      onClick={() => {
                        onStatusChange(app.id, ns);
                        setOpen(false);
                        onOpenChange?.(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${cfg?.dot ?? "bg-slate-400"}`}
                      />
                      <span className={cfg?.text ?? "text-slate-700"}>
                        {STATUS_LABELS[ns] ?? ns}
                      </span>
                    </button>
                  );
                })}
              </>
            )}

            {/* Schedule interview */}
            {(app.status === "shortlisted" || app.status === "interview") && (
              <>
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={() => {
                    onSchedule(app);
                    setOpen(false);
                    onOpenChange?.(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-purple-700 hover:bg-purple-50 transition-colors"
                >
                  <Calendar size={14} />
                  Schedule Interview
                </button>
              </>
            )}

            {/* Archive / Unarchive */}
            {isHROrAdmin && (
              <>
                <div className="border-t border-slate-100 my-1" />
                {app.is_archived ? (
                  <button
                    onClick={() => {
                      onUnarchive(app.id);
                      setOpen(false);
                      onOpenChange?.(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 transition-colors"
                  >
                    <ArchiveRestore size={14} />
                    Restore from Archive
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      onArchive(app.id);
                      setOpen(false);
                      onOpenChange?.(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-amber-700 hover:bg-amber-50 transition-colors"
                  >
                    <Archive size={14} />
                    Archive
                  </button>
                )}
              </>
            )}

            {/* Delete — admin only */}
            {isAdmin && (
              <button
                onClick={() => {
                  onDelete(app.id);
                  setOpen(false);
                  onOpenChange?.(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={14} />
                Delete Permanently
              </button>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────

function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  variant = "danger",
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  variant?: "danger" | "warning";
  loading?: boolean;
}) {
  if (!open) return null;
  const btnClass =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 text-white"
      : "bg-amber-500 hover:bg-amber-600 text-white";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start gap-3 mb-4">
          <div
            className={`p-2 rounded-full ${variant === "danger" ? "bg-red-100" : "bg-amber-100"}`}
          >
            <AlertTriangle
              size={20}
              className={
                variant === "danger" ? "text-red-600" : "text-amber-600"
              }
            />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500 mt-1">{description}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${btnClass} disabled:opacity-50`}
          >
            {loading && <Spinner size={14} className="text-white" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Candidate Detail Drawer ───────────────────────────────────────────────────

function CandidateDrawer({
  app,
  onClose,
}: {
  app: Application | null;
  onClose: () => void;
}) {
  const { data: logs, isLoading: logsLoading } = useAuditLog(app?.id ?? null);

  if (!app) return null;

  const score = app.ai_score != null ? Math.round(Number(app.ai_score)) : null;
  const cfg = STATUS_CFG[app.status] ?? STATUS_CFG.pending;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-base font-semibold text-slate-900">
            Application Details
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Candidate info */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
              {app.candidate_name?.charAt(0) ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 text-base">
                {app.candidate_name}
              </h3>
              <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-0.5">
                <Mail size={12} />
                {app.candidate_email}
              </div>
            </div>
          </div>

          {/* Status + Score */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Status
              </div>
              <Badge variant={cfg.variant} dot>
                {cfg.label}
              </Badge>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                AI Score
              </div>
              {score != null ? (
                <div className="flex items-center gap-2">
                  <span
                    className={`text-lg font-bold ${scoreTextColor(score)}`}
                  >
                    {score}%
                  </span>
                  <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${scoreColor(score)}`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              ) : (
                <span className="text-sm text-slate-400">Not scored</span>
              )}
            </div>
          </div>

          {/* Job info */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Briefcase size={14} className="text-slate-400" />
              <span className="font-medium text-slate-700">
                {app.job_title}
              </span>
            </div>
            {app.job_location && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <MapPin size={14} className="text-slate-400" />
                {app.job_location}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Clock size={14} className="text-slate-400" />
              Applied {formatDate(app.created_at)}
            </div>
          </div>

          {/* Cover letter */}
          {app.cover_letter && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Cover Letter
              </h4>
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-4">
                {app.cover_letter}
              </p>
            </div>
          )}

          {/* Notes */}
          {app.notes && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Recruiter Notes
              </h4>
              <p className="text-sm text-slate-600 bg-amber-50 border border-amber-100 rounded-xl p-4">
                {app.notes}
              </p>
            </div>
          )}

          {/* CV link */}
          {app.cv_url && (
            <a
              href={app.cv_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              <FileText size={14} />
              View CV
              <ExternalLink size={12} />
            </a>
          )}

          {/* Audit log */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <History size={12} />
              Activity Log
            </h4>
            {logsLoading ? (
              <div className="flex justify-center py-6">
                <Spinner size={18} />
              </div>
            ) : logs && logs.length > 0 ? (
              <div className="space-y-0 relative">
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />
                {logs.map((log) => (
                  <div key={log.id} className="flex gap-3 pb-3 relative">
                    <div className="w-[15px] h-[15px] rounded-full bg-white border-2 border-slate-300 shrink-0 mt-0.5 z-10" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-700">
                        <span className="font-medium">
                          {log.performed_by_name}
                        </span>{" "}
                        {log.action.replace("_", " ")}
                        {log.new_value && (
                          <>
                            {" "}
                            &rarr;{" "}
                            <Badge
                              variant={
                                STATUS_CFG[log.new_value]?.variant ?? "default"
                              }
                              size="sm"
                            >
                              {STATUS_CFG[log.new_value]?.label ??
                                log.new_value}
                            </Badge>
                          </>
                        )}
                      </div>
                      {log.note && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          {log.note}
                        </p>
                      )}
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {formatDate(log.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">
                No activity recorded yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ApplicationsManagePage() {
  const [searchParams] = useSearchParams();
  const jobFilter = searchParams.get("job") ?? "";
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [schedulingApp, setSchedulingApp] = useState<{
    id: number;
    name: string;
    job: string;
  } | null>(null);
  const [drawerApp, setDrawerApp] = useState<Application | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: "delete" | "archive" | "bulk-archive" | "bulk-status" | "bulk-delete";
    id?: number;
    status?: string;
  } | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

  const user = useAuthStore((s) => s.user);
  const userRole = user?.role ?? "";
  const isAdmin = userRole === "admin";
  const isHROrAdmin = userRole === "admin" || userRole === "hr_manager";

  const { data, isLoading } = useApplications({
    status: statusFilter || undefined,
    job: jobFilter ? Number(jobFilter) : undefined,
    archived: showArchived || undefined,
    search: searchTerm || undefined,
  });
  const updateStatus = useUpdateApplicationStatus();
  const archiveMutation = useArchiveApplication();
  const unarchiveMutation = useUnarchiveApplication();
  const deleteMutation = useDeleteApplication();
  const bulkStatusMutation = useBulkUpdateStatus();
  const bulkArchiveMutation = useBulkArchive();
  const bulkDeleteMutation = useBulkDelete();

  const apps = data?.results ?? [];

  const handleStatusChange = async (appId: number, newStatus: string) => {
    try {
      await updateStatus.mutateAsync({ id: appId, status: newStatus });
      toast.success(`Moved to ${STATUS_LABELS[newStatus] ?? newStatus}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleArchive = async (id: number) => {
    try {
      await archiveMutation.mutateAsync(id);
      toast.success("Application archived");
    } catch {
      toast.error("Failed to archive");
    }
  };

  const handleUnarchive = async (id: number) => {
    try {
      await unarchiveMutation.mutateAsync(id);
      toast.success("Application restored");
    } catch {
      toast.error("Failed to restore");
    }
  };

  const handleDelete = (id: number) => {
    setConfirmAction({ type: "delete", id });
  };

  const confirmDelete = async () => {
    if (!confirmAction?.id) return;
    try {
      await deleteMutation.mutateAsync(confirmAction.id);
      toast.success("Application permanently deleted");
      setConfirmAction(null);
    } catch {
      toast.error("Failed to delete");
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === apps.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(apps.map((a) => a.id)));
    }
  };

  const handleBulkStatus = async (status: string) => {
    try {
      const result = await bulkStatusMutation.mutateAsync({
        ids: [...selectedIds],
        status,
      });
      toast.success(`${result.updated} application(s) updated`);
      setSelectedIds(new Set());
    } catch {
      toast.error("Bulk update failed");
    }
  };

  const handleBulkArchive = async () => {
    try {
      const result = await bulkArchiveMutation.mutateAsync([...selectedIds]);
      toast.success(`${result.archived} application(s) archived`);
      setSelectedIds(new Set());
    } catch {
      toast.error("Bulk archive failed");
    }
  };

  const handleBulkDelete = () => {
    setConfirmAction({ type: "bulk-delete" });
  };

  const confirmBulkDelete = async () => {
    try {
      const result = await bulkDeleteMutation.mutateAsync([...selectedIds]);
      toast.success(`${result.deleted} application(s) permanently deleted`);
      setSelectedIds(new Set());
      setConfirmAction(null);
    } catch {
      toast.error("Bulk delete failed");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Applications</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {data
              ? `${data.count} total application${data.count !== 1 ? "s" : ""}`
              : "Loading\u2026"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search candidates\u2026"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-blue-400 w-52"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-blue-400 pr-8"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_review">In Review</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="interview">Interview</option>
            <option value="hired">Hired</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Archive toggle */}
          {isHROrAdmin && (
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border transition-colors ${
                showArchived
                  ? "bg-amber-50 border-amber-200 text-amber-700"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Archive size={14} />
              {showArchived ? "Showing Archived" : "Show Archived"}
            </button>
          )}
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="text-sm font-medium text-blue-800">
            {selectedIds.size} selected
          </span>
          <div className="h-4 w-px bg-blue-200" />
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => handleBulkStatus("in_review")}
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
            >
              Move to Review
            </button>
            <button
              onClick={() => handleBulkStatus("shortlisted")}
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
            >
              Shortlist
            </button>
            <button
              onClick={() => handleBulkStatus("rejected")}
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
            >
              Reject
            </button>
            {isHROrAdmin && (
              <button
                onClick={handleBulkArchive}
                className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
              >
                Archive
              </button>
            )}
            {isAdmin && (
              <button
                onClick={handleBulkDelete}
                className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-1"
              >
                <Trash2 size={12} />
                Delete
              </button>
            )}
          </div>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto p-1 rounded hover:bg-blue-100 text-blue-400 hover:text-blue-600 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Table */}
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="w-10 px-4 py-3">
                  <button
                    onClick={toggleSelectAll}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {selectedIds.size === apps.length && apps.length > 0 ? (
                      <CheckSquare size={16} className="text-blue-600" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                </th>
                {["Candidate", "Job", "Status", "AI Score", "Applied", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className={`text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider ${h === "" ? "w-14 sticky right-0 bg-slate-50/80" : ""}`}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-4" />
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 rounded-md bg-slate-100 animate-pulse w-24" />
                      </td>
                    ))}
                  </tr>
                ))}

              {apps.map((app) => {
                const cfg = STATUS_CFG[app.status] ?? STATUS_CFG.pending;
                const score =
                  app.ai_score != null
                    ? Math.round(Number(app.ai_score))
                    : null;
                const isSelected = selectedIds.has(app.id);

                return (
                  <tr
                    key={app.id}
                    className={`transition-colors cursor-pointer ${
                      isSelected ? "bg-blue-50/50" : "hover:bg-slate-50/80"
                    } ${app.is_archived ? "opacity-60" : ""}`}
                    onClick={() => setDrawerApp(app)}
                  >
                    <td
                      className="px-4 py-3.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => toggleSelect(app.id)}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare size={16} className="text-blue-600" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 text-white font-semibold text-xs">
                          {app.candidate_name?.charAt(0)?.toUpperCase() ?? "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate">
                            {app.candidate_name}
                          </p>
                          <p className="text-xs text-slate-400 truncate">
                            {app.candidate_email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="min-w-0">
                        <p className="text-slate-700 truncate max-w-44">
                          {app.job_title}
                        </p>
                        {app.job_location && (
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin size={10} />
                            {app.job_location}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 border ${cfg.bg} ${cfg.text} border-transparent`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}
                        />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {score != null ? (
                        <div className="flex items-center gap-2 min-w-[100px]">
                          <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${scoreColor(score)}`}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                          <span
                            className={`text-xs font-semibold tabular-nums ${scoreTextColor(score)}`}
                          >
                            {score}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">&mdash;</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                      {formatDate(app.created_at)}
                    </td>
                    <td
                      className={`px-4 py-3.5 sticky right-0 bg-white transition-all ${openDropdownId === app.id ? "z-30" : "z-10"}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ActionsDropdown
                        app={app}
                        userRole={userRole}
                        onStatusChange={handleStatusChange}
                        onArchive={handleArchive}
                        onUnarchive={handleUnarchive}
                        onDelete={handleDelete}
                        onSchedule={(a) =>
                          setSchedulingApp({
                            id: a.id,
                            name: a.candidate_name ?? "",
                            job: a.job_title ?? "",
                          })
                        }
                        onViewDetails={setDrawerApp}
                        onOpenChange={(open) =>
                          setOpenDropdownId(open ? app.id : null)
                        }
                      />
                    </td>
                  </tr>
                );
              })}

              {data && apps.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={7} className="py-1">
                    <EmptyState
                      icon={<FileText size={20} />}
                      title={
                        showArchived
                          ? "No archived applications"
                          : "No applications yet"
                      }
                      description={
                        showArchived
                          ? "Archived applications will appear here."
                          : "Applications will appear here once candidates apply."
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Schedule Interview Modal */}
      <ScheduleInterviewModal
        isOpen={!!schedulingApp}
        onClose={() => setSchedulingApp(null)}
        applicationId={schedulingApp?.id || 0}
        candidateName={schedulingApp?.name}
        jobTitle={schedulingApp?.job}
      />

      {/* Candidate Drawer */}
      {drawerApp && (
        <CandidateDrawer app={drawerApp} onClose={() => setDrawerApp(null)} />
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        open={confirmAction?.type === "delete"}
        onClose={() => setConfirmAction(null)}
        onConfirm={confirmDelete}
        title="Delete Application Permanently"
        description="This action cannot be undone. The application and all related data will be permanently removed from the system."
        confirmLabel="Delete Forever"
        variant="danger"
        loading={deleteMutation.isPending}
      />

      {/* Confirm Bulk Delete Modal */}
      <ConfirmModal
        open={confirmAction?.type === "bulk-delete"}
        onClose={() => setConfirmAction(null)}
        onConfirm={confirmBulkDelete}
        title={`Delete ${selectedIds.size} Application(s) Permanently`}
        description="This action cannot be undone. All selected applications and their related data will be permanently removed from the system."
        confirmLabel="Delete All Forever"
        variant="danger"
        loading={bulkDeleteMutation.isPending}
      />
    </div>
  );
}
