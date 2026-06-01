import { apiData, buildQuery } from './client';
import { endpoints } from './endpoints';
import type { CreateTenantRequest, TenantMutationResponse, TenantSummary, UpdateTenantRequest } from '../types/tenant';

export const tenantsApi = {
  list: (params?: { status?: string }) =>
    apiData<TenantSummary[]>(`${endpoints.tenants.list}${buildQuery(params ?? {})}`),
  create: (body: CreateTenantRequest) =>
    apiData<TenantMutationResponse>(endpoints.tenants.list, { method: 'POST', body }),
  update: (tenantId: number, body: UpdateTenantRequest) =>
    apiData<TenantMutationResponse>(endpoints.tenants.detail(tenantId), { method: 'PATCH', body }),
};

