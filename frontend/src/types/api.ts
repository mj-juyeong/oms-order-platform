export interface ApiMeta {
  requestId: string;
  timestamp: string;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  field?: string;
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
  total: number;
  totalPages: number;
}
