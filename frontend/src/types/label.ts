export interface LabelLine {
  id: string;
  numericId?: number;
  batchId: string;
  batchNumericId?: number;
  batchStatus?: import('./batch').BatchStatus | null;
  sheetName?: string;
  labelType: 'EA' | 'BOX';
  orderNo: string;
  storeCode: string;
  storeName: string;
  brandName: string;
  productCode: string;
  productName: string;
  orderQty: number;
  sequence: string;
  matchingCode: string;
  qrCode: string;
  boxSequence?: string;
  totalBoxQty?: number;
  rowNo: number;
  rawRowJson?: string;
}

export interface LabelDownloadRow {
  id: string;
  batchId: string;
  batchNumericId?: number;
  clientName: string;
  deliveryDate: string;
  status: import('./batch').BatchStatus;
  storeCode: string;
  labelEaCount: number;
  labelBoxCount: number;
  storeCount: number;
  vehicleName: string;
  deliveryRound: string;
  downloadable: boolean;
  unavailableReason?: string;
  lastDownloadedAt?: string;
  downloadedBy?: string;
}

export interface BackendLabelLine {
  id: number;
  tenantId: number;
  clientId: number;
  batchId: number;
  batchStatus?: import('./batch').BatchStatus | null;
  sheetName: string;
  labelType: 'EA' | 'BOX';
  orderNo?: string | null;
  storeCode?: string | null;
  storeName?: string | null;
  brandName?: string | null;
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
