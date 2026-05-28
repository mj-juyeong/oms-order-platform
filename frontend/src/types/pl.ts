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
