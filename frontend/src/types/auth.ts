export type UserRole = 'PUBLIC' | 'VIEWER' | 'OPERATOR' | 'ADMIN' | 'SYSTEM_ADMIN' | 'API_KEY';

export interface CurrentUser {
  id: number;
  loginId: string;
  name: string;
  userScopeType: 'SYSTEM' | 'TENANT' | 'CLIENT';
  tenantName: string;
  clientName: string;
  roles: UserRole[];
}
