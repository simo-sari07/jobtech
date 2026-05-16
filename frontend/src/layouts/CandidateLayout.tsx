/**
 * CandidateLayout — layout shell for all /candidate/* routes.

 *
 * Structure:
 *  ┌─────────────────────────────────────────────────┐
 *  │  CandidateTopbar (sticky, 64px, full-width)     │
 *  ├─────────────────────────────────────────────────┤
 *  │  CandidateNavTabs (sticky below topbar, 44px)   │
 *  ├─────────────────────────────────────────────────┤
 *  │  <Outlet /> centered, max-w-6xl, px-6 py-8      │
 *  └─────────────────────────────────────────────────┘
 */
import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import CandidateTopbar  from './CandidateTopbar'
import CandidateNavTabs from './CandidateNavTabs'

// ── DEV-only mount log ────────────────────────────────────────────────────────
if (import.meta.env.DEV) {
  console.log(
    '%c[CandidateLayout] mounted — NO sidebar, full-width candidate portal',
    'color:#16A34A;font-weight:bold;font-size:11px'
  )
}

export default function CandidateLayout() {
  const { pathname } = useLocation()

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Topbar (sticky, 64px) ────────────────────────────────── */}
      <CandidateTopbar />

      {/* ── Nav tabs (sticky, 44px, sits directly below topbar) ──── */}
      <CandidateNavTabs />

      {/* ── Page content ─────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Outlet />
      </main>

    </div>
  )
}
