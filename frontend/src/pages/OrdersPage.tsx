import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { omsApi } from '../api/oms';
import { fakeCurrentUser } from '../app/auth';
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
import { CodeCell } from '../components/domain';
import type { PageResponse } from '../types/api';
import type { BackendOrderLine, OrderLine } from '../types/order';
import { isDateInRange, type DateRangeValue } from '../utils/dateRange';

type OrderViewMode = 'PRODUCTS' | 'STORES' | 'VEHICLES' | 'BATCHES';

interface OrderFilters {
  batchId: string;
  dueDateRange: DateRangeValue;
  orderNo: string;
  storeCode: string;
  storeName: string;
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

const viewModeOptions: Array<{ label: string; value: OrderViewMode }> = [
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
  const [filters, setFilters] = useState<OrderFilters>(initialFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<OrderViewMode>('PRODUCTS');
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderLine | null>(null);
  const [page, setPage] = useState(0);
  const [response, setResponse] = useState<PageResponse<BackendOrderLine> | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadSeq, setReloadSeq] = useState(0);

  const orders = useMemo(() => (response?.items ?? []).map(mapBackendOrderLine), [response]);
  const visibleOrders = useMemo(
    () => orders.filter((order) => isDateInRange(order.dueDate, filters.dueDateRange)),
    [filters.dueDateRange, orders],
  );
  const visibleGroups = useMemo(() => groupOrders(visibleOrders, viewMode), [viewMode, visibleOrders]);
  const summary = useMemo(() => createOrderSummary(visibleOrders, response?.totalElements ?? 0), [response, visibleOrders]);
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);
  const batchIdError = filters.batchId.trim() && !toNumberOrUndefined(filters.batchId) ? '배치 ID는 숫자로 입력해주세요.' : null;

  useEffect(() => {
    const visibleGroupIds = new Set(visibleGroups.map((item) => item.id));
    setExpandedGroupIds((current) => current.filter((groupId) => visibleGroupIds.has(groupId)));
  }, [visibleGroups]);

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

    omsApi.orders
      .list(buildOrderQuery(filters, page))
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
  }, [batchIdError, filters, page, reloadSeq]);

  function updateFilter<TKey extends keyof OrderFilters>(key: TKey, value: OrderFilters[TKey]) {
    setPage(0);
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function resetFilters() {
    setPage(0);
    setFilters(initialFilters);
  }

  return (
    <div className="space-y-5">
      <SummaryCards loading={loading} summary={summary} />

      <OrderFilterPanel
        activeFilterCount={activeFilterCount}
        filters={filters}
        open={filtersOpen}
        onReload={() => setReloadSeq((value) => value + 1)}
        onReset={resetFilters}
        onToggleOpen={() => setFiltersOpen((current) => !current)}
        updateFilter={updateFilter}
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-bold text-slate-950">주문 요약</p>
              <Badge tone="teal">관점별 그룹</Badge>
              <Badge tone="green">확정 배치만</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              서버에서 조회한 확정 주문 <strong className="text-teal-700">{(response?.totalElements ?? 0).toLocaleString()}</strong>건 중
              현재 페이지의 <strong className="text-teal-700">{visibleOrders.length.toLocaleString()}</strong>건을 묶어서 보여줍니다.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {viewModeOptions.map((option) => (
              <ViewModeButton
                active={viewMode === option.value}
                key={option.value}
                onClick={() => setViewMode(option.value)}
              >
                {option.label}
              </ViewModeButton>
            ))}
            <Button disabled size="sm" variant="primary">주문 다운로드</Button>
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
              expandedGroupIds={expandedGroupIds}
              mode={viewMode}
              onSelectOrder={setSelectedOrder}
              onToggleGroup={(groupId) =>
                setExpandedGroupIds((current) =>
                  current.includes(groupId) ? current.filter((item) => item !== groupId) : [...current, groupId],
                )
              }
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
        <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      </Card>
    </div>
  );
}

