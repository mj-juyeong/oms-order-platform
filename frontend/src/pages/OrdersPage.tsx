import { useEffect, useMemo, useRef, useState, type ReactNode, type UIEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { omsApi, type BackendBatchSummary } from '../api/oms';
import { readBatchContextSelection, resetBatchContextSelection, saveAllBatchContextSelection, saveBatchIdContextSelection, useBatchContextSelection } from '../app/batchContext';
import { resetClientContextSelection } from '../app/clientContext';
import { fakeCurrentUser } from '../app/auth';
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
  Select,
} from '../components/common';
import { Pagination, SortMenu, type DataTableSort } from '../components/data';
import { BatchSelectionPanel, BatchStatusBadge, ClientSelectionPanel, CodeCell, OrderDetailModal, SelectedBatchScopeBar } from '../components/domain';
import { usePageBackButton } from '../components/layout';
import type { PageResponse } from '../types/api';
import type { BackendOrderLine, OrderLine } from '../types/order';
import { todayString, type DateRangeValue } from '../utils/dateRange';
import { areFilterStatesEqual } from '../utils/filterState';

type OrderViewMode = 'ALL' | 'BRANDS' | 'PRODUCTS' | 'STORES' | 'VEHICLES' | 'BATCHES';
type SortDirection = 'asc' | 'desc';
type OrderSortField = 'id' | 'orderNo' | 'clientName' | 'batchId' | 'storeCode' | 'storeName' | 'brandName' | 'productCode' | 'productName' | 'dueDate' | 'orderQty' | 'batchStatus';
type ModalOrderSearchField = 'ALL' | 'orderNo' | 'storeCode' | 'storeName' | 'productCode' | 'productName';

interface OrderSort {
  field: OrderSortField;
  direction: SortDirection;
}

interface ModalOrderSearch {
  field: ModalOrderSearchField;
  query: string;
}

interface OrderFilters {
  batchId: string;
  dueDateRange: DateRangeValue;
  orderNo: string;
  storeCode: string;
  storeName: string;
  brandName: string;
  productCode: string;
  productName: string;
  unit: 'ALL' | OrderLine['unit'];
  vehicleName: string;
}

interface OrderGroupRow {
  id: string;
  label: string;
  subLabel: string;
  items: OrderLine[];
  orderCount: number;
  totalQty: number;
  unitSummary: string;
  productCount: number;
  storeCount: number;
  vehicleCount: number;
  dueDates: string;
}

const pageSize = 100;
const modalOrderChunkSize = 30;

const viewModeOptions: Array<{ label: string; value: OrderViewMode }> = [
  { label: '전체 주문', value: 'ALL' },
  { label: '브랜드별', value: 'BRANDS' },
  { label: '상품별', value: 'PRODUCTS' },
  { label: '거래처별', value: 'STORES' },
  { label: '차량별', value: 'VEHICLES' },
  { label: '배치별', value: 'BATCHES' },
];

const initialFilters: OrderFilters = {
  batchId: '',
  dueDateRange: { preset: 'CUSTOM', from: todayString(), to: '' },
  orderNo: '',
  storeCode: '',
  storeName: '',
  brandName: '',
  productCode: '',
  productName: '',
  unit: 'ALL',
  vehicleName: '',
};

const unitOptions = [
  { label: '전체', value: 'ALL' },
  { label: 'EA', value: 'EA' },
  { label: 'BOX', value: 'BOX' },
];

const orderSortOptions: Array<{ label: string; value: OrderSortField }> = [
  { label: '주문번호', value: 'orderNo' },
  { label: '고객사', value: 'clientName' },
  { label: '배치번호', value: 'batchId' },
  { label: '거래처코드', value: 'storeCode' },
  { label: '거래처명', value: 'storeName' },
  { label: '브랜드', value: 'brandName' },
  { label: '품목코드', value: 'productCode' },
  { label: '품목명', value: 'productName' },
  { label: '납기일', value: 'dueDate' },
  { label: '수량', value: 'orderQty' },
  { label: '배치 상태', value: 'batchStatus' },
];

const modalSearchOptions: Array<{ label: string; value: ModalOrderSearchField }> = [
  { label: '전체', value: 'ALL' },
  { label: '주문번호', value: 'orderNo' },
  { label: '거래처코드', value: 'storeCode' },
  { label: '거래처명', value: 'storeName' },
  { label: '품목코드', value: 'productCode' },
  { label: '품목명', value: 'productName' },
];

const initialOrderSort: OrderSort = { field: 'orderNo', direction: 'asc' };
const initialModalSearch: ModalOrderSearch = { field: 'ALL', query: '' };

