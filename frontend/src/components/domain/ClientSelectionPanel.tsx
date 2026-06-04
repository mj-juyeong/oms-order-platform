import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, UserRoundCheck } from 'lucide-react';
import { omsApi, type ClientSummary } from '../../api/oms';
import { saveClientContextSelection } from '../../app/clientContext';
import { Button, Card, EmptyState, ErrorState, Input, LoadingState } from '../common';

interface ClientSelectionPanelProps {
  tenantId: number;
  title?: string;
  description?: string;
}

export function ClientSelectionPanel({
  tenantId,
  title = '고객사를 선택하세요',
  description = '조회할 고객사를 먼저 선택하면 해당 고객사의 배치와 주문 데이터를 확인할 수 있습니다.',
}: ClientSelectionPanelProps) {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadSeq, setReloadSeq] = useState(0);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(null);

    omsApi.clients
      .list({ tenantId })
      .then((items) => {
        if (!ignore) setClients(dedupeClientsByName(items));
      })
      .catch((loadError: unknown) => {
        if (!ignore) setError(loadError instanceof Error ? loadError.message : '고객사 목록을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [reloadSeq, tenantId]);

  const filteredClients = useMemo(() => {
    const normalized = normalize(query);
    if (!normalized) return clients;
    return clients.filter((client) =>
      [client.name, client.code, client.externalCode ?? ''].some((value) => normalize(value).includes(normalized)),
    );
  }, [clients, query]);

  function selectClient(client: ClientSummary) {
    saveClientContextSelection({
      mode: 'client',
      clientId: client.id,
      clientName: client.name,
    });
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2">
              <UserRoundCheck aria-hidden="true" className="h-5 w-5 text-teal-700" />
              <h2 className="text-base font-bold text-slate-950">{title}</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
          </div>
          <div className="grid w-full gap-2 sm:grid-cols-[minmax(0,1fr)_auto] lg:max-w-xl">
            <Input
              label="고객사 검색"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="고객사명, 코드"
              value={query}
            />
            <Button className="self-end" onClick={() => saveClientContextSelection({ mode: 'all' })} variant="secondary">
              전체 고객사 보기
            </Button>
          </div>
        </div>
      </Card>

      {loading ? (
        <LoadingState label="고객사 목록을 불러오는 중입니다." />
      ) : error ? (
        <ErrorState description={error} onRetry={() => setReloadSeq((value) => value + 1)} title="고객사를 조회하지 못했습니다." />
      ) : filteredClients.length === 0 ? (
        <EmptyState
          action={
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              to="/clients"
            >
              고객사 관리로 이동
            </Link>
          }
          description={query ? '검색어와 일치하는 고객사가 없습니다.' : '등록된 고객사가 없습니다. 고객사 관리에서 먼저 등록해 주세요.'}
          title="선택할 고객사가 없습니다."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredClients.map((client) => (
            <Card className="p-4" key={client.id}>
              <div className="flex h-full flex-col gap-4">
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-slate-950">{client.name}</p>
                  <dl className="mt-3 grid gap-2 text-sm">
                    <ClientFact label="고객사 코드" value={client.code} />
                    {client.externalCode ? <ClientFact label="외부 코드" value={client.externalCode} /> : null}
                    <ClientFact label="상태" value={client.status} />
                  </dl>
                </div>
                <Button className="mt-auto w-full" onClick={() => selectClient(client)} variant="primary">
                  선택
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && !error && clients.length > 0 ? (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Search aria-hidden="true" className="h-4 w-4" />
          {filteredClients.length.toLocaleString()}개 고객사가 표시됩니다.
        </p>
      ) : null}
    </div>
  );
}

function ClientFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-2">
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="truncate text-slate-900">{value || '-'}</dd>
    </div>
  );
}

function dedupeClientsByName(clients: ClientSummary[]) {
  const seen = new Set<string>();
  return clients.filter((client) => {
    const key = normalize(client.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalize(value: string) {
  return value.replace(/\s+/g, '').toLowerCase();
}
