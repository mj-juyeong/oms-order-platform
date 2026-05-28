export type ApiResultStatus = 'SUCCESS' | 'ERROR';

export interface ApiErrorDetail {
  code: string;
  message: string;
  field?: string;
}

export interface ApiResponse<TData> {
  requestId: string;
  timestamp: string;
  status: ApiResultStatus;
  data: TData;
  errors?: ApiErrorDetail[];
}

export interface PageResponse<TItem> {
  items: TItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
