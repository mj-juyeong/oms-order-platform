export interface ApiKeyItem {
  id: number;
  tenantId: number;
  clientId?: number | null;
  clientName?: string | null;
  name: string;
  status: string;
  allowedScope: string[];
  expiresAt?: string | null;
  lastUsedAt?: string | null;
  createdBy?: number | null;
}

export interface CreatedApiKey {
  id: number;
  apiKey: string;
  status: string;
}
