import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { omsApi, type ClientSummary } from '../../api/oms';
import { clearAuthSession, fakeCurrentUser } from '../../app/auth';
import {
  clientSelectionFromValue,
  clientSelectionValue,
  readClientContextSelection,
  saveClientContextSelection,
  subscribeClientContextSelection,
} from '../../app/clientContext';
import { Button, Select } from '../common';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate();
  const tenantId = fakeCurrentUser.tenantId;
  const clientContextLocked = fakeCurrentUser.userScopeType === 'CLIENT';
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [selection, setSelection] = useState(readClientContextSelection);

  useEffect(() => subscribeClientContextSelection(setSelection), []);

  useEffect(() => {
    if (!tenantId || clientContextLocked) {
      setClients([]);
      return;
    }

    let ignore = false;
    omsApi.clients.list({ tenantId })
      .then((items) => {
        if (!ignore) {
          const uniqueClients = dedupeClientsByName(items);
          setClients(uniqueClients);
          if (selection.mode === 'client' && !uniqueClients.some((client) => client.id === selection.clientId)) {
            saveClientContextSelection({ mode: 'all' });
          }
        }
      })
      .catch(() => {
        if (!ignore) setClients([]);
      });
    return () => {
      ignore = true;
    };
  }, [clientContextLocked, selection, tenantId]);

  const clientOptions = useMemo(() => {
    return [
      { label: '전체 고객사', value: 'all' },
      ...clients.map((client) => ({ label: `고객사: ${client.name}`, value: String(client.id) })),
    ];
  }, [clients]);

  async function handleLogout() {
    try {
      await omsApi.auth.logout();
    } catch {
      // Local session cleanup should happen even when the backend is unavailable.
    } finally {
      clearAuthSession();
      navigate('/login', { replace: true });
    }
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-1 items-center gap-3 text-sm text-slate-600">
          <button
            aria-label="사이드바 열기"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 lg:hidden"
            onClick={onMenuClick}
            type="button"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <span className="font-semibold text-slate-950">OMS Logistics</span>
          <span className="h-4 w-px bg-slate-200" aria-hidden="true" />
          <span className="truncate">{fakeCurrentUser.tenantName}</span>
        </div>
        <div className="ml-auto flex min-w-fit flex-wrap items-center justify-end gap-3">
          {clientContextLocked ? (
            <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
              {fakeCurrentUser.clientName ?? (selection.mode === 'client' ? selection.clientName ?? `client-${selection.clientId}` : 'Client')}
            </span>
          ) : (
            <Select
              aria-label="client-context"
              className="w-44 sm:w-52"
              disabled={!tenantId}
              onChange={(event) => saveClientContextSelection(clientSelectionFromValue(event.target.value, clients))}
              options={clientOptions}
              value={clientSelectionValue(selection)}
            />
          )}
          <div className="flex items-center text-sm">
            <span className="font-semibold text-slate-900">{fakeCurrentUser.name ?? fakeCurrentUser.loginId}</span>
          </div>
          <Button onClick={handleLogout} size="sm" variant="ghost">
            로그아웃
          </Button>
        </div>
      </div>
    </header>
  );
}

function dedupeClientsByName(clients: ClientSummary[]) {
  const seen = new Set<string>();
  return clients.filter((client) => {
    const key = client.name.replace(/\s+/g, '').toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

interface IconProps {
  className?: string;
}

function MenuIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}
