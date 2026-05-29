export interface ApiMeta {
  requestId: string;
  timestamp: string;
}

export interface ApiErrorDetail {
  message: string;
  code?: string;
  field?: string;
  rejectedValue?: string;
  sheetName?: string;
  rowNo?: number;
  columnName?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
}

export interface ApiResponse<TData> {
  success: boolean;
  data: TData | null;
  error: ApiError | null;
  meta: ApiMeta;
}

export interface PageResponse<TItem> {
  items: TItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
