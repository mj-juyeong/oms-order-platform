import { apiData, buildQuery } from './client';
import { endpoints } from './endpoints';
import type { ListParams } from './types';
import type { PageResponse } from '../types/api';
import type { BackendScanLine } from '../types/scan';

export const scanApi = {
  list: (params: ListParams & {
    batchId?: number;
    deliveryDate?: string;
    deliveryDateFrom?: string;
    deliveryDateTo?: string;
    scanCenter?: string;
    storeCode?: string;
    storeName?: string;
    productCode?: string;
    productName?: string;
    barcode?: string;
  }) =>
    apiData<PageResponse<BackendScanLine>>(`${endpoints.scanLines}${buildQuery(params)}`),
};
