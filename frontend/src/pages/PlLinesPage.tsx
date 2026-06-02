import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { omsApi, type BackendBatchSummary, type BackendPlLine } from '../api/oms';
import { readBatchContextSelection, resetBatchContextSelection, saveBatchIdContextSelection } from '../app/batchContext';
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
import { DataTable, Pagination, type DataTableColumn } from '../components/data';
import { BatchSelectionPanel, ClientSelectionPanel, CodeCell, SelectedBatchScopeBar } from '../components/domain';
import type { PageResponse } from '../types/api';
import type { PlLine } from '../types/pl';
import { todayString, type DateRangeValue } from '../utils/dateRange';
import { areFilterStatesEqual } from '../utils/filterState';

interface PlFilters {
  batchId: string;
  dueDateRange: DateRangeValue;
  orderNo: string;
  productCode: string;
  productName: string;
  storeCode: string;
  storeName: string;
  vehicleName: string;
}

type PlTypeFilter = 'ALL' | PlLine['plType'];

const initialFilters: PlFilters = {
  batchId: '',
  dueDateRange: { preset: 'CUSTOM', from: todayString(), to: '' },
  orderNo: '',
  productCode: '',
  productName: '',
  storeCode: '',
  storeName: '',
  vehicleName: '',
};

const pageSize = 20;

