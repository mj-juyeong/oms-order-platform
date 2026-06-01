import { apiData, buildQuery } from './client';
import { endpoints } from './endpoints';
import type { PageResponse } from '../types/api';
import type {
  CreateUserRequest,
  CurrentUser,
  LoginRequest,
  LoginResponse,
  UpdateUserRequest,
  UserMutationResponse,
  UserSummary,
} from '../types/auth';

export const authApi = {
  login: (body: LoginRequest) => apiData<LoginResponse>(endpoints.auth.login, { method: 'POST', body }),
  logout: () => apiData<{ loggedOut: boolean }>(endpoints.auth.logout, { method: 'POST' }),
  me: () => apiData<CurrentUser>(endpoints.auth.me),
};

export const usersApi = {
  list: (params: { userScopeType?: string; tenantId?: number; clientId?: number; status?: string; keyword?: string; page?: number; size?: number }) =>
    apiData<PageResponse<UserSummary>>(`/users${buildQuery(params)}`),
  create: (body: CreateUserRequest) =>
    apiData<UserMutationResponse>('/users', { method: 'POST', body }),
  update: (userId: number, body: UpdateUserRequest) =>
    apiData<UserMutationResponse>(`/users/${userId}`, { method: 'PATCH', body }),
};
