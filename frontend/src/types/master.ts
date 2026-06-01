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
  rowNo?: number | null;
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
