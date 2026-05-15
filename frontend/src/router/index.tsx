/**
 * Router — Single source of truth for all routes.
 *
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  DUAL-SURFACE ARCHITECTURE — STRICT LAYOUT SEPARATION           ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  /            → PublicLayout   (navbar + footer, NO sidebar)    ║
 * ║  /jobs        → PublicLayout                                    ║
 * ║  /dashboard/* → DashboardLayout (sidebar + topbar, NO navbar)   ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * KEY FIX: All /dashboard/* children use RELATIVE paths ('admin', 'hr')
 * NOT absolute paths ('/dashboard/admin') — that was the root bug.
 */
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { useAuthStore } from '@/store/authStore'

// ── Layouts — two completely isolated shells ─────────────────────────────────
import PublicLayout    from '@/components/public/PublicLayout'
import DashboardLayout from '@/components/shared/DashboardLayout'

// ── Route guards ─────────────────────────────────────────────────────────────
import ProtectedRoute  from './ProtectedRoute'
import GuestRoute      from './GuestRoute'

// ── Public pages (PublicLayout ONLY) ────────────────────────────────────────
import HomePage      from '@/features/public/pages/HomePage'
import JobsPage      from '@/features/public/pages/JobsPage'
import JobDetailPage from '@/pages/jobs/JobDetailPage'

// ── Auth pages (no layout) ──────────────────────────────────────────────────
import LoginPage    from '@/features/auth/pages/LoginPage'
import RegisterPage from '@/features/auth/pages/RegisterPage'

// ── Dashboard pages (DashboardLayout ONLY) ──────────────────────────────────
import AdminDashboard     from '@/pages/dashboard/AdminDashboard'
import HRDashboard        from '@/pages/dashboard/HRDashboard'
import RecruiterDashboard from '@/pages/dashboard/RecruiterDashboard'
import CandidateDashboard from '@/pages/dashboard/CandidateDashboard'
import NotFound           from '@/pages/NotFound'

// ── Lazy-loaded feature pages ────────────────────────────────────────────────
const UsersManagePage        = lazy(() => import('@/pages/admin/UsersManagePage'))
const UserDetailPage         = lazy(() => import('@/pages/admin/UserDetailPage'))
const CreateJobPage          = lazy(() => import('@/pages/jobs/CreateJobPage'))
const EditJobPage            = lazy(() => import('@/pages/jobs/EditJobPage'))
const JobsListPage           = lazy(() => import('@/pages/jobs/JobsListPage'))
const ApplicationsManagePage = lazy(() => import('@/pages/applications/ApplicationsManagePage'))
const MyApplicationsPage     = lazy(() => import('@/pages/applications/MyApplicationsPage'))
const SettingsPage           = lazy(() => import('@/pages/settings/SettingsPage'))
const CandidateProfilePage   = lazy(() => import('@/pages/dashboard/candidate/CandidateProfilePage'))
const SavedJobsPage          = lazy(() => import('@/pages/dashboard/candidate/SavedJobsPage'))
const NotificationsPage     = lazy(() => import('@/pages/dashboard/candidate/NotificationsPage'))
const InterviewsListPage    = lazy(() => import('@/pages/interviews/InterviewsListPage'))
const EvaluationPage        = lazy(() => import('@/pages/interviews/EvaluationPage'))
const AIPipelinePage        = lazy(() => import('@/features/ai/components/AIPipelinePage'))

// ── Suspense wrapper ─────────────────────────────────────────────────────────
const Loader = () => (
  <div className="flex h-48 items-center justify-center">
    <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
  </div>
)
const S = (el: React.ReactNode) => <Suspense fallback={<Loader />}>{el}</Suspense>

// ── Role-based redirect for /dashboard (index) ───────────────────────────────
function RoleRedirect() {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  const map: Record<string, string> = {
    admin:      '/dashboard/admin',
    hr_manager: '/dashboard/hr',
    recruiter:  '/dashboard/recruiter',
    candidate:  '/dashboard/candidate',
  }
  return <Navigate to={map[user.role] ?? '/login'} replace />
}

/** Returns the absolute home path for a role — used post-login. */
export function getRoleHomePath(role: string): string {
  switch (role) {
    case 'admin':      return '/dashboard/admin'
    case 'hr_manager': return '/dashboard/hr'
    case 'recruiter':  return '/dashboard/recruiter'
    case 'candidate':  return '/dashboard/candidate'
    default:           return '/login'
  }
}

