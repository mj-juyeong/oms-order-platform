export interface ScanLine {
  id: string;
  batchId: string;
  sheetName: string;
  scanCenter: string;
  deliveryDate: string;
  bus: string;
  barcode: string;
  orderBusinessSiteCode: string;
  storeName: string;
  productCode: string;
  productName: string;
  labelQty: number;
  unit: string;
  temperatureType: string;
  rowNo: number;
}

export interface BackendScanLine {
  id: number;
  tenantId: number;
  clientId: number;
  batchId: number;
  sheetName: string;
  scanCenter?: string | null;
  deliveryDate?: string | null;
  bus?: string | null;
  barcode?: string | null;
  orderBusinessSiteCode?: string | null;
  storeName?: string | null;
  productCode?: string | null;
  productName?: string | null;
  labelQty?: number | string | null;
  unit?: string | null;
  boxSequence?: string | null;
  temperatureType?: string | null;
  rowNo: number;
  rawRowJson?: string | null;
}
