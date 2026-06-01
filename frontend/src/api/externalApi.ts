import { apiData, buildQuery } from './client';
import { endpoints } from './endpoints';
import type { PageResponse } from '../types/api';
import type { ExternalApiStatusParams, ExternalApiStatusRow } from '../types/externalApi';

export const externalApi = {
  status: (params: ExternalApiStatusParams) =>
    apiData<PageResponse<ExternalApiStatusRow>>(`${endpoints.externalApi.status}${buildQuery(params)}`),
};

