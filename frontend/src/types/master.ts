export interface MasterVersion {
  id: string;
  versionName: string;
  uploadedAt: string;
  rowCount: number;
  active: boolean;
}

export interface ProductMasterItem {
  id: string;
  ezadminCode: string;
  productName: string;
  clientProductCode: string;
  boxQty: number;
  outboundUnit: string;
  storageTemperature: string;
  cbm: number;
  operationStatus: 'ACTIVE' | 'INACTIVE';
  rowNo: number;
}

export interface StoreRouteMasterItem {
  id: string;
  baljugoCode: string;
  storeCode: string;
  brandName: string;
  storeName: string;
  area: string;
  deliveryRound: string;
  vehicleName: string;
  driverName: string;
  operationStatus: 'ACTIVE' | 'INACTIVE';
  rowNo: number;
}
