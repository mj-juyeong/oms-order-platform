import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { omsApi, type BackendBatchSummary, type BackendScanLine } from '../api/oms';
import { readBatchContextSelection, resetBatchContextSelection, saveAllBatchContextSelection, saveBatchIdContextSelection, useBatchContextSelection } from '../app/batchContext';
import { resetClientContextSelection } from '../app/clientContext';
import { useQueryScope } from '../hooks/useQueryScope';
import {
  Badge,
  Button,
  Card,
  DateRangeQuickFilter,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  ModalFrame,
} from '../components/common';
import { DataTable, Pagination, SortMenu, type DataTableColumn, type DataTableSort } from '../components/data';
import { BatchSelectionPanel, ClientSelectionPanel, CodeCell, SelectedBatchScopeBar } from '../components/domain';
import { usePageBackButton } from '../components/layout';
import type { PageResponse } from '../types/api';
import type { ScanLine } from '../types/scan';
import { todayString, type DateRangeValue } from '../utils/dateRange';
import { areFilterStatesEqual } from '../utils/filterState';

interface ScanFilters {
  barcode: string;
  batchId: string;
  deliveryDateRange: DateRangeValue;
  productCode: string;
  productName: string;
  scanCenter: string;
  storeCode: string;
  storeName: string;
}

const initialFilters: ScanFilters = {
  barcode: '',
  batchId: '',
  deliveryDateRange: { preset: 'CUSTOM', from: todayString(), to: '' },
  productCode: '',
  productName: '',
  scanCenter: '',
  storeCode: '',
  storeName: '',
};

const pageSize = 20;
const initialSort: DataTableSort = { field: 'barcode', direction: 'asc' };
const scanSortOptions = [
  { label: '바코드', value: 'barcode' },
  { label: 'Scan 센터', value: 'scanCenter' },
  { label: '배송일', value: 'deliveryDate' },
  { label: '거래처코드', value: 'storeCode' },
  { label: '거래처명', value: 'storeName' },
  { label: '품목코드', value: 'productCode' },
  { label: '품목명', value: 'productName' },
  { label: '라벨수량', value: 'labelQty' },
  { label: '단위', value: 'unit' },
  { label: '버스', value: 'bus' },
];

