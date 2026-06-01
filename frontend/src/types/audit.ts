export interface AuditLog {
  id: string;
  logType: 'BATCH' | 'DOWNLOAD' | 'API';
  batchId?: string;
  actionOrPath: string;
  status: string;
  actorName: string;
  occurredAt: string;
  requestId?: string;
  responseTimeMs?: number;
  message: string;
}

export interface BackendBatchAuditLog {
  id: number;
  tenantId: number;
  clientId: number;
  batchId?: number | null;
  action: string;
  beforeStatus?: import('./batch').BatchStatus | null;
  afterStatus?: import('./batch').BatchStatus | null;
  actorId?: number | null;
  requestId?: string | null;
  message?: string | null;
  metadataJson?: string | null;
  createdAt?: string | null;
}

export interface BackendApiCallLog {
  id: number;
  tenantId: number;
  clientId: number;
  apiKeyId?: number | null;
  requestId?: string | null;
  path: string;
  method: string;
  queryString?: string | null;
  responseStatus: number;
  responseTimeMs?: number | null;
  clientIp?: string | null;
  createdAt?: string | null;
}

export interface BackendAuditDownloadLog {
  id: number;
  tenantId: number;
  clientId: number;
  batchId?: number | null;
  downloadType: string;
  fileName: string;
  filterJson?: string | null;
  rowCount?: number | null;
  downloadedBy?: number | null;
  requestId?: string | null;
  downloadedAt: string;
}
