import type { BatchStatus } from './batch';

export interface MasterVersion {
  id: string;
  versionName: string;
  uploadedAt: string;
  rowCount: number;
  active: boolean;
}

export type MasterUploadStatus =
  | 'UPLOADED'
  | 'PROCESSING'
  | 'READY_TO_APPLY'
  | 'REVIEW_REQUIRED'
  | 'APPLIED'
  | 'PARTIAL_FAILED'
  | 'FAILED'
  | 'CANCELLED'
  | 'SUCCESS';

export interface MasterUploadRowFailure {
  rowNo: number;
  columnName: string;
  errorCode: string;
  message: string;
  originalValue?: string | null;
  keyValue?: string | null;
  rawRow: Record<string, string>;
}

export interface MasterUploadPreviewResult {
  uploadId: number | string;
  fileName?: string;
  rowCount: number;
  validCount: number;
  failedCount: number;
  candidateInsertedCount: number;
  candidateUpdatedCount: number;
  candidateUnchangedCount: number;
  status: MasterUploadStatus;
  failures: MasterUploadRowFailure[];
  uploadedAt?: string;
  uploadedBy?: string | number | null;
}

export interface ProductMasterUploadResult {
  uploadId: number | string;
  fileName?: string;
  rowCount: number;
  insertedCount: number;
  updatedCount: number;
  unchangedCount: number;
  failedCount: number;
  status: MasterUploadStatus;
  uploadedAt?: string;
  uploadedBy?: string | number | null;
}

export interface ProductMasterUploadHistory extends ProductMasterUploadResult {
  id?: number | string;
  masterType?: string;
  appliedAt?: string | null;
  message?: string;
}

export interface StoreRouteMasterUploadResult {
  uploadId: number | string;
  fileName?: string;
  rowCount: number;
  insertedCount: number;
  updatedCount: number;
  unchangedCount: number;
  failedCount: number;
  status: MasterUploadStatus;
  uploadedAt?: string;
  uploadedBy?: string | number | null;
}

export interface StoreRouteMasterUploadHistory extends StoreRouteMasterUploadResult {
  id?: number | string;
  masterType?: string;
  appliedAt?: string | null;
  message?: string;
}

export interface ProductMasterItem {
  id: string | number;
  ezadminCode: string;
  productName?: string | null;
  customerProductCode?: string | null;
  clientProductCode?: string;
  boxQty?: number | null;
  outboundUnit?: string | null;
  temperatureType?: string | null;
  storageTemperature?: string;
  cbm?: number | null;
  activeYn?: boolean;
  operationStatus?: 'ACTIVE' | 'INACTIVE';
  lastMasterUploadBatchId?: number | null;
  lastMasterUploadedAt?: string | null;
  latestConfirmedBatchId?: number | null;
  latestConfirmedBatchNo?: string | null;
  latestConfirmedBatchAt?: string | null;
  rowNo?: number | null;
}

export interface StoreRouteMasterItem {
  id: string | number;
  baljugoCode: string;
  customerCode?: string | null;
  storeCode?: string;
  brandName?: string | null;
  storeName?: string | null;
  area?: string | null;
  deliveryDay?: string | null;
  deliveryRound?: string | null;
  vehicleName?: string | null;
  driverName?: string | null;
  address?: string | null;
  activeYn?: boolean;
  operationStatus?: 'ACTIVE' | 'INACTIVE';
  lastMasterUploadBatchId?: number | null;
  lastMasterUploadedAt?: string | null;
  latestConfirmedBatchId?: number | null;
  latestConfirmedBatchNo?: string | null;
  latestConfirmedBatchAt?: string | null;
  rowNo?: number | null;
}

export interface MasterDetailUpload {
  id: number;
  fileName: string;
  status: MasterUploadStatus;
  uploadedAt: string;
  appliedAt?: string | null;
}

export interface MasterUsageSummary {
  orderCount: number;
  scanLineCount: number;
  plLineCount: number;
  labelLineCount: number;
  validationErrorCount: number;
  activeClientScopeCount: number;
}

