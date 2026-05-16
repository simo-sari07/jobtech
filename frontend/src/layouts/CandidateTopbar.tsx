/**
 * CandidateTopbar — full-width sticky topbar for the candidate portal.
 *
 * Layout:
 *   Left:   Logo  (JT mark + "JobTech" text → links to /candidate/overview)
 *   Center: Search bar
 *   Right:  NotificationBell + ProfileDropdown
 *
 * Rules:
 *   - Height: 64px, sticky top-0 z-50
 *   - No sidebar toggle (no hamburger)
 *   - Background: white, border-bottom 1px solid #E5E7EB
 */
import { useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import NotificationBell from '@/features/candidates/components/NotificationBell'
import ProfileDropdown from './ProfileDropdown'

export default function CandidateTopbar() {
  const { user } = useAuthStore()
  const navigate  = useNavigate()
  const inputRef  = useRef<HTMLInputElement>(null)

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const q = (inputRef.current?.value ?? '').trim()
    if (q) navigate(`/candidate/jobs?search=${encodeURIComponent(q)}`)
  }

  if (!user) return null

  return (
    <header
      id="candidate-topbar"
      className="sticky top-0 z-50 bg-white border-b border-slate-200"
      style={{
        height: 64,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div className="flex items-center h-full px-6 gap-4">

        {/* ── Logo ───────────────────────────────────────────────────── */}
        <Link
          to="/candidate/overview"
          className="flex items-center shrink-0 no-underline group"
        >
          <img 
            src="/assets/images/logo-jobtech.png" 
            alt="JobTech" 
            className="h-11 w-auto object-contain transition-transform group-hover:scale-105 duration-300"
          />
        </Link>

        {/* ── Search bar (center) ────────────────────────────────────── */}
        <form
          onSubmit={handleSearch}
          className="flex-1 max-w-xl mx-auto"
        >
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              ref={inputRef}
              type="search"
              placeholder="Search jobs, skills, locations…"
              className="
                w-full h-9 pl-9 pr-4 rounded-lg border border-slate-200 bg-slate-50
                text-sm text-slate-800 placeholder-slate-400 outline-none
                focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white
                transition-all duration-150
              "
            />
          </div>
        </form>

        {/* ── Right actions ──────────────────────────────────────────── */}
        <div className="flex items-center gap-2 shrink-0">
          <NotificationBell />
          <ProfileDropdown user={user} />
        </div>

      </div>
    </header>
  )
}
