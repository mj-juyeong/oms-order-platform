import { useEffect, useMemo, useState } from 'react';
import { omsApi, type BackendApiCallLog, type BackendAuditDownloadLog, type BackendBatchAuditLog } from '../api/oms';
import { fakeCurrentUser } from '../app/auth';
import { useClientScope } from '../app/clientContext';
import { Badge, Button, Card, DateRangeQuickFilter, ErrorState, Input, LoadingState, Select } from '../components/common';
import { DataTable, FilterBar, Pagination, type DataTableColumn } from '../components/data';
import { CodeCell } from '../components/domain';
import type { PageResponse } from '../types/api';
import type { AuditLog } from '../types/audit';
import { isDateInRange, type DateRangeValue } from '../utils/dateRange';

type AuditLogType = AuditLog['logType'];

interface AuditFilters {
  action: string;
  actor: string;
  batchId: string;
  dateRange: DateRangeValue;
  responseStatus: string;
}

const initialFilters: AuditFilters = {
  action: '',
  actor: '',
  batchId: '',
  dateRange: { preset: 'ALL', from: '', to: '' },
  responseStatus: '',
};

const pageSize = 20;

export function AuditPage() {
  const tenantId = fakeCurrentUser.tenantId ?? null;
  const { clientId } = useClientScope();
  const [activeType, setActiveType] = useState<AuditLogType>('BATCH');
  const [filters, setFilters] = useState<AuditFilters>(initialFilters);
  const [page, setPage] = useState(1);
  const [batchPage, setBatchPage] = useState<PageResponse<BackendBatchAuditLog> | null>(null);
  const [downloadPage, setDownloadPage] = useState<PageResponse<BackendAuditDownloadLog> | null>(null);
  const [apiPage, setApiPage] = useState<PageResponse<BackendApiCallLog> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadSeq, setReloadSeq] = useState(0);

  useEffect(() => {
    void loadAuditLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType, clientId, filters.action, filters.batchId, filters.dateRange, filters.responseStatus, page, reloadSeq, tenantId]);

  const rows = useMemo(() => {
    const mappedRows =
      activeType === 'BATCH'
        ? (batchPage?.items ?? []).map(toBatchAuditLog)
        : activeType === 'DOWNLOAD'
          ? (downloadPage?.items ?? []).map(toDownloadAuditLog)
          : (apiPage?.items ?? []).map(toApiAuditLog);

    return filterAuditLogs(mappedRows, filters);
  }, [activeType, apiPage, batchPage, downloadPage, filters]);

  const total = currentPageData(activeType, batchPage, downloadPage, apiPage)?.totalElements ?? rows.length;
  const totalPages = currentPageData(activeType, batchPage, downloadPage, apiPage)?.totalPages ?? 1;
  const activeFilterCount = countActiveFilters(filters);

  async function loadAuditLogs() {
    setLoading(true);
    setError(null);

    try {
      if (!tenantId) {
        setBatchPage({ items: [], page: page - 1, size: pageSize, totalElements: 0, totalPages: 0 });
        setDownloadPage({ items: [], page: page - 1, size: pageSize, totalElements: 0, totalPages: 0 });
        setApiPage({ items: [], page: page - 1, size: pageSize, totalElements: 0, totalPages: 0 });
        return;
      }
      const commonParams = {
        tenantId,
        clientId,
        page: page - 1,
        size: pageSize,
        ...dateTimeQuery(filters.dateRange),
      };

      if (activeType === 'BATCH') {
        const data = await omsApi.audit.batches({
          ...commonParams,
          batchId: parseNumericFilter(filters.batchId),
          action: textFilter(filters.action),
        });
        setBatchPage(data);
      } else if (activeType === 'DOWNLOAD') {
        const data = await omsApi.audit.downloads({
          ...commonParams,
          batchId: parseNumericFilter(filters.batchId),
          downloadType: textFilter(filters.action),
          downloadedBy: parseNumericFilter(filters.actor),
        });
        setDownloadPage(data);
      } else {
        const data = await omsApi.audit.apiCalls({
          ...commonParams,
          path: textFilter(filters.action),
          responseStatus: parseNumericFilter(filters.responseStatus),
        });
        setApiPage(data);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '이력/로그 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  function updateFilter<TKey extends keyof AuditFilters>(key: TKey, value: AuditFilters[TKey]) {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function resetFilters() {
    setPage(1);
    setFilters(initialFilters);
  }

  function updateActiveType(type: AuditLogType) {
    setPage(1);
    setActiveType(type);
  }

  return (
    <div className="space-y-5">
      <AuditTabs activeType={activeType} onChange={updateActiveType} />

      <FilterBar onReset={resetFilters}>
        <DateRangeQuickFilter label="발생시각" onChange={(value) => updateFilter('dateRange', value)} value={filters.dateRange} />
        <Input label={activeType === 'API' ? 'path' : activeType === 'DOWNLOAD' ? '다운로드 유형' : 'action'} onChange={(event) => updateFilter('action', event.target.value)} placeholder={activeType === 'API' ? '/external/v1' : activeType === 'DOWNLOAD' ? 'LABEL' : 'CONFIRMED'} value={filters.action} />
        {activeType !== 'API' ? (
          <Input label="배치 ID" onChange={(event) => updateFilter('batchId', event.target.value)} placeholder="숫자 ID" value={filters.batchId} />
        ) : null}
        {activeType === 'API' ? (
          <Input label="응답 상태" onChange={(event) => updateFilter('responseStatus', event.target.value)} placeholder="200" value={filters.responseStatus} />
        ) : (
          <Input label={activeType === 'DOWNLOAD' ? '다운로드자 ID' : 'actor ID'} onChange={(event) => updateFilter('actor', event.target.value)} placeholder="1" value={filters.actor} />
        )}
        <Select
          label="현재 탭"
          onChange={(event) => updateActiveType(event.target.value as AuditLogType)}
          options={[
            { label: '배치', value: 'BATCH' },
            { label: '다운로드', value: 'DOWNLOAD' },
            { label: 'API', value: 'API' },
          ]}
          value={activeType}
        />
      </FilterBar>

      <Card className="px-4 py-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {auditTypeLabel(activeType)} 로그 <span className="text-teal-700">{total.toLocaleString()}</span>건
            </p>
            <p className="mt-1 text-xs text-slate-500">requestId, actor, action/path, 상태 전후와 응답 상태를 추적합니다.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeFilterCount > 0 ? <Badge tone="blue">필터 {activeFilterCount}</Badge> : <Badge>전체 조회</Badge>}
            <Button onClick={() => setReloadSeq((current) => current + 1)} size="sm" variant="secondary">
              새로고침
            </Button>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading && !currentPageData(activeType, batchPage, downloadPage, apiPage) ? (
          <div className="p-5">
            <LoadingState label={`${auditTypeLabel(activeType)} 로그를 불러오는 중입니다.`} />
          </div>
        ) : null}
        {error && !loading ? (
          <div className="p-5">
            <ErrorState description={error} onRetry={() => setReloadSeq((current) => current + 1)} title="이력/로그를 조회하지 못했습니다." />
          </div>
        ) : null}
        {!error ? (
          <DataTable
            columns={columns}
            data={rows}
            emptyDescription="기간과 필터 조건을 조정해 주세요."
            emptyTitle={`${auditTypeLabel(activeType)} 로그가 없습니다.`}
            getRowKey={(item) => item.id}
          />
        ) : null}
        <div className="px-5 py-4">
          <Pagination onPageChange={setPage} page={page} total={total} totalPages={Math.max(1, totalPages)} />
        </div>
      </Card>
    </div>
  );
}