export interface MasterRelatedBatch {
  id: number;
  batchNo: string;
  clientId: number;
  status: BatchStatus;
  deliveryDate?: string | null;
  uploadedAt: string;
  confirmedAt?: string | null;
}

export interface MasterRelatedOrder {
  id: number;
  batchId: number;
  clientName?: string | null;
  orderNo?: string | null;
  storeCode?: string | null;
  storeName?: string | null;
  productCode?: string | null;
  productName?: string | null;
  unit?: string | null;
  orderQty?: number | null;
  dueDate?: string | null;
  vehicleName?: string | null;
  deliveryRound?: string | null;
  area?: string | null;
  sourcePlLineId?: number | null;
  batchStatus?: import('./batch').BatchStatus | null;
  confirmed: boolean;
}

export interface MasterRelatedValidationError {
  id: number;
  batchId: number;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  errorCode: string;
  domain: string;
  sheetName?: string | null;
  rowNo?: number | null;
  columnName?: string | null;
  message: string;
  createdAt?: string | null;
}

export interface ProductMasterDetail {
  item: ProductMasterItem;
  lastUpload?: MasterDetailUpload | null;
  usage: MasterUsageSummary;
  recentBatches: MasterRelatedBatch[];
  recentOrders: MasterRelatedOrder[];
  validationErrors: MasterRelatedValidationError[];
}

export interface StoreRouteMasterDetail {
  item: StoreRouteMasterItem;
  lastUpload?: MasterDetailUpload | null;
  usage: MasterUsageSummary;
  recentBatches: MasterRelatedBatch[];
  recentOrders: MasterRelatedOrder[];
  validationErrors: MasterRelatedValidationError[];
}

export type ClientProductMasterVisibilityMode = 'SCOPED_ONLY' | 'ALL_PRODUCTS';

export type ClientStoreRouteMasterVisibilityMode = 'SCOPED_ONLY' | 'ALL_STORE_ROUTES';

export type ClientMasterScopeSource = 'MANUAL' | 'USED_IN_BATCH' | 'UPLOADED_BATCH' | 'REQUEST_APPROVED';
export type ClientMasterScopeStatus = 'ACTIVE' | 'INACTIVE';

export interface ClientMasterVisibilitySetting {
  tenantId: number;
  clientId: number;
  productVisibilityMode: ClientProductMasterVisibilityMode;
  storeRouteVisibilityMode: ClientStoreRouteMasterVisibilityMode;
  showPriceFieldsYn: boolean;
  showSupplierFieldsYn: boolean;
  showStoreRouteInternalFieldsYn: boolean;
  updatedBy?: number | null;
  updatedAt?: string | null;
}

export interface ClientMasterVisibilitySettingRequest {
  tenantId: number;
  clientId: number;
  productVisibilityMode: ClientProductMasterVisibilityMode;
  storeRouteVisibilityMode: ClientStoreRouteMasterVisibilityMode;
  showPriceFieldsYn?: boolean;
  showSupplierFieldsYn?: boolean;
  showStoreRouteInternalFieldsYn?: boolean;
}

export interface ClientPublicProductMasterItem {
  id: number;
  ezadminCode: string;
  productName?: string | null;
  customerProductCode?: string | null;
  boxQty?: number | null;
  outboundUnit?: string | null;
  temperatureType?: string | null;
  cbm?: number | null;
  activeYn: boolean;
  latestConfirmedBatchId?: number | null;
  latestConfirmedBatchNo?: string | null;
  latestConfirmedBatchAt?: string | null;
}

export interface ClientPublicStoreRouteMasterItem {
  id: number;
  baljugoCode: string;
  customerCode?: string | null;
  brandName?: string | null;
  storeName?: string | null;
  area?: string | null;
  deliveryDay?: string | null;
  deliveryRound?: string | null;
  vehicleName?: string | null;
  driverName?: string | null;
  address?: string | null;
  activeYn: boolean;
  internalFieldsVisible: boolean;
  latestConfirmedBatchId?: number | null;
  latestConfirmedBatchNo?: string | null;
  latestConfirmedBatchAt?: string | null;
}

