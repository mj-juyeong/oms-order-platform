export type UserRole = 'PUBLIC' | 'VIEWER' | 'OPERATOR' | 'ADMIN' | 'SYSTEM_ADMIN' | 'API_USER' | 'SUPPORT';

export interface CurrentUser {
  id: number | null;
  loginId: string | null;
  name: string | null;
  userScopeType: 'SYSTEM' | 'TENANT' | 'CLIENT' | null;
  tenantId?: number | null;
  clientId?: number | null;
  tenantName?: string;
  clientName?: string;
  roles: UserRole[];
}

export interface UserSummary {
  id: number;
  loginId: string;
  name: string;
  email?: string | null;
  userScopeType: 'SYSTEM' | 'TENANT' | 'CLIENT';
  tenantId?: number | null;
  clientId?: number | null;
  status: string;
  roles: string[];
  lastLoginAt?: string | null;
}
