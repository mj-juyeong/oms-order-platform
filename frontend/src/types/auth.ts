export type UserRole = 'PUBLIC' | 'VIEWER' | 'OPERATOR' | 'ADMIN' | 'SYSTEM_ADMIN' | 'API_USER' | 'SUPPORT';
export type UserScopeType = 'SYSTEM' | 'TENANT' | 'CLIENT';

export interface CurrentUser {
  id: number | null;
  loginId: string | null;
  name: string | null;
  userScopeType: UserScopeType | null;
  tenantId?: number | null;
  clientId?: number | null;
  tenantName?: string;
  clientName?: string;
  roles: UserRole[];
}

export interface LoginRequest {
  loginId: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer' | string;
  expiresInSeconds: number;
  user: CurrentUser;
}

export interface UserSummary {
  id: number;
  loginId: string;
  name: string;
  email?: string | null;
  userScopeType: UserScopeType;
  tenantId?: number | null;
  tenantName?: string | null;
  clientId?: number | null;
  clientName?: string | null;
  status: string;
  roles: string[];
  lastLoginAt?: string | null;
}

export interface CreateUserRequest {
  loginId: string;
  name: string;
  email?: string | null;
  userScopeType: UserScopeType;
  tenantId?: number | null;
  clientId?: number | null;
  password: string;
  roleCodes: string[];
}

export interface UpdateUserRequest {
  name?: string;
  email?: string | null;
  userScopeType?: UserScopeType;
  tenantId?: number | null;
  clientId?: number | null;
  status?: string;
  roleCodes?: string[];
}

export interface UserMutationResponse {
  id: number;
  updated: boolean;
}
