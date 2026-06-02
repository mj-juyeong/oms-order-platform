import { apiData, buildQuery, uploadMultipart } from './client';
import { endpoints } from './endpoints';
import type { PageResponse } from '../types/api';
import type {
  ClientMasterScope,
  ClientMasterVisibilitySetting,
  ClientMasterVisibilitySettingRequest,
  ClientProductCodeMapping,
  ClientProductCodeMappingUpsertRequest,
  ClientProductMasterScopeItem,
  ClientPublicProductMasterItem,
  ClientPublicStoreRouteMasterItem,
  ClientStoreCodeMapping,
  ClientStoreCodeMappingUpsertRequest,
  ClientStoreRouteMasterScopeItem,
  MasterUploadPreviewResult,
  MasterUploadRowFailure,
  ProductMasterItem,
  ProductMasterUploadHistory,
  ProductMasterUploadResult,
  StoreRouteMasterItem,
  StoreRouteMasterUploadHistory,
  StoreRouteMasterUploadResult,
} from '../types/master';

export const mastersApi = {
  products: {
    list: (params: { tenantId: number; ezadminCode?: string; productName?: string; operationStatus?: string; activeYn?: boolean; storageTemperature?: string; page?: number; size?: number }) => {
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
    previewCsv: (body: { tenantId: number; file: File; uploadedBy?: number }) => {
      const formData = new FormData();
      formData.set('tenantId', String(body.tenantId));
      if (body.uploadedBy) formData.set('uploadedBy', String(body.uploadedBy));
      formData.set('file', body.file);
      return uploadMultipart<MasterUploadPreviewResult>(endpoints.masters.productUploadPreview, formData);
    },
    applyUpload: (params: { tenantId: number; uploadId: number | string }) =>
      apiData<ProductMasterUploadResult>(`${endpoints.masters.productUploadApply(params.uploadId)}${buildQuery({ tenantId: params.tenantId })}`, {
        method: 'POST',
      }),
    cancelUpload: (params: { tenantId: number; uploadId: number | string }) =>
      apiData<ProductMasterUploadResult>(`${endpoints.masters.productUploadCancel(params.uploadId)}${buildQuery({ tenantId: params.tenantId })}`, {
        method: 'POST',
      }),
    rowErrors: (params: { tenantId: number; uploadId: number | string }) =>
      apiData<MasterUploadRowFailure[]>(`${endpoints.masters.productUploadRowErrors(params.uploadId)}${buildQuery({ tenantId: params.tenantId })}`),
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
    previewXlsx: (body: { tenantId: number; file: File; uploadedBy?: number }) => {
      const formData = new FormData();
      formData.set('tenantId', String(body.tenantId));
      if (body.uploadedBy) formData.set('uploadedBy', String(body.uploadedBy));
      formData.set('file', body.file);
      return uploadMultipart<MasterUploadPreviewResult>(endpoints.masters.storeRouteUploadPreview, formData);
    },
    applyUpload: (params: { tenantId: number; uploadId: number | string }) =>
      apiData<StoreRouteMasterUploadResult>(`${endpoints.masters.storeRouteUploadApply(params.uploadId)}${buildQuery({ tenantId: params.tenantId })}`, {
        method: 'POST',
      }),
    cancelUpload: (params: { tenantId: number; uploadId: number | string }) =>
      apiData<StoreRouteMasterUploadResult>(`${endpoints.masters.storeRouteUploadCancel(params.uploadId)}${buildQuery({ tenantId: params.tenantId })}`, {
        method: 'POST',
      }),
    rowErrors: (params: { tenantId: number; uploadId: number | string }) =>
      apiData<MasterUploadRowFailure[]>(`${endpoints.masters.storeRouteUploadRowErrors(params.uploadId)}${buildQuery({ tenantId: params.tenantId })}`),
    uploads: (params: { tenantId: number; status?: string; from?: string; to?: string; page?: number; size?: number }) =>
      apiData<PageResponse<StoreRouteMasterUploadHistory>>(`${endpoints.masters.storeRouteUploads}${buildQuery(params)}`),
  },
  clientProductCodeMappings: {
    list: (params: { tenantId: number; clientId: number; clientProductCode?: string; ezadminCode?: string; activeYn?: boolean; page?: number; size?: number }) =>
      apiData<PageResponse<ClientProductCodeMapping>>(`${endpoints.masters.clientProductCodeMappings}${buildQuery(params)}`),
    upsert: (body: ClientProductCodeMappingUpsertRequest) =>
      apiData<ClientProductCodeMapping>(endpoints.masters.clientProductCodeMappings, {
        method: 'POST',
        body,
      }),
  },
  clientStoreCodeMappings: {
    list: (params: { tenantId: number; clientId: number; clientStoreCode?: string; baljugoCode?: string; activeYn?: boolean; page?: number; size?: number }) =>
      apiData<PageResponse<ClientStoreCodeMapping>>(`${endpoints.masters.clientStoreCodeMappings}${buildQuery(params)}`),
    upsert: (body: ClientStoreCodeMappingUpsertRequest) =>
      apiData<ClientStoreCodeMapping>(endpoints.masters.clientStoreCodeMappings, {
        method: 'POST',
        body,
      }),
  },
  clientVisibility: {
    getSetting: (params: { tenantId?: number; clientId?: number }) =>
      apiData<ClientMasterVisibilitySetting>(`${endpoints.clientMasterVisibility.settings}${buildQuery(params)}`),
    updateSetting: (body: ClientMasterVisibilitySettingRequest) =>
      apiData<ClientMasterVisibilitySetting>(endpoints.clientMasterVisibility.settings, {
        method: 'PUT',
        body,
      }),
    productScopes: (params: { tenantId: number; clientId: number; status?: string; ezadminCode?: string; productName?: string; page?: number; size?: number }) =>
      apiData<PageResponse<ClientProductMasterScopeItem>>(`${endpoints.clientMasterVisibility.productScopes}${buildQuery(params)}`),
    upsertProductScope: (body: { tenantId: number; clientId: number; productMasterItemId: number; activeYn?: boolean; source?: string }) =>
      apiData<ClientMasterScope>(endpoints.clientMasterVisibility.productScopes, {
        method: 'POST',
        body,
      }),
    storeRouteScopes: (params: { tenantId: number; clientId: number; status?: string; baljugoCode?: string; storeName?: string; page?: number; size?: number }) =>
      apiData<PageResponse<ClientStoreRouteMasterScopeItem>>(`${endpoints.clientMasterVisibility.storeRouteScopes}${buildQuery(params)}`),
    upsertStoreRouteScope: (body: { tenantId: number; clientId: number; storeRouteMasterItemId: number; activeYn?: boolean; source?: string }) =>
      apiData<ClientMasterScope>(endpoints.clientMasterVisibility.storeRouteScopes, {
        method: 'POST',
        body,
      }),
  },
  clientMasters: {
    products: {
      list: (params: { tenantId?: number; clientId?: number; ezadminCode?: string; productName?: string; activeYn?: boolean; page?: number; size?: number }) =>
        apiData<PageResponse<ClientPublicProductMasterItem>>(`${endpoints.clientMasters.products}${buildQuery(params)}`),
    },
    storeRoutes: {
      list: (params: { tenantId?: number; clientId?: number; baljugoCode?: string; customerCode?: string; brandName?: string; storeName?: string; area?: string; deliveryRound?: string; activeYn?: boolean; page?: number; size?: number }) =>
        apiData<PageResponse<ClientPublicStoreRouteMasterItem>>(`${endpoints.clientMasters.storeRoutes}${buildQuery(params)}`),
    },
  },
};
