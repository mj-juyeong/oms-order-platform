export interface TenantSummary {
  id: number;
  code: string;
  name: string;
  status: string;
}

export interface CreateTenantRequest {
  name: string;
  code?: string | null;
}

export interface UpdateTenantRequest {
  code?: string;
  name?: string;
  status?: string;
}

export interface TenantMutationResponse {
  id: number;
  updated: boolean;
}