function SummaryCards({ loading, summary }: { loading: boolean; summary: ReturnType<typeof createOrderSummary> }) {
  const cards = [
    { label: '확정 주문', value: summary.total, tone: 'green' as const, description: 'CONFIRMED 배치 기준 총 조회 건수' },
    { label: '현재 페이지', value: summary.loaded, tone: 'teal' as const, description: '현재 페이지에 표시 중인 주문 건수' },
    { label: '주문 수량', value: summary.totalQty, tone: 'blue' as const, description: '현재 페이지 주문 수량 합계' },
    { label: '코드 보존', value: summary.codeSensitive, tone: 'amber' as const, description: '0으로 시작하는 코드성 값' },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card className="p-4" key={card.label}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-600">{card.label}</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{loading ? '-' : card.value.toLocaleString()}</p>
            </div>
            <Badge tone={card.tone}>{card.label}</Badge>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">{card.description}</p>
        </Card>
      ))}
    </div>
  );
}

function OrderFilterPanel({
  activeFilterCount,
  filters,
  onReload,
  onReset,
  onToggleOpen,
  open,
  updateFilter,
}: {
  activeFilterCount: number;
  filters: OrderFilters;
  onReload: () => void;
  onReset: () => void;
  onToggleOpen: () => void;
  open: boolean;
  updateFilter: <TKey extends keyof OrderFilters>(key: TKey, value: OrderFilters[TKey]) => void;
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
            <Badge tone="green">CONFIRMED</Badge>
          </div>
          <p className="mt-1 text-xs text-slate-500">확정 완료된 배치의 PL 기반 주문 요약 데이터를 조회합니다.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
          <Button onClick={onReload} size="sm" variant="secondary">새로고침</Button>
          <Button disabled={activeFilterCount === 0} onClick={onReset} size="sm" variant="ghost">초기화</Button>
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
            <Input label="품목코드" onChange={(event) => updateFilter('productCode', event.target.value)} placeholder="73043" value={filters.productCode} />
            <Input label="품목명" onChange={(event) => updateFilter('productName', event.target.value)} placeholder="상품명" value={filters.productName} />
            <Select label="단위" onChange={(event) => updateFilter('unit', event.target.value as OrderFilters['unit'])} options={unitOptions} value={filters.unit} />
            <Input label="차량명" onChange={(event) => updateFilter('vehicleName', event.target.value)} placeholder="장지N-14" value={filters.vehicleName} />
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
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function GroupedOrderList({
  expandedGroupIds,
  mode,
  onSelectOrder,
  onToggleGroup,
  rows,
}: {
  expandedGroupIds: string[];
  mode: OrderViewMode;
  onSelectOrder: (order: OrderLine) => void;
  onToggleGroup: (groupId: string) => void;
  rows: OrderGroupRow[];
}) {
  if (rows.length === 0) {
    return (
      <div className="min-h-[360px] border-t border-slate-100 p-8 text-center">
        <p className="text-base font-bold text-slate-950">{viewModeLabel(mode)} 조회 결과가 없습니다.</p>
        <p className="mt-2 text-sm text-slate-500">확정된 배치가 없거나 조회 조건에 맞는 주문이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[440px] border-t border-slate-100">
      <div className="grid grid-cols-[minmax(0,1.5fr)_88px_104px_104px_104px_104px_156px_32px] gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase text-slate-500 max-xl:hidden">
        <span>{viewModeLabel(mode)}</span>
        <span className="text-right">주문 건</span>
        <span className="text-right">총 수량</span>
        <span>단위</span>
        <span className="text-right">상품</span>
        <span className="text-right">거래처</span>
        <span>납기일</span>
        <span />
      </div>

      <div className="divide-y divide-slate-100">
        {rows.map((row) => {
          const expanded = expandedGroupIds.includes(row.id);

          return (
            <section className={expanded ? 'bg-teal-50/30' : 'bg-white'} key={row.id}>
              <button
                aria-expanded={expanded}
                className="grid w-full grid-cols-1 gap-3 px-5 py-4 text-left transition hover:bg-slate-50 xl:grid-cols-[minmax(0,1.5fr)_88px_104px_104px_104px_104px_156px_32px] xl:items-center"
                onClick={() => onToggleGroup(row.id)}
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
                <span className="hidden items-center justify-end xl:inline-flex xl:justify-self-end">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 shadow-sm">
                    <ChevronIcon expanded={expanded} />
                  </span>
                </span>
              </button>

              <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="min-h-0 overflow-hidden">
                  <ExpandedOrders mode={mode} orders={row.items} onSelectOrder={onSelectOrder} />
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-3.5 w-3.5 transition-transform duration-300 ease-out ${expanded ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
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
  const showProduct = mode !== 'PRODUCTS';
  const showVehicle = mode !== 'VEHICLES';
  const showBatch = mode !== 'BATCHES';
  const headers = [
    '주문번호',
    showStore ? '거래처' : null,
    showProduct ? '상품' : null,
    '납기일',
    '수량',
    showVehicle ? '차량/차수' : null,
    showBatch ? '배치' : null,
    'OIS PL',
    '상태',
    '',
  ].filter(Boolean);

  return (
    <div className="border-t border-teal-100 bg-white px-5 pb-5 pt-1">
      <div className="mt-3 overflow-x-auto rounded-md border border-slate-200">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
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
              <tr className="hover:bg-slate-50" key={order.id}>
                <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3"><CodeCell value={order.orderNo} /></td>
                {showStore ? <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3"><StoreCell order={order} /></td> : null}
                {showProduct ? <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3"><ProductCell order={order} /></td> : null}
                <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-slate-700">{order.dueDate || '-'}</td>
                <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-right font-semibold text-slate-900">{order.orderQty.toLocaleString()} {order.unit}</td>
                {showVehicle ? <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-slate-700">{formatVehicleRound(order)}</td> : null}
                {showBatch ? <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3"><InlineCode value={order.batchId} /></td> : null}
                <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3"><SourcePlCell order={order} /></td>
                <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3"><BatchScopeBadge /></td>
                <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-right">
                  <Button onClick={() => onSelectOrder(order)} size="sm" variant="secondary">상세</Button>
                </td>
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

function BatchScopeBadge() {
  return <Badge tone="green">확정</Badge>;
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

function OrderDetailModal({ onClose, order }: { onClose: () => void; order: OrderLine | null }) {
  if (!order) {
    return null;
  }

  return (
    <ModalFrame onClose={onClose} panelClassName="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-bold text-slate-950">주문 상세</p>
            <BatchScopeBadge />
            <Badge tone={order.unit === 'EA' ? 'blue' : 'teal'}>{order.unit}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">PL 데이터를 기준으로 재구성한 OMS 주문 조회용 요약입니다.</p>
        </div>
        <Button aria-label="주문 상세 닫기" onClick={onClose} size="sm" variant="ghost">닫기</Button>
      </div>

      <div className="overflow-y-auto bg-slate-50 px-6 py-5">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-base font-bold text-slate-950">{order.productName || '-'}</p>
          <p className="mt-1 text-sm text-slate-600">{order.storeName || order.storeCode || '-'} · {order.orderQty.toLocaleString()} {order.unit}</p>
          <p className="mt-3 text-sm leading-6 text-emerald-800">확정 완료된 배치의 주문입니다. 외부 API 제공과 운영 다운로드 대상에 포함될 수 있습니다.</p>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-3">
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

function buildOrderQuery(filters: OrderFilters, page: number) {
  return {
    tenantId: fakeCurrentUser.tenantId ?? 1,
    clientId: fakeCurrentUser.clientId ?? 1,
    page,
    size: pageSize,
    confirmedOnly: true,
    batchId: toNumberOrUndefined(filters.batchId),
    dueDateFrom: filters.dueDateRange.from || undefined,
    dueDateTo: filters.dueDateRange.to || undefined,
    orderNo: textOrUndefined(filters.orderNo),
    storeCode: textOrUndefined(filters.storeCode),
    storeName: textOrUndefined(filters.storeName),
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
    clientName: fakeCurrentUser.clientName ?? `client-${row.clientId}`,
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
  if (mode === 'PRODUCTS') return row.productCode || row.productName || '-';
  if (mode === 'STORES') return row.storeCode || row.storeName || '-';
  if (mode === 'VEHICLES') return row.vehicleName || '-';
  return row.batchId || '-';
}

function groupLabelForMode(row: OrderLine, mode: OrderViewMode): Pick<OrderGroupRow, 'label' | 'subLabel'> {
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
