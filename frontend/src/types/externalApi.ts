import type { BatchStatus } from './batch';

export type ExternalApiChannel = 'WOS_SCAN' | 'PL';

export interface ExternalApiStatusRow {
  channel: ExternalApiChannel;
  endpoint: string;
  requiredScope: string;
  tenantId: number;
  clientId?: number | null;
  batchId: number;
  batchNo: string;
  deliveryDate?: string | null;
  batchStatus: BatchStatus;
  providable: boolean;
  excludedReasonCode?: string | null;
  excludedReason?: string | null;
  sourceSheets: string[];
  providedRowCount: number;
  activeApiKeyCount: number;
  hasActiveApiKey: boolean;
  latestApiKeyLastUsedAt?: string | null;
  latestApiKeyExpiresAt?: string | null;
  lastCalledAt?: string | null;
  lastStatusCode?: number | null;
  lastRequestId?: string | null;
  lastResponseTimeMs?: number | null;
  scanCenterCount?: number | null;
  scanBarcodeCount?: number | null;
  plEaCount?: number | null;
  plBoxCount?: number | null;
  plOrderQty?: number | null;
  plStoreCount?: number | null;
  plVehicleCount?: number | null;
}

export interface ExternalApiStatusParams {
  tenantId: number;
  clientId?: number;
  channel?: ExternalApiChannel;
  batchId?: number;
  deliveryDate?: string;
  status?: BatchStatus;
  page?: number;
  size?: number;
}
