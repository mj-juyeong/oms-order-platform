import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { omsApi, type ClientSummary } from '../api/oms';
import { fakeCurrentUser } from '../app/auth';
import { clientSelectionFromValue, clientSelectionValue, saveClientContextSelection, useClientScope } from '../app/clientContext';
import {
  Badge,
  Button,
  Card,
  DateRangeQuickFilter,
  Input,
  ModalFrame,
  Select,
} from '../components/common';
import { DataTable, Pagination, type DataTableColumn } from '../components/data';
import { CodeCell } from '../components/domain';
import type { ExternalApiChannel, ExternalApiStatusRow } from '../types/externalApi';
import { isDateInRange, type DateRangeValue } from '../utils/dateRange';
import { areFilterStatesEqual } from '../utils/filterState';

interface StatusFilters {
  batchId: string;
  channel: 'ALL' | ExternalApiChannel;
  deliveryDateRange: DateRangeValue;
  keyword: string;
  providable: 'ALL' | 'YES' | 'NO';
}

const initialFilters: StatusFilters = {
  batchId: '',
  channel: 'ALL',
  deliveryDateRange: { preset: 'ALL', from: '', to: '' },
  keyword: '',
  providable: 'ALL',
};

const channelLabels: Record<ExternalApiChannel, string> = {
  WOS_SCAN: 'WOS / Scan',
  PL: 'PL / Picking List',
};

