import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isFullPanelAdmin, isStaffOrPanelAdmin } from '../lib/roles';

export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export function RequireAdmin() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || !isStaffOrPanelAdmin(user)) return <Navigate to="/servers" replace />;
  return <Outlet />;
}

/** Full admin only (settings, infra mutations). */
export function RequireFullAdmin() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || !isFullPanelAdmin(user)) return <Navigate to="/admin" replace />;
  return <Outlet />;
}

