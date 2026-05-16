/**
 * App Sidebar — clean light-mode, role-aware navigation with Lucide icons.
 */
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  PlusCircle,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Settings,
  BarChart3,
  Calendar,
  Zap,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { ROLES, type Role } from "@/utils/constants";
import { logoutApi } from "@/features/auth/api";
import toast from "react-hot-toast";

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: Record<Role, NavItem[]> = {
  // ── Admin ────────────────────────────────────────────────────────────────
  [ROLES.ADMIN]: [
    { label: 'Overview',      to: '/dashboard/admin',        icon: <LayoutDashboard size={18} /> },
    { label: 'Job Offers',    to: '/dashboard/jobs',         icon: <Briefcase size={18} /> },
    { label: 'Applications',  to: '/dashboard/applications', icon: <FileText size={18} /> },
    { label: 'Interviews',    to: '/dashboard/interviews',   icon: <Calendar size={18} /> },
    { label: 'AI Pipeline',   to: '/dashboard/ai',           icon: <Zap size={18} /> },
    { label: 'Post a Job',    to: '/dashboard/jobs/create',  icon: <PlusCircle size={18} /> },
    { label: 'Users',         to: '/dashboard/users',        icon: <Users size={18} /> },
    { label: 'Analytics',     to: '/dashboard/admin',        icon: <BarChart3 size={18} /> },
  ],

  // ── HR Manager ───────────────────────────────────────────────────────────
  [ROLES.HR_MANAGER]: [
    { label: 'Overview',      to: '/dashboard/hr',           icon: <LayoutDashboard size={18} /> },
    { label: 'Job Offers',    to: '/dashboard/jobs',         icon: <Briefcase size={18} /> },
    { label: 'Applications',  to: '/dashboard/applications', icon: <FileText size={18} /> },
    { label: 'Interviews',    to: '/dashboard/interviews',   icon: <Calendar size={18} /> },
    { label: 'AI Pipeline',   to: '/dashboard/ai',           icon: <Zap size={18} /> },
    { label: 'Post a Job',    to: '/dashboard/jobs/create',  icon: <PlusCircle size={18} /> },
    { label: 'Reports',       to: '/dashboard/hr',           icon: <BarChart3 size={18} /> },
  ],

  // ── Recruiter ────────────────────────────────────────────────────────────
  [ROLES.RECRUITER]: [
    { label: 'Overview',      to: '/dashboard/recruiter',    icon: <LayoutDashboard size={18} /> },
    { label: 'Job Offers',    to: '/dashboard/jobs',         icon: <Briefcase size={18} /> },
    { label: 'Applications',  to: '/dashboard/applications', icon: <FileText size={18} /> },
    { label: 'Interviews',    to: '/dashboard/interviews',   icon: <Calendar size={18} /> },
    { label: 'AI Pipeline',   to: '/dashboard/ai',           icon: <Zap size={18} /> },
    { label: 'Post a Job',    to: '/dashboard/jobs/create',  icon: <PlusCircle size={18} /> },
  ],

  // ── Candidate ─ (candidates use CandidateLayout, not this sidebar) ───────
  [ROLES.CANDIDATE]: [],
};


const ROLE_CONFIG: Record<Role, { color: string; bg: string; label: string }> =
  {
    admin: { color: "text-red-600", bg: "bg-red-50", label: "Administrator" },
    hr_manager: {
      color: "text-blue-600",
      bg: "bg-blue-50",
      label: "HR Manager",
    },
    recruiter: { color: "text-teal-600", bg: "bg-teal-50", label: "Recruiter" },
    candidate: {
      color: "text-green-600",
      bg: "bg-green-50",
      label: "Candidate",
    },
  };

export default function Sidebar() {
  const { user, clearAuth } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (!user) return null;

  const navItems = NAV_ITEMS[user.role] ?? [];
  const roleConf = ROLE_CONFIG[user.role];
  const initials =
    `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();

  async function handleLogout() {
    try {
      await logoutApi();
    } catch {
      /* best-effort */
    }
    
    // 1. Clear Zustand store
    clearAuth();
    
    // 2. Clear React Query cache — CRITICAL to prevent data persistence
    queryClient.clear();
    
    toast.success("Signed out successfully");
    navigate("/login", { replace: true });
  }


  const w = sidebarCollapsed ? "w-16" : "w-64";

  return (
    <aside
      className={`fixed top-0 left-0 h-screen ${w} bg-white border-r border-slate-200 flex flex-col z-50 transition-all duration-200 shadow-sm`}
    >
      {/* Logo */}
      <div
        className={`flex items-center px-4 border-b border-slate-100 shrink-0 ${sidebarCollapsed ? "justify-center" : ""}`}
        style={{ height: 64 }}
      >
        <img 
          src="/assets/images/logo-jobtech.png" 
          alt="JobTech" 
          className="h-11 w-auto object-contain shrink-0"
        />
      </div>

      {/* User chip */}
      {!sidebarCollapsed && (
        <div className="mx-3 mt-4 mb-1 p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 min-w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <span className="text-blue-700 font-semibold text-xs">
              {initials}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate leading-tight">
              {user.full_name}
            </p>
            <span
              className={`text-xs font-medium px-1.5 py-0.5 rounded ${roleConf.bg} ${roleConf.color}`}
            >
              {roleConf.label}
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {!sidebarCollapsed && (
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-2 mb-2">
            Navigation
          </p>
        )}
        <div className="flex flex-col gap-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to + item.label}
              to={item.to}
              end={item.to.split("/").length <= 3}
              title={sidebarCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                ${
                  isActive
                    ? "bg-blue-50 text-blue-700 border border-blue-100"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
                }
                ${sidebarCollapsed ? "justify-center" : ""}`
              }
            >
              <span className="shrink-0">{item.icon}</span>
              {!sidebarCollapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-100 p-2 flex flex-col gap-1">
        <NavLink
            to="/dashboard/settings"
            title={sidebarCollapsed ? 'Settings' : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all border ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border-blue-100'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border-transparent'
              } ${sidebarCollapsed ? 'justify-center' : ''}`
            }
          >
            <Settings size={18} />
            {!sidebarCollapsed && <span>Settings</span>}
          </NavLink>
        <button
          id="btn-logout"
          onClick={handleLogout}
          title={sidebarCollapsed ? "Sign out" : undefined}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all border border-transparent w-full ${sidebarCollapsed ? "justify-center" : ""}`}
        >
          <LogOut size={18} />
          {!sidebarCollapsed && <span>Sign out</span>}
        </button>
      </div>

      {/* ── Floating Toggle Arrow ─────────────────────────────────────── */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-[72px] w-6 h-6 bg-white border border-slate-200 rounded-md shadow-sm flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-400 z-50 transition-all duration-200 hover:scale-110 active:scale-95"
        aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {sidebarCollapsed ? (
          <ChevronRight size={14} />
        ) : (
          <ChevronLeft size={14} />
        )}
      </button>
    </aside>
  );
}
