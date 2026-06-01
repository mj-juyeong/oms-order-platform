import { apiData, buildQuery } from './client';
import { endpoints } from './endpoints';
import type { ListParams } from './types';
import type { PageResponse } from '../types/api';
import type { BackendPlLine } from '../types/pl';

export const plApi = {
  list: (params: ListParams & { batchId?: number; plType?: string; dueDate?: string; vehicleName?: string; storeCode?: string; productCode?: string; orderNo?: string }) =>
    apiData<PageResponse<BackendPlLine>>(`${endpoints.plLines}${buildQuery(params)}`),
};
