import { useEffect, useMemo, useState } from 'react';
import { LogOut } from 'lucide-react';
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
import { NotificationBell } from '../domain/NotificationBell';

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
    if (!tenantId) {
      setClients([]);
      return;
    }

    let ignore = false;
    omsApi.clients.list({ tenantId })
      .then((items) => {
        if (!ignore) {
          const uniqueClients = dedupeClientsByName(items);
          setClients(uniqueClients);
          if (!clientContextLocked && selection.mode === 'client') {
            const matchedClient = uniqueClients.find((client) => client.id === selection.clientId);
            if (!matchedClient) {
              saveClientContextSelection({ mode: 'all' });
            } else if (selection.clientName !== matchedClient.name) {
              saveClientContextSelection({ mode: 'client', clientId: matchedClient.id, clientName: matchedClient.name });
            }
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

  const lockedClient = clients.find((client) => client.id === fakeCurrentUser.clientId);
  const lockedClientName =
    lockedClient?.name ??
    fakeCurrentUser.clientName ??
    (selection.mode === 'client' ? selection.clientName ?? `고객사 #${selection.clientId}` : '고객사');

  const clientOptions = useMemo(() => {
    return [
      { label: '전체 고객사', value: 'all' },
      ...clients.map((client) => ({ label: `고객사: ${client.name}`, value: String(client.id) })),
    ];
  }, [clients]);
  const userDisplayName = fakeCurrentUser.name ?? fakeCurrentUser.loginId ?? '-';

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
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-3 py-3 backdrop-blur sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-nowrap items-center justify-between gap-2">
        <div className="flex min-w-0 shrink items-center gap-2 text-sm text-slate-600 sm:gap-3">
          <button
            aria-label="사이드바 열기"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 lg:hidden"
            onClick={onMenuClick}
            type="button"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <span className="shrink-0 font-semibold text-slate-950">OMS</span>
          {fakeCurrentUser.tenantName ? <span className="hidden h-4 w-px bg-slate-200 sm:inline-block" aria-hidden="true" /> : null}
          {fakeCurrentUser.tenantName ? <span className="hidden truncate sm:inline">{fakeCurrentUser.tenantName}</span> : null}
        </div>
        <div className="ml-auto flex min-w-0 shrink-0 items-center justify-end gap-2 sm:gap-3">
          {clientContextLocked ? (
            <span className="max-w-[112px] truncate rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 sm:max-w-[220px]">
              <span className="hidden sm:inline">고객사: </span>{lockedClientName}
            </span>
          ) : (
            <Select
              aria-label="client-context"
              className="w-32 sm:w-52"
              disabled={!tenantId}
              onChange={(event) => saveClientContextSelection(clientSelectionFromValue(event.target.value, clients))}
              options={clientOptions}
              value={clientSelectionValue(selection)}
            />
          )}
          <NotificationBell />
          <div className="hidden min-w-0 items-center text-sm sm:flex">
            <span className="truncate font-semibold text-slate-900">
              <span className="font-medium text-slate-500">사용자: </span>
              {userDisplayName}
            </span>
          </div>
          <Button aria-label="로그아웃" className="h-9 w-9 px-0 sm:w-auto sm:px-3" onClick={handleLogout} size="sm" title="로그아웃" variant="ghost">
            <LogOut aria-hidden="true" className="h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">로그아웃</span>
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
