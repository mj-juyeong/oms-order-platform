import { apiKeysApi } from './apiKeys';
import { auditApi } from './audit';
import { authApi, usersApi } from './auth';
import { batchesApi } from './batches';
import { clientsApi } from './clients';
import { downloadsApi } from './downloads';
import { externalApi } from './externalApi';
import { labelsApi } from './labels';
import { mastersApi } from './masters';
import { notificationsApi, workItemsApi } from './notifications';
import { ordersApi } from './orders';
import { plApi } from './pl';
import { scanApi } from './scan';
import { tenantsApi } from './tenants';
import { uploadsApi } from './uploads';
import { validationApi } from './validation';

export const omsApi = {
  auth: authApi,
  me: authApi.me,
  tenants: tenantsApi,
  clients: clientsApi,
  users: usersApi,
  apiKeys: apiKeysApi,
  batches: {
    ...batchesApi,
    validate: validationApi.validate,
    validationErrors: validationApi.listErrors,
  },
  uploads: uploadsApi,
  orders: ordersApi,
  scanLines: scanApi,
  plLines: plApi,
  labelLines: labelsApi,
  masters: mastersApi,
  downloads: downloadsApi,
  externalApi,
  audit: auditApi,
  notifications: notificationsApi,
  workItems: workItemsApi,
};

export type { ListParams } from './types';
export type { ApiKeyItem, ApiKeyRequestItem, ApiKeyRequestStatus, ApiKeyScopeType, CreatedApiKey } from '../types/apiKey';
export type { BackendApiCallLog, BackendAuditDownloadLog, BackendBatchAuditLog } from '../types/audit';
export type {
  BackendBatchDetail,
  BackendBatchSummary,
  BatchConfirmationRequest,
  BatchSupplementRequestType,
  OisSheetResult,
  OisUploadResponse,
} from '../types/batch';
export type { BackendLabelLine } from '../types/label';
export type { BackendPlLine } from '../types/pl';
export type { BackendScanLine } from '../types/scan';
export type { BatchValidationResult, ValidationErrorItem } from '../types/validation';
export type { ClientResolveCandidate, ClientSummary } from '../types/client';
export type { NotificationItem, WorkItemSummary } from '../types/notification';
export type {
  ClientMasterVisibilitySetting,
  ClientPublicProductMasterItem,
  ClientPublicStoreRouteMasterItem,
} from '../types/master';
export type { TenantSummary } from '../types/tenant';
