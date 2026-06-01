import { apiData, buildQuery } from './client';
import { endpoints } from './endpoints';
import type { ListParams } from './types';
import type { PageResponse } from '../types/api';
import type { BackendBatchDetail, BackendBatchSummary, BatchStatus } from '../types/batch';

export const batchesApi = {
  list: (params: ListParams & { status?: BatchStatus; deliveryDate?: string; deliveryDateFrom?: string; deliveryDateTo?: string; keyword?: string; errorOnly?: boolean }) =>
    apiData<PageResponse<BackendBatchSummary>>(`${endpoints.batches.list}${buildQuery(params)}`),
  detail: (batchId: number, params: { tenantId: number; clientId?: number }) =>
    apiData<BackendBatchDetail>(`${endpoints.batches.detail(batchId)}${buildQuery(params)}`),
  confirm: (batchId: number, params: { tenantId: number; clientId?: number; actorId?: number }) =>
    apiData<unknown>(`${endpoints.batches.confirm(batchId)}${buildQuery(params)}`, { method: 'POST' }),
  cancel: (batchId: number, params: { tenantId: number; clientId?: number }, body?: { reason?: string; actorId?: number }) =>
    apiData<unknown>(`${endpoints.batches.cancel(batchId)}${buildQuery(params)}`, { method: 'POST', body }),
  rollback: (batchId: number, params: { tenantId: number; clientId?: number }, body?: { reason?: string; actorId?: number }) =>
    apiData<unknown>(`${endpoints.batches.rollback(batchId)}${buildQuery(params)}`, { method: 'POST', body }),
};
