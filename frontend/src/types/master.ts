export interface MasterVersion {
  id: string;
  versionName: string;
  uploadedAt: string;
  rowCount: number;
  active: boolean;
}

export type MasterUploadStatus = 'UPLOADED' | 'PROCESSING' | 'APPLIED' | 'PARTIAL_FAILED' | 'FAILED' | 'SUCCESS';

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
