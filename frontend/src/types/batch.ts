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

export interface BackendBatchSummary {
  id: number;
  tenantId: number;
  clientId: number;
  status: BatchStatus;
  batchNo: string;
  deliveryDate?: string | null;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  uploadedAt: string;
  confirmedAt?: string | null;
  memo?: string | null;
}

export interface BackendBatchDetail extends BackendBatchSummary {
  uploadedFiles: Array<{
    id: number;
    fileType: string;
    originalFileName: string;
    fileHash: string;
    fileSize: number;
    contentType?: string | null;
  }>;
  sheetResults: Array<{
    id: number;
    sheetName: string;
    sheetType: string;
    suffixValue?: string | null;
    dataRowCount: number;
    status: string;
    message?: string | null;
  }>;
}

export interface OisSheetResult {
  id: number;
  sheetName: string;
  sheetType: string;
  suffixValue?: string | null;
  dataRowCount: number;
  status: string;
  message?: string | null;
}

export interface OisUploadResponse {
  batchId: number;
  tenantId: number;
  clientId: number;
  status: BatchStatus;
  batchNo: string;
  deliveryDate?: string | null;
  fileName: string;
  sheetResults: OisSheetResult[];
  scanLineCount: number;
  plLineCount: number;
  labelLineCount: number;
  orderLineCount: number;
}
