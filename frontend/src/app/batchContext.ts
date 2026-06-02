import { fakeCurrentUser } from './auth';
import type { BackendBatchSummary } from '../types/batch';

const BATCH_CONTEXT_KEY_PREFIX = 'oms.batchContext';
const BATCH_CONTEXT_CHANGED_EVENT = 'oms:batch-context-changed';

export interface BatchContextSelection {
  tenantId: number;
  clientId: number;
  batchId: number;
  batchNo?: string;
  deliveryDate?: string | null;
}

export function readBatchContextSelection(
  tenantId: number | null | undefined,
  clientId: number | null | undefined,
): BatchContextSelection | null {
  if (!tenantId || !clientId) return null;

  try {
    const raw = localStorage.getItem(batchContextStorageKey(tenantId, clientId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BatchContextSelection;
    if (parsed.tenantId !== tenantId || parsed.clientId !== clientId || !Number.isFinite(parsed.batchId)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveBatchContextSelection(batch: BackendBatchSummary) {
  const tenantId = batch.tenantId;
  const clientId = batch.clientId;
  const selection: BatchContextSelection = {
    tenantId,
    clientId,
    batchId: batch.id,
    batchNo: batch.batchNo,
    deliveryDate: batch.deliveryDate,
  };
  localStorage.setItem(batchContextStorageKey(tenantId, clientId), JSON.stringify(selection));
  window.dispatchEvent(new CustomEvent(BATCH_CONTEXT_CHANGED_EVENT, { detail: selection }));
}

export function saveBatchIdContextSelection({
  tenantId,
  clientId,
  batchId,
}: {
  tenantId: number;
  clientId: number;
  batchId: number;
}) {
  const existing = readBatchContextSelection(tenantId, clientId);
  const selection: BatchContextSelection = {
    tenantId,
    clientId,
    batchId,
    batchNo: existing?.batchId === batchId ? existing.batchNo : undefined,
    deliveryDate: existing?.batchId === batchId ? existing.deliveryDate : undefined,
  };
  localStorage.setItem(batchContextStorageKey(tenantId, clientId), JSON.stringify(selection));
  window.dispatchEvent(new CustomEvent(BATCH_CONTEXT_CHANGED_EVENT, { detail: selection }));
}

export function resetBatchContextSelection(
  tenantId: number | null | undefined,
  clientId: number | null | undefined,
) {
  if (!tenantId || !clientId) return;
  localStorage.removeItem(batchContextStorageKey(tenantId, clientId));
  window.dispatchEvent(new CustomEvent(BATCH_CONTEXT_CHANGED_EVENT, { detail: null }));
}

function batchContextStorageKey(tenantId: number, clientId: number) {
  const scope = fakeCurrentUser.userScopeType ?? 'ANONYMOUS';
  const user = fakeCurrentUser.id ?? 'anonymous';
  return `${BATCH_CONTEXT_KEY_PREFIX}.${scope}.${tenantId}.${clientId}.${user}`;
}
