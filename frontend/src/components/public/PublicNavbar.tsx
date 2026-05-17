/**
 * PublicNavbar — Indeed-style sticky top nav.
 *
 * Left:   JobTech logo
 * Center: Quick search shortcut (desktop)
 * Right:
 *   • Unauthenticated  → Sign in
 *   • Candidate        → My Applications + Logout
 *   • Staff            → Go to Dashboard →
 */
import { Link, useNavigate } from 'react-router-dom'
import { Search, LogOut, LayoutDashboard, FileText } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useState } from 'react'

function getRoleHomePath(role: string): string {
  switch (role) {
    case 'admin':      return '/dashboard/admin'
    case 'hr_manager': return '/dashboard/hr'
    case 'recruiter':  return '/dashboard/recruiter'
    case 'candidate':  return '/candidate/overview'
    default:           return '/login'
  }
}

function QuickSearch() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (q.trim()) navigate(`/jobs?search=${encodeURIComponent(q.trim())}`)
    else navigate('/jobs')
  }

  return (
    <form onSubmit={submit} className="flex-1 max-w-md">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search jobs, skills, locations…"
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-full bg-gray-50 text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all"
        />
      </div>
    </form>
  )
}

export default function PublicNavbar() {
  const { isAuthenticated, user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="shrink-0 flex items-center group">
            <img 
              src="/assets/images/logo-jobtech.png" 
              alt="JobTech" 
              className="h-11 w-auto object-contain transition-transform group-hover:scale-105 duration-300"
            />
          </Link>

          {/* Right actions */}
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-8 mr-8 text-sm font-medium">
              <Link to="/jobs" className="text-slate-600 hover:text-blue-600 transition-colors">Browse Jobs</Link>
            </nav>

            {!isAuthenticated && (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="px-6 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="px-6 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl hover:from-blue-500 hover:to-blue-400 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                >
                  Sign up
                </Link>
              </div>
            )}

            {isAuthenticated && user?.role === 'candidate' && (
              <div className="flex items-center gap-4">
                <Link
                  to="/candidate/applications"
                  className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                >
                  <FileText size={16} />
                  My Applications
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-slate-900 transition-colors rounded-xl hover:bg-slate-100"
                  title="Sign out"
                >
                  <LogOut size={20} />
                </button>
              </div>
            )}

            {isAuthenticated && user?.role !== 'candidate' && (
              <Link
                to={getRoleHomePath(user?.role ?? '')}
                className="flex items-center gap-1.5 px-6 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-500 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
              >
                <LayoutDashboard size={16} />
                Dashboard
              </Link>
            )}
          </div>

        </div>
      </div>
    </header>
  )
}
