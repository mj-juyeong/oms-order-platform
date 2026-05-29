import { apiData, buildQuery, downloadBlob, uploadMultipart } from './client';
import { endpoints } from './endpoints';
import type { PageResponse } from '../types/api';
import type { CurrentUser, UserSummary } from '../types/auth';
import type { BatchStatus } from '../types/batch';
import type { ExternalApiStatusParams, ExternalApiStatusRow } from '../types/externalApi';
import type {
  ProductMasterItem,
  ProductMasterUploadHistory,
  ProductMasterUploadResult,
  StoreRouteMasterItem,
  StoreRouteMasterUploadHistory,
  StoreRouteMasterUploadResult,
} from '../types/master';
import type { BackendOrderLine } from '../types/order';

export interface ListParams {
  tenantId: number;
  clientId?: number;
  page?: number;
  size?: number;
}

export interface BackendBatchSummary {
  id: number;
  tenantId: number;
  clientId: number;
  status: BatchStatus;
  batchNo: string;
  deliveryDate?: string | null;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  uploadedAt: string;
  confirmedAt?: string | null;
  memo?: string | null;
}

export interface BackendBatchDetail extends BackendBatchSummary {
  uploadedFiles: Array<{
    id: number;
    fileType: string;
    originalFileName: string;
    fileHash: string;
    fileSize: number;
    contentType?: string | null;
  }>;
  sheetResults: Array<{
    id: number;
    sheetName: string;
    sheetType: string;
    suffixValue?: string | null;
    dataRowCount: number;
    status: string;
    message?: string | null;
  }>;
}

export interface OisSheetResult {
  id: number;
  sheetName: string;
  sheetType: string;
  suffixValue?: string | null;
  dataRowCount: number;
  status: string;
  message?: string | null;
}

export interface OisUploadResponse {
  batchId: number;
  tenantId: number;
  clientId: number;
  status: BatchStatus;
  batchNo: string;
  deliveryDate?: string | null;
  fileName: string;
  sheetResults: OisSheetResult[];
  scanLineCount: number;
  plLineCount: number;
  labelLineCount: number;
  orderLineCount: number;
}

export interface BatchValidationResult {
  batchId: number;
  status: BatchStatus;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  productMasterCheckedAt?: string | null;
  storeRouteMasterCheckedAt?: string | null;
}

export interface ValidationErrorItem {
  id: number;
  batchId: number;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  userTitle?: string | null;
  userMessage?: string | null;
  actionGuide?: string | null;
  domain: string;
  sheetName?: string | null;
  rowNo?: number | null;
  columnName?: string | null;
  lineTable?: string | null;
  lineId?: number | null;
  errorCode: string;
  message: string;
  originalValue?: string | null;
  normalizedValue?: string | null;
  targetCode?: string | null;
  targetName?: string | null;
  orderNo?: string | null;
  storeCode?: string | null;
  storeName?: string | null;
  productCode?: string | null;
  productName?: string | null;
  orderQty?: string | null;
  unit?: string | null;
  sourceSummary?: string | null;
  resolvedYn: boolean;
}

export interface BackendLabelLine {
  id: number;
  tenantId: number;
  clientId: number;
  batchId: number;
  batchStatus?: BatchStatus | null;
  sheetName: string;
  labelType: 'EA' | 'BOX';
  orderNo?: string | null;
  storeCode?: string | null;
  storeName?: string | null;
  productCode?: string | null;
  productName?: string | null;
  orderQty?: number | string | null;
  sequenceNo?: string | null;
  matchingCode?: string | null;
  qrCode?: string | null;
  boxSequence?: string | null;
  totalBoxQty?: number | string | null;
  rowNo: number;
  rawRowJson?: string | null;
}

export interface ApiKeyItem {
  id: number;
  tenantId: number;
  clientId?: number | null;
  name: string;
  status: string;
  allowedScope: string[];
  expiresAt?: string | null;
  lastUsedAt?: string | null;
  createdBy?: number | null;
}

export interface CreatedApiKey {
  id: number;
  apiKey: string;
  status: string;
}

