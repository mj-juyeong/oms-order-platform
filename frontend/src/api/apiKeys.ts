import { apiData, buildQuery } from './client';
import { endpoints } from './endpoints';
import type { PageResponse } from '../types/api';
import type { ApiKeyItem, ApiKeyRequestItem, ApiKeyRequestRevealResult, ApiKeyRequestStatus, ApiKeyScopeType, CreateApiKeyRequestBody, CreatedApiKey } from '../types/apiKey';

export const apiKeysApi = {
  list: (params: { tenantId: number; clientId?: number; status?: string; page?: number; size?: number }) =>
    apiData<PageResponse<ApiKeyItem>>(`${endpoints.apiKeys.list}${buildQuery(params)}`),
  create: (body: { tenantId: number; clientId?: number | null; scopeType?: ApiKeyScopeType; name: string; allowedScope: string[]; expiresAt?: string | null }) =>
    apiData<CreatedApiKey>(endpoints.apiKeys.list, { method: 'POST', body }),
  revoke: (apiKeyId: number, reason?: string) =>
    apiData<{ id: number; status: string }>(endpoints.apiKeys.revoke(apiKeyId), { method: 'POST', body: { reason } }),
  requests: {
    list: (params: { tenantId?: number; clientId?: number; status?: ApiKeyRequestStatus; page?: number; size?: number }) =>
      apiData<PageResponse<ApiKeyRequestItem>>(`${endpoints.apiKeyRequests.list}${buildQuery(params)}`),
    create: (body: CreateApiKeyRequestBody) =>
      apiData<ApiKeyRequestItem>(endpoints.apiKeyRequests.list, { method: 'POST', body }),
    approve: (requestId: number | string, params: { tenantId?: number; clientId?: number }, body?: { comment?: string }) =>
      apiData<ApiKeyRequestItem>(`${endpoints.apiKeyRequests.approve(requestId)}${buildQuery(params)}`, { method: 'POST', body }),
    reject: (requestId: number | string, params: { tenantId?: number; clientId?: number }, body?: { comment?: string }) =>
      apiData<ApiKeyRequestItem>(`${endpoints.apiKeyRequests.reject(requestId)}${buildQuery(params)}`, { method: 'POST', body }),
    cancel: (requestId: number | string, params: { tenantId?: number; clientId?: number }) =>
      apiData<ApiKeyRequestItem>(`${endpoints.apiKeyRequests.cancel(requestId)}${buildQuery(params)}`, { method: 'POST' }),
    reveal: (requestId: number | string, params: { tenantId?: number; clientId?: number }) =>
      apiData<ApiKeyRequestRevealResult>(`${endpoints.apiKeyRequests.reveal(requestId)}${buildQuery(params)}`, { method: 'POST' }),
  },
};
