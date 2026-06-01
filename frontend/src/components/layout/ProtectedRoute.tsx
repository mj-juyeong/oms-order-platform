import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { fakeCurrentUser, hasAnyRole, hasAnyScope, hasAuthenticatedSession } from '../../app/auth';
import type { UserRole, UserScopeType } from '../../types/auth';

interface ProtectedRouteProps {
  children?: ReactNode;
  requiredRoles?: UserRole[];
  requiredScopes?: UserScopeType[];
}

export function ProtectedRoute({ children, requiredRoles = [], requiredScopes = [] }: ProtectedRouteProps) {
  const location = useLocation();

  if (!hasAuthenticatedSession()) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  if (requiredRoles.length > 0 && !hasAnyRole(fakeCurrentUser.roles, requiredRoles)) {
    return <Navigate replace to="/dashboard" />;
  }

  if (!hasAnyScope(fakeCurrentUser.userScopeType, requiredScopes)) {
    return <Navigate replace to="/dashboard" />;
  }

  return children ?? <Outlet />;
}

export function GuestRoute() {
  if (hasAuthenticatedSession()) {
    return <Navigate replace to="/dashboard" />;
  }

  return <Outlet />;
}