export const omsApi = {
  me: () => apiData<CurrentUser>(endpoints.auth.me),

  users: {
    list: (params: { userScopeType?: string; tenantId?: number; clientId?: number; status?: string; keyword?: string; page?: number; size?: number }) =>
      apiData<PageResponse<UserSummary>>(`/users${buildQuery(params)}`),
  },

  apiKeys: {
    list: (params: { tenantId: number; status?: string; page?: number; size?: number }) =>
      apiData<PageResponse<ApiKeyItem>>(`${endpoints.apiKeys.list}${buildQuery(params)}`),
    create: (body: { tenantId: number; clientId?: number | null; name: string; allowedScope: string[]; expiresAt?: string | null }) =>
      apiData<CreatedApiKey>(endpoints.apiKeys.list, { method: 'POST', body }),
    revoke: (apiKeyId: number, reason?: string) =>
      apiData<{ id: number; status: string }>(endpoints.apiKeys.revoke(apiKeyId), { method: 'POST', body: { reason } }),
  },

  batches: {
    list: (params: ListParams & { status?: BatchStatus; deliveryDate?: string }) =>
      apiData<PageResponse<BackendBatchSummary>>(`${endpoints.batches.list}${buildQuery(params)}`),
    detail: (batchId: number, params: { tenantId: number; clientId: number }) =>
      apiData<BackendBatchDetail>(`${endpoints.batches.detail(batchId)}${buildQuery(params)}`),
    validate: (batchId: number, params: { tenantId: number; clientId: number; memo?: string; actorId?: number }) =>
      apiData<BatchValidationResult>(`${endpoints.batches.validate(batchId)}${buildQuery(params)}`, { method: 'POST' }),
    confirm: (batchId: number, params: { tenantId: number; clientId: number; actorId?: number }) =>
      apiData<unknown>(`${endpoints.batches.confirm(batchId)}${buildQuery(params)}`, { method: 'POST' }),
    cancel: (batchId: number, params: { tenantId: number; clientId: number }, body?: { reason?: string; actorId?: number }) =>
      apiData<unknown>(`${endpoints.batches.cancel(batchId)}${buildQuery(params)}`, { method: 'POST', body }),
    rollback: (batchId: number, params: { tenantId: number; clientId: number }, body?: { reason?: string; actorId?: number }) =>
      apiData<unknown>(`${endpoints.batches.rollback(batchId)}${buildQuery(params)}`, { method: 'POST', body }),
    validationErrors: (batchId: number, params: ListParams & { severity?: string; sheetName?: string; errorCode?: string }) =>
      apiData<PageResponse<ValidationErrorItem>>(`${endpoints.batches.validationErrors(batchId)}${buildQuery(params)}`),
  },

  uploads: {
    orderExcel: (body: { tenantId: number; clientId: number; file: File; memo?: string; uploadedBy?: number }) => {
      const formData = new FormData();
      formData.set('tenantId', String(body.tenantId));
      formData.set('clientId', String(body.clientId));
      if (body.memo) formData.set('memo', body.memo);
      if (body.uploadedBy) formData.set('uploadedBy', String(body.uploadedBy));
      formData.set('file', body.file);
      return uploadMultipart<OisUploadResponse>(endpoints.batches.list, formData);
    },
  },

  orders: {
    list: (params: ListParams & { batchId?: number; deliveryDate?: string; dueDateFrom?: string; dueDateTo?: string; storeCode?: string; storeName?: string; productCode?: string; productName?: string; orderNo?: string; unit?: string; vehicleName?: string; confirmedOnly?: boolean }) =>
      apiData<PageResponse<BackendOrderLine>>(`${endpoints.orders}${buildQuery(params)}`),
  },

  scanLines: {
    list: (params: ListParams & { batchId?: number; deliveryDate?: string; scanCenter?: string; storeCode?: string; productCode?: string; barcode?: string }) =>
      apiData<PageResponse<unknown>>(`${endpoints.scanLines}${buildQuery(params)}`),
  },

  plLines: {
    list: (params: ListParams & { batchId?: number; plType?: string; dueDate?: string; vehicleName?: string; storeCode?: string; productCode?: string; orderNo?: string }) =>
      apiData<PageResponse<unknown>>(`${endpoints.plLines}${buildQuery(params)}`),
  },

  labelLines: {
    list: (params: ListParams & { batchId?: number; labelType?: string; storeCode?: string; storeName?: string; productCode?: string; productName?: string; orderNo?: string; matchingCode?: string; qrCode?: string }) =>
      apiData<PageResponse<BackendLabelLine>>(`${endpoints.labelLines}${buildQuery(params)}`),
    detail: (labelLineId: number, params: { tenantId: number; clientId: number }) =>
      apiData<BackendLabelLine>(`${endpoints.labelLines}/${labelLineId}${buildQuery(params)}`),
  },

  masters: {
    products: {
      list: (params: { tenantId: number; ezadminCode?: string; productName?: string; operationStatus?: string; activeYn?: boolean; page?: number; size?: number }) => {
        const { operationStatus, ...rest } = params;
        const activeYn =
          params.activeYn ??
          (operationStatus === 'ACTIVE'
            ? true
            : operationStatus === 'INACTIVE'
              ? false
              : undefined);
        return apiData<PageResponse<ProductMasterItem>>(`${endpoints.masters.products}${buildQuery({ ...rest, activeYn })}`);
      },
      uploadCsv: (body: { tenantId: number; file: File; uploadedBy?: number }) => {
        const formData = new FormData();
        formData.set('tenantId', String(body.tenantId));
        if (body.uploadedBy) formData.set('uploadedBy', String(body.uploadedBy));
        formData.set('file', body.file);
        return uploadMultipart<ProductMasterUploadResult>(endpoints.masters.productUploads, formData);
      },
      uploads: (params: { tenantId: number; status?: string; from?: string; to?: string; page?: number; size?: number }) =>
        apiData<PageResponse<ProductMasterUploadHistory>>(`${endpoints.masters.productUploads}${buildQuery(params)}`),
    },
    storeRoutes: {
      list: (params: { tenantId: number; baljugoCode?: string; storeCode?: string; customerCode?: string; brandName?: string; storeName?: string; area?: string; deliveryRound?: string; vehicleName?: string; operationStatus?: string; activeYn?: boolean; page?: number; size?: number }) => {
        const { operationStatus, ...rest } = params;
        const activeYn =
          params.activeYn ??
          (operationStatus === 'ACTIVE'
            ? true
            : operationStatus === 'INACTIVE'
              ? false
              : undefined);
        return apiData<PageResponse<StoreRouteMasterItem>>(`${endpoints.masters.storeRoutes}${buildQuery({ ...rest, activeYn })}`);
      },
      uploadXlsx: (body: { tenantId: number; file: File; uploadedBy?: number }) => {
        const formData = new FormData();
        formData.set('tenantId', String(body.tenantId));
        if (body.uploadedBy) formData.set('uploadedBy', String(body.uploadedBy));
        formData.set('file', body.file);
        return uploadMultipart<StoreRouteMasterUploadResult>(endpoints.masters.storeRouteUploads, formData);
      },
      uploads: (params: { tenantId: number; status?: string; from?: string; to?: string; page?: number; size?: number }) =>
        apiData<PageResponse<StoreRouteMasterUploadHistory>>(`${endpoints.masters.storeRouteUploads}${buildQuery(params)}`),
    },
  },

  downloads: {
    labels: (params: { tenantId: number; clientId: number; batchId: number; labelType?: string; storeCode?: string; productCode?: string; orderNo?: string; matchingCode?: string; qrCode?: string; deliveryRound?: string; vehicleName?: string; downloadedBy?: number }) =>
      downloadBlob(`${endpoints.labelDownloads}${buildQuery(params)}`),
  },

  externalApi: {
    status: (params: ExternalApiStatusParams) =>
      apiData<PageResponse<ExternalApiStatusRow>>(`${endpoints.externalApi.status}${buildQuery(params)}`),
  },

  audit: {
    batches: (params: ListParams & { batchId?: number; action?: string; from?: string; to?: string }) =>
      apiData<PageResponse<unknown>>(`${endpoints.audit.batches}${buildQuery(params)}`),
    apiCalls: (params: ListParams & { apiKeyId?: number; path?: string; responseStatus?: number; from?: string; to?: string }) =>
      apiData<PageResponse<unknown>>(`${endpoints.audit.apiCalls}${buildQuery(params)}`),
    downloads: (params: ListParams & { batchId?: number; downloadType?: string; downloadedBy?: number; from?: string; to?: string }) =>
      apiData<PageResponse<unknown>>(`${endpoints.audit.downloads}${buildQuery(params)}`),
  },
};
