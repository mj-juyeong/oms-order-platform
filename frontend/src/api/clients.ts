import { apiData, buildQuery } from './client';
import { endpoints } from './endpoints';
import type { ClientMutationResponse, ClientResolveCandidate, ClientSummary, CreateClientRequest, UpdateClientRequest } from '../types/client';

export const clientsApi = {
  list: (params: { tenantId: number }) =>
    apiData<ClientSummary[]>(`${endpoints.clients.list}${buildQuery(params)}`),
  resolveCandidates: (params: { tenantId: number; sourceText: string; limit?: number }) =>
    apiData<ClientResolveCandidate[]>(`${endpoints.clients.resolveCandidates}${buildQuery(params)}`),
  create: (body: CreateClientRequest) =>
    apiData<ClientMutationResponse>(endpoints.clients.list, { method: 'POST', body }),
  update: (tenantId: number, clientId: number, body: UpdateClientRequest) =>
    apiData<ClientMutationResponse>(`${endpoints.clients.detail(clientId)}${buildQuery({ tenantId })}`, { method: 'PATCH', body }),
};
