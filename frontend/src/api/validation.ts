import { apiData, buildQuery } from './client';
import { endpoints } from './endpoints';
import type { ListParams } from './types';
import type { PageResponse } from '../types/api';
import type { BatchValidationResult, ValidationErrorItem } from '../types/validation';

export const validationApi = {
  validate: (batchId: number, params: { tenantId: number; clientId?: number; memo?: string; actorId?: number }) =>
    apiData<BatchValidationResult>(`${endpoints.batches.validate(batchId)}${buildQuery(params)}`, { method: 'POST' }),
  listErrors: (batchId: number, params: ListParams & { severity?: string; sheetName?: string; errorCode?: string }) =>
    apiData<PageResponse<ValidationErrorItem>>(`${endpoints.batches.validationErrors(batchId)}${buildQuery(params)}`),
};
