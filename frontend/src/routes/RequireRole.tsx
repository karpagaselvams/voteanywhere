import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, portalHome } from '@/hooks/useAuth';
import type { Role } from '@/types';

interface RequireRoleProps {
  roles: Role[];
}

/**
 * Keeps a portal's routes out of the navigation for the wrong role. This is a
 * routing concern only — the API rejects the call regardless of what the
 * frontend chooses to render.
 */
export function RequireRole({ roles }: RequireRoleProps) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-sm text-text-3">
        Loading…
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;
  if (!roles.includes(session.role)) {
    return <Navigate to={portalHome[session.role] ?? '/login'} replace />;
  }

  return <Outlet />;
}