export function OrdersPage() {
  const queryScope = useQueryScope();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<OrderFilters>(() => orderFiltersFromSearchParams(searchParams, queryScope.tenantId, queryScope.clientId));
  const [appliedFilters, setAppliedFilters] = useState<OrderFilters>(() => orderFiltersFromSearchParams(searchParams, queryScope.tenantId, queryScope.clientId));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<OrderViewMode>('ALL');
  const [sort, setSort] = useState<OrderSort>(initialOrderSort);
  const [selectedGroup, setSelectedGroup] = useState<OrderGroupRow | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderLine | null>(null);
  const [page, setPage] = useState(0);
  const [response, setResponse] = useState<PageResponse<BackendOrderLine> | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadSeq, setReloadSeq] = useState(0);
  const previousClientIdRef = useRef<number | undefined>(undefined);

  const orders = useMemo(() => (response?.items ?? []).map(mapBackendOrderLine), [response]);
  const visibleOrders = orders;
  const visibleGroups = useMemo(() => groupOrders(visibleOrders, viewMode), [viewMode, visibleOrders]);
  const summary = useMemo(() => createOrderSummary(visibleOrders, response?.totalElements ?? 0), [response, visibleOrders]);
  const activeFilterCount = useMemo(() => countActiveFilters(appliedFilters), [appliedFilters]);
  const hasPendingFilters = useMemo(() => !areFilterStatesEqual(filters, appliedFilters), [appliedFilters, filters]);
  const batchIdError = appliedFilters.batchId.trim() && !toNumberOrUndefined(appliedFilters.batchId) ? '배치 ID는 숫자로 입력해주세요.' : null;
  const appliedBatchId = toNumberOrUndefined(appliedFilters.batchId);
  const storedBatchSelection = useBatchContextSelection(queryScope.tenantId, queryScope.clientId);
  const allBatchesSelected = storedBatchSelection?.mode === 'all' && !appliedBatchId;
  const needsBatchSelection = queryScope.canQuery && Boolean(queryScope.clientId) && !batchIdError && !appliedBatchId && !allBatchesSelected;
  const selectedBatchSelection = storedBatchSelection?.mode === 'batch' && storedBatchSelection.batchId === appliedBatchId ? storedBatchSelection : null;

  useEffect(() => {
    const nextFilters = orderFiltersFromSearchParams(searchParams, queryScope.tenantId, queryScope.clientId);
    setPage(0);
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
  }, [queryScope.clientId, queryScope.tenantId, searchParams]);

  useEffect(() => {
    const previousClientId = previousClientIdRef.current;
    if (previousClientId !== undefined && previousClientId !== queryScope.clientId) {
      const storedBatch = readBatchContextSelection(queryScope.tenantId, queryScope.clientId);
      const nextBatchId = storedBatch?.mode === 'batch' ? String(storedBatch.batchId) : '';
      setPage(0);
      setFilters((current) => ({ ...current, batchId: nextBatchId }));
      setAppliedFilters((current) => ({ ...current, batchId: nextBatchId }));
      setResponse(null);
    }
    previousClientIdRef.current = queryScope.clientId;
  }, [queryScope.clientId, queryScope.tenantId]);

  useEffect(() => {
    const batchId = toNumberOrUndefined(appliedFilters.batchId);
    if (queryScope.canQuery && queryScope.tenantId && queryScope.clientId && batchId) {
      saveBatchIdContextSelection({
        tenantId: queryScope.tenantId,
        clientId: queryScope.clientId,
        batchId,
      });
    }
  }, [appliedFilters.batchId, queryScope.canQuery, queryScope.clientId, queryScope.tenantId]);

  useEffect(() => {
    if (selectedGroup && !visibleGroups.some((item) => item.id === selectedGroup.id)) {
      setSelectedGroup(null);
    }
  }, [selectedGroup, visibleGroups]);

  useEffect(() => {
    if (selectedOrder && !visibleOrders.some((item) => item.id === selectedOrder.id)) {
      setSelectedOrder(null);
    }
  }, [selectedOrder, visibleOrders]);

  useEffect(() => {
    if (batchIdError) {
      setLoading(false);
      setErrorMessage(batchIdError);
      setResponse(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setErrorMessage(null);

    if (!queryScope.canQuery || needsBatchSelection) {
      setResponse({ items: [], page, size: pageSize, totalElements: 0, totalPages: 0 });
      setLoading(false);
      return;
    }

    omsApi.orders
      .list(buildOrderQuery(appliedFilters, sort, page, queryScope.tenantId, queryScope.clientId))
      .then((data) => {
        if (!cancelled) {
          setResponse(data);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setResponse(null);
          setErrorMessage(error instanceof Error ? error.message : '주문 조회 API 호출에 실패했습니다.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [appliedFilters, batchIdError, needsBatchSelection, page, queryScope.canQuery, queryScope.clientId, queryScope.tenantId, reloadSeq, sort]);

  function updateFilter<TKey extends keyof OrderFilters>(key: TKey, value: OrderFilters[TKey]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function applyFilters() {
    setPage(0);
    setAppliedFilters(filters);
    setFiltersOpen(false);
  }

  function applySort(nextSort: DataTableSort) {
    setPage(0);
    setSort({ field: nextSort.field as OrderSortField, direction: nextSort.direction });
  }

  function resetFilters() {
    const nextFilters = orderFiltersFromSearchParams(new URLSearchParams(), queryScope.tenantId, queryScope.clientId);
    setPage(0);
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setSearchParams({}, { replace: true });
  }

  function selectBatch(batch: BackendBatchSummary) {
    const nextFilters: OrderFilters = { ...filters, batchId: String(batch.id), dueDateRange: { preset: 'ALL', from: '', to: '' } };
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('batchId', String(batch.id));
    setPage(0);
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setSearchParams(nextParams, { replace: true });
  }

  function chooseDifferentBatch() {
    if (!queryScope.clientId) {
      chooseDifferentClient();
      return;
    }
    resetBatchContextSelection(queryScope.tenantId, queryScope.clientId);
    const nextFilters: OrderFilters = { ...filters, batchId: '' };
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('batchId');
    setPage(0);
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setResponse(null);
    setSearchParams(nextParams, { replace: true });
  }

  function chooseDifferentClient() {
    resetBatchContextSelection(queryScope.tenantId, queryScope.clientId);
    resetClientContextSelection();
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('batchId');
    const nextFilters = orderFiltersFromSearchParams(new URLSearchParams(), queryScope.tenantId, undefined);
    setPage(0);
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setResponse(null);
    setSearchParams(nextParams, { replace: true });
  }

  function selectAllBatches() {
    if (!queryScope.tenantId || !queryScope.clientId) return;
    saveAllBatchContextSelection({ tenantId: queryScope.tenantId, clientId: queryScope.clientId });
    const nextFilters: OrderFilters = { ...filters, batchId: '', dueDateRange: { preset: 'ALL', from: '', to: '' } };
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('batchId');
    setPage(0);
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setResponse(null);
    setSearchParams(nextParams, { replace: true });
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
    searchParams,
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
        onChooseClient={!queryScope.isClientLocked ? chooseDifferentClient : undefined}
        onSelectAllBatches={selectAllBatches}
        onSelectBatch={selectBatch}
        tenantId={queryScope.tenantId}
        title="주문을 조회할 배치를 선택하세요"
      />
    );
  }

  return (
    <div className="space-y-3 md:space-y-5">
      <SummaryCards loading={loading} summary={summary} />

      <SelectedBatchScopeBar
        batchId={appliedFilters.batchId}
        batchNo={selectedBatchSelection?.batchNo}
        clientName={queryScope.clientName}
        deliveryDate={selectedBatchSelection?.deliveryDate}
        onChooseBatch={chooseDifferentBatch}
        onChooseClient={!queryScope.isClientLocked ? chooseDifferentClient : undefined}
      />

      <OrderFilterPanel
        activeFilterCount={activeFilterCount}
        filters={filters}
        hasPendingFilters={hasPendingFilters}
        open={filtersOpen}
        onApply={applyFilters}
        onReload={() => setReloadSeq((value) => value + 1)}
        onReset={resetFilters}
        onToggleOpen={() => setFiltersOpen((current) => !current)}
        updateFilter={updateFilter}
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-5 lg:py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-bold text-slate-950">주문 요약</p>
            </div>
            <p className="mt-1 hidden text-sm text-slate-500 sm:block">
              서버에서 조회한 주문 <strong className="text-teal-700">{(response?.totalElements ?? 0).toLocaleString()}</strong>건 중
              현재 페이지의 <strong className="text-teal-700">{visibleOrders.length.toLocaleString()}</strong>건을 묶어서 보여줍니다.
            </p>
          </div>
          <div className="flex min-w-0 shrink-0 flex-col gap-3 xl:items-end">
            <div className="oms-table-scroll flex max-w-full gap-2 overflow-x-auto pb-1">
              {viewModeOptions.map((option) => (
                <ViewModeButton
                  active={viewMode === option.value}
                  key={option.value}
                  onClick={() => setViewMode(option.value)}
                >
                  {option.label}
                </ViewModeButton>
              ))}
            </div>
            <SortMenu onChange={applySort} options={orderSortOptions} sort={sort} />
          </div>
        </div>

        {loading ? <div className="p-5"><LoadingState label="주문 조회 API에서 데이터를 불러오는 중입니다." /></div> : null}
        {errorMessage && !loading ? (
          <div className="p-5">
            <ErrorState description={errorMessage} onRetry={() => setReloadSeq((value) => value + 1)} title="주문 데이터를 조회하지 못했습니다." />
          </div>
        ) : null}
        {!loading && !errorMessage ? (
          <>
            <GroupedOrderList
              mode={viewMode}
              onOpenGroup={setSelectedGroup}
              onOpenOrder={setSelectedOrder}
              rows={visibleGroups}
            />
            <div className="border-t border-slate-100 px-5 py-4">
              <Pagination
                onPageChange={(nextPage) => setPage(nextPage - 1)}
                page={(response?.page ?? page) + 1}
                total={response?.totalElements ?? 0}
                totalPages={Math.max(response?.totalPages ?? 1, 1)}
              />
            </div>
          </>
        ) : null}
        <OrderGroupModal
          group={selectedGroup}
          mode={viewMode}
          onClose={() => setSelectedGroup(null)}
          onSelectOrder={setSelectedOrder}
        />
        <OrderDetailModal
          order={selectedOrder}
          onBackToList={selectedGroup ? () => setSelectedOrder(null) : undefined}
          onClose={() => setSelectedOrder(null)}
        />
      </Card>
    </div>
  );
}

function SummaryCards({ loading, summary }: { loading: boolean; summary: ReturnType<typeof createOrderSummary> }) {
  const cards = [
    { label: '조회 주문', shortLabel: '조회', value: summary.total, description: '총 조회 건수' },
    { label: '현재 페이지', shortLabel: '페이지', value: summary.loaded, description: '표시 중인 건수' },
    { label: '주문 수량', shortLabel: '수량', value: summary.totalQty, description: '현재 페이지 합계' },
    { label: '코드 보존', shortLabel: '코드', value: summary.codeSensitive, description: '0 시작 코드' },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 md:gap-3">
      {cards.map((card) => (
        <Card className="min-w-0 px-2 py-3 md:p-4" key={card.label}>
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-600 md:text-sm">
                <span className="md:hidden">{card.shortLabel}</span>
                <span className="hidden md:inline">{card.label}</span>
              </p>
              <p className="mt-1 truncate text-xl font-bold text-slate-950 md:mt-2 md:text-2xl">{loading ? '-' : card.value.toLocaleString()}</p>
            </div>
          </div>
          <p className="mt-1 hidden text-xs leading-5 text-slate-500 md:block">{card.description}</p>
        </Card>
      ))}
    </div>
  );
}

function OrderFilterPanel({
  activeFilterCount,
  filters,
  hasPendingFilters,
  onApply,
  onReload,
  onReset,
  onToggleOpen,
  open,
  updateFilter,
}: {
  activeFilterCount: number;
  filters: OrderFilters;
  hasPendingFilters: boolean;
  onApply: () => void;
  onReload: () => void;
  onReset: () => void;
  onToggleOpen: () => void;
  open: boolean;
  updateFilter: <TKey extends keyof OrderFilters>(key: TKey, value: OrderFilters[TKey]) => void;
}) {
  return (
    <Card className="px-4 py-3 md:py-4">
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
          <p className="mt-1 hidden text-xs text-slate-500 sm:block">PL 기반 주문 요약 데이터를 조건별로 조회합니다.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
          <Button disabled={!hasPendingFilters} onClick={onApply} size="sm" variant="primary">검색</Button>
          <Button onClick={onReload} size="sm" variant="secondary">새로고침</Button>
          <Button disabled={activeFilterCount === 0 && !hasPendingFilters} onClick={onReset} size="sm" variant="ghost">초기화</Button>
          <Button aria-expanded={open} onClick={onToggleOpen} size="sm" variant="secondary">
            {open ? '필터 닫기' : '상세 필터'}
          </Button>
        </div>
      </div>

      {open ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="grid gap-3 lg:grid-cols-5">
            <DateRangeQuickFilter includeTomorrow label="납기일" onChange={(value) => updateFilter('dueDateRange', value)} value={filters.dueDateRange} />
            <Input label="주문번호" onChange={(event) => updateFilter('orderNo', event.target.value)} placeholder="0000000001" value={filters.orderNo} />
            <Input label="거래처코드" onChange={(event) => updateFilter('storeCode', event.target.value)} placeholder="BJ0133" value={filters.storeCode} />
            <Input label="거래처명" onChange={(event) => updateFilter('storeName', event.target.value)} placeholder="매장명" value={filters.storeName} />
            <Input label="브랜드명" onChange={(event) => updateFilter('brandName', event.target.value)} placeholder="브랜드" value={filters.brandName} />
            <Input label="품목코드" onChange={(event) => updateFilter('productCode', event.target.value)} placeholder="73043" value={filters.productCode} />
            <Input label="품목명" onChange={(event) => updateFilter('productName', event.target.value)} placeholder="상품명" value={filters.productName} />
            <Select label="단위" onChange={(event) => updateFilter('unit', event.target.value as OrderFilters['unit'])} options={unitOptions} value={filters.unit} />
            <Input label="차량명" onChange={(event) => updateFilter('vehicleName', event.target.value)} placeholder="장지N-14" value={filters.vehicleName} />
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

function ViewModeButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      aria-pressed={active}
      className={`inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs font-semibold transition ${
        active ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
      } shrink-0`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function GroupedOrderList({
  mode,
  onOpenGroup,
  onOpenOrder,
  rows,
}: {
  mode: OrderViewMode;
  onOpenGroup: (group: OrderGroupRow) => void;
  onOpenOrder: (order: OrderLine) => void;
  rows: OrderGroupRow[];
}) {
  if (rows.length === 0) {
    return (
      <div className="min-h-[360px] border-t border-slate-100 p-8 text-center">
        <p className="text-base font-bold text-slate-950">{viewModeLabel(mode)} 조회 결과가 없습니다.</p>
        <p className="mt-2 text-sm text-slate-500">조회 조건에 맞는 주문이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[440px] border-t border-slate-100">
      <div className="grid grid-cols-[minmax(0,1.5fr)_88px_104px_104px_104px_104px_156px] gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase text-slate-500 max-xl:hidden">
        <span>{viewModeLabel(mode)}</span>
        <span className="text-right">주문 건</span>
        <span className="text-right">총 수량</span>
        <span>단위</span>
        <span className="text-right">상품</span>
        <span className="text-right">거래처</span>
        <span>납기일</span>
      </div>

      <div className="divide-y divide-slate-100">
        {rows.map((row) => (
          <section className="bg-white" key={row.id}>
            <button
              className="grid w-full grid-cols-1 gap-3 px-5 py-4 text-left transition hover:bg-slate-50 xl:grid-cols-[minmax(0,1.5fr)_88px_104px_104px_104px_104px_156px] xl:items-center"
              onClick={() => (mode === 'ALL' ? onOpenOrder(row.items[0]) : onOpenGroup(row))}
              type="button"
            >
              <span className="min-w-0">
                <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="min-w-0 truncate font-semibold text-slate-950">{row.label}</span>
                  {row.subLabel ? <InlineCode value={row.subLabel} /> : null}
                </span>
              </span>
              <GroupMetric label="주문 건" value={row.orderCount.toLocaleString()} />
              <GroupMetric label="총 수량" value={row.totalQty.toLocaleString()} />
              <GroupMetric label="단위" value={row.unitSummary} />
              <GroupMetric label="상품" value={row.productCount.toLocaleString()} />
              <GroupMetric label="거래처" value={row.storeCount.toLocaleString()} />
              <GroupMetric label="납기일" value={row.dueDates} />
            </button>
          </section>
        ))}
      </div>
    </div>
  );
}

function GroupMetric({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-center justify-between gap-3 xl:block xl:text-right">
      <span className="text-xs font-semibold text-slate-500 xl:hidden">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </span>
  );
}

function OrderGroupModal({
  group,
  mode,
  onClose,
  onSelectOrder,
}: {
  group: OrderGroupRow | null;
  mode: OrderViewMode;
  onClose: () => void;
  onSelectOrder: (order: OrderLine) => void;
}) {
  const [visibleCount, setVisibleCount] = useState(modalOrderChunkSize);
  const [modalSearch, setModalSearch] = useState<ModalOrderSearch>(initialModalSearch);
  const [appliedModalSearch, setAppliedModalSearch] = useState<ModalOrderSearch>(initialModalSearch);

  useEffect(() => {
    setVisibleCount(modalOrderChunkSize);
    setModalSearch(initialModalSearch);
    setAppliedModalSearch(initialModalSearch);
  }, [group?.id]);

  const filteredOrders = useMemo(
    () => filterModalOrders(group?.items ?? [], appliedModalSearch),
    [appliedModalSearch, group?.items],
  );

  if (!group) {
    return null;
  }

  const currentGroup = group;
  const title = mode === 'ALL' ? '전체 주문' : `${viewModeLabel(mode)} 주문`;
  const visibleOrders = filteredOrders.slice(0, visibleCount);
  const hasMore = visibleOrders.length < filteredOrders.length;
  const caption = orderGroupCaption(currentGroup, mode);
  const hasPendingModalSearch = modalSearch.field !== appliedModalSearch.field || modalSearch.query !== appliedModalSearch.query;
  const hasActiveModalSearch = appliedModalSearch.query.trim().length > 0;

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const target = event.currentTarget;
    const nearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 160;
    if (nearBottom && hasMore) {
      setVisibleCount((current) => Math.min(current + modalOrderChunkSize, filteredOrders.length));
    }
  }

  function applyModalSearch() {
    setVisibleCount(modalOrderChunkSize);
    setAppliedModalSearch({ field: modalSearch.field, query: modalSearch.query.trim() });
  }

  function resetModalSearch() {
    setVisibleCount(modalOrderChunkSize);
    setModalSearch(initialModalSearch);
    setAppliedModalSearch(initialModalSearch);
  }

  return (
    <ModalFrame onClose={onClose} panelClassName="flex max-h-[86vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-bold text-slate-950">{title}</p>
            <Badge tone="teal">{currentGroup.orderCount.toLocaleString()}건</Badge>
          </div>
          {caption ? <p className="mt-1 truncate text-sm text-slate-500">{caption}</p> : null}
        </div>
        <Button aria-label="주문 목록 닫기" onClick={onClose} size="sm" variant="ghost">닫기</Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col bg-slate-50 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex gap-2 sm:gap-3">
          <GroupSummaryTile label="주문 건" value={`${currentGroup.orderCount.toLocaleString()}건`} />
          <GroupSummaryTile label="총 수량" value={currentGroup.totalQty.toLocaleString()} />
          <GroupSummaryTile label="상품" value={`${currentGroup.productCount.toLocaleString()}개`} />
          <GroupSummaryTile label="거래처" value={`${currentGroup.storeCount.toLocaleString()}개`} />
        </div>

        <div className="mt-3 rounded-md border border-slate-200 bg-white p-3 sm:mt-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <Select
              aria-label="모달 주문 검색 유형"
              className="lg:w-36"
              onChange={(event) => setModalSearch((current) => ({ ...current, field: event.target.value as ModalOrderSearchField }))}
              options={modalSearchOptions}
              value={modalSearch.field}
            />
            <div className="min-w-0 flex-1">
              <Input
                aria-label="모달 주문 검색어"
                className="w-full"
                onChange={(event) => setModalSearch((current) => ({ ...current, query: event.target.value }))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    applyModalSearch();
                  }
                }}
                placeholder="주문번호, 거래처, 품목으로 검색"
                value={modalSearch.query}
              />
            </div>
            <div className="flex shrink-0 gap-2">
              <Button disabled={!hasPendingModalSearch} onClick={applyModalSearch} size="sm" variant="primary">
                검색
              </Button>
              <Button disabled={!hasActiveModalSearch && !hasPendingModalSearch} onClick={resetModalSearch} size="sm" variant="secondary">
                초기화
              </Button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
            <span>검색 결과 {filteredOrders.length.toLocaleString()}건</span>
            {hasPendingModalSearch ? <Badge tone="amber">검색 필요</Badge> : null}
            {hasActiveModalSearch ? <Badge tone="blue">검색 적용</Badge> : null}
          </div>
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-md border border-slate-200 bg-white sm:mt-4" onScroll={handleScroll}>
          {filteredOrders.length > 0 ? (
            <ExpandedOrders mode={mode} orders={visibleOrders} onSelectOrder={onSelectOrder} />
          ) : (
            <EmptyState description="검색 유형이나 검색어를 바꿔 다시 검색해 주세요." title="조건에 맞는 주문이 없습니다." />
          )}
        </div>

        <div className="flex shrink-0 items-center justify-center px-4 pt-4 text-xs font-semibold text-slate-500">
          {hasMore
            ? `${visibleOrders.length.toLocaleString()} / ${filteredOrders.length.toLocaleString()}건 표시 중 · 아래로 스크롤하면 더 불러옵니다.`
            : `${filteredOrders.length.toLocaleString()}건 전체 표시`}
        </div>
      </div>
    </ModalFrame>
  );
}

function orderGroupCaption(group: OrderGroupRow, mode: OrderViewMode) {
  if (mode === 'ALL') {
    const order = group.items[0];
    return [order?.clientName, group.subLabel].filter(Boolean).join(' · ');
  }

  return [group.label, group.subLabel].filter(Boolean).join(' · ');
}

function filterModalOrders(orders: OrderLine[], search: ModalOrderSearch) {
  const query = search.query.trim().toLowerCase();
  if (!query) {
    return orders;
  }

  return orders.filter((order) =>
    modalSearchValues(order, search.field).some((value) => value.toLowerCase().includes(query)),
  );
}

function modalSearchValues(order: OrderLine, field: ModalOrderSearchField) {
  if (field === 'orderNo') return [order.orderNo];
  if (field === 'storeCode') return [order.storeCode];
  if (field === 'storeName') return [order.storeName];
  if (field === 'productCode') return [order.productCode];
  if (field === 'productName') return [order.productName];

  return [order.orderNo, order.storeCode, order.storeName, order.productCode, order.productName];
}

function GroupSummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-2.5 sm:px-4 sm:py-3">
      <p className="truncate text-[11px] font-semibold text-slate-500 sm:text-xs">{label}</p>
      <p className="mt-1 truncate font-mono text-sm font-bold text-slate-950 sm:text-base">{value}</p>
    </div>
  );
}

function ExpandedOrders({
  mode,
  onSelectOrder,
  orders,
}: {
  mode: OrderViewMode;
  onSelectOrder: (order: OrderLine) => void;
  orders: OrderLine[];
}) {
  const showStore = mode !== 'STORES';
  const showBrand = mode !== 'BRANDS';
  const showProduct = mode !== 'PRODUCTS';
  const showVehicle = mode !== 'VEHICLES';
  const showBatch = mode !== 'BATCHES';
  const headers = [
    '주문번호',
    showStore ? '거래처' : null,
    showBrand ? '브랜드' : null,
    showProduct ? '상품' : null,
    '납기일',
    '수량',
    showVehicle ? '차량/차수' : null,
    showBatch ? '배치' : null,
    'OIS PL',
    '상태',
  ].filter(Boolean);

  return (
    <div className="bg-white">
      <div className="divide-y divide-slate-100 md:hidden">
        {orders.map((order) => (
          <button
            className="w-full px-4 py-3 text-left transition active:bg-teal-50"
            key={order.id}
            onClick={() => onSelectOrder(order)}
            type="button"
          >
            <OrderMobileCard order={order} />
          </button>
        ))}
      </div>
      <div className="oms-table-scroll hidden overflow-x-auto md:block">
        <table className="oms-responsive-table min-w-full border-separate border-spacing-0 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {headers.map((header) => (
                <th className="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500" key={header}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                className="cursor-pointer hover:bg-teal-50/60"
                key={order.id}
                onClick={() => onSelectOrder(order)}
                tabIndex={0}
              >
                <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3"><CodeCell value={order.orderNo} /></td>
                {showStore ? <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3"><StoreCell order={order} /></td> : null}
                {showBrand ? <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-slate-700">{order.brandName || '-'}</td> : null}
                {showProduct ? <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3"><ProductCell order={order} /></td> : null}
                <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-slate-700">{order.dueDate || '-'}</td>
                <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-right font-semibold text-slate-900">{order.orderQty.toLocaleString()} {order.unit}</td>
                {showVehicle ? <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-slate-700">{formatVehicleRound(order)}</td> : null}
                {showBatch ? <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3"><InlineCode value={order.batchId} /></td> : null}
                <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3"><SourcePlCell order={order} /></td>
                <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3"><OrderBatchStatus order={order} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StoreCell({ order }: { order: OrderLine }) {
  if (!order.storeName) {
    return <InlineCode value={order.storeCode || '-'} />;
  }

  return (
    <span className="flex min-w-[150px] max-w-[240px] items-center gap-2">
      <span className="truncate font-semibold text-slate-800">{order.storeName}</span>
      <InlineCode value={order.storeCode} />
    </span>
  );
}

function OrderMobileCard({ order }: { order: OrderLine }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CodeCell value={order.orderNo} />
            <Badge tone={order.unit === 'BOX' ? 'teal' : 'blue'}>{order.unit}</Badge>
            <OrderBatchStatus order={order} />
          </div>
          <p className="mt-2 truncate text-sm font-bold text-slate-950" title={order.productName || '-'}>{order.productName || '-'}</p>
          <p className="mt-1 truncate text-xs text-slate-500" title={order.storeName || order.storeCode}>{order.storeName || order.storeCode || '-'}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-bold text-slate-950">{order.orderQty.toLocaleString()}</p>
          <p className="text-xs font-semibold text-slate-500">{order.dueDate || '-'}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
        <OrderMobileFact label="상품" value={<InlineCode value={order.productCode} />} />
        <OrderMobileFact label="거래처" value={<InlineCode value={order.storeCode} />} />
        <OrderMobileFact label="브랜드" value={order.brandName || '-'} />
        <OrderMobileFact label="차량" value={formatVehicleRound(order)} />
      </div>
    </div>
  );
}

function OrderMobileFact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-semibold text-slate-500">{label}</p>
      <div className="mt-1 min-w-0 truncate font-semibold text-slate-800">{value}</div>
    </div>
  );
}

function ProductCell({ order }: { order: OrderLine }) {
  return (
    <span className="flex min-w-[260px] max-w-[420px] items-center gap-2">
      <span className="truncate font-semibold text-slate-800">{order.productName || '-'}</span>
      <InlineCode value={order.productCode} />
    </span>
  );
}

function SourcePlCell({ order }: { order: OrderLine }) {
  return (
    <div className="flex items-center gap-2">
      <Badge tone={order.sourceSheetName === 'PL_EA' ? 'blue' : 'teal'}>{order.sourceSheetName}</Badge>
      <span className="text-xs text-slate-500">#{order.sourcePlLineId}</span>
    </div>
  );
}

function OrderBatchStatus({ order }: { order: OrderLine }) {
  if (order.batchStatus) {
    return <BatchStatusBadge status={order.batchStatus} />;
  }

  return <Badge tone={order.confirmed ? 'green' : 'neutral'}>{order.confirmed ? '확정' : '미확정'}</Badge>;
}

function InlineCode({ value }: { value?: string }) {
  const displayValue = value && value.length > 0 ? value : '-';

  return (
    <span
      className="shrink-0 font-mono text-xs font-semibold text-slate-500"
      onDoubleClick={(event) => {
        if (!value) {
          return;
        }
        event.stopPropagation();
        void navigator.clipboard?.writeText(displayValue);
      }}
      title={value ? `${displayValue} 더블클릭하여 복사` : displayValue}
    >
      #{displayValue}
    </span>
  );
}

function orderFiltersFromSearchParams(
  searchParams: URLSearchParams,
  tenantId?: number | null,
  clientId?: number,
): OrderFilters {
  const storedBatch = readBatchContextSelection(tenantId, clientId);
  const batchId = searchParams.get('batchId') ?? (storedBatch?.mode === 'batch' ? String(storedBatch.batchId) : initialFilters.batchId);
  const dueDateFrom = searchParams.get('dueDateFrom') ?? '';
  const dueDateTo = searchParams.get('dueDateTo') ?? '';

  return {
    ...initialFilters,
    batchId,
    dueDateRange: dueDateFrom || dueDateTo
      ? { preset: 'CUSTOM', from: dueDateFrom || dueDateTo, to: dueDateTo || dueDateFrom }
      : batchId
        ? { preset: 'ALL', from: '', to: '' }
      : initialFilters.dueDateRange,
  };
}

function buildOrderQuery(filters: OrderFilters, sort: OrderSort, page: number, tenantId: number | null, clientId?: number) {
  return {
    tenantId: requireTenantId(tenantId),
    clientId,
    page,
    size: pageSize,
    sortBy: sort.field,
    sortDirection: sort.direction,
    batchId: toNumberOrUndefined(filters.batchId),
    dueDateFrom: filters.dueDateRange.from || undefined,
    dueDateTo: filters.dueDateRange.to || undefined,
    orderNo: textOrUndefined(filters.orderNo),
    storeCode: textOrUndefined(filters.storeCode),
    storeName: textOrUndefined(filters.storeName),
    brandName: textOrUndefined(filters.brandName),
    productCode: textOrUndefined(filters.productCode),
    productName: textOrUndefined(filters.productName),
    unit: filters.unit === 'ALL' ? undefined : filters.unit,
    vehicleName: textOrUndefined(filters.vehicleName),
  };
}

function requireTenantId(tenantId: number | null) {
  if (!tenantId) {
    throw new Error('물류사 계정 정보가 없습니다.');
  }
  return tenantId;
}

function mapBackendOrderLine(row: BackendOrderLine): OrderLine {
  const unit = normalizeUnit(row.unit);

  return {
    id: String(row.id),
    batchId: String(row.batchId),
    clientName: row.clientName?.trim() || fakeCurrentUser.clientName || `고객사 #${row.clientId}`,
    orderNo: row.orderNo ?? '',
    dueDate: row.dueDate ?? '',
    storeCode: row.storeCode ?? '',
    storeName: row.storeName ?? '',
    brandName: row.brandName ?? '',
    productCode: row.productCode ?? '',
    productName: row.productName ?? '',
    unit,
    orderQty: Number(row.orderQty ?? 0),
    vehicleName: row.vehicleName ?? '',
    deliveryRound: row.deliveryRound ?? '',
    area: row.area ?? '',
    sourcePlLineId: String(row.sourcePlLineId),
    sourceSheetName: unit === 'BOX' ? 'PL_Box' : 'PL_EA',
    sourceRowNo: 0,
    storageTemperature: '-',
    qrCode: undefined,
    batchStatus: row.batchStatus,
    confirmed: row.confirmed,
  };
}

function normalizeUnit(value: string | null | undefined): OrderLine['unit'] {
  return value?.toUpperCase() === 'BOX' ? 'BOX' : 'EA';
}

function formatVehicleRound(order: OrderLine) {
  const values = [order.vehicleName, order.deliveryRound].filter(Boolean);
  return values.length > 0 ? values.join(' / ') : '-';
}

function groupOrders(rows: OrderLine[], mode: OrderViewMode): OrderGroupRow[] {
  if (mode === 'ALL') {
    return rows.map((row) => ({
      id: `ALL-${row.id}`,
      label: row.orderNo || `주문 ${row.id}`,
      subLabel: [row.brandName, row.productName || row.productCode, row.storeName || row.storeCode].filter(Boolean).join(' · '),
      items: [row],
      orderCount: 1,
      totalQty: row.orderQty,
      unitSummary: row.unit,
      productCount: row.productCode ? 1 : 0,
      storeCount: row.storeCode ? 1 : 0,
      vehicleCount: row.vehicleName ? 1 : 0,
      dueDates: row.dueDate || '-',
    }));
  }

  const groupMap = new Map<string, OrderLine[]>();

  rows.forEach((row) => {
    const groupKey = groupKeyForMode(row, mode);
    groupMap.set(groupKey, [...(groupMap.get(groupKey) ?? []), row]);
  });

  return [...groupMap.entries()]
    .map(([key, items]) => {
      const products = uniqueValues(items.map((item) => item.productCode));
      const stores = uniqueValues(items.map((item) => item.storeCode));
      const vehicles = uniqueValues(items.map((item) => item.vehicleName));
      const units = uniqueValues(items.map((item) => item.unit));
      const dueDates = uniqueValues(items.map((item) => item.dueDate));

      return {
        id: `${mode}-${key}`,
        ...groupLabelForMode(items[0], mode),
        items,
        orderCount: items.length,
        totalQty: items.reduce((sum, item) => sum + item.orderQty, 0),
        unitSummary: units.join(' / '),
        productCount: products.length,
        storeCount: stores.length,
        vehicleCount: vehicles.length,
        dueDates: dueDates.join(', ') || '-',
      };
    })
    .sort((a, b) => b.totalQty - a.totalQty || a.label.localeCompare(b.label));
}

function groupKeyForMode(row: OrderLine, mode: OrderViewMode) {
  if (mode === 'BRANDS') return row.brandName || '-';
  if (mode === 'PRODUCTS') return row.productCode || row.productName || '-';
  if (mode === 'STORES') return row.storeCode || row.storeName || '-';
  if (mode === 'VEHICLES') return row.vehicleName || '-';
  return row.batchId || '-';
}

function groupLabelForMode(row: OrderLine, mode: OrderViewMode): Pick<OrderGroupRow, 'label' | 'subLabel'> {
  if (mode === 'BRANDS') {
    return { label: row.brandName || '-', subLabel: row.storeName || row.storeCode || '' };
  }
  if (mode === 'PRODUCTS') {
    return { label: row.productName || '-', subLabel: row.productCode };
  }
  if (mode === 'STORES') {
    return { label: row.storeName || row.storeCode || '-', subLabel: row.storeName ? row.storeCode : '' };
  }
  if (mode === 'VEHICLES') {
    return { label: row.vehicleName || '-', subLabel: row.area || '' };
  }
  return { label: `Batch ${row.batchId}`, subLabel: row.dueDate || '' };
}

function viewModeLabel(mode: OrderViewMode) {
  if (mode === 'ALL') return '전체 주문';
  if (mode === 'BRANDS') return '브랜드별';
  if (mode === 'PRODUCTS') return '상품별';
  if (mode === 'STORES') return '거래처별';
  if (mode === 'VEHICLES') return '차량별';
  return '배치별';
}

function uniqueValues(values: string[]) {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function countActiveFilters(filters: OrderFilters) {
  return Object.entries(filters).filter(([key, value]) => {
    if (key === 'batchId') {
      return false;
    }

    if (key === 'unit') {
      return value !== 'ALL';
    }

    if (key === 'dueDateRange') {
      return (value as DateRangeValue).preset !== 'ALL';
    }

    return String(value).trim().length > 0;
  }).length;
}

function createOrderSummary(rows: OrderLine[], totalElements: number) {
  return {
    total: totalElements,
    loaded: rows.length,
    totalQty: rows.reduce((sum, row) => sum + row.orderQty, 0),
    codeSensitive: rows.filter((row) => row.orderNo.startsWith('0') || row.productCode.startsWith('0')).length,
  };
}

function textOrUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toNumberOrUndefined(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}
