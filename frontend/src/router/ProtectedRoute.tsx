/**
 * ProtectedRoute — guards routes by authentication and optional role.
 *
 * Usage:
 *   <ProtectedRoute />                    — auth only
 *   <ProtectedRoute role="admin" />       — admin only
 *   <ProtectedRoute role={["admin","hr_manager"]} />
 */
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import type { Role } from '@/utils/constants'

interface ProtectedRouteProps {
  /** Required role(s) — if omitted, any authenticated user is allowed */
  role?: Role | Role[]
  /** Alias for role — preferred in newer code */
  allowedRoles?: Role | Role[]
  /** Where to redirect if not authenticated */
  redirectTo?: string
}

export default function ProtectedRoute({
  role,
  allowedRoles,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuthStore()
  
  // Use allowedRoles if provided, fallback to role
  const rolesToCheck = allowedRoles ?? role

  // Show nothing while session is being restored
  if (isLoading) {
    return <FullPageSpinner />
  }

  // Not logged in
  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} replace />
  }

  // Role check
  if (rolesToCheck) {
    const allowed = Array.isArray(rolesToCheck) ? rolesToCheck : [rolesToCheck]
    if (!allowed.includes(user.role)) {
      // Redirect to their own dashboard instead of 403
      const dashMap: Record<string, string> = {
        admin:      '/dashboard/admin',
        hr_manager: '/dashboard/hr',
        recruiter:  '/dashboard/recruiter',
        candidate:  '/dashboard/candidate',
      }
      return <Navigate to={dashMap[user.role] ?? '/dashboard'} replace />
    }
  }

  return <Outlet />
}

function FullPageSpinner() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--navy)',
      flexDirection: 'column',
      gap: '1rem',
    }}>
      <div style={{
        width: 40, height: 40,
        border: '3px solid rgba(59,130,246,0.2)',
        borderTopColor: 'var(--blue)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <span style={{ color: 'var(--muted)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
        Loading…
      </span>
    </div>
  )
}
