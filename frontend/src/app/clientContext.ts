import { useEffect, useMemo, useState } from 'react';
import { fakeCurrentUser } from './auth';
import type { ClientSummary } from '../types/client';

const LEGACY_CLIENT_CONTEXT_KEY = 'oms.clientContext';
const CLIENT_CONTEXT_KEY_PREFIX = 'oms.clientContext';
const CLIENT_CONTEXT_CHANGED_EVENT = 'oms:client-context-changed';

export type ClientContextSelection =
  | {
      mode: 'unselected';
    }
  | {
      mode: 'all';
    }
  | {
      mode: 'client';
      clientId: number;
      clientName?: string;
    };

export const defaultClientContextSelection: ClientContextSelection = {
  mode: 'unselected',
};

export function readClientContextSelection(): ClientContextSelection {
  const fixedSelection = fixedClientSelectionForCurrentUser();
  if (fixedSelection) {
    return fixedSelection;
  }

  try {
    const raw = localStorage.getItem(clientContextStorageKey());
    if (!raw) return defaultClientContextSelection;
    const parsed = JSON.parse(raw) as ClientContextSelection;
    if (parsed.mode === 'unselected') return defaultClientContextSelection;
    if (parsed.mode === 'all') return { mode: 'all' };
    if (parsed.mode === 'client' && Number.isFinite(parsed.clientId)) {
      return {
        mode: 'client',
        clientId: parsed.clientId,
        clientName: parsed.clientName,
      };
    }
  } catch {
    return defaultClientContextSelection;
  }
  return defaultClientContextSelection;
}

export function saveClientContextSelection(selection: ClientContextSelection) {
  const fixedSelection = fixedClientSelectionForCurrentUser();
  const nextSelection = fixedSelection ?? selection;
  if (fixedSelection) {
    localStorage.removeItem(clientContextStorageKey());
  } else {
    localStorage.setItem(clientContextStorageKey(), JSON.stringify(nextSelection));
  }
  window.dispatchEvent(new CustomEvent(CLIENT_CONTEXT_CHANGED_EVENT, { detail: nextSelection }));
}

export function resetClientContextSelection() {
  removeLegacyClientContextSelection();
  localStorage.removeItem(clientContextStorageKey());
  window.dispatchEvent(new CustomEvent(CLIENT_CONTEXT_CHANGED_EVENT, { detail: readClientContextSelection() }));
}

export function removeLegacyClientContextSelection() {
  localStorage.removeItem(LEGACY_CLIENT_CONTEXT_KEY);
}

export function subscribeClientContextSelection(listener: (selection: ClientContextSelection) => void) {
  const handleContextChanged = (event: Event) => {
    listener((event as CustomEvent<ClientContextSelection>).detail ?? readClientContextSelection());
  };
  const handleStorage = (event: StorageEvent) => {
    if (event.key === clientContextStorageKey()) {
      listener(readClientContextSelection());
    }
  };

  window.addEventListener(CLIENT_CONTEXT_CHANGED_EVENT, handleContextChanged);
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener(CLIENT_CONTEXT_CHANGED_EVENT, handleContextChanged);
    window.removeEventListener('storage', handleStorage);
  };
}

export function clientSelectionFromValue(value: string, clients: ClientSummary[]): ClientContextSelection {
  if (value === 'unselected') {
    return defaultClientContextSelection;
  }

  if (value === 'all') {
    return { mode: 'all' };
  }

  const clientId = Number(value);
  const client = clients.find((item) => item.id === clientId);
  return {
    mode: 'client',
    clientId,
    clientName: client?.name,
  };
}

export function clientSelectionValue(selection: ClientContextSelection) {
  if (selection.mode === 'unselected') return 'unselected';
  return selection.mode === 'all' ? 'all' : String(selection.clientId);
}

export function useClientScope() {
  const [selection, setSelection] = useState(readClientContextSelection);

  useEffect(() => {
    setSelection(readClientContextSelection());
    return subscribeClientContextSelection(setSelection);
  }, [fakeCurrentUser.id, fakeCurrentUser.userScopeType, fakeCurrentUser.tenantId, fakeCurrentUser.clientId]);

  return useMemo(
    () => ({
      selection,
      clientId: selection.mode === 'client' ? selection.clientId : undefined,
      clientName: selection.mode === 'client' ? selection.clientName : undefined,
      isAllClients: selection.mode === 'all',
      isClientUnselected: selection.mode === 'unselected',
      scopeLabel:
        selection.mode === 'unselected'
          ? '고객사 선택 필요'
          : selection.mode === 'all'
            ? '전체 고객사'
            : selection.clientName ?? `고객사 #${selection.clientId}`,
    }),
    [selection],
  );
}

function clientContextStorageKey() {
  const scope = fakeCurrentUser.userScopeType ?? 'ANONYMOUS';
  const tenant = fakeCurrentUser.tenantId ?? 'none';
  const client = fakeCurrentUser.clientId ?? 'all';
  const user = fakeCurrentUser.id ?? 'anonymous';
  return `${CLIENT_CONTEXT_KEY_PREFIX}.${scope}.${tenant}.${client}.${user}`;
}

function fixedClientSelectionForCurrentUser(): ClientContextSelection | null {
  if (fakeCurrentUser.userScopeType !== 'CLIENT' || typeof fakeCurrentUser.clientId !== 'number') {
    return null;
  }

  return {
    mode: 'client',
    clientId: Number(fakeCurrentUser.clientId),
    clientName: fakeCurrentUser.clientName,
  };
}