export function ExternalApiStatusPage() {
  const tenantId = fakeCurrentUser.tenantId ?? null;
  const { clientId, selection } = useClientScope();
  const selectedClientId = clientId ?? fakeCurrentUser.clientId ?? null;
  const [searchParams] = useSearchParams();
  const requestedBatchId = searchParams.get('batchId') ?? '';
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [filters, setFilters] = useState<StatusFilters>(() => ({ ...initialFilters, batchId: requestedBatchId }));
  const [appliedFilters, setAppliedFilters] = useState<StatusFilters>(() => ({ ...initialFilters, batchId: requestedBatchId }));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [rows, setRows] = useState<ExternalApiStatusRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<ExternalApiStatusRow | null>(null);

  useEffect(() => {
    if (!tenantId || fakeCurrentUser.userScopeType === 'CLIENT') {
      setClients([]);
      return;
    }

    let ignore = false;
    omsApi.clients.list({ tenantId })
      .then((items) => {
        if (ignore) return;
        setClients(items);
        if (selection.mode === 'client' && !items.some((client) => client.id === selection.clientId)) {
          saveClientContextSelection({ mode: 'all' });
        }
      })
      .catch(() => {
        if (!ignore) setClients([]);
      });

    return () => {
      ignore = true;
    };
  }, [selection, tenantId]);

  const clientOptions = useMemo(
    () => [
      { label: '고객사를 선택해 주세요', value: 'all' },
      ...clients.map((client) => ({ label: client.name, value: String(client.id) })),
    ],
    [clients],
  );
  const selectedClient = clients.find((client) => client.id === selectedClientId);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setLoadError(null);

    if (!tenantId || !selectedClientId) {
      setRows([]);
      setSelectedRow(null);
      setLoading(false);
      return () => {
        ignore = true;
      };
    }

    omsApi.externalApi.status({
      tenantId,
      clientId: selectedClientId,
      batchId: /^\d+$/.test(appliedFilters.batchId.trim()) ? Number(appliedFilters.batchId.trim()) : undefined,
      channel: appliedFilters.channel === 'ALL' ? undefined : appliedFilters.channel,
      deliveryDate:
        appliedFilters.deliveryDateRange.from && appliedFilters.deliveryDateRange.from === appliedFilters.deliveryDateRange.to
          ? appliedFilters.deliveryDateRange.from
          : undefined,
      page: 0,
      size: 100,
    })
      .then((response) => {
        if (ignore) {
          return;
        }
        setRows(response.items);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (ignore) {
          return;
        }
        setRows([]);
        setSelectedRow(null);
        setLoadError(error instanceof Error ? error.message : 'API 제공 현황을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [appliedFilters.batchId, appliedFilters.channel, appliedFilters.deliveryDateRange.from, appliedFilters.deliveryDateRange.to, selectedClientId, tenantId]);

  useEffect(() => {
    setFilters((current) => (current.batchId === requestedBatchId ? current : { ...current, batchId: requestedBatchId }));
    setAppliedFilters((current) => (current.batchId === requestedBatchId ? current : { ...current, batchId: requestedBatchId }));
  }, [requestedBatchId]);

  const filteredRows = useMemo(() => filterRows(rows, appliedFilters), [appliedFilters, rows]);
  const summary = useMemo(() => createSummary(filteredRows), [filteredRows]);
  const activeFilterCount = useMemo(() => countActiveFilters(appliedFilters), [appliedFilters]);
  const hasPendingFilters = useMemo(() => !areFilterStatesEqual(filters, appliedFilters), [appliedFilters, filters]);

  function updateFilter<TKey extends keyof StatusFilters>(key: TKey, value: StatusFilters[TKey]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function applyFilters() {
    setAppliedFilters(filters);
    setFiltersOpen(false);
  }

  function resetFilters() {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
  }

  return (
    <div className="space-y-5">
      <Card className="px-4 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">고객사 기준</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              외부 API 제공 현황은 API Key와 동일하게 고객사 단위로 확인합니다.
            </p>
          </div>
          {fakeCurrentUser.userScopeType === 'CLIENT' ? (
            <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
              {fakeCurrentUser.clientName ?? `고객사 ${selectedClientId ?? '-'}`}
            </span>
          ) : (
            <Select
              aria-label="external-api-status-client"
              className="w-full sm:w-64"
              disabled={!tenantId}
              onChange={(event) => saveClientContextSelection(clientSelectionFromValue(event.target.value, clients))}
              options={clientOptions}
              value={clientSelectionValue(selection)}
            />
          )}
        </div>
        {selectedClient ? (
          <p className="mt-3 rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-xs leading-5 text-teal-800">
            현재 <strong>{selectedClient.name}</strong> 고객사의 WOS/PL 제공 가능 상태를 조회합니다.
          </p>
        ) : !selectedClientId ? (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
            제공 현황을 보려면 고객사를 선택해 주세요.
          </p>
        ) : null}
      </Card>

      <SummaryCards summary={summary} />

      <ExternalApiFilterPanel
        activeFilterCount={activeFilterCount}
        filters={filters}
        hasPendingFilters={hasPendingFilters}
        loadError={loadError}
        onApply={applyFilters}
        onReset={resetFilters}
        onToggleOpen={() => setFiltersOpen((current) => !current)}
        open={filtersOpen}
        updateFilter={updateFilter}
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-bold text-slate-950">외부 API 제공 대상</p>
              <Badge tone="teal">확정 배치만 제공</Badge>
              <Badge tone="blue">X-Api-Key</Badge>
            </div>
            <p className="mt-1 hidden text-sm text-slate-500 sm:block">
              총 <span className="font-semibold text-teal-700">{filteredRows.length.toLocaleString()}</span>건입니다.
              행을 선택하면 호출 방법, 제공 조건과 API Key 상태를 확인합니다.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <SmallLinkButton to="/audit">API 호출 로그</SmallLinkButton>
            <SmallLinkButton to="/external-api/api-keys">API Key 관리</SmallLinkButton>
          </div>
        </div>
        <DataTable
          columns={createColumns()}
          data={filteredRows}
          emptyDescription={loadError ? '백엔드 API 응답을 확인한 뒤 다시 조회해 주세요.' : '채널, 제공 상태, 배송일, 검색어 조건을 조정해 주세요.'}
          emptyTitle={loadError ? 'API 제공 현황을 불러오지 못했습니다.' : '표시할 API 제공 현황이 없습니다.'}
          getRowClassName={(item) => (rowKey(item) === (selectedRow ? rowKey(selectedRow) : '') ? 'bg-teal-50/80' : '')}
          getRowKey={rowKey}
          onRowClick={setSelectedRow}
          renderMobileCard={renderExternalApiMobileCard}
        />
        <div className="px-5 py-4">
          <p className="hidden text-xs text-slate-500 sm:block">{loading ? 'API 제공 현황을 갱신하는 중입니다.' : '라벨은 API가 아니라 라벨 다운로드 화면에서 제공합니다.'}</p>
          <div className="mt-3">
            <Pagination page={1} total={filteredRows.length} totalPages={Math.max(1, Math.ceil(filteredRows.length / 20))} />
          </div>
        </div>
      </Card>

      <StatusDetailModal row={selectedRow} onClose={() => setSelectedRow(null)} />
    </div>
  );
}

function ExternalApiFilterPanel({
  activeFilterCount,
  filters,
  hasPendingFilters,
  loadError,
  onApply,
  onReset,
  onToggleOpen,
  open,
  updateFilter,
}: {
  activeFilterCount: number;
  filters: StatusFilters;
  hasPendingFilters: boolean;
  loadError: string | null;
  onApply: () => void;
  onReset: () => void;
  onToggleOpen: () => void;
  open: boolean;
  updateFilter: <TKey extends keyof StatusFilters>(key: TKey, value: StatusFilters[TKey]) => void;
}) {
  return (
    <Card className="px-4 py-4">
      <div
        className="flex cursor-pointer flex-col gap-3 rounded-md lg:flex-row lg:items-center lg:justify-between"
        onClick={onToggleOpen}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">조회 조건</p>
            {activeFilterCount > 0 ? <Badge tone="blue">적용 {activeFilterCount}</Badge> : <Badge>전체 조회</Badge>}
            {hasPendingFilters ? <Badge tone="amber">검색 필요</Badge> : null}
            {loadError ? <Badge tone="red">조회 실패</Badge> : <Badge tone="green">API 연결</Badge>}
          </div>
          <p className="mt-1 hidden text-xs text-slate-500 sm:block">WOS/PL 채널, 제공 상태, 배송일과 endpoint 조건으로 API 제공 대상을 찾습니다.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
          <Button disabled={!hasPendingFilters} onClick={onApply} size="sm" variant="primary">
            검색
          </Button>
          <Button disabled={activeFilterCount === 0 && !hasPendingFilters} onClick={onReset} size="sm" variant="ghost">
            초기화
          </Button>
          <Button aria-expanded={open} onClick={onToggleOpen} size="sm" variant="secondary">
            {open ? '필터 접기' : '상세 필터'}
          </Button>
        </div>
      </div>

      {open ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Select
              label="제공 채널"
              onChange={(event) => updateFilter('channel', event.target.value as StatusFilters['channel'])}
              options={[
                { label: '전체', value: 'ALL' },
                { label: 'WOS / Scan', value: 'WOS_SCAN' },
                { label: 'PL / Picking List', value: 'PL' },
              ]}
              value={filters.channel}
            />
            <Select
              label="제공 상태"
              onChange={(event) => updateFilter('providable', event.target.value as StatusFilters['providable'])}
              options={[
                { label: '전체', value: 'ALL' },
                { label: '제공 가능', value: 'YES' },
                { label: '제공 제외', value: 'NO' },
              ]}
              value={filters.providable}
            />
            <Input
              label="배치 ID"
              onChange={(event) => updateFilter('batchId', event.target.value)}
              placeholder="예: 12"
              value={filters.batchId}
            />
            <DateRangeQuickFilter
              includeTomorrow
              label="배송일"
              onChange={(value) => updateFilter('deliveryDateRange', value)}
              value={filters.deliveryDateRange}
            />
            <Input label="검색" onChange={(event) => updateFilter('keyword', event.target.value)} placeholder="배치, endpoint, scope" value={filters.keyword} />
          </div>
          <div className="mt-4 flex justify-end">
            <Button disabled={!hasPendingFilters} onClick={onApply} size="sm" variant="primary">
              검색
            </Button>
          </div>
        </div>
      ) : null}

      {loadError ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
          API 제공 현황을 불러오지 못했습니다. {loadError}
        </p>
      ) : null}
    </Card>
  );
}

function SummaryCards({ summary }: { summary: ReturnType<typeof createSummary> }) {
  const cards = [
    { label: 'WOS 제공 가능', value: summary.wosProvidable, tone: 'teal' as const, description: '스캔 데이터 기준' },
    { label: 'PL 제공 가능', value: summary.plProvidable, tone: 'blue' as const, description: '피킹 리스트 기준' },
    { label: '제공 제외', value: summary.excluded, tone: 'amber' as const, description: '확정 전, 데이터 없음, Key 없음' },
    { label: '최근 호출 실패', value: summary.failedCalls, tone: 'red' as const, description: '마지막 응답 4xx/5xx' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {cards.map((card) => (
        <Card className="p-3 sm:p-4" key={card.label}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-600">{card.label}</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{card.value.toLocaleString()}</p>
            </div>
            <Badge tone={card.tone}>{card.label}</Badge>
          </div>
          <p className="mt-3 hidden text-xs leading-5 text-slate-500 sm:block">{card.description}</p>
        </Card>
      ))}
    </div>
  );
}

function createColumns(): DataTableColumn<ExternalApiStatusRow>[] {
  return [
    { key: 'channel', header: '채널', width: '150px', cell: (item) => <ChannelBadge channel={item.channel} /> },
    { key: 'client', header: '고객사', width: '140px', cell: (item) => clientDisplayName(item) },
    { key: 'endpoint', header: 'Endpoint', width: '360px', cell: (item) => <EndpointCell row={item} /> },
    { key: 'batch', header: '배치', width: '220px', cell: (item) => <BatchCell row={item} /> },
    { key: 'deliveryDate', header: '배송일', width: '110px', cell: (item) => item.deliveryDate ?? '-' },
    { key: 'status', header: '제공 상태', width: '210px', cell: (item) => <ProvideStatus row={item} /> },
    { key: 'source', header: '원천/건수', width: '220px', cell: (item) => <SourceCell row={item} /> },
    { key: 'apiKey', header: 'API Key', width: '180px', cell: (item) => <ApiKeyCell row={item} /> },
  ];
}

function ChannelBadge({ channel }: { channel: ExternalApiChannel }) {
  return <Badge tone={channel === 'WOS_SCAN' ? 'teal' : 'blue'}>{channelLabels[channel]}</Badge>;
}

function EndpointCell({ row }: { row: ExternalApiStatusRow }) {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="neutral">GET</Badge>
        <CodeCell value={row.endpoint} />
      </div>
      <p className="text-xs text-slate-500">Header X-Api-Key · scope {row.requiredScope}</p>
    </div>
  );
}

function BatchCell({ row }: { row: ExternalApiStatusRow }) {
  return (
    <div className="space-y-1">
      <Link className="font-semibold text-slate-900 underline-offset-2 hover:text-teal-700 hover:underline" to={`/batches/${row.batchNo}`}>
        {row.batchNo}
      </Link>
      <div className="flex flex-wrap items-center gap-1.5">
        <CodeCell muted value={String(row.batchId)} />
        <span className="text-xs text-slate-500">{statusLabel(row.batchStatus)}</span>
      </div>
    </div>
  );
}

function ProvideStatus({ row }: { row: ExternalApiStatusRow }) {
  if (row.providable) {
    return (
      <div className="space-y-1">
        <Badge tone="green">제공 가능</Badge>
        <p className="text-xs text-slate-500">확정 배치와 활성 Key 확인됨</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Badge tone="amber">제공 제외</Badge>
      <p className="max-w-[220px] truncate text-xs text-slate-500" title={row.excludedReason ?? undefined}>{row.excludedReason ?? '제공 조건 확인 필요'}</p>
    </div>
  );
}

function SourceCell({ row }: { row: ExternalApiStatusRow }) {
  return (
    <div className="space-y-1">
      <p className="font-semibold text-slate-900">{row.providedRowCount.toLocaleString()}건</p>
      <p className="max-w-[220px] truncate text-xs text-slate-500" title={row.sourceSheets.join(', ')}>
        {row.sourceSheets.join(', ') || '-'}
      </p>
    </div>
  );
}

function ApiKeyCell({ row }: { row: ExternalApiStatusRow }) {
  return (
    <div className="space-y-1">
      <Badge tone={row.hasActiveApiKey ? 'green' : 'red'}>{row.activeApiKeyCount.toLocaleString()}개 활성</Badge>
      <p className="text-xs text-slate-500">scope {row.requiredScope}</p>
    </div>
  );
}

function renderExternalApiMobileCard(row: ExternalApiStatusRow) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <ChannelBadge channel={row.channel} />
            <Badge tone={row.providable ? 'green' : 'amber'}>{row.providable ? '제공 가능' : '제공 제외'}</Badge>
          </div>
          <p className="mt-2 truncate text-sm font-bold text-slate-950" title={row.endpoint}>{row.endpoint}</p>
          <p className="mt-1 truncate text-xs text-slate-500" title={clientDisplayName(row)}>{clientDisplayName(row)}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-bold text-slate-950">{row.providedRowCount.toLocaleString()}</p>
          <p className="text-xs font-semibold text-slate-500">rows</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
        <MobileFact label="배치" value={<CodeCell value={String(row.batchId)} />} />
        <MobileFact label="Scope" value={<CodeCell value={row.requiredScope} />} />
        <MobileFact label="API Key" value={`${row.activeApiKeyCount.toLocaleString()}개 활성`} />
        <MobileFact label="소스" value={row.sourceSheets.join(', ') || '-'} />
      </div>
    </div>
  );
}

function MobileFact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-semibold text-slate-500">{label}</p>
      <div className="mt-1 min-w-0 truncate font-semibold text-slate-800">{value}</div>
    </div>
  );
}