export function ScanLinesPage() {
  const queryScope = useQueryScope();
  const [filters, setFilters] = useState<ScanFilters>(() => scanFiltersForScope(queryScope.tenantId, queryScope.clientId));
  const [appliedFilters, setAppliedFilters] = useState<ScanFilters>(() => scanFiltersForScope(queryScope.tenantId, queryScope.clientId));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState<ScanLine | null>(null);
  const [page, setPage] = useState(1);
  const [pageData, setPageData] = useState<PageResponse<BackendScanLine> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadSeq, setReloadSeq] = useState(0);
  const [sort, setSort] = useState<DataTableSort>(initialSort);
  const previousClientIdRef = useRef<number | undefined>(undefined);

  const lines = useMemo(() => (pageData?.items ?? []).map(toScanLine), [pageData]);
  const summary = useMemo(() => createScanSummary(lines, pageData?.totalElements ?? 0), [lines, pageData]);
  const activeFilterCount = useMemo(() => countActiveFilters(appliedFilters), [appliedFilters]);
  const hasPendingFilters = useMemo(() => !areFilterStatesEqual(filters, appliedFilters), [appliedFilters, filters]);
  const appliedBatchId = parseNumericFilter(appliedFilters.batchId);
  const storedBatchSelection = useBatchContextSelection(queryScope.tenantId, queryScope.clientId);
  const allBatchesSelected = storedBatchSelection?.mode === 'all' && !appliedBatchId;
  const needsBatchSelection = queryScope.canQuery && Boolean(queryScope.clientId) && !appliedBatchId && !allBatchesSelected;
  const selectedBatchSelection = storedBatchSelection?.mode === 'batch' && storedBatchSelection.batchId === appliedBatchId ? storedBatchSelection : null;

  useEffect(() => {
    const previousClientId = previousClientIdRef.current;
    if (previousClientId !== undefined && previousClientId !== queryScope.clientId) {
      const nextFilters = scanFiltersForScope(queryScope.tenantId, queryScope.clientId);
      setPage(1);
      setFilters(nextFilters);
      setAppliedFilters(nextFilters);
      setPageData(null);
    }
    previousClientIdRef.current = queryScope.clientId;
  }, [queryScope.clientId, queryScope.tenantId]);

  useEffect(() => {
    const batchId = parseNumericFilter(appliedFilters.batchId);
    if (queryScope.canQuery && queryScope.tenantId && queryScope.clientId && batchId) {
      saveBatchIdContextSelection({
        tenantId: queryScope.tenantId,
        clientId: queryScope.clientId,
        batchId,
      });
    }
  }, [appliedFilters.batchId, queryScope.canQuery, queryScope.clientId, queryScope.tenantId]);

  useEffect(() => {
    void loadScanLines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters.batchId, appliedFilters.barcode, appliedFilters.deliveryDateRange, appliedFilters.productCode, appliedFilters.scanCenter, appliedFilters.storeCode, needsBatchSelection, page, queryScope.canQuery, queryScope.clientId, queryScope.tenantId, reloadSeq, sort]);

  useEffect(() => {
    if (selectedLine && !lines.some((line) => line.id === selectedLine.id)) {
      setSelectedLine(null);
    }
  }, [lines, selectedLine]);

  async function loadScanLines() {
    setLoading(true);
    setError(null);

    try {
      if (!queryScope.canQuery || needsBatchSelection) {
        setPageData({ items: [], page: page - 1, size: pageSize, totalElements: 0, totalPages: 0 });
        return;
      }
      const data = await omsApi.scanLines.list({
        tenantId: requireTenantId(queryScope.tenantId),
        clientId: queryScope.clientId,
        page: page - 1,
        size: pageSize,
        sortBy: sort.field,
        sortDirection: sort.direction,
        batchId: parseNumericFilter(appliedFilters.batchId),
        deliveryDateFrom: appliedFilters.deliveryDateRange.from || undefined,
        deliveryDateTo: appliedFilters.deliveryDateRange.to || undefined,
        scanCenter: textFilter(appliedFilters.scanCenter),
        storeCode: textFilter(appliedFilters.storeCode),
        productCode: textFilter(appliedFilters.productCode),
        barcode: textFilter(appliedFilters.barcode),
      });
      setPageData(data);
    } catch (loadError) {
      setPageData(null);
      setError(loadError instanceof Error ? loadError.message : 'Scan 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  function updateFilter<TKey extends keyof ScanFilters>(key: TKey, value: ScanFilters[TKey]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function applyFilters() {
    setPage(1);
    setAppliedFilters(filters);
    setFiltersOpen(false);
  }

  function applySort(nextSort: DataTableSort) {
    setPage(1);
    setSort(nextSort);
  }

  function resetFilters() {
    const nextFilters = scanFiltersForScope(queryScope.tenantId, queryScope.clientId);
    setPage(1);
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
  }

  function selectBatch(batch: BackendBatchSummary) {
    const nextFilters: ScanFilters = { ...filters, batchId: String(batch.id), deliveryDateRange: { preset: 'ALL', from: '', to: '' } };
    setPage(1);
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
  }

  function chooseDifferentBatch() {
    if (!queryScope.clientId) {
      chooseDifferentClient();
      return;
    }
    resetBatchContextSelection(queryScope.tenantId, queryScope.clientId);
    const nextFilters: ScanFilters = { ...filters, batchId: '' };
    setPage(1);
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setPageData(null);
  }

  function chooseDifferentClient() {
    resetBatchContextSelection(queryScope.tenantId, queryScope.clientId);
    resetClientContextSelection();
    const nextFilters = scanFiltersForScope(queryScope.tenantId, undefined);
    setPage(1);
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setPageData(null);
  }

  function selectAllBatches() {
    if (!queryScope.tenantId || !queryScope.clientId) return;
    saveAllBatchContextSelection({ tenantId: queryScope.tenantId, clientId: queryScope.clientId });
    const nextFilters: ScanFilters = { ...filters, batchId: '', deliveryDateRange: { preset: 'ALL', from: '', to: '' } };
    setPage(1);
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setPageData(null);
  }

  const batchStepBackOverride = useMemo(() => {
    const hasBatchResultStep =
      Boolean(queryScope.clientId) &&
      !queryScope.needsClientSelection &&
      !queryScope.blockedReason &&
      !needsBatchSelection &&
      (Boolean(appliedBatchId) || allBatchesSelected);

    return hasBatchResultStep ? { label: '배치 선택으로 돌아가기', onBack: chooseDifferentBatch } : null;
  }, [
    allBatchesSelected,
    appliedBatchId,
    filters,
    needsBatchSelection,
    queryScope.blockedReason,
    queryScope.clientId,
    queryScope.needsClientSelection,
    queryScope.tenantId,
  ]);

  usePageBackButton(batchStepBackOverride);

  if (queryScope.needsClientSelection && queryScope.tenantId) {
    return <ClientSelectionPanel tenantId={queryScope.tenantId} />;
  }

  if (queryScope.blockedReason || !queryScope.tenantId) {
    return (
      <EmptyState
        description={queryScope.blockedReason ?? '조회에 필요한 물류사 정보를 확인할 수 없습니다.'}
        title="조회 범위를 확인해야 합니다."
      />
    );
  }

  if (needsBatchSelection && queryScope.clientId) {
    return (
      <BatchSelectionPanel
        clientId={queryScope.clientId}
        clientName={queryScope.clientName}
        description="선택한 배치 기준으로 Scan 데이터를 조회합니다."
        onChooseClient={!queryScope.isClientLocked ? chooseDifferentClient : undefined}
        onSelectAllBatches={selectAllBatches}
        onSelectBatch={selectBatch}
        tenantId={queryScope.tenantId}
        title="Scan 데이터를 조회할 배치를 선택하세요"
      />
    );
  }

  return (
    <div className="space-y-5">
      <ScanSummaryCards summary={summary} />

      <SelectedBatchScopeBar
        batchId={appliedFilters.batchId}
        batchNo={selectedBatchSelection?.batchNo}
        clientName={queryScope.clientName}
        deliveryDate={selectedBatchSelection?.deliveryDate}
        onChooseBatch={chooseDifferentBatch}
        onChooseClient={!queryScope.isClientLocked ? chooseDifferentClient : undefined}
      />

      <ScanFilterPanel
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
              <p className="text-base font-bold text-slate-950">Scan 데이터</p>
              <Badge tone="teal">센터별 조회</Badge>
              <Badge tone="blue">바코드</Badge>
            </div>
            <p className="mt-1 hidden text-sm text-slate-500 sm:block">
              총 <span className="font-semibold text-teal-700">{(pageData?.totalElements ?? 0).toLocaleString()}</span>건이 검색되었습니다.
              행을 선택하면 바코드, 상품, 배송지 정보를 큰 화면에서 확인합니다.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <SortMenu onChange={applySort} options={scanSortOptions} sort={sort} />
            <Button onClick={() => setReloadSeq((current) => current + 1)} size="sm" variant="secondary">
              새로고침
            </Button>
          </div>
        </div>
        {loading && !pageData ? (
          <div className="p-5">
            <LoadingState label="Scan 조회 API에서 데이터를 불러오는 중입니다." />
          </div>
        ) : null}
        {error && !loading ? (
          <div className="p-5">
            <ErrorState description={error} onRetry={() => setReloadSeq((current) => current + 1)} title="Scan 데이터를 조회하지 못했습니다." />
          </div>
        ) : null}
        {!error ? (
          <DataTable
            columns={createColumns()}
            data={lines}
            emptyDescription="배송일, Scan 센터, 거래처, 상품, 바코드 조건을 조정해 주세요."
            emptyTitle="조건에 맞는 Scan 데이터가 없습니다."
            getRowClassName={(item) => (item.id === selectedLine?.id ? 'bg-teal-50/80' : '')}
            getRowKey={(item) => item.id}
            onRowClick={setSelectedLine}
            onSortChange={applySort}
            renderMobileCard={renderScanMobileCard}
            sort={sort}
          />
        ) : null}
        <div className="px-5 py-4">
          <Pagination
            onPageChange={setPage}
            page={page}
            total={pageData?.totalElements ?? lines.length}
            totalPages={Math.max(1, pageData?.totalPages ?? 1)}
          />
        </div>
      </Card>

      <ScanDetailModal line={selectedLine} onClose={() => setSelectedLine(null)} />
    </div>
  );
}

function ScanSummaryCards({ summary }: { summary: ReturnType<typeof createScanSummary> }) {
  const cards = [
    { label: 'Scan 행', value: summary.total, description: '전체 스캔 건수' },
    { label: 'Scan 센터', value: summary.centers, description: '센터 수' },
    { label: '거래처', value: summary.stores, description: '주문사업장 기준' },
    { label: '라벨 수량', value: summary.labelQty, description: 'Scan 라벨수량 합계' },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 md:gap-3">
      {cards.map((card) => (
        <Card className="min-w-0 px-2 py-3 md:p-4" key={card.label}>
          <div className="min-w-0">
            <div>
              <p className="truncate text-xs font-semibold text-slate-600 md:text-sm">{card.label}</p>
              <p className="mt-1 truncate text-xl font-bold text-slate-950 md:mt-2 md:text-2xl">{card.value.toLocaleString()}</p>
            </div>
          </div>
          <p className="mt-1 hidden text-xs leading-5 text-slate-500 md:block">{card.description}</p>
        </Card>
      ))}
    </div>
  );
}

function ScanFilterPanel({
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
  filters: ScanFilters;
  hasPendingFilters: boolean;
  onApply: () => void;
  onReset: () => void;
  onToggleOpen: () => void;
  open: boolean;
  updateFilter: <TKey extends keyof ScanFilters>(key: TKey, value: ScanFilters[TKey]) => void;
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
          <p className="mt-1 hidden text-xs text-slate-500 sm:block">Scan 센터, 배송일, 바코드, 거래처와 상품을 조합해 데이터를 찾습니다.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
          <Button disabled={!hasPendingFilters} onClick={onApply} size="sm" variant="primary">검색</Button>
          <Button disabled={activeFilterCount === 0 && !hasPendingFilters} onClick={onReset} size="sm" variant="ghost">초기화</Button>
          <Button aria-expanded={open} onClick={onToggleOpen} size="sm" variant="secondary">{open ? '필터 접기' : '상세 필터'}</Button>
        </div>
      </div>

      {open ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="grid gap-3 lg:grid-cols-4">
            <DateRangeQuickFilter
              includeTomorrow
              label="배송일"
              onChange={(value) => updateFilter('deliveryDateRange', value)}
              value={filters.deliveryDateRange}
            />
            <Input label="Scan 센터" onChange={(event) => updateFilter('scanCenter', event.target.value)} placeholder="장지" value={filters.scanCenter} />
            <Input label="바코드" onChange={(event) => updateFilter('barcode', event.target.value)} placeholder="880..." value={filters.barcode} />
            <Input label="거래처코드" onChange={(event) => updateFilter('storeCode', event.target.value)} placeholder="S001" value={filters.storeCode} />
            <Input label="거래처명" onChange={(event) => updateFilter('storeName', event.target.value)} placeholder="강남점" value={filters.storeName} />
            <Input label="품목코드" onChange={(event) => updateFilter('productCode', event.target.value)} placeholder="P000001" value={filters.productCode} />
            <Input label="상품명" onChange={(event) => updateFilter('productName', event.target.value)} placeholder="상품명" value={filters.productName} />
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

function createColumns(): DataTableColumn<ScanLine>[] {
  return [
    { key: 'barcode', header: '바코드', sortKey: 'barcode', width: '190px', cell: (item) => <CodeCell value={item.barcode} /> },
    { key: 'source', header: '파일 위치', sortKey: 'rowNo', width: '170px', cell: (item) => <SourceCell sheetName={item.sheetName} rowNo={item.rowNo} /> },
    { key: 'center', header: 'Scan 센터', sortKey: 'scanCenter', width: '110px', cell: (item) => <Badge tone="teal">{item.scanCenter}</Badge> },
    { key: 'deliveryDate', header: '배송일', sortKey: 'deliveryDate', width: '120px', cell: (item) => item.deliveryDate },
    { key: 'store', header: '거래처', sortKey: 'storeName', width: '190px', cell: (item) => <NameCode name={item.storeName} code={item.orderBusinessSiteCode} /> },
    { key: 'product', header: '상품', sortKey: 'productName', width: '220px', cell: (item) => <NameCode name={item.productName} code={item.productCode} /> },
    { key: 'labelQty', header: '라벨수량', sortKey: 'labelQty', align: 'right', width: '90px', cell: (item) => item.labelQty.toLocaleString() },
    { key: 'unit', header: '단위', sortKey: 'unit', width: '80px', cell: (item) => <Badge tone={item.unit === 'BOX' ? 'teal' : 'blue'}>{item.unit}</Badge> },
    { key: 'temperature', header: '온도', width: '90px', cell: (item) => item.temperatureType },
    { key: 'bus', header: '버스', sortKey: 'bus', width: '90px', cell: (item) => item.bus },
  ];
}

function ScanDetailModal({ line, onClose }: { line: ScanLine | null; onClose: () => void }) {
  if (!line) {
    return null;
  }

  return (
    <ModalFrame onClose={onClose} panelClassName="flex max-h-[92dvh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-bold text-slate-950">Scan 상세</p>
              <Badge tone="teal">{line.scanCenter}</Badge>
              <Badge tone={line.unit === 'BOX' ? 'teal' : 'blue'}>{line.unit}</Badge>
            </div>
            <p className="mt-1 hidden text-sm text-slate-500 sm:block">바코드, 거래처, 품목, 라벨수량을 기준으로 Scan 데이터를 확인합니다.</p>
          </div>
          <Button aria-label="Scan 상세 닫기" onClick={onClose} size="sm" variant="ghost">닫기</Button>
        </div>

        <div className="overflow-y-auto bg-slate-50 px-4 py-4 sm:px-6 sm:py-5">
          <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <p className="break-words text-base font-bold text-slate-950">{line.productName}</p>
                <p className="mt-1 text-sm text-slate-600">{line.storeName} · {line.labelQty.toLocaleString()} {line.unit}</p>
                <p className="mt-3 hidden text-sm leading-6 text-teal-800 sm:block">Scan_upload_* 시트에서 저장된 정식 입력 데이터입니다.</p>
              </div>
              <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 xl:w-auto xl:min-w-[280px]">
                <ScanSummaryPill label="거래처" value={line.storeName} />
                <ScanSummaryPill label="라벨수량" value={`${line.labelQty.toLocaleString()} ${line.unit}`} />
                <ScanSummaryPill label="센터" value={line.scanCenter} />
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DetailSection description="Scan 데이터를 식별하는 기본 정보입니다." title="Scan 정보">
              <DetailItem label="바코드" value={<CodeCell value={line.barcode} />} />
              <DetailItem label="배송일" value={line.deliveryDate} />
              <DetailItem label="Scan 센터" value={line.scanCenter} />
              <DetailItem label="배치번호" value={<CodeCell value={line.batchId} />} />
            </DetailSection>
            <DetailSection description="스캔된 품목과 라벨 수량을 확인합니다." title="품목/수량">
              <DetailItem label="품목코드" value={<CodeCell value={line.productCode} />} />
              <DetailItem label="품목명" value={line.productName} />
              <DetailItem label="라벨수량" value={`${line.labelQty.toLocaleString()} ${line.unit}`} />
              <DetailItem label="온도" value={line.temperatureType} />
            </DetailSection>
            <DetailSection description="배송지와 차량 배정 참고 정보입니다." title="거래처/배송">
              <DetailItem label="거래처코드" value={<CodeCell value={line.orderBusinessSiteCode} />} />
              <DetailItem label="거래처명" value={line.storeName} />
              <DetailItem label="버스" value={line.bus} />
              <DetailItem label="배송일" value={line.deliveryDate} />
            </DetailSection>
          </div>

          <details className="mt-5 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
            <summary className="cursor-pointer font-semibold text-slate-700">원천 Scan 정보</summary>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <DetailItem label="시트" value={<CodeCell value={line.sheetName} />} />
              <DetailItem label="엑셀 행" value={`${line.rowNo}행`} />
              <DetailItem label="배치번호" value={<CodeCell value={line.batchId} />} />
            </dl>
          </details>

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Link className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50" to={`/batches/${line.batchId}`}>
              배치 상세
            </Link>
            <Button onClick={onClose} variant="primary">확인</Button>
          </div>
        </div>
    </ModalFrame>
  );
}

function ScanSummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-white/70 bg-white/70 px-3 py-2">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-slate-950" title={value}>{value}</p>
    </div>
  );
}

function SourceCell({ rowNo, sheetName }: { rowNo: number; sheetName: string }) {
  return (
    <div className="flex flex-col gap-1">
      <CodeCell value={sheetName} />
      <span className="text-xs text-slate-500">{rowNo}행</span>
    </div>
  );
}

function NameCode({ code, name }: { code: string; name: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="truncate font-semibold text-slate-900" title={name}>{name}</span>
      <CodeCell value={code} />
    </div>
  );
}

function renderScanMobileCard(line: ScanLine) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CodeCell value={line.barcode} />
            <Badge tone={line.unit === 'BOX' ? 'teal' : 'blue'}>{line.unit}</Badge>
          </div>
          <p className="mt-2 truncate text-sm font-bold text-slate-950" title={line.productName}>{line.productName}</p>
          <p className="mt-1 truncate text-xs text-slate-500" title={line.storeName}>{line.storeName}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-bold text-slate-950">{line.labelQty.toLocaleString()}</p>
          <p className="text-xs font-semibold text-slate-500">{line.scanCenter}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
        <MobileFact label="상품" value={<CodeCell value={line.productCode} />} />
        <MobileFact label="거래처" value={<CodeCell value={line.orderBusinessSiteCode} />} />
        <MobileFact label="배송일" value={line.deliveryDate || '-'} />
        <MobileFact label="원본" value={`${line.sheetName} / ${line.rowNo}행`} />
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

function DetailSection({ children, description, title }: { children: ReactNode; description: string; title: string }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-bold text-slate-950">{title}</p>
        <p className="mt-1 hidden text-xs text-slate-500 sm:block">{description}</p>
      </div>
      <dl className="grid gap-3 p-3 text-sm sm:p-4">{children}</dl>
    </section>
  );
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid min-w-0 grid-cols-[76px_minmax(0,1fr)] items-center gap-3 rounded-md border border-slate-200 bg-white p-3 sm:grid-cols-[104px_minmax(0,1fr)] sm:p-4">
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="min-w-0 overflow-hidden text-slate-900">{value}</dd>
    </div>
  );
}

