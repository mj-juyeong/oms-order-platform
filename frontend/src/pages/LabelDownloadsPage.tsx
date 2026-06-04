import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fakeCurrentUser } from '../app/auth';
import { useClientScope } from '../app/clientContext';
import { omsApi, type BackendBatchSummary } from '../api/oms';
import {
  Badge,
  Button,
  Card,
  DateRangeQuickFilter,
  ErrorState,
  Input,
  LoadingState,
  Modal,
  Select,
} from '../components/common';
import { DataTable, Pagination, type DataTableColumn } from '../components/data';
import { BatchStatusBadge, CodeCell } from '../components/domain';
import type { BatchStatus } from '../types/batch';
import type { LabelDownloadRow } from '../types/label';
import { isDateInRange, type DateRangeValue } from '../utils/dateRange';
import { areFilterStatesEqual } from '../utils/filterState';

type LabelTypeFilter = 'ALL' | 'EA' | 'BOX';
type DownloadableFilter = 'ALL' | 'YES' | 'NO';

interface LabelDownloadFilters {
  batchId: string;
  deliveryDateRange: DateRangeValue;
  labelType: LabelTypeFilter;
  storeCode: string;
  vehicleName: string;
  deliveryRound: string;
  downloadable: DownloadableFilter;
}

interface DownloadResult {
  fileName: string;
  rowCount: number;
  batchId: string;
  labelType: LabelTypeFilter;
}

interface DownloadLogItem {
  id: number;
  batchId?: number | null;
  downloadType: string;
  fileName: string;
  rowCount?: number | null;
  downloadedBy?: number | null;
  downloadedAt: string;
}

interface LabelLineCountResponse {
  totalElements: number;
  items: Array<{ storeCode?: string | null }>;
}

const initialFilters: LabelDownloadFilters = {
  batchId: '',
  deliveryDateRange: { preset: 'ALL', from: '', to: '' },
  labelType: 'ALL',
  storeCode: '',
  vehicleName: '',
  deliveryRound: '',
  downloadable: 'ALL',
};