export const router = createBrowserRouter([

  // ══════════════════════════════════════════════════════════════════════
  // SURFACE 1 — PUBLIC
  // PublicLayout: navbar + footer. NO sidebar. NO topbar.
  // These paths are completely isolated from /dashboard/*.
  // ══════════════════════════════════════════════════════════════════════
  {
    element: <PublicLayout />,
    children: [
      { path: '/',           element: <HomePage /> },
      { path: '/jobs',       element: <JobsPage /> },
      { path: '/jobs/:slug', element: <JobDetailPage /> },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  // AUTH PAGES — no layout, GuestRoute redirects logged-in users away
  // ══════════════════════════════════════════════════════════════════════
  {
    element: <GuestRoute />,
    children: [
      { path: '/login',    element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  // SURFACE 2 — PRIVATE DASHBOARD
  //
  // Structure (React Router v6 nested routing):
  //
  //   /dashboard  ←  ProtectedRoute (auth gate)
  //     └─  (no path)  ←  DashboardLayout (sidebar + topbar)
  //           ├─  index  ←  RoleRedirect
  //           ├─  admin  ←  ProtectedRoute (role gate)  →  AdminDashboard
  //           ├─  hr     ←  ProtectedRoute (role gate)  →  HRDashboard
  //           ├─  recruiter  ←  ProtectedRoute          →  RecruiterDashboard
  //           ├─  candidate  ←  ProtectedRoute          →  CandidateDashboard
  //           ├─  jobs       →  JobsListPage
  //           └─  ...more staff pages
  //
  // CRITICAL: children use RELATIVE paths ('admin', not '/dashboard/admin')
  // ══════════════════════════════════════════════════════════════════════
  {
    path: '/dashboard',
    element: <ProtectedRoute />,          // 1. Auth gate
    children: [
      {
        element: <DashboardLayout />,     // 2. Layout shell (sidebar + topbar)
        children: [

          // /dashboard  →  redirect to role-specific page
          { index: true, element: <RoleRedirect /> },

          // ── /dashboard/admin ─────────────────────────────────────────
          {
            path: 'admin',
            element: <ProtectedRoute allowedRoles={['admin']} />,
            children: [
              { index: true, element: <AdminDashboard /> },
              { path: 'users',     element: S(<UsersManagePage />) },
              { path: 'users/:id', element: S(<UserDetailPage />) },
            ],
          },

          // ── /dashboard/hr ────────────────────────────────────────────
          {
            path: 'hr',
            element: <ProtectedRoute allowedRoles={['admin', 'hr_manager']} />,
            children: [
              { index: true, element: <HRDashboard /> },
            ],
          },

          // ── /dashboard/recruiter ─────────────────────────────────────
          {
            path: 'recruiter',
            element: <ProtectedRoute allowedRoles={['admin', 'hr_manager', 'recruiter']} />,
            children: [
              { index: true, element: <RecruiterDashboard /> },
            ],
          },

          // ── /dashboard/candidate ─────────────────────────────────────
          {
            path: 'candidate',
            element: <ProtectedRoute allowedRoles={['candidate']} />,
            children: [
              { index: true, element: <CandidateDashboard /> },
              { path: 'applications', element: S(<MyApplicationsPage />) },
              { path: 'interviews',   element: S(<InterviewsListPage />) },
              { path: 'profile',     element: S(<CandidateProfilePage />) },
              { path: 'saved-jobs',  element: S(<SavedJobsPage />) },
              { path: 'notifications', element: S(<NotificationsPage />) },
            ],
          },

          // ── /dashboard/jobs (staff internal view) ────────────────────
          {
            path: 'jobs',
            element: <ProtectedRoute allowedRoles={['admin', 'hr_manager', 'recruiter']} />,
            children: [
              { index: true, element: S(<JobsListPage />) },
              { path: 'create', element: S(<CreateJobPage />) },
              { path: ':id/edit', element: S(<EditJobPage />) },
            ],
          },

          // ── /dashboard/applications (staff) ──────────────────────────
          {
            path: 'applications',
            element: <ProtectedRoute allowedRoles={['admin', 'hr_manager', 'recruiter']} />,
            children: [
              { index: true, element: S(<ApplicationsManagePage />) },
            ],
          },

          // ── /dashboard/interviews (staff) ─────────────────────────────
          {
            path: 'interviews',
            element: <ProtectedRoute allowedRoles={['admin', 'hr_manager', 'recruiter']} />,
            children: [
              { index: true, element: S(<InterviewsListPage />) },
              { path: ':id/evaluate', element: S(<EvaluationPage />) },
            ],
          },

          // ── /dashboard/ai (AI Pipeline — staff only) ─────────────────
          {
            path: 'ai',
            element: <ProtectedRoute allowedRoles={['admin', 'hr_manager', 'recruiter']} />,
            children: [
              { index: true, element: S(<AIPipelinePage />) },
            ],
          },

          // ── /dashboard/users (admin shortcut) ────────────────────────
          {
            path: 'users',
            element: <ProtectedRoute allowedRoles={['admin']} />,
            children: [
              { index: true, element: S(<UsersManagePage />) },
              { path: ':id',  element: S(<UserDetailPage />) },
            ],
          },

          // ── /dashboard/settings (all authenticated roles) ─────────────
          {
            path: 'settings',
            children: [
              { index: true, element: S(<SettingsPage />) },
            ],
          },

        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  // LEGACY PATHS — kept for backward compatibility with old links
  // These redirect to the new /dashboard/* equivalents
  // ══════════════════════════════════════════════════════════════════════
  { path: '/admin/users',     element: <Navigate to="/dashboard/admin/users" replace /> },
  { path: '/admin/users/:id', element: <Navigate to="/dashboard/admin/users" replace /> },
  { path: '/applications',    element: <Navigate to="/dashboard/applications" replace /> },
  { path: '/applications/mine', element: <Navigate to="/dashboard/candidate/applications" replace /> },
  { path: '/jobs/create',     element: <Navigate to="/dashboard/jobs/create" replace /> },

  // ══════════════════════════════════════════════════════════════════════
  // 404
  // ══════════════════════════════════════════════════════════════════════
  { path: '*', element: <NotFound /> },
])
