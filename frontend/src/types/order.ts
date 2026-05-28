export interface OrderLine {
  id: string;
  batchId: string;
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
}
