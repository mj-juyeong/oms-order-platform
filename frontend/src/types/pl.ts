export interface PlLine {
  id: string;
  batchId: string;
  plType: 'EA' | 'BOX';
  orderNo: string;
  storeCode: string;
  storeName: string;
  brandName: string;
  productCode: string;
  productName: string;
  unit: string;
  storageTemperature: string;
  dueDate: string;
  orderQty: number;
  vehicleName: string;
  cbm: number;
  qrCode: string;
  rowNo: number;
}

export interface BackendPlLine {
  id: number;
  tenantId: number;
  clientId: number;
  batchId: number;
  sheetName: string;
  plType: 'EA' | 'BOX';
  orderNo?: string | null;
  storeCode?: string | null;
  storeName?: string | null;
  brandName?: string | null;
  productCode?: string | null;
  productName?: string | null;
  unit?: string | null;
  storageTemperature?: string | null;
  dueDate?: string | null;
  orderQty?: number | string | null;
  vehicleName?: string | null;
  cbm?: number | string | null;
  qrCode?: string | null;
  boxQty?: number | string | null;
  rowNo: number;
  rawRowJson?: string | null;
}