function countActiveFilters(filters: ScanFilters) {
  return [
    filters.barcode.trim(),
    filters.deliveryDateRange.preset !== 'ALL' ? filters.deliveryDateRange.preset : '',
    filters.productCode.trim(),
    filters.productName.trim(),
    filters.scanCenter.trim(),
    filters.storeCode.trim(),
    filters.storeName.trim(),
  ].filter(Boolean).length;
}

function createScanSummary(lines: ScanLine[], totalElements: number) {
  return {
    centers: uniqueValues(lines.map((line) => line.scanCenter)).length,
    labelQty: lines.reduce((sum, line) => sum + line.labelQty, 0),
    stores: uniqueValues(lines.map((line) => line.orderBusinessSiteCode)).length,
    total: totalElements,
  };
}

function uniqueValues(values: string[]) {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function toScanLine(row: BackendScanLine): ScanLine {
  return {
    id: String(row.id),
    batchId: String(row.batchId),
    sheetName: row.sheetName,
    scanCenter: row.scanCenter ?? '-',
    deliveryDate: row.deliveryDate ?? '',
    bus: row.bus ?? '-',
    barcode: row.barcode ?? '-',
    orderBusinessSiteCode: row.orderBusinessSiteCode ?? '-',
    storeName: row.storeName ?? '-',
    productCode: row.productCode ?? '-',
    productName: row.productName ?? '-',
    labelQty: toNumber(row.labelQty),
    unit: row.unit ?? '-',
    temperatureType: row.temperatureType ?? '-',
    rowNo: row.rowNo,
  };
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

function toNumber(value: number | string | null | undefined) {
  const numberValue = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function requireTenantId(tenantId: number | null) {
  if (!tenantId) {
    throw new Error('물류사 계정 정보가 없습니다.');
  }
  return tenantId;
}

function scanFiltersForScope(tenantId?: number | null, clientId?: number): ScanFilters {
  const storedBatch = readBatchContextSelection(tenantId, clientId);
  return {
    ...initialFilters,
    batchId: storedBatch?.mode === 'batch' ? String(storedBatch.batchId) : '',
    deliveryDateRange: storedBatch ? { preset: 'ALL', from: '', to: '' } : initialFilters.deliveryDateRange,
  };
}
