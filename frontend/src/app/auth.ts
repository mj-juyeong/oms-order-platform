import type { CurrentUser, UserRole } from '../types/auth';

export const fakeCurrentUser: CurrentUser = {
  id: 1,
  loginId: 'ops01',
  name: '운영자01',
  tenantName: '샘플 물류사',
  clientName: '웰스토리',
  roles: ['ADMIN', 'OPERATOR', 'VIEWER'],
};

export function hasAnyRole(userRoles: UserRole[], requiredRoles: UserRole[]) {
  return requiredRoles.some((role) => userRoles.includes(role));
}
