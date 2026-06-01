import { apiData, buildQuery } from './client';
import { endpoints } from './endpoints';
import type { ListParams } from './types';
import type { PageResponse } from '../types/api';
import type { BackendLabelLine } from '../types/label';

export const labelsApi = {
  list: (params: ListParams & { batchId?: number; labelType?: string; storeCode?: string; storeName?: string; brandName?: string; productCode?: string; productName?: string; orderNo?: string; matchingCode?: string; qrCode?: string }) =>
    apiData<PageResponse<BackendLabelLine>>(`${endpoints.labelLines}${buildQuery(params)}`),
  detail: (labelLineId: number, params: { tenantId: number; clientId?: number }) =>
    apiData<BackendLabelLine>(`${endpoints.labelLines}/${labelLineId}${buildQuery(params)}`),
};
