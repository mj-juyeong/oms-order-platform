import { useEffect, useMemo, useState } from 'react';
import { fakeCurrentUser } from './auth';
import type { BackendBatchSummary } from '../types/batch';

const BATCH_CONTEXT_KEY_PREFIX = 'oms.batchContext';
const BATCH_CONTEXT_CHANGED_EVENT = 'oms:batch-context-changed';

export type BatchContextSelection =
  | {
      mode: 'all';
      tenantId: number;
      clientId: number;
    }
  | {
      mode: 'batch';
      tenantId: number;
      clientId: number;
      batchId: number;
      batchNo?: string;
      deliveryDate?: string | null;
    };

export function readBatchContextSelection(
  tenantId: number | null | undefined,
  clientId: number | null | undefined,
): BatchContextSelection | null {
  if (!tenantId || !clientId) return null;

  try {
    const raw = localStorage.getItem(batchContextStorageKey(tenantId, clientId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BatchContextSelection;
    if (parsed.tenantId !== tenantId || parsed.clientId !== clientId) {
      return null;
    }
    if (parsed.mode === 'all') {
      return parsed;
    }
    if (parsed.mode !== 'batch' || !Number.isFinite(parsed.batchId)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function useBatchContextSelection(
  tenantId: number | null | undefined,
  clientId: number | null | undefined,
) {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    function handleBatchContextChanged(event: Event) {
      const selection = (event as CustomEvent<BatchContextSelection | null>).detail;

      if (!selection || (selection.tenantId === tenantId && selection.clientId === clientId)) {
        setVersion((current) => current + 1);
      }
    }

    window.addEventListener(BATCH_CONTEXT_CHANGED_EVENT, handleBatchContextChanged);

    return () => {
      window.removeEventListener(BATCH_CONTEXT_CHANGED_EVENT, handleBatchContextChanged);
    };
  }, [clientId, tenantId]);

  return useMemo(() => readBatchContextSelection(tenantId, clientId), [clientId, tenantId, version]);
}

export function saveBatchContextSelection(batch: BackendBatchSummary) {
  const tenantId = batch.tenantId;
  const clientId = batch.clientId;
  const selection: BatchContextSelection = {
    mode: 'batch',
    tenantId,
    clientId,
    batchId: batch.id,
    batchNo: batch.batchNo,
    deliveryDate: batch.deliveryDate,
  };
  localStorage.setItem(batchContextStorageKey(tenantId, clientId), JSON.stringify(selection));
  window.dispatchEvent(new CustomEvent(BATCH_CONTEXT_CHANGED_EVENT, { detail: selection }));
}

export function saveAllBatchContextSelection({
  tenantId,
  clientId,
}: {
  tenantId: number;
  clientId: number;
}) {
  const selection: BatchContextSelection = {
    mode: 'all',
    tenantId,
    clientId,
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
    mode: 'batch',
    tenantId,
    clientId,
    batchId,
    batchNo: existing?.mode === 'batch' && existing.batchId === batchId ? existing.batchNo : undefined,
    deliveryDate: existing?.mode === 'batch' && existing.batchId === batchId ? existing.deliveryDate : undefined,
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