function StatusDetailModal({ onClose, row }: { onClose: () => void; row: ExternalApiStatusRow | null }) {
  if (!row) {
    return null;
  }

  return (
    <ModalFrame onClose={onClose} panelClassName="flex max-h-[92dvh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-bold text-slate-950">API 제공 상세</p>
              <ChannelBadge channel={row.channel} />
              <Badge tone={row.providable ? 'green' : 'amber'}>{row.providable ? '제공 가능' : '제공 제외'}</Badge>
            </div>
            <p className="mt-1 hidden text-sm text-slate-500 sm:block">WOS/PL 연동 대상 배치의 호출 방법, 제공 조건과 최근 호출 결과입니다.</p>
          </div>
          <Button aria-label="API 제공 상세 닫기" onClick={onClose} size="sm" variant="ghost">닫기</Button>
        </div>

        <div className="overflow-y-auto bg-slate-50 px-4 py-4 sm:px-6 sm:py-5">
          <div className={`rounded-lg border p-4 ${row.providable ? 'border-teal-200 bg-teal-50' : 'border-amber-200 bg-amber-50'}`}>
            <div className="flex flex-wrap items-center gap-2">
              <CodeCell value={row.endpoint} />
              <CodeCell value={row.requiredScope} />
              <span className="text-sm font-semibold text-slate-900">{row.batchNo}</span>
            </div>
            <p className={`mt-3 hidden text-sm leading-6 sm:block ${row.providable ? 'text-teal-800' : 'text-amber-800'}`}>
              {row.providable ? '현재 배치는 외부 시스템이 API로 조회할 수 있습니다.' : row.excludedReason ?? '제공 제외 사유를 확인해야 합니다.'}
            </p>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <DetailSection description="외부 연동에 필요한 정보입니다." title="호출 방법">
              <DetailItem label="Method" value={<Badge tone="neutral">GET</Badge>} />
              <DetailItem label="Endpoint" value={<CodeCell value={row.endpoint} />} />
              <DetailItem label="Header" value={<CodeCell value="X-Api-Key" />} />
              <DetailItem label="Scope" value={<CodeCell value={row.requiredScope} />} />
            </DetailSection>

            <DetailSection description="외부 API 제공 여부를 결정하는 조건입니다." title="제공 조건">
              <DetailItem label="고객사" value={clientDisplayName(row)} />
              <DetailItem label="배치 상태" value={<Badge tone={row.batchStatus === 'CONFIRMED' ? 'green' : 'amber'}>{statusLabel(row.batchStatus)}</Badge>} />
              <DetailItem label="제공 행 수" value={`${row.providedRowCount.toLocaleString()}건`} />
              <DetailItem label="활성 API Key" value={`${row.activeApiKeyCount.toLocaleString()}개`} />
              <DetailItem label="제외 코드" value={row.excludedReasonCode ? <CodeCell value={row.excludedReasonCode} /> : '-'} />
            </DetailSection>

            <DetailSection description="외부 API로 제공되는 데이터 범위입니다." title="제공 데이터">
              <DetailItem label="제공 범위" value={row.sourceSheets.length > 0 ? row.sourceSheets.join(', ') : '-'} />
              {row.channel === 'WOS_SCAN' ? (
                <>
                  <DetailItem label="Scan 센터" value={`${(row.scanCenterCount ?? 0).toLocaleString()}개`} />
                  <DetailItem label="바코드" value={`${(row.scanBarcodeCount ?? 0).toLocaleString()}건`} />
                </>
              ) : (
                <>
                  <DetailItem label="EA / Box" value={`${(row.plEaCount ?? 0).toLocaleString()} / ${(row.plBoxCount ?? 0).toLocaleString()}건`} />
                  <DetailItem label="주문 수량" value={`${(row.plOrderQty ?? 0).toLocaleString()}개`} />
                  <DetailItem label="거래처 / 차량" value={`${(row.plStoreCount ?? 0).toLocaleString()} / ${(row.plVehicleCount ?? 0).toLocaleString()}개`} />
                </>
              )}
            </DetailSection>

            <DetailSection description="API Key와 마지막 API 호출 결과입니다." title="연동 상태">
              <DetailItem label="최근 호출" value={row.lastCalledAt ? formatDateTime(row.lastCalledAt) : '호출 이력 없음'} />
              <DetailItem label="응답 상태" value={row.lastStatusCode ? <Badge tone={row.lastStatusCode >= 400 ? 'red' : 'green'}>{row.lastStatusCode}</Badge> : '-'} />
              <DetailItem label="응답 시간" value={row.lastResponseTimeMs ? `${row.lastResponseTimeMs}ms` : '-'} />
              <DetailItem label="Request ID" value={row.lastRequestId ? <CodeCell value={row.lastRequestId} /> : '-'} />
            </DetailSection>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <LinkButton to={`/batches/${row.batchNo}`}>배치 상세</LinkButton>
            <LinkButton to={row.channel === 'WOS_SCAN' ? '/scan-lines' : '/pl-lines'}>{row.channel === 'WOS_SCAN' ? 'Scan 조회' : 'PL 조회'}</LinkButton>
            <LinkButton to="/audit">API 호출 로그</LinkButton>
          </div>
        </div>
    </ModalFrame>
  );
}

