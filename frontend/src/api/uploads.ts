import { uploadMultipart } from './client';
import { endpoints } from './endpoints';
import type { OisUploadResponse } from '../types/batch';

export const uploadsApi = {
  orderExcel: (body: { tenantId: number; clientId: number; file: File; memo?: string; uploadedBy?: number; parentBatchId?: number; reuploadReason?: string }) => {
    const formData = new FormData();
    formData.set('tenantId', String(body.tenantId));
    formData.set('clientId', String(body.clientId));
    if (body.memo) formData.set('memo', body.memo);
    if (body.uploadedBy) formData.set('uploadedBy', String(body.uploadedBy));
    if (body.parentBatchId) formData.set('parentBatchId', String(body.parentBatchId));
    if (body.reuploadReason) formData.set('reuploadReason', body.reuploadReason);
    formData.set('file', body.file);
    return uploadMultipart<OisUploadResponse>(endpoints.batches.list, formData);
  },
};
