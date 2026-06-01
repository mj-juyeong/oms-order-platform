export type ValidationSeverity = 'ERROR' | 'WARNING' | 'INFO';

export interface ValidationError {
  id: string;
  batchId: string;
  severity: ValidationSeverity;
  errorCode: string;
  sheetName: string;
  rowNo: number;
  columnName: string;
  rawValue: string;
  normalizedValue: string;
  message: string;
  relatedCode: string;
  resolved: boolean;
}

export interface BatchValidationResult {
  batchId: number;
  status: import('./batch').BatchStatus;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  productMasterCheckedAt?: string | null;
  storeRouteMasterCheckedAt?: string | null;
}

export interface ValidationErrorItem {
  id: number;
  batchId: number;
  severity: ValidationSeverity;
  userTitle?: string | null;
  userMessage?: string | null;
  actionGuide?: string | null;
  domain: string;
  sheetName?: string | null;
  rowNo?: number | null;
  columnName?: string | null;
  lineTable?: string | null;
  lineId?: number | null;
  errorCode: string;
  message: string;
  originalValue?: string | null;
  normalizedValue?: string | null;
  targetCode?: string | null;
  targetName?: string | null;
  orderNo?: string | null;
  storeCode?: string | null;
  storeName?: string | null;
  productCode?: string | null;
  productName?: string | null;
  orderQty?: string | null;
  unit?: string | null;
  sourceSummary?: string | null;
  resolvedYn: boolean;
}