export function PlLinesPage() {
  const queryScope = useQueryScope();
  const [filters, setFilters] = useState<PlFilters>(() => plFiltersForScope(queryScope.tenantId, queryScope.clientId));
  const [appliedFilters, setAppliedFilters] = useState<PlFilters>(() => plFiltersForScope(queryScope.tenantId, queryScope.clientId));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [plType, setPlType] = useState<PlTypeFilter>('ALL');
  const [appliedPlType, setAppliedPlType] = useState<PlTypeFilter>('ALL');
  const [selectedLine, setSelectedLine] = useState<PlLine | null>(null);
  const [page, setPage] = useState(1);
  const [pageData, setPageData] = useState<PageResponse<BackendPlLine> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadSeq, setReloadSeq] = useState(0);
  const previousClientIdRef = useRef<number | undefined>(undefined);

  const lines = useMemo(() => (pageData?.items ?? []).map(toPlLine), [pageData]);
  const summary = useMemo(() => createPlSummary(lines, pageData?.totalElements ?? 0), [lines, pageData]);
  const activeFilterCount = useMemo(() => countActiveFilters(appliedFilters) + (appliedPlType === 'ALL' ? 0 : 1), [appliedFilters, appliedPlType]);
  const hasPendingFilters = useMemo(
    () => !areFilterStatesEqual(filters, appliedFilters) || plType !== appliedPlType,
    [appliedFilters, appliedPlType, filters, plType],
  );
  const needsBatchSelection = queryScope.canQuery && !parseNumericFilter(appliedFilters.batchId);
  const selectedBatchSelection = useMemo(() => {
    const batchId = parseNumericFilter(appliedFilters.batchId);
    const selection = readBatchContextSelection(queryScope.tenantId, queryScope.clientId);
    return selection && selection.batchId === batchId ? selection : null;
  }, [appliedFilters.batchId, queryScope.clientId, queryScope.tenantId]);

  useEffect(() => {
    const previousClientId = previousClientIdRef.current;
    if (previousClientId !== undefined && previousClientId !== queryScope.clientId) {
      const nextFilters = plFiltersForScope(queryScope.tenantId, queryScope.clientId);
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
    void loadPlLines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters.batchId, appliedFilters.dueDateRange, appliedFilters.orderNo, appliedFilters.productCode, appliedFilters.storeCode, appliedFilters.vehicleName, appliedPlType, needsBatchSelection, page, queryScope.canQuery, queryScope.clientId, queryScope.tenantId, reloadSeq]);

  useEffect(() => {
    if (selectedLine && !lines.some((line) => line.id === selectedLine.id)) {
      setSelectedLine(null);
    }
  }, [lines, selectedLine]);

  async function loadPlLines() {
    setLoading(true);
    setError(null);

    try {
      if (!queryScope.canQuery || needsBatchSelection) {
        setPageData({ items: [], page: page - 1, size: pageSize, totalElements: 0, totalPages: 0 });
        return;
      }
      const data = await omsApi.plLines.list({
        tenantId: requireTenantId(queryScope.tenantId),
        clientId: queryScope.clientId,
        page: page - 1,
        size: pageSize,
        batchId: parseNumericFilter(appliedFilters.batchId),
        plType: appliedPlType === 'ALL' ? undefined : appliedPlType,
        dueDateFrom: appliedFilters.dueDateRange.from || undefined,
        dueDateTo: appliedFilters.dueDateRange.to || undefined,
        vehicleName: textFilter(appliedFilters.vehicleName),
        storeCode: textFilter(appliedFilters.storeCode),
        productCode: textFilter(appliedFilters.productCode),
        orderNo: textFilter(appliedFilters.orderNo),
      });
      setPageData(data);
    } catch (loadError) {
      setPageData(null);
      setError(loadError instanceof Error ? loadError.message : 'PL 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  function updateFilter<TKey extends keyof PlFilters>(key: TKey, value: PlFilters[TKey]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function resetFilters() {
    const nextFilters = plFiltersForScope(queryScope.tenantId, queryScope.clientId);
    setPage(1);
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setPlType('ALL');
    setAppliedPlType('ALL');
  }

  function updatePlType(value: PlTypeFilter) {
    setPlType(value);
  }

  function applyFilters() {
    setPage(1);
    setAppliedFilters(filters);
    setAppliedPlType(plType);
    setFiltersOpen(false);
  }

  function selectBatch(batch: BackendBatchSummary) {
    const nextFilters: PlFilters = { ...filters, batchId: String(batch.id), dueDateRange: { preset: 'ALL', from: '', to: '' } };
    setPage(1);
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
  }

  function chooseDifferentBatch() {
    resetBatchContextSelection(queryScope.tenantId, queryScope.clientId);
    const nextFilters: PlFilters = { ...filters, batchId: '' };
    setPage(1);
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setPageData(null);
  }

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
        description="선택한 배치 기준으로 PL 데이터를 조회합니다."
        onSelectBatch={selectBatch}
        tenantId={queryScope.tenantId}
        title="PL 데이터를 조회할 배치를 선택하세요"
      />
    );
  }

  return (
    <div className="space-y-5">
      <PlSummaryCards summary={summary} />

      <SelectedBatchScopeBar
        batchId={appliedFilters.batchId}
        batchNo={selectedBatchSelection?.batchNo}
        clientName={queryScope.clientName}
        deliveryDate={selectedBatchSelection?.deliveryDate}
        onChooseBatch={chooseDifferentBatch}
      />

      <PlFilterPanel
        activeFilterCount={activeFilterCount}
        filters={filters}
        hasPendingFilters={hasPendingFilters}
        onApply={applyFilters}
        onReset={resetFilters}
        onToggleOpen={() => setFiltersOpen((current) => !current)}
        open={filtersOpen}
        plType={plType}
        setPlType={updatePlType}
        updateFilter={updateFilter}
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-bold text-slate-950">PL 데이터</p>
              <Badge tone="blue">EA</Badge>
              <Badge tone="teal">BOX</Badge>
            </div>
            <p className="mt-1 hidden text-sm text-slate-500 sm:block">
              총 <span className="font-semibold text-teal-700">{(pageData?.totalElements ?? 0).toLocaleString()}</span>건이 검색되었습니다.
              행을 선택하면 주문, 상품, 배송 정보를 큰 화면에서 확인합니다.
            </p>
          </div>
          <Button onClick={() => setReloadSeq((current) => current + 1)} size="sm" variant="secondary">
            새로고침
          </Button>
        </div>
        {loading && !pageData ? (
          <div className="p-5">
            <LoadingState label="PL 조회 API에서 데이터를 불러오는 중입니다." />
          </div>
        ) : null}
        {error && !loading ? (
          <div className="p-5">
            <ErrorState description={error} onRetry={() => setReloadSeq((current) => current + 1)} title="PL 데이터를 조회하지 못했습니다." />
          </div>
        ) : null}
        {!error ? (
          <DataTable
            columns={createColumns()}
            data={lines}
            emptyDescription="PL 유형, 납기일, 주문번호, 거래처, 상품, 차량 조건을 조정해 주세요."
            emptyTitle="조건에 맞는 PL 데이터가 없습니다."
            getRowClassName={(item) => (item.id === selectedLine?.id ? 'bg-teal-50/80' : '')}
            getRowKey={(item) => item.id}
            onRowClick={setSelectedLine}
            renderMobileCard={renderPlMobileCard}
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

      <PlDetailModal line={selectedLine} onClose={() => setSelectedLine(null)} />
    </div>
  );
}

function PlSummaryCards({ summary }: { summary: ReturnType<typeof createPlSummary> }) {
  const cards = [
    { label: 'PL 행', value: summary.total, description: '전체 PL 건수' },
    { label: 'EA', value: summary.ea, description: 'EA PL 건수' },
    { label: 'BOX', value: summary.box, description: 'BOX PL 건수' },
    { label: '총 주문량', value: summary.qty, description: 'PL 주문량 합계' },
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

function PlFilterPanel({
  activeFilterCount,
  filters,
  hasPendingFilters,
  onApply,
  onReset,
  onToggleOpen,
  open,
  plType,
  setPlType,
  updateFilter,
}: {
  activeFilterCount: number;
  filters: PlFilters;
  hasPendingFilters: boolean;
  onApply: () => void;
  onReset: () => void;
  onToggleOpen: () => void;
  open: boolean;
  plType: PlTypeFilter;
  setPlType: (value: PlTypeFilter) => void;
  updateFilter: <TKey extends keyof PlFilters>(key: TKey, value: PlFilters[TKey]) => void;
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
          <p className="mt-1 hidden text-xs text-slate-500 sm:block">PL 유형, 납기일, 주문번호, 거래처와 상품을 조합해 데이터를 찾습니다.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
          <SegmentButton active={plType === 'ALL'} onClick={() => setPlType('ALL')}>전체</SegmentButton>
          <SegmentButton active={plType === 'EA'} onClick={() => setPlType('EA')}>EA</SegmentButton>
          <SegmentButton active={plType === 'BOX'} onClick={() => setPlType('BOX')}>BOX</SegmentButton>
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
              label="납기일"
              onChange={(value) => updateFilter('dueDateRange', value)}
              value={filters.dueDateRange}
            />
            <Input label="주문번호" onChange={(event) => updateFilter('orderNo', event.target.value)} placeholder="2025..." value={filters.orderNo} />
            <Input label="차량명" onChange={(event) => updateFilter('vehicleName', event.target.value)} placeholder="11가" value={filters.vehicleName} />
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

function createColumns(): DataTableColumn<PlLine>[] {
  return [
    { key: 'type', header: 'PL 유형', width: '90px', cell: (item) => <Badge tone={item.plType === 'EA' ? 'blue' : 'teal'}>{item.plType}</Badge> },
    { key: 'orderNo', header: '주문번호', width: '180px', cell: (item) => <CodeCell value={item.orderNo} /> },
    { key: 'source', header: '행 번호', width: '110px', cell: (item) => <span className="text-xs text-slate-500">{item.rowNo}행</span> },
    { key: 'store', header: '거래처', width: '190px', cell: (item) => <NameCode name={item.storeName} code={item.storeCode} /> },
    { key: 'product', header: '상품', width: '220px', cell: (item) => <NameCode name={item.productName} code={item.productCode} /> },
    { key: 'dueDate', header: '납기요청일', width: '120px', cell: (item) => item.dueDate },
    { key: 'qty', header: '주문량', align: 'right', width: '90px', cell: (item) => item.orderQty.toLocaleString() },
    { key: 'unit', header: '단위', width: '80px', cell: (item) => <Badge tone={item.unit === 'BOX' ? 'teal' : 'blue'}>{item.unit}</Badge> },
    { key: 'vehicle', header: '차량명', width: '110px', cell: (item) => item.vehicleName },
    { key: 'temp', header: '보관온도', width: '90px', cell: (item) => item.storageTemperature },
    { key: 'qr', header: 'QR코드', width: '160px', cell: (item) => <CodeCell value={item.qrCode} /> },
  ];
}

function PlDetailModal({ line, onClose }: { line: PlLine | null; onClose: () => void }) {
  if (!line) {
    return null;
  }

  return (
    <ModalFrame onClose={onClose} panelClassName="flex max-h-[92dvh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-bold text-slate-950">PL 상세</p>
              <Badge tone={line.plType === 'EA' ? 'blue' : 'teal'}>{line.plType}</Badge>
              <Badge tone={line.unit === 'BOX' ? 'teal' : 'blue'}>{line.unit}</Badge>
            </div>
            <p className="mt-1 hidden text-sm text-slate-500 sm:block">주문번호, 거래처, 품목, 수량, 차량 기준으로 PL 데이터를 확인합니다.</p>
          </div>
          <Button aria-label="PL 상세 닫기" onClick={onClose} size="sm" variant="ghost">닫기</Button>
        </div>

        <div className="overflow-y-auto bg-slate-50 px-4 py-4 sm:px-6 sm:py-5">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <p className="break-words text-base font-bold text-slate-950">{line.productName}</p>
                <p className="mt-1 text-sm text-slate-600">{line.storeName} · {line.orderQty.toLocaleString()} {line.unit}</p>
              </div>
              <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 xl:w-auto xl:min-w-[280px]">
                <PlSummaryPill label="거래처" value={line.storeName} />
                <PlSummaryPill label="주문량" value={`${line.orderQty.toLocaleString()} ${line.unit}`} />
                <PlSummaryPill label="차량" value={line.vehicleName} />
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DetailSection description="PL 행을 식별하는 주문 정보입니다." title="주문 정보">
              <DetailItem label="주문번호" value={<CodeCell value={line.orderNo} />} />
              <DetailItem label="배치번호" value={<CodeCell value={line.batchId} />} />
              <DetailItem label="PL 유형" value={<Badge tone={line.plType === 'EA' ? 'blue' : 'teal'}>{line.plType}</Badge>} />
              <DetailItem label="납기요청일" value={line.dueDate} />
            </DetailSection>
            <DetailSection description="피킹할 품목과 수량을 확인합니다." title="품목/수량">
              <DetailItem label="품목코드" value={<CodeCell value={line.productCode} />} />
              <DetailItem label="품목명" value={line.productName} />
              <DetailItem label="브랜드" value={line.brandName} />
              <DetailItem label="주문량" value={`${line.orderQty.toLocaleString()} ${line.unit}`} />
              <DetailItem label="보관온도" value={line.storageTemperature} />
              <DetailItem label="CBM" value={line.cbm.toLocaleString()} />
            </DetailSection>
            <DetailSection description="거래처와 배송 차량 정보를 확인합니다." title="거래처/배송">
              <DetailItem label="거래처코드" value={<CodeCell value={line.storeCode} />} />
              <DetailItem label="거래처명" value={line.storeName} />
              <DetailItem label="차량명" value={line.vehicleName} />
              <DetailItem label="납기요청일" value={line.dueDate} />
            </DetailSection>
          </div>

          <details className="mt-5 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
            <summary className="cursor-pointer font-semibold text-slate-700">원천 PL 정보</summary>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <DetailItem label="PL 유형" value={<Badge tone={line.plType === 'EA' ? 'blue' : 'teal'}>{line.plType}</Badge>} />
              <DetailItem label="엑셀 행" value={`${line.rowNo}행`} />
              <DetailItem label="QR코드" value={<CodeCell value={line.qrCode} />} />
              <DetailItem label="배치번호" value={<CodeCell value={line.batchId} />} />
            </dl>
          </details>

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Link className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50" to={`/batches/${line.batchId}`}>
              배치 상세
            </Link>
            <Button onClick={onClose} variant="primary">확인</Button>
          </div>
        </div>
    </ModalFrame>
  );
}

function PlSummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-white/70 bg-white/70 px-3 py-2">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-slate-950" title={value}>{value}</p>
    </div>
  );
}

function SegmentButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      aria-pressed={active}
      className={`inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs font-semibold transition ${
        active ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
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

function renderPlMobileCard(line: PlLine) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CodeCell value={line.orderNo} />
            <Badge tone={line.plType === 'EA' ? 'blue' : 'teal'}>{line.plType}</Badge>
          </div>
          <p className="mt-2 truncate text-sm font-bold text-slate-950" title={line.productName}>{line.productName}</p>
          <p className="mt-1 truncate text-xs text-slate-500" title={line.storeName}>{line.storeName}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-bold text-slate-950">{line.orderQty.toLocaleString()}</p>
          <p className="text-xs font-semibold text-slate-500">{line.unit}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
        <MobileFact label="상품" value={<CodeCell value={line.productCode} />} />
        <MobileFact label="거래처" value={<CodeCell value={line.storeCode} />} />
        <MobileFact label="납기일" value={line.dueDate || '-'} />
        <MobileFact label="차량" value={line.vehicleName || '-'} />
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

function DetailSection({ children, className = '', description, title }: { children: ReactNode; className?: string; description: string; title: string }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white ${className}`}>
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

function countActiveFilters(filters: PlFilters) {
  return [
    filters.dueDateRange.preset !== 'ALL' ? filters.dueDateRange.preset : '',
    filters.orderNo.trim(),
    filters.productCode.trim(),
    filters.productName.trim(),
    filters.storeCode.trim(),
    filters.storeName.trim(),
    filters.vehicleName.trim(),
  ].filter(Boolean).length;
}

function createPlSummary(lines: PlLine[], totalElements: number) {
  return {
    box: lines.filter((line) => line.plType === 'BOX').length,
    ea: lines.filter((line) => line.plType === 'EA').length,
    qty: lines.reduce((sum, line) => sum + line.orderQty, 0),
    total: totalElements,
  };
}

function toPlLine(row: BackendPlLine): PlLine {
  return {
    id: String(row.id),
    batchId: String(row.batchId),
    plType: row.plType,
    orderNo: row.orderNo ?? '-',
    storeCode: row.storeCode ?? '-',
    storeName: row.storeName ?? '-',
    brandName: row.brandName ?? '-',
    productCode: row.productCode ?? '-',
    productName: row.productName ?? '-',
    unit: row.unit ?? '-',
    storageTemperature: row.storageTemperature ?? '-',
    dueDate: row.dueDate ?? '',
    orderQty: toNumber(row.orderQty),
    vehicleName: row.vehicleName ?? '-',
    cbm: toNumber(row.cbm),
    qrCode: row.qrCode ?? '-',
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

function plFiltersForScope(tenantId?: number | null, clientId?: number): PlFilters {
  const storedBatch = readBatchContextSelection(tenantId, clientId);
  return {
    ...initialFilters,
    batchId: storedBatch ? String(storedBatch.batchId) : '',
    dueDateRange: storedBatch ? { preset: 'ALL', from: '', to: '' } : initialFilters.dueDateRange,
  };
}