const columns: DataTableColumn<AuditLog>[] = [
  { key: 'type', header: '로그 유형', width: '100px', cell: (item) => <Badge tone={item.logType === 'BATCH' ? 'blue' : item.logType === 'DOWNLOAD' ? 'teal' : 'amber'}>{auditTypeLabel(item.logType)}</Badge> },
  { key: 'batch', header: '배치 ID', width: '110px', cell: (item) => item.batchId ? <CodeCell value={item.batchId} /> : '-' },
  { key: 'action', header: 'action/path', width: '240px', cell: (item) => <CodeCell value={item.actionOrPath} /> },
  { key: 'status', header: '상태', width: '160px', cell: (item) => <StatusCell item={item} /> },
  { key: 'actor', header: 'actor/API key', width: '130px', cell: (item) => item.actorName },
  { key: 'requestId', header: 'requestId', width: '180px', cell: (item) => item.requestId ? <CodeCell value={item.requestId} /> : '-' },
  { key: 'occurredAt', header: '발생시각', width: '170px', cell: (item) => formatDateTime(item.occurredAt) },
  { key: 'responseTime', header: '응답시간', align: 'right', width: '100px', cell: (item) => item.responseTimeMs ? `${item.responseTimeMs.toLocaleString()}ms` : '-' },
  { key: 'message', header: '메시지', width: '260px', cell: (item) => item.message },
];

