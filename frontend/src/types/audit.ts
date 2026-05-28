export interface AuditLog {
  id: string;
  logType: 'BATCH' | 'DOWNLOAD' | 'API';
  batchId?: string;
  actionOrPath: string;
  status: string;
  actorName: string;
  occurredAt: string;
  responseTimeMs?: number;
  message: string;
}
