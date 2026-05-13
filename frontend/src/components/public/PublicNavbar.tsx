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
    case 'candidate':  return '/dashboard/candidate'
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
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6 h-14">

          {/* Logo */}
          <Link to="/" className="shrink-0 flex items-center gap-1.5 group">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">JT</span>
            </div>
            <span className="text-gray-900 font-bold text-lg tracking-tight group-hover:text-blue-600 transition-colors">
              JobTech
            </span>
          </Link>



          {/* Nav links */}
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            <Link
              to="/jobs"
              className="px-3 py-1.5 rounded-md text-gray-600 hover:text-blue-600 hover:bg-blue-50 font-medium transition-colors"
            >
              Browse Jobs
            </Link>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 ml-auto sm:ml-0">
            {!isAuthenticated && (
              <>
                <Link
                  to="/login"
                  className="px-4 py-1.5 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                >
                  Create account
                </Link>
              </>
            )}

            {isAuthenticated && user?.role === 'candidate' && (
              <>
                <Link
                  to="/dashboard/candidate/applications"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                >
                  <FileText size={14} />
                  My Applications
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors rounded-md hover:bg-gray-100"
                  title="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </>
            )}

            {isAuthenticated && user?.role !== 'candidate' && (
              <Link
                to={getRoleHomePath(user?.role ?? '')}
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
              >
                <LayoutDashboard size={14} />
                Dashboard
              </Link>
            )}
          </div>

        </div>
      </div>
    </header>
  )
}
