export type UserRole = 'PUBLIC' | 'VIEWER' | 'OPERATOR' | 'ADMIN' | 'API_KEY';

export interface CurrentUser {
  id: number;
  loginId: string;
  name: string;
  tenantName: string;
  clientName: string;
  roles: UserRole[];
}
