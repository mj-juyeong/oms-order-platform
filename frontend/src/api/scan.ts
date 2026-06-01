import { apiData, buildQuery } from './client';
import { endpoints } from './endpoints';
import type { ListParams } from './types';
import type { PageResponse } from '../types/api';
import type { BackendScanLine } from '../types/scan';

export const scanApi = {
  list: (params: ListParams & { batchId?: number; deliveryDate?: string; scanCenter?: string; storeCode?: string; productCode?: string; barcode?: string }) =>
    apiData<PageResponse<BackendScanLine>>(`${endpoints.scanLines}${buildQuery(params)}`),
};
