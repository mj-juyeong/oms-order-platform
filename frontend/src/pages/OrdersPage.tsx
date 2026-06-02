import { useEffect, useMemo, useState, type ReactNode, type UIEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { omsApi } from '../api/oms';
import { fakeCurrentUser } from '../app/auth';
import { useClientScope } from '../app/clientContext';
import {
  Badge,
  Button,
  Card,
  DateRangeQuickFilter,
  ErrorState,
  Input,
  LoadingState,
  ModalFrame,
  Select,
} from '../components/common';
import { Pagination } from '../components/data/Pagination';
import { BatchStatusBadge, CodeCell } from '../components/domain';
import type { PageResponse } from '../types/api';
import type { BackendOrderLine, OrderLine } from '../types/order';
import { type DateRangeValue } from '../utils/dateRange';
import { areFilterStatesEqual } from '../utils/filterState';

type OrderViewMode = 'ALL' | 'BRANDS' | 'PRODUCTS' | 'STORES' | 'VEHICLES' | 'BATCHES';

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
  dueDateRange: { preset: 'ALL', from: '', to: '' },
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

export function OrdersPage() {
  const tenantId = fakeCurrentUser.tenantId ?? null;
  const { clientId } = useClientScope();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<OrderFilters>(() => orderFiltersFromSearchParams(searchParams));
  const [appliedFilters, setAppliedFilters] = useState<OrderFilters>(() => orderFiltersFromSearchParams(searchParams));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<OrderViewMode>('ALL');
  const [selectedGroup, setSelectedGroup] = useState<OrderGroupRow | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderLine | null>(null);
  const [page, setPage] = useState(0);
  const [response, setResponse] = useState<PageResponse<BackendOrderLine> | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadSeq, setReloadSeq] = useState(0);

  const orders = useMemo(() => (response?.items ?? []).map(mapBackendOrderLine), [response]);
  const visibleOrders = orders;
  const visibleGroups = useMemo(() => groupOrders(visibleOrders, viewMode), [viewMode, visibleOrders]);
  const summary = useMemo(() => createOrderSummary(visibleOrders, response?.totalElements ?? 0), [response, visibleOrders]);
  const activeFilterCount = useMemo(() => countActiveFilters(appliedFilters), [appliedFilters]);
  const hasPendingFilters = useMemo(() => !areFilterStatesEqual(filters, appliedFilters), [appliedFilters, filters]);
  const batchIdError = appliedFilters.batchId.trim() && !toNumberOrUndefined(appliedFilters.batchId) ? '배치 ID는 숫자로 입력해주세요.' : null;

  useEffect(() => {
    const nextFilters = orderFiltersFromSearchParams(searchParams);
    setPage(0);
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
  }, [searchParams]);

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

    if (!tenantId) {
      setResponse({ items: [], page, size: pageSize, totalElements: 0, totalPages: 0 });
      setLoading(false);
      return;
    }

    omsApi.orders
      .list(buildOrderQuery(appliedFilters, page, tenantId, clientId))
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
  }, [appliedFilters, batchIdError, clientId, page, reloadSeq, tenantId]);

  function updateFilter<TKey extends keyof OrderFilters>(key: TKey, value: OrderFilters[TKey]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function applyFilters() {
    setPage(0);
    setAppliedFilters(filters);
    setFiltersOpen(false);
  }

  function resetFilters() {
    setPage(0);
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setSearchParams({}, { replace: true });
  }

  return (
    <div className="space-y-3 md:space-y-5">
      <SummaryCards loading={loading} summary={summary} />

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
          <div className="oms-table-scroll flex shrink-0 gap-2 overflow-x-auto pb-1">
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
    { label: '조회 주문', shortLabel: '조회', value: summary.total, tone: 'green' as const, description: '총 조회 건수' },
    { label: '현재 페이지', shortLabel: '페이지', value: summary.loaded, tone: 'teal' as const, description: '표시 중인 건수' },
    { label: '주문 수량', shortLabel: '수량', value: summary.totalQty, tone: 'blue' as const, description: '현재 페이지 합계' },
    { label: '코드 보존', shortLabel: '코드', value: summary.codeSensitive, tone: 'amber' as const, description: '0 시작 코드' },
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
            <span className="hidden md:inline-flex">
              <Badge tone={card.tone}>{card.label}</Badge>
            </span>
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
            <Input label="배치 ID" onChange={(event) => updateFilter('batchId', event.target.value)} placeholder="예: 12" value={filters.batchId} />
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

  useEffect(() => {
    setVisibleCount(modalOrderChunkSize);
  }, [group?.id]);

  if (!group) {
    return null;
  }

  const currentGroup = group;
  const title = mode === 'ALL' ? '전체 주문' : `${viewModeLabel(mode)} 주문`;
  const visibleOrders = currentGroup.items.slice(0, visibleCount);
  const hasMore = visibleOrders.length < currentGroup.items.length;
  const caption = orderGroupCaption(currentGroup, mode);

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const target = event.currentTarget;
    const nearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 160;
    if (nearBottom && hasMore) {
      setVisibleCount((current) => Math.min(current + modalOrderChunkSize, currentGroup.items.length));
    }
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

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-md border border-slate-200 bg-white sm:mt-4" onScroll={handleScroll}>
          <ExpandedOrders mode={mode} orders={visibleOrders} onSelectOrder={onSelectOrder} />
        </div>

        <div className="flex shrink-0 items-center justify-center px-4 pt-4 text-xs font-semibold text-slate-500">
          {hasMore
            ? `${visibleOrders.length.toLocaleString()} / ${currentGroup.items.length.toLocaleString()}건 표시 중 · 아래로 스크롤하면 더 불러옵니다.`
            : `${currentGroup.items.length.toLocaleString()}건 전체 표시`}
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

function OrderDetailModal({
  onBackToList,
  onClose,
  order,
}: {
  onBackToList?: () => void;
  onClose: () => void;
  order: OrderLine | null;
}) {
  if (!order) {
    return null;
  }

  return (
    <ModalFrame onClose={onClose} panelClassName="flex max-h-[84vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-bold text-slate-950">주문 상세</p>
            <OrderBatchStatus order={order} />
            <Badge tone={order.unit === 'EA' ? 'blue' : 'teal'}>{order.unit}</Badge>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {onBackToList ? <Button onClick={onBackToList} size="sm" variant="secondary">주문 목록으로</Button> : null}
          <Button aria-label="주문 상세 닫기" onClick={onClose} size="sm" variant="ghost">닫기</Button>
        </div>
      </div>

      <div className="overflow-y-auto bg-slate-50 px-4 py-4 sm:px-6 sm:py-5">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-base font-bold text-slate-950">{order.productName || '-'}</p>
          <p className="mt-1 text-sm text-slate-600">{order.storeName || order.storeCode || '-'} · {order.orderQty.toLocaleString()} {order.unit}</p>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <DetailSection title="주문 정보" description="주문과 배치 기준 정보">
            <DetailItem label="주문번호" value={<CodeCell value={order.orderNo} />} />
            <DetailItem label="고객사" value={order.clientName} />
            <DetailItem label="납기일" value={order.dueDate || '-'} />
            <DetailItem label="배치 ID" value={<CodeCell value={order.batchId} />} />
            <DetailItem label="PL 기준" value={<SourcePlCell order={order} />} />
          </DetailSection>

          <DetailSection title="품목/수량" description="출고할 품목과 주문 수량">
            <DetailItem label="품목코드" value={<CodeCell value={order.productCode} />} />
            <DetailItem label="품목명" value={order.productName || '-'} />
            <DetailItem label="브랜드" value={order.brandName || '-'} />
            <DetailItem label="주문수량" value={`${order.orderQty.toLocaleString()} ${order.unit}`} />
            <DetailItem label="보관온도" value={order.storageTemperature} />
          </DetailSection>

          <DetailSection title="거래처/배송" description="거래처와 배송 참고 정보">
            <DetailItem label="거래처코드" value={<CodeCell value={order.storeCode} />} />
            <DetailItem label="거래처명" value={order.storeName || '-'} />
            <DetailItem label="권역" value={order.area || '-'} />
            <DetailItem label="차량명" value={order.vehicleName || '-'} />
            <DetailItem label="차수" value={order.deliveryRound || '-'} />
          </DetailSection>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {onBackToList ? <Button onClick={onBackToList} variant="secondary">주문 목록으로</Button> : null}
          <Link className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50" to={`/batches/${order.batchId}`}>
            배치 상세
          </Link>
          <Link className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50" to="/pl-lines">
            PL 보기
          </Link>
          <Button onClick={onClose} variant="primary">확인</Button>
        </div>
      </div>
    </ModalFrame>
  );
}

function DetailSection({ children, description, title }: { children: ReactNode; description: string; title: string }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-bold text-slate-950">{title}</p>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
      <dl className="grid gap-3 p-4 text-sm">{children}</dl>
    </section>
  );
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[104px_minmax(0,1fr)] items-center gap-3 rounded-md border border-slate-200 bg-white p-4">
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="min-w-0 text-slate-900">{value}</dd>
    </div>
  );
}

function orderFiltersFromSearchParams(searchParams: URLSearchParams): OrderFilters {
  const dueDateFrom = searchParams.get('dueDateFrom') ?? '';
  const dueDateTo = searchParams.get('dueDateTo') ?? '';

  return {
    ...initialFilters,
    dueDateRange: dueDateFrom || dueDateTo
      ? { preset: 'CUSTOM', from: dueDateFrom || dueDateTo, to: dueDateTo || dueDateFrom }
      : initialFilters.dueDateRange,
  };
}

function buildOrderQuery(filters: OrderFilters, page: number, tenantId: number, clientId?: number) {
  return {
    tenantId,
    clientId,
    page,
    size: pageSize,
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
