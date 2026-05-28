export type BatchStatus =
  | 'UPLOADED'
  | 'VALIDATING'
  | 'VALIDATION_FAILED'
  | 'READY_TO_CONFIRM'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'ROLLED_BACK';

export interface SheetResult {
  sheetName: string;
  sheetType: 'SCAN' | 'PL_EA' | 'PL_BOX' | 'LABEL_EA' | 'LABEL_BOX';
  suffix?: string;
  rowCount: number;
  status: 'NORMAL' | 'WARNING' | 'ERROR';
  message: string;
  errorCount: number;
  warningCount: number;
}

export interface UploadBatch {
  id: string;
  clientName: string;
  fileName: string;
  deliveryDate: string;
  status: BatchStatus;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  totalRowCount: number;
  uploadedBy: string;
  uploadedAt: string;
  confirmedAt?: string;
  productMasterVersion: string;
  storeRouteMasterVersion: string;
  sheetResults: SheetResult[];
}