function DetailSection({ children, description, title }: { children: ReactNode; description: string; title: string }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="font-semibold text-slate-950">{title}</p>
        <p className="mt-1 hidden text-xs text-slate-500 sm:block">{description}</p>
      </div>
      <div className="divide-y divide-slate-100">{children}</div>
    </section>
  );
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid min-w-0 grid-cols-[80px_minmax(0,1fr)] gap-3 px-3 py-3 text-sm sm:grid-cols-[120px_minmax(0,1fr)] sm:px-4">
      <span className="text-slate-500">{label}</span>
      <div className="min-w-0 overflow-hidden font-medium text-slate-900">{value}</div>
    </div>
  );
}

function LinkButton({ children, to }: { children: ReactNode; to: string }) {
  return (
    <Link className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50" to={to}>
      {children}
    </Link>
  );
}

function SmallLinkButton({ children, to }: { children: ReactNode; to: string }) {
  return (
    <Link className="inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 transition hover:bg-slate-50" to={to}>
      {children}
    </Link>
  );
}

function filterRows(rows: ExternalApiStatusRow[], filters: StatusFilters) {
  const batchId = filters.batchId.trim();
  const keyword = filters.keyword.trim().toLowerCase();

  return rows.filter((row) => {
    if (batchId && String(row.batchId) !== batchId) {
      return false;
    }

    if (filters.channel !== 'ALL' && row.channel !== filters.channel) {
      return false;
    }

    if (!isDateInRange(row.deliveryDate, filters.deliveryDateRange)) {
      return false;
    }

    if (filters.providable === 'YES' && !row.providable) {
      return false;
    }

    if (filters.providable === 'NO' && row.providable) {
      return false;
    }

    if (!keyword) {
      return true;
    }

    return [
      row.batchNo,
      String(row.batchId),
      clientDisplayName(row),
      row.endpoint,
      row.requiredScope,
      row.excludedReason ?? '',
      row.sourceSheets.join(' '),
      row.lastRequestId ?? '',
    ].some((value) => value.toLowerCase().includes(keyword));
  });
}

