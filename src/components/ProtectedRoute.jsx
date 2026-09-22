import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import PageLoader from './PageLoader.jsx'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <PageLoader label="Restoring your session…" />
  }

  // Redirect to login if not authenticated, remembering where the user
  // was headed so they can be sent back after signing in.
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // Check role restrictions if allowedRoles is specified
  if (allowedRoles && (!profile || !allowedRoles.includes(profile.role))) {
    console.warn(
      `[ProtectedRoute] Access denied. User role: ${profile?.role}. Allowed roles: ${allowedRoles.join(', ')}`,
    )
    return <Navigate to="/dashboard" replace />
  }

  return children
}
