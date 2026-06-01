import { apiData, buildQuery } from './client';
import { endpoints } from './endpoints';
import type { ListParams } from './types';
import type { PageResponse } from '../types/api';
import type { BackendApiCallLog, BackendAuditDownloadLog, BackendBatchAuditLog } from '../types/audit';

export const auditApi = {
  batches: (params: ListParams & { batchId?: number; action?: string; from?: string; to?: string }) =>
    apiData<PageResponse<BackendBatchAuditLog>>(`${endpoints.audit.batches}${buildQuery(params)}`),
  apiCalls: (params: ListParams & { apiKeyId?: number; path?: string; responseStatus?: number; from?: string; to?: string }) =>
    apiData<PageResponse<BackendApiCallLog>>(`${endpoints.audit.apiCalls}${buildQuery(params)}`),
  downloads: (params: ListParams & { batchId?: number; downloadType?: string; downloadedBy?: number; from?: string; to?: string }) =>
    apiData<PageResponse<BackendAuditDownloadLog>>(`${endpoints.audit.downloads}${buildQuery(params)}`),
};