export interface ClientPublicProductMasterDetail {
  item: ClientPublicProductMasterItem;
  lastUpload?: MasterDetailUpload | null;
  usage: MasterUsageSummary;
  recentBatches: MasterRelatedBatch[];
  recentOrders: MasterRelatedOrder[];
  validationErrors: MasterRelatedValidationError[];
}

export interface ClientPublicStoreRouteMasterDetail {
  item: ClientPublicStoreRouteMasterItem;
  lastUpload?: MasterDetailUpload | null;
  usage: MasterUsageSummary;
  recentBatches: MasterRelatedBatch[];
  recentOrders: MasterRelatedOrder[];
  validationErrors: MasterRelatedValidationError[];
}

export interface ClientMasterScope {
  id: number;
  tenantId: number;
  clientId: number;
  masterItemId: number;
  status: ClientMasterScopeStatus;
  source: ClientMasterScopeSource;
}

export interface ClientProductMasterScopeItem {
  id: number;
  tenantId: number;
  clientId: number;
  productMasterItemId: number;
  status: ClientMasterScopeStatus;
  source: ClientMasterScopeSource;
  product?: ClientPublicProductMasterItem | null;
}

export interface ClientStoreRouteMasterScopeItem {
  id: number;
  tenantId: number;
  clientId: number;
  storeRouteMasterItemId: number;
  status: ClientMasterScopeStatus;
  source: ClientMasterScopeSource;
  storeRoute?: ClientPublicStoreRouteMasterItem | null;
}

export type MasterDataAddRequestType = 'PRODUCT' | 'STORE_ROUTE' | 'PRODUCT_CODE_MAPPING' | 'STORE_CODE_MAPPING';
export type MasterDataAddRequestStatus = 'REQUESTED' | 'NEEDS_MORE_INFO' | 'REJECTED' | 'APPROVED' | 'APPLIED';

export interface MasterDataAddRequest {
  id: number;
  tenantId: number;
  clientId: number;
  requestType: MasterDataAddRequestType;
  status: MasterDataAddRequestStatus;
  title: string;
  requestFields: Record<string, string>;
  requestMemo?: string | null;
  requestedBy?: number | null;
  requestedAt: string;
  reviewedBy?: number | null;
  reviewedAt?: string | null;
  reviewComment?: string | null;
  appliedMasterType?: 'PRODUCT' | 'STORE_ROUTE' | null;
  appliedMasterItemId?: number | null;
}

export interface MasterDataAddRequestCreate {
  tenantId?: number;
  clientId?: number;
  requestType: MasterDataAddRequestType;
  title: string;
  requestFields: Record<string, string>;
  requestMemo?: string | null;
  requestedBy?: number | null;
}

export interface MasterDataAddRequestReview {
  comment?: string | null;
  actorId?: number | null;
  appliedMasterType?: 'PRODUCT' | 'STORE_ROUTE' | null;
  appliedMasterItemId?: number | null;
  requestFields?: Record<string, string>;
  activeYn?: boolean;
  createClientScope?: boolean;
}

export interface ClientProductCodeMapping {
  id: number;
  tenantId: number;
  clientId: number;
  clientProductCode: string;
  ezadminCode: string;
  productName?: string | null;
  activeYn: boolean;
  memo?: string | null;
}

export interface ClientProductCodeMappingUpsertRequest {
  tenantId: number;
  clientId: number;
  clientProductCode: string;
  ezadminCode: string;
  activeYn?: boolean;
  memo?: string | null;
}

export interface ClientStoreCodeMapping {
  id: number;
  tenantId: number;
  clientId: number;
  clientStoreCode: string;
  baljugoCode: string;
  storeName?: string | null;
  activeYn: boolean;
  memo?: string | null;
}

export interface ClientStoreCodeMappingUpsertRequest {
  tenantId: number;
  clientId: number;
  clientStoreCode: string;
  baljugoCode: string;
  activeYn?: boolean;
  memo?: string | null;
}
