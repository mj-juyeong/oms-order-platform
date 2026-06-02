export interface ListParams {
  tenantId: number;
  clientId?: number;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}