export function LabelDownloadsPage() {
  const tenantId = fakeCurrentUser.tenantId ?? null;
  const { clientId } = useClientScope();
  const [filters, setFilters] = useState<LabelDownloadFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<LabelDownloadFilters>(initialFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [rows, setRows] = useState<LabelDownloadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingBatchId, setDownloadingBatchId] = useState<string | null>(null);
  const [downloadResult, setDownloadResult] = useState<DownloadResult | null>(null);

  const activeFilterCount = useMemo(() => countActiveFilters(appliedFilters), [appliedFilters]);
  const hasPendingFilters = useMemo(() => !areFilterStatesEqual(filters, appliedFilters), [appliedFilters, filters]);
  const filteredRows = useMemo(() => filterRows(rows, appliedFilters), [appliedFilters, rows]);
  const summary = useMemo(() => createSummary(rows), [rows]);
  const recentDownloads = useMemo(() => rows.filter((item) => item.lastDownloadedAt).slice(0, 6), [rows]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!tenantId) {
        setRows([]);
        return;
      }
      const [batchPage, downloadLogPage] = await Promise.all([
        omsApi.batches.list({ tenantId, clientId, page: 0, size: 100 }),
        omsApi.audit.downloads({ tenantId, clientId, downloadType: 'LABEL', page: 0, size: 100 }).catch(() => ({
          items: [],
          page: 0,
          size: 100,
          totalElements: 0,
          totalPages: 0,
        })),
      ]);

      const logs = downloadLogPage.items as DownloadLogItem[];
      const nextRows = await Promise.all(batchPage.items.map((batch) => toLabelDownloadRow(batch, logs, tenantId, clientId)));
      setRows(nextRows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '라벨 다운로드 대상을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [clientId, tenantId]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  function updateFilter<TKey extends keyof LabelDownloadFilters>(key: TKey, value: LabelDownloadFilters[TKey]) {
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

  async function handleDownload(row: LabelDownloadRow) {
    if (!row.downloadable || !row.batchNumericId) {
      return;
    }

    setDownloadingBatchId(row.id);
    setError(null);
    try {
      if (!tenantId) {
        setError('물류사 계정 정보가 없습니다. 다시 로그인해 주세요.');
        return;
      }
      const labelType = appliedFilters.labelType === 'ALL' ? undefined : appliedFilters.labelType;
      const downloaded = await omsApi.downloads.labels({
        tenantId,
        clientId,
        batchId: row.batchNumericId,
        labelType,
        storeCode: appliedFilters.storeCode.trim() || undefined,
        vehicleName: appliedFilters.vehicleName.trim() || undefined,
        deliveryRound: appliedFilters.deliveryRound.trim() || undefined,
        downloadedBy: fakeCurrentUser.id ?? undefined,
      });

      const fileName = downloaded.fileName ?? defaultFileName(row.batchNumericId, appliedFilters.labelType);
      saveBlob(downloaded.blob, fileName);
      setDownloadResult({
        batchId: row.batchId,
        fileName,
        labelType: appliedFilters.labelType,
        rowCount: appliedFilters.labelType === 'EA' ? row.labelEaCount : appliedFilters.labelType === 'BOX' ? row.labelBoxCount : row.labelEaCount + row.labelBoxCount,
      });
      await loadRows();
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : '라벨 파일 다운로드에 실패했습니다.');
    } finally {
      setDownloadingBatchId(null);
    }
  }

  if (loading) {
    return <LoadingState label="라벨 다운로드 대상을 불러오는 중입니다." />;
  }

  return (
    <div className="space-y-5">
      {error ? <ErrorState description={error} onRetry={loadRows} title="라벨 다운로드를 처리할 수 없습니다." /> : null}

      <section className="grid gap-4 lg:grid-cols-4">
        <MetricCard description="CONFIRMED 상태이며 Label 데이터가 있는 배치" title="다운로드 가능" tone="green" value={`${summary.downloadable.toLocaleString()}건`} />
        <MetricCard description="미확정 또는 Label 데이터 없음" title="제외 대상" tone="amber" value={`${summary.blocked.toLocaleString()}건`} />
        <MetricCard description="조회된 배치의 EA 라벨 건수" title="Label EA" tone="blue" value={`${summary.labelEaCount.toLocaleString()}건`} />
        <MetricCard description="조회된 배치의 BOX 라벨 건수" title="Label BOX" tone="teal" value={`${summary.labelBoxCount.toLocaleString()}건`} />
      </section>

      <LabelDownloadFilterPanel
        activeFilterCount={activeFilterCount}
        filters={filters}
        hasPendingFilters={hasPendingFilters}
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
              <p className="text-base font-bold text-slate-950">라벨 다운로드 대상 배치</p>
              <Badge tone="teal">EA / BOX</Badge>
              <Badge tone="green">CONFIRMED만 가능</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              총 <span className="font-semibold text-teal-700">{filteredRows.length.toLocaleString()}</span>건입니다. 필터는 다운로드 요청에도 함께 적용됩니다.
            </p>
          </div>
          <Button onClick={loadRows} size="sm" variant="secondary">
            새로고침
          </Button>
        </div>
        <DataTable
          columns={createColumns(handleDownload, downloadingBatchId)}
          data={filteredRows}
          emptyDescription="배치, 배송일, Label 유형, 다운로드 가능 여부 조건을 다시 확인해 주세요."
          emptyTitle="표시할 라벨 다운로드 대상이 없습니다."
          getRowClassName={(item) => (item.downloadable ? '' : 'bg-slate-50/80')}
          getRowKey={(item) => item.id}
          onRowClick={handleDownload}
          renderMobileCard={(item) => renderLabelDownloadCard(item, handleDownload, downloadingBatchId)}
        />
        <div className="flex flex-col gap-2 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-xs text-slate-500">다운로드가 성공하면 다운로드 로그가 저장됩니다.</p>
          <Pagination page={1} total={filteredRows.length} totalPages={1} />
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950">최근 다운로드 로그</h2>
            <p className="text-sm text-slate-500">이 화면에서는 최근 파일 단위 로그를 요약하고, 전체 로그는 이력/로그 화면에서 확인합니다.</p>
          </div>
          <Link className="text-sm font-semibold text-teal-700 hover:text-teal-800" to="/audit">
            전체 로그 보기
          </Link>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {recentDownloads.length > 0 ? (
            recentDownloads.map((item) => (
              <div className="rounded-md border border-slate-200 bg-white px-4 py-3" key={item.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CodeCell value={item.batchId} />
                  <Badge tone="green">SUCCESS</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {item.lastDownloadedAt} · {item.downloadedBy ?? '-'} · EA {item.labelEaCount.toLocaleString()} / BOX {item.labelBoxCount.toLocaleString()}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">아직 라벨 다운로드 로그가 없습니다.</p>
          )}
        </div>
      </Card>

      <DownloadResultModal result={downloadResult} onClose={() => setDownloadResult(null)} />
    </div>
  );
}

async function toLabelDownloadRow(batch: BackendBatchSummary, logs: DownloadLogItem[], tenantId: number, selectedClientId?: number): Promise<LabelDownloadRow> {
  const [eaCount, boxCount, stores] = await Promise.all([
    fetchLabelCount(tenantId, batch.id, 'EA', selectedClientId),
    fetchLabelCount(tenantId, batch.id, 'BOX', selectedClientId),
    fetchLabelStores(tenantId, batch.id, selectedClientId),
  ]);
  const latestLog = logs
    .filter((log) => log.batchId === batch.id)
    .sort((a, b) => b.downloadedAt.localeCompare(a.downloadedAt))[0];
  const labelCount = eaCount + boxCount;
  const downloadable = batch.status === 'CONFIRMED' && labelCount > 0;

  return {
    id: String(batch.id),
    batchId: batch.batchNo || String(batch.id),
    batchNumericId: batch.id,
    clientName: `client ${batch.clientId}`,
    deliveryDate: batch.deliveryDate ?? '-',
    status: batch.status as BatchStatus,
    storeCode: Array.from(stores)[0] ?? '',
    labelEaCount: eaCount,
    labelBoxCount: boxCount,
    storeCount: stores.size,
    vehicleName: '-',
    deliveryRound: '-',
    downloadable,
    unavailableReason: downloadable ? undefined : batch.status !== 'CONFIRMED' ? '확정 완료된 배치만 다운로드할 수 있습니다.' : 'Label 데이터가 없습니다.',
    lastDownloadedAt: latestLog?.downloadedAt,
    downloadedBy: latestLog?.downloadedBy ? String(latestLog.downloadedBy) : undefined,
  };
}

async function fetchLabelCount(tenantId: number, batchId: number, labelType: 'EA' | 'BOX', clientId?: number) {
  const result = await omsApi.labelLines.list({ tenantId, clientId, batchId, labelType, page: 0, size: 1 }) as LabelLineCountResponse;
  return result.totalElements;
}

async function fetchLabelStores(tenantId: number, batchId: number, clientId?: number) {
  const result = await omsApi.labelLines.list({ tenantId, clientId, batchId, page: 0, size: 500 }) as LabelLineCountResponse;
  return new Set(result.items.map((item) => item.storeCode).filter((value): value is string => Boolean(value)));
}

function LabelDownloadFilterPanel({
  activeFilterCount,
  filters,
  hasPendingFilters,
  onApply,
  onReset,
  onToggleOpen,
  open,
  updateFilter,
}: {
  activeFilterCount: number;
  filters: LabelDownloadFilters;
  hasPendingFilters: boolean;
  onApply: () => void;
  onReset: () => void;
  onToggleOpen: () => void;
  open: boolean;
  updateFilter: <TKey extends keyof LabelDownloadFilters>(key: TKey, value: LabelDownloadFilters[TKey]) => void;
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
          </div>
          <p className="mt-1 text-xs text-slate-500">배치, 배송일, Label 유형, 거래처코드, 차량명, 차수 조건으로 다운로드 대상을 찾습니다.</p>
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
          <div className="grid gap-3 lg:grid-cols-4">
            <Input label="배치" onChange={(event) => updateFilter('batchId', event.target.value)} placeholder="BATCH-" value={filters.batchId} />
            <DateRangeQuickFilter
              includeTomorrow
              label="배송일"
              onChange={(value) => updateFilter('deliveryDateRange', value)}
              value={filters.deliveryDateRange}
            />
            <Select
              label="Label 유형"
              onChange={(event) => updateFilter('labelType', event.target.value as LabelTypeFilter)}
              options={[
                { label: '전체', value: 'ALL' },
                { label: 'EA', value: 'EA' },
                { label: 'BOX', value: 'BOX' },
              ]}
              value={filters.labelType}
            />
            <Select
              label="다운로드 가능"
              onChange={(event) => updateFilter('downloadable', event.target.value as DownloadableFilter)}
              options={[
                { label: '전체', value: 'ALL' },
                { label: '가능', value: 'YES' },
                { label: '불가', value: 'NO' },
              ]}
              value={filters.downloadable}
            />
            <Input label="거래처코드" onChange={(event) => updateFilter('storeCode', event.target.value)} placeholder="S001" value={filters.storeCode} />
            <Input label="차량명" onChange={(event) => updateFilter('vehicleName', event.target.value)} placeholder="차량1" value={filters.vehicleName} />
            <Input label="차수" onChange={(event) => updateFilter('deliveryRound', event.target.value)} placeholder="1" value={filters.deliveryRound} />
          </div>
          <div className="mt-4 flex justify-end">
            <Button disabled={!hasPendingFilters} onClick={onApply} size="sm" variant="primary">
              검색
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function createColumns(onDownload: (row: LabelDownloadRow) => void, downloadingBatchId: string | null): DataTableColumn<LabelDownloadRow>[] {
  return [
    { key: 'batch', header: '배치번호', width: '190px', cell: (item) => <CodeCell value={item.batchId} /> },
    { key: 'client', header: '고객사', width: '110px', cell: (item) => item.clientName },
    { key: 'deliveryDate', header: '배송일', width: '120px', cell: (item) => item.deliveryDate },
    { key: 'status', header: '상태', width: '150px', cell: (item) => <BatchStatusBadge status={item.status} /> },
    { key: 'ea', header: 'Label EA', align: 'right', width: '100px', cell: (item) => item.labelEaCount.toLocaleString() },
    { key: 'box', header: 'Label BOX', align: 'right', width: '100px', cell: (item) => item.labelBoxCount.toLocaleString() },
    { key: 'storeCount', header: '배송지', align: 'right', width: '90px', cell: (item) => item.storeCount.toLocaleString() },
    { key: 'downloadable', header: '다운로드 가능', width: '180px', cell: (item) => <DownloadableCell row={item} /> },
    { key: 'last', header: '최근 다운로드', width: '170px', cell: (item) => item.lastDownloadedAt ?? '-' },
    { key: 'by', header: '다운로드자', width: '110px', cell: (item) => item.downloadedBy ?? '-' },
    {
      key: 'action',
      sticky: 'right',
      header: '액션',
      width: '130px',
      cell: (item) => (
        <Button disabled={!item.downloadable || downloadingBatchId === item.id} onClick={() => onDownload(item)} size="sm" variant={item.downloadable ? 'primary' : 'secondary'}>
          {downloadingBatchId === item.id ? '처리 중' : '다운로드'}
        </Button>
      ),
    },
  ];
}

function renderLabelDownloadCard(
  row: LabelDownloadRow,
  onDownload: (row: LabelDownloadRow) => void,
  downloadingBatchId: string | null,
) {
  return (
    <div className="space-y-3">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <CodeCell value={row.batchId} />
          <p className="mt-2 truncate text-sm font-semibold text-slate-950" title={row.clientName}>{row.clientName}</p>
          <p className="mt-1 text-xs text-slate-500">{row.deliveryDate}</p>
        </div>
        <BatchStatusBadge status={row.status} />
      </div>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <CompactValue label="EA" value={row.labelEaCount.toLocaleString()} />
        <CompactValue label="BOX" value={row.labelBoxCount.toLocaleString()} />
        <CompactValue label="Stores" value={row.storeCount.toLocaleString()} />
      </div>
      <div className="flex items-center justify-between gap-3">
        <DownloadableCell row={row} />
        <Button
          disabled={!row.downloadable || downloadingBatchId === row.id}
          onClick={() => onDownload(row)}
          size="sm"
          variant={row.downloadable ? 'primary' : 'secondary'}
        >
          {downloadingBatchId === row.id ? '처리 중' : '다운로드'}
        </Button>
      </div>
    </div>
  );
}

function CompactValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-slate-50 px-2 py-2">
      <p className="truncate text-[11px] font-semibold text-slate-500">{label}</p>
      <p className="mt-1 truncate font-mono text-sm font-bold text-slate-950">{value}</p>
    </div>
  );
}

function DownloadableCell({ row }: { row: LabelDownloadRow }) {
  if (row.downloadable) {
    return <Badge tone="green">가능</Badge>;
  }

  return (
    <div className="space-y-1">
      <Badge tone="amber">불가</Badge>
      <p className="text-xs text-slate-500">{row.unavailableReason ?? '확정 완료 후 가능합니다.'}</p>
    </div>
  );
}

function DownloadResultModal({ onClose, result }: { onClose: () => void; result: DownloadResult | null }) {
  if (!result) {
    return null;
  }

  return (
    <Modal open title="라벨 다운로드 완료" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-md border border-teal-200 bg-teal-50 px-4 py-3">
          <p className="text-sm font-semibold text-teal-800">라벨 파일 다운로드 요청이 처리되었습니다.</p>
          <p className="mt-1 text-xs text-teal-700">브라우저 다운로드 목록에서 생성된 XLSX 파일을 확인할 수 있습니다.</p>
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <DetailItem label="배치번호" value={result.batchId} />
          <DetailItem label="파일명" value={result.fileName} />
          <DetailItem label="Label 유형" value={result.labelType === 'ALL' ? 'EA + BOX' : result.labelType} />
          <DetailItem label="예상 행 수" value={`${result.rowCount.toLocaleString()}건`} />
        </dl>
        <div className="flex justify-end">
          <Button onClick={onClose} variant="primary">
            확인
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1 break-all font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function MetricCard({ description, title, tone, value }: { description: string; title: string; tone: 'amber' | 'blue' | 'green' | 'teal'; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-600">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
        </div>
        <Badge tone={tone}>{title}</Badge>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{description}</p>
    </Card>
  );
}

function filterRows(rows: LabelDownloadRow[], filters: LabelDownloadFilters) {
  return rows.filter((row) => {
    const matchesBatchId = row.batchId.toLowerCase().includes(filters.batchId.trim().toLowerCase());
    const matchesDeliveryDate = isDateInRange(row.deliveryDate, filters.deliveryDateRange);
    const matchesLabelType =
      filters.labelType === 'ALL' ||
      (filters.labelType === 'EA' && row.labelEaCount > 0) ||
      (filters.labelType === 'BOX' && row.labelBoxCount > 0);
    const matchesStoreCode = !filters.storeCode.trim() || row.storeCode.toLowerCase().includes(filters.storeCode.trim().toLowerCase());
    const matchesDownloadable =
      filters.downloadable === 'ALL' ||
      (filters.downloadable === 'YES' && row.downloadable) ||
      (filters.downloadable === 'NO' && !row.downloadable);

    return matchesBatchId && matchesDeliveryDate && matchesLabelType && matchesStoreCode && matchesDownloadable;
  });
}

function createSummary(rows: LabelDownloadRow[]) {
  return rows.reduce(
    (summary, row) => ({
      downloadable: summary.downloadable + (row.downloadable ? 1 : 0),
      blocked: summary.blocked + (row.downloadable ? 0 : 1),
      labelEaCount: summary.labelEaCount + row.labelEaCount,
      labelBoxCount: summary.labelBoxCount + row.labelBoxCount,
    }),
    { blocked: 0, downloadable: 0, labelBoxCount: 0, labelEaCount: 0 },
  );
}

function countActiveFilters(filters: LabelDownloadFilters) {
  return [
    filters.batchId.trim(),
    filters.deliveryDateRange.preset !== 'ALL' ? filters.deliveryDateRange.preset : '',
    filters.labelType !== 'ALL' ? filters.labelType : '',
    filters.storeCode.trim(),
    filters.vehicleName.trim(),
    filters.deliveryRound.trim(),
    filters.downloadable !== 'ALL' ? filters.downloadable : '',
  ].filter(Boolean).length;
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function defaultFileName(batchId: number, labelType: LabelTypeFilter) {
  const suffix = labelType === 'ALL' ? 'ALL' : labelType;
  return `labels_batch_${batchId}_${suffix}.xlsx`;
}
