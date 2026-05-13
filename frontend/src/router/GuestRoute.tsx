/**
 * GuestRoute — redirects authenticated users to their dashboard.
 * Wrap /login and /register with this to prevent re-login.
 */
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

function getRoleHomePath(role: string): string {
  switch (role) {
    case 'admin':      return '/dashboard/admin'
    case 'hr_manager': return '/dashboard/hr'
    case 'recruiter':  return '/dashboard/recruiter'
    case 'candidate':  return '/dashboard/candidate'
    default:           return '/login'
  }
}

export default function GuestRoute() {
  const { isAuthenticated, isLoading, user } = useAuthStore()

  if (isLoading) return null

  if (isAuthenticated && user) {
    return <Navigate to={getRoleHomePath(user.role)} replace />
  }

  return <Outlet />
}
