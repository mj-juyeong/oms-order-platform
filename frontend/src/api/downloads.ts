import { buildQuery, downloadBlob } from './client';
import { endpoints } from './endpoints';

export const downloadsApi = {
  labels: (params: { tenantId: number; clientId?: number; batchId: number; labelType?: string; storeCode?: string; brandName?: string; productCode?: string; orderNo?: string; matchingCode?: string; qrCode?: string; deliveryRound?: string; vehicleName?: string; downloadedBy?: number }) =>
    downloadBlob(`${endpoints.labelDownloads}${buildQuery(params)}`),
};
