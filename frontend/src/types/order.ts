import type { BatchStatus } from './batch';

export interface BackendOrderLine {
  id: number;
  tenantId: number;
  clientId: number;
  clientName?: string | null;
  batchId: number;
  sourcePlLineId: number;
  orderNo?: string | null;
  storeCode?: string | null;
  storeName?: string | null;
  brandName?: string | null;
  productCode?: string | null;
  productName?: string | null;
  unit?: string | null;
  orderQty?: number | string | null;
  dueDate?: string | null;
  vehicleName?: string | null;
  deliveryRound?: string | null;
  area?: string | null;
  batchStatus?: BatchStatus | null;
  confirmed: boolean;
}

export interface OrderLine {
  id: string;
  batchId: string;
  clientName: string;
  orderNo: string;
  dueDate: string;
  storeCode: string;
  storeName: string;
  brandName: string;
  productCode: string;
  productName: string;
  unit: 'EA' | 'BOX';
  orderQty: number;
  vehicleName: string;
  deliveryRound: string;
  area: string;
  sourcePlLineId: string;
  sourceSheetName: 'PL_EA' | 'PL_Box';
  sourceRowNo: number;
  storageTemperature: string;
  cbm?: number;
  qrCode?: string;
  batchStatus?: BatchStatus | null;
  confirmed: boolean;
}
