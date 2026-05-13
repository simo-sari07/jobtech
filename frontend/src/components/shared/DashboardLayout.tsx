/**
 * DashboardLayout — shell for ALL /dashboard/* pages.
 *
 * ╔══════════════════════════════════════════════════════════╗
 * ║  ARCHITECTURE RULE                                      ║
 * ║  ✅  /dashboard/* → DashboardLayout (this file)         ║
 * ║  ❌  NEVER used for public routes (/, /jobs)            ║
 * ║  ❌  NEVER import PublicNavbar / JobCard here            ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * Structure:
 *  ┌──────────┬────────────────────────────────────┐
 *  │ Sidebar  │  Topbar                            │
 *  │ (fixed)  ├────────────────────────────────────┤
 *  │          │  <Outlet />  ← page content        │
 *  └──────────┴────────────────────────────────────┘
 */
import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar  from './Topbar'
import { useUIStore } from '@/store/uiStore'

// ── Debug guard (DEV only) ────────────────────────────────────────────────────
if (import.meta.env.DEV) {
  console.log(
    '%c[DashboardLayout] mounted — sidebar + topbar active',
    'color:#3B82F6;font-weight:bold;font-size:11px'
  )
}

/** Map path → human-readable title shown in the Topbar */
function usePageTitle(): { title: string; subtitle: string } {
  const { pathname } = useLocation()
  if (pathname.startsWith('/dashboard/admin'))                  return { title: 'Admin Dashboard',     subtitle: 'Full system control' }
  if (pathname.startsWith('/dashboard/hr'))                     return { title: 'HR Dashboard',        subtitle: 'Manage your talent pipeline' }
  if (pathname.startsWith('/dashboard/recruiter'))              return { title: 'Recruiter Dashboard', subtitle: 'Manage interviews & offers' }
  if (pathname.startsWith('/dashboard/jobs'))                   return { title: 'Job Offers',          subtitle: 'Browse and manage job offers' }
  if (pathname.startsWith('/dashboard/applications'))           return { title: 'Applications',        subtitle: 'Track and manage applications' }
  if (pathname.startsWith('/dashboard/users'))                  return { title: 'User Management',     subtitle: 'Manage platform users' }
  if (pathname.startsWith('/dashboard/settings'))               return { title: 'Settings',            subtitle: 'Manage your account and preferences' }
  if (pathname.startsWith('/dashboard/candidate/profile'))      return { title: 'My Profile',          subtitle: 'Complete your candidate profile' }
  if (pathname.startsWith('/dashboard/candidate/saved-jobs'))   return { title: 'Saved Jobs',          subtitle: "Jobs you've bookmarked" }
  if (pathname.startsWith('/dashboard/candidate/notifications')) return { title: 'Notifications',       subtitle: 'Stay updated with your career activity' }
  if (pathname.startsWith('/dashboard/candidate/applications')) return { title: 'My Applications',     subtitle: 'Track your job applications' }
  if (pathname.startsWith('/dashboard/candidate'))              return { title: 'My Dashboard',        subtitle: 'Your career hub' }
  return { title: 'Dashboard', subtitle: '' }
}

export default function DashboardLayout() {
  const { sidebarCollapsed } = useUIStore()
  const marginLeft = sidebarCollapsed ? '64px' : '256px'
  const { title, subtitle } = usePageTitle()
  const { pathname } = useLocation()

  // ── Scroll to top on route change (FIX: dashboard scroll glitch) ──────────
  useEffect(() => {
    const content = document.getElementById('dashboard-content')
    if (content) {
      content.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [pathname])

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">

      {/* ── Sidebar (fixed, left) ─────────────────────────────────── */}
      <Sidebar />

      {/* ── Main area (scrollable, right of sidebar) ──────────────── */}
      <div
        className="flex flex-1 flex-col min-h-screen transition-all duration-200"
        style={{ marginLeft }}
      >
        {/* Sticky topbar */}
        <Topbar title={title} subtitle={subtitle} />

        {/* Scrollable page content */}
        <main
          id="dashboard-content"
          className="flex-1 overflow-y-auto p-6"
        >
          <Outlet />
        </main>
      </div>

    </div>
  )
}