function clientDisplayName(row: ExternalApiStatusRow) {
  if (row.clientName?.trim()) {
    return row.clientName;
  }
  if (!row.clientId) {
    return '-';
  }
  return `고객사 ${row.clientId}`;
}

function createSummary(rows: ExternalApiStatusRow[]) {
  return rows.reduce(
    (acc, row) => {
      if (row.channel === 'WOS_SCAN' && row.providable) {
        acc.wosProvidable += 1;
      }
      if (row.channel === 'PL' && row.providable) {
        acc.plProvidable += 1;
      }
      if (!row.providable) {
        acc.excluded += 1;
      }
      if (row.lastStatusCode && row.lastStatusCode >= 400) {
        acc.failedCalls += 1;
      }
      return acc;
    },
    { excluded: 0, failedCalls: 0, plProvidable: 0, wosProvidable: 0 },
  );
}

function countActiveFilters(filters: StatusFilters) {
  return [
    filters.batchId.trim() !== '',
    filters.channel !== 'ALL',
    filters.deliveryDateRange.preset !== 'ALL',
    filters.keyword.trim() !== '',
    filters.providable !== 'ALL',
  ].filter(Boolean).length;
}

function rowKey(row: ExternalApiStatusRow) {
  return `${row.channel}-${row.batchId}`;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    UPLOADED: '업로드 완료',
    VALIDATING: '검증 중',
    VALIDATION_FAILED: '검증 실패',
    READY_TO_CONFIRM: '확정 대기',
    CONFIRMED: '확정 완료',
    CANCELLED: '취소',
    ROLLED_BACK: '롤백',
  };
  return labels[status] ?? status;
}

function formatDateTime(value: string) {
  return value.replace('T', ' ').slice(0, 16);
}
