import { apiData, buildQuery } from './client';
import { endpoints } from './endpoints';
import type { PageResponse } from '../types/api';
import type { ApiKeyItem, CreatedApiKey } from '../types/apiKey';

export const apiKeysApi = {
  list: (params: { tenantId: number; clientId?: number; status?: string; page?: number; size?: number }) =>
    apiData<PageResponse<ApiKeyItem>>(`${endpoints.apiKeys.list}${buildQuery(params)}`),
  create: (body: { tenantId: number; clientId?: number | null; name: string; allowedScope: string[]; expiresAt?: string | null }) =>
    apiData<CreatedApiKey>(endpoints.apiKeys.list, { method: 'POST', body }),
  revoke: (apiKeyId: number, reason?: string) =>
    apiData<{ id: number; status: string }>(endpoints.apiKeys.revoke(apiKeyId), { method: 'POST', body: { reason } }),
};
