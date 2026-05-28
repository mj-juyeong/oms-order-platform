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
