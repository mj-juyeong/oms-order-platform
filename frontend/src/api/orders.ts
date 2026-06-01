import { apiData, buildQuery } from './client';
import { endpoints } from './endpoints';
import type { ListParams } from './types';
import type { PageResponse } from '../types/api';
import type { BackendOrderLine } from '../types/order';

export const ordersApi = {
  list: (params: ListParams & { batchId?: number; deliveryDate?: string; dueDateFrom?: string; dueDateTo?: string; storeCode?: string; storeName?: string; brandName?: string; productCode?: string; productName?: string; orderNo?: string; unit?: string; vehicleName?: string }) =>
    apiData<PageResponse<BackendOrderLine>>(`${endpoints.orders}${buildQuery(params)}`),
};
