export interface ClientSummary {
  id: number;
  tenantId: number;
  code: string;
  name: string;
  externalCode?: string | null;
  status: string;
}

export interface ClientResolveCandidate {
  client: ClientSummary;
  score: number;
  matchedText: string;
  matchType: 'CLIENT_NAME' | 'CLIENT_CODE' | 'ALIAS' | 'NONE' | string;
  reason: string;
}

export interface CreateClientRequest {
  tenantId?: number | null;
  name: string;
  code?: string | null;
  externalCode?: string | null;
}

export interface UpdateClientRequest {
  code?: string;
  name?: string;
  externalCode?: string | null;
  status?: string;
}

export interface ClientMutationResponse {
  id: number;
  updated: boolean;
}
