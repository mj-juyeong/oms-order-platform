export interface LabelLine {
  id: string;
  batchId: string;
  labelType: 'EA' | 'BOX';
  orderNo: string;
  storeCode: string;
  storeName: string;
  productCode: string;
  productName: string;
  orderQty: number;
  sequence: string;
  matchingCode: string;
  qrCode: string;
  boxSequence?: string;
  totalBoxQty?: number;
  rowNo: number;
}

export interface LabelDownloadRow {
  id: string;
  batchId: string;
  clientName: string;
  deliveryDate: string;
  status: import('./batch').BatchStatus;
  labelEaCount: number;
  labelBoxCount: number;
  downloadable: boolean;
  lastDownloadedAt?: string;
  downloadedBy?: string;
}
