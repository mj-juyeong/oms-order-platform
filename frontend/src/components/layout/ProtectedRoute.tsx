import { Navigate, Outlet } from 'react-router-dom';
import { fakeCurrentUser, hasAnyRole } from '../../app/auth';
import type { UserRole } from '../../types/auth';

export function ProtectedRoute({ requiredRoles = ['VIEWER'] }: { requiredRoles?: UserRole[] }) {
  if (!hasAnyRole(fakeCurrentUser.roles, requiredRoles)) {
    return <Navigate replace to="/login" />;
  }

  return <Outlet />;
}
