export interface ApiKeyItem {
  id: number;
  tenantId: number;
  clientId?: number | null;
  scopeType: ApiKeyScopeType;
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

export type ApiKeyScopeType = 'TENANT' | 'CLIENT';

export type ApiKeyRequestStatus = 'REQUESTED' | 'REJECTED' | 'CANCELED' | 'ISSUED';

export interface ApiKeyRequestItem {
  id: number;
  tenantId: number;
  clientId?: number | null;
  scopeType: ApiKeyScopeType;
  clientName?: string | null;
  name: string;
  purpose: string;
  systemName: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  allowedScope: string[];
  requestedExpiresAt?: string | null;
  status: ApiKeyRequestStatus;
  requestedBy?: number | null;
  requestedAt: string;
  reviewedBy?: number | null;
  reviewedAt?: string | null;
  reviewComment?: string | null;
  issuedApiKeyId?: number | null;
  issuedAt?: string | null;
  keyRevealAvailable: boolean;
  keyRevealedAt?: string | null;
}

export interface ApiKeyRequestRevealResult {
  requestId: number;
  apiKeyId: number;
  apiKey: string;
  revealedAt: string;
}

export interface CreateApiKeyRequestBody {
  tenantId?: number | null;
  clientId?: number | null;
  scopeType?: ApiKeyScopeType;
  name: string;
  purpose: string;
  systemName: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  allowedScope: string[];
  requestedExpiresAt?: string | null;
}