function AuditTabs({ activeType, onChange }: { activeType: AuditLogType; onChange: (type: AuditLogType) => void }) {
  const items: Array<{ label: string; type: AuditLogType; description: string }> = [
    { label: '배치', type: 'BATCH', description: '확정, 취소, 롤백' },
    { label: '다운로드', type: 'DOWNLOAD', description: '라벨 파일 생성' },
    { label: 'API', type: 'API', description: '외부 호출 추적' },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {items.map((item) => (
        <button
          aria-pressed={activeType === item.type}
          className={`rounded-lg border px-4 py-3 text-left transition ${
            activeType === item.type ? 'border-teal-300 bg-teal-50 text-teal-900 shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
          key={item.type}
          onClick={() => onChange(item.type)}
          type="button"
        >
          <span className="text-sm font-bold">{item.label}</span>
          <span className="mt-1 block text-xs text-slate-500">{item.description}</span>
        </button>
      ))}
    </div>
  );
}

function StatusCell({ item }: { item: AuditLog }) {
  if (item.logType === 'API') {
    const status = Number(item.status);
    return <Badge tone={status >= 200 && status < 300 ? 'green' : 'red'}>{item.status}</Badge>;
  }

  return <span className="text-sm text-slate-700">{item.status}</span>;
}

function toBatchAuditLog(row: BackendBatchAuditLog): AuditLog {
  return {
    id: `batch-${row.id}`,
    logType: 'BATCH',
    batchId: row.batchId ? String(row.batchId) : undefined,
    actionOrPath: row.action,
    status: [row.beforeStatus, row.afterStatus].filter(Boolean).join(' -> ') || '-',
    actorName: row.actorId ? `user ${row.actorId}` : '-',
    occurredAt: row.createdAt ?? '',
    requestId: row.requestId ?? undefined,
    message: row.message ?? row.metadataJson ?? '-',
  };
}

function toDownloadAuditLog(row: BackendAuditDownloadLog): AuditLog {
  return {
    id: `download-${row.id}`,
    logType: 'DOWNLOAD',
    batchId: row.batchId ? String(row.batchId) : undefined,
    actionOrPath: row.downloadType,
    status: `${row.rowCount?.toLocaleString() ?? '-'} rows`,
    actorName: row.downloadedBy ? `user ${row.downloadedBy}` : '-',
    occurredAt: row.downloadedAt,
    requestId: row.requestId ?? undefined,
    message: row.fileName,
  };
}

function toApiAuditLog(row: BackendApiCallLog): AuditLog {
  return {
    id: `api-${row.id}`,
    logType: 'API',
    actionOrPath: `${row.method} ${row.path}`,
    status: String(row.responseStatus),
    actorName: row.apiKeyId ? `api key ${row.apiKeyId}` : '-',
    occurredAt: row.createdAt ?? '',
    requestId: row.requestId ?? undefined,
    responseTimeMs: row.responseTimeMs ?? undefined,
    message: [row.queryString, row.clientIp].filter(Boolean).join(' · ') || '-',
  };
}

function filterAuditLogs(rows: AuditLog[], filters: AuditFilters) {
  return rows.filter((row) => (
    isDateInRange(row.occurredAt, filters.dateRange) &&
    includesText(row.batchId ?? '', filters.batchId) &&
    includesText(row.actionOrPath, filters.action) &&
    includesText(row.actorName, filters.actor) &&
    includesText(row.status, filters.responseStatus)
  ));
}

function currentPageData(
  type: AuditLogType,
  batchPage: PageResponse<BackendBatchAuditLog> | null,
  downloadPage: PageResponse<BackendAuditDownloadLog> | null,
  apiPage: PageResponse<BackendApiCallLog> | null,
) {
  if (type === 'BATCH') return batchPage;
  if (type === 'DOWNLOAD') return downloadPage;
  return apiPage;
}

function countActiveFilters(filters: AuditFilters) {
  return [
    filters.action.trim(),
    filters.actor.trim(),
    filters.batchId.trim(),
    filters.dateRange.preset !== 'ALL' ? filters.dateRange.preset : '',
    filters.responseStatus.trim(),
  ].filter(Boolean).length;
}

function dateTimeQuery(range: DateRangeValue) {
  const from = range.from ? `${range.from}T00:00:00` : undefined;
  const to = range.to ? `${range.to}T23:59:59` : undefined;
  return { from, to };
}

function parseNumericFilter(value: string) {
  const trimmed = value.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) {
    return undefined;
  }

  return Number(trimmed);
}

function textFilter(value: string) {
  return value.trim() || undefined;
}

function includesText(value: string, query: string) {
  return value.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
}

function auditTypeLabel(type: AuditLogType) {
  if (type === 'BATCH') return '배치';
  if (type === 'DOWNLOAD') return '다운로드';
  return 'API';
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
