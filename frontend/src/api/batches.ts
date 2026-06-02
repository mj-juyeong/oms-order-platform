import { apiData, buildQuery } from './client';
import { endpoints } from './endpoints';
import type { ListParams } from './types';
import type { PageResponse } from '../types/api';
import type { BackendBatchDetail, BackendBatchSummary, BatchConfirmationRequest, BatchConfirmationRequestStatus, BatchStatus, BatchSupplementRequestType } from '../types/batch';

export const batchesApi = {
  list: (params: ListParams & { status?: BatchStatus; deliveryDate?: string; deliveryDateFrom?: string; deliveryDateTo?: string; keyword?: string; errorOnly?: boolean }) =>
    apiData<PageResponse<BackendBatchSummary>>(`${endpoints.batches.list}${buildQuery(params)}`),
  detail: (batchId: number, params: { tenantId: number; clientId?: number }) =>
    apiData<BackendBatchDetail>(`${endpoints.batches.detail(batchId)}${buildQuery(params)}`),
  requestConfirmation: (batchId: number, params: { tenantId: number; clientId?: number }, body?: { memo?: string; actorId?: number }) =>
    apiData<BatchConfirmationRequest>(`${endpoints.batches.requestConfirmation(batchId)}${buildQuery(params)}`, { method: 'POST', body }),
  confirm: (batchId: number, params: { tenantId: number; clientId?: number; actorId?: number }) =>
    apiData<unknown>(`${endpoints.batches.confirm(batchId)}${buildQuery(params)}`, { method: 'POST' }),
  cancel: (batchId: number, params: { tenantId: number; clientId?: number }, body?: { reason?: string; actorId?: number }) =>
    apiData<unknown>(`${endpoints.batches.cancel(batchId)}${buildQuery(params)}`, { method: 'POST', body }),
  rollback: (batchId: number, params: { tenantId: number; clientId?: number }, body?: { reason?: string; actorId?: number }) =>
    apiData<unknown>(`${endpoints.batches.rollback(batchId)}${buildQuery(params)}`, { method: 'POST', body }),
  confirmationRequests: {
    list: (params: ListParams & { status?: BatchConfirmationRequestStatus }) =>
      apiData<PageResponse<BatchConfirmationRequest>>(`${endpoints.batchConfirmationRequests.list}${buildQuery(params)}`),
    detail: (requestId: number, params: { tenantId: number; clientId?: number }) =>
      apiData<BatchConfirmationRequest>(`${endpoints.batchConfirmationRequests.detail(requestId)}${buildQuery(params)}`),
    approve: (requestId: number, params: { tenantId: number; clientId?: number }, body?: { comment?: string; actorId?: number }) =>
      apiData<BatchConfirmationRequest>(`${endpoints.batchConfirmationRequests.approve(requestId)}${buildQuery(params)}`, { method: 'POST', body }),
    reject: (requestId: number, params: { tenantId: number; clientId?: number }, body?: { comment?: string; actorId?: number }) =>
      apiData<BatchConfirmationRequest>(`${endpoints.batchConfirmationRequests.reject(requestId)}${buildQuery(params)}`, { method: 'POST', body }),
    needsMoreInfo: (requestId: number, params: { tenantId: number; clientId?: number }, body?: { comment?: string; supplementType?: BatchSupplementRequestType; actorId?: number }) =>
      apiData<BatchConfirmationRequest>(`${endpoints.batchConfirmationRequests.needsMoreInfo(requestId)}${buildQuery(params)}`, { method: 'POST', body }),
  },
};
