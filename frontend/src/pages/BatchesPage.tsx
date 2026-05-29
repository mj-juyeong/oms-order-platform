import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { OmsApiError } from '../api/client';
import { omsApi, type BackendBatchSummary } from '../api/oms';
import { fakeCurrentUser } from '../app/auth';
import {
  Badge,
  Button,
  Card,
  DateRangeQuickFilter,
  Input,
  Select,
} from '../components/common';
import { Pagination } from '../components/data';
import { BatchStatusBadge } from '../components/domain';
import type { BatchStatus } from '../types/batch';
import type { PageResponse } from '../types/api';
import { formatDateRangeFilterLabel, isDateInRange, type DateRangeValue } from '../utils/dateRange';

interface BatchFilters {
  keyword: string;
  dateRange: DateRangeValue;
  status: 'ALL' | BatchStatus;
  errorOnly: boolean;
}

const initialFilters: BatchFilters = {
  keyword: '',
  dateRange: { preset: 'ALL', from: '', to: '' },
  status: 'ALL',
  errorOnly: false,
};

const statusOptions: Array<{ label: string; value: BatchFilters['status'] }> = [
  { label: '전체', value: 'ALL' },
  { label: '업로드됨', value: 'UPLOADED' },
  { label: '검증 중', value: 'VALIDATING' },
  { label: '검증 실패', value: 'VALIDATION_FAILED' },
  { label: '확정 대기', value: 'READY_TO_CONFIRM' },
  { label: '확정 완료', value: 'CONFIRMED' },
  { label: '취소됨', value: 'CANCELLED' },
  { label: '롤백됨', value: 'ROLLED_BACK' },
];

const tenantId = fakeCurrentUser.tenantId ?? 1;
const clientId = fakeCurrentUser.clientId ?? 1;

export function BatchesPage() {
  const [filters, setFilters] = useState<BatchFilters>(initialFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [response, setResponse] = useState<PageResponse<BackendBatchSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadSeq, setReloadSeq] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadBatches() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const result = await omsApi.batches.list({
          tenantId,
          clientId,
          page,
          size: 50,
          status: filters.status === 'ALL' ? undefined : filters.status,
        });
        if (!ignore) {
          setResponse(result);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(formatApiError(error));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadBatches();
    return () => {
      ignore = true;
    };
  }, [filters.status, page, reloadSeq]);

  const filteredBatches = useMemo(() => filterBatches(response?.items ?? [], filters), [filters, response]);
  const summary = useMemo(() => createBatchSummary(response?.items ?? []), [response]);
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  function updateFilter<TKey extends keyof BatchFilters>(key: TKey, value: BatchFilters[TKey]) {
    setFilters((current) => ({ ...current, [key]: value }));
    if (key === 'status') {
      setPage(0);
    }
  }

  function resetFilters() {
    setFilters(initialFilters);
    setPage(0);
  }

  return (
    <div className="space-y-5">
      <BatchSummaryCards summary={summary} />

      <BatchFilterPanel
        activeFilterCount={activeFilterCount}
        filters={filters}
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        onReset={resetFilters}
        onToggleOpen={() => setFiltersOpen((current) => !current)}
        updateFilter={updateFilter}
      />

      <Card className="px-4 py-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              총 <span className="text-teal-700">{(response?.totalElements ?? 0).toLocaleString()}</span>건의 배치가 조회되었습니다.
            </p>
            <p className="mt-1 text-xs text-slate-500">현재 범위: tenant {tenantId} / client {clientId}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="red">검증 실패 {summary.errorBatches}</Badge>
            <Badge tone="amber">확정 대기 {summary.readyToConfirm}</Badge>
            <Badge tone="green">확정 완료 {summary.confirmed}</Badge>
          </div>
        </div>
      </Card>

      {errorMessage ? <ApiErrorCard message={errorMessage} onRetry={() => setReloadSeq((current) => current + 1)} /> : null}
      {loading ? <LoadingCard message="배치 목록을 불러오는 중입니다." /> : <BatchList items={filteredBatches} />}
      <Pagination page={(response?.page ?? page) + 1} total={response?.totalElements ?? filteredBatches.length} totalPages={Math.max(1, response?.totalPages ?? 1)} />
    </div>
  );
}

function BatchFilterPanel({
  activeFilterCount,
  filters,
  onClose,
  onReset,
  onToggleOpen,
  open,
  updateFilter,
}: {
  activeFilterCount: number;
  filters: BatchFilters;
  onClose: () => void;
  onReset: () => void;
  onToggleOpen: () => void;
  open: boolean;
  updateFilter: <TKey extends keyof BatchFilters>(key: TKey, value: BatchFilters[TKey]) => void;
}) {
  return (
    <Card className="px-4 py-3">
      <div className="flex cursor-pointer flex-col gap-3 rounded-md lg:flex-row lg:items-center lg:justify-between" onClick={onToggleOpen}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">필터</p>
            {activeFilterCount > 0 ? <Badge tone="blue">적용 {activeFilterCount}</Badge> : <Badge>기본 조건</Badge>}
          </div>
          <p className="mt-1 text-xs text-slate-500">{createFilterSummary(filters)}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
          <Button disabled={activeFilterCount === 0} onClick={onReset} size="sm" variant="ghost">
            초기화
          </Button>
          <Button aria-expanded={open} onClick={onToggleOpen} size="sm" variant="secondary">
            {open ? '필터 접기' : '필터 열기'}
          </Button>
        </div>
      </div>

      {open ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="grid gap-3 lg:grid-cols-4">
            <Input
              label="배치번호/메모"
              onChange={(event) => updateFilter('keyword', event.target.value)}
              placeholder="OE- 또는 메모"
              value={filters.keyword}
            />
            <DateRangeQuickFilter
              includeTomorrow
              label="배송일"
              onChange={(value) => updateFilter('dateRange', value)}
              value={filters.dateRange}
            />
            <Select
              label="배치 상태"
              onChange={(event) => updateFilter('status', event.target.value as BatchFilters['status'])}
              options={statusOptions}
              value={filters.status}
            />
            <div className="flex items-end">
              <button
                aria-pressed={filters.errorOnly}
                className={`inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition ${
                  filters.errorOnly
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
                onClick={() => updateFilter('errorOnly', !filters.errorOnly)}
                type="button"
              >
                <span className={`h-2.5 w-2.5 rounded-full ${filters.errorOnly ? 'bg-red-500' : 'bg-slate-300'}`} />
                검증 실패만
              </button>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={onClose} size="sm" variant="primary">
              적용하고 접기
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function BatchSummaryCards({ summary }: { summary: ReturnType<typeof createBatchSummary> }) {
  const cards = [
    { label: '현재 페이지', value: summary.total, tone: 'blue' as const, description: '조회된 페이지 내 배치' },
    { label: '검증 실패', value: summary.errorBatches, tone: 'red' as const, description: 'Error가 남은 배치' },
    { label: '확정 대기', value: summary.readyToConfirm, tone: 'amber' as const, description: '확정 가능한 후보' },
    { label: '확정 완료', value: summary.confirmed, tone: 'green' as const, description: '외부 제공/다운로드 가능' },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card className="p-4" key={card.label}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-600">{card.label}</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{card.value.toLocaleString()}</p>
            </div>
            <Badge tone={card.tone}>{card.label}</Badge>
          </div>
          <p className="mt-2 text-xs text-slate-500">{card.description}</p>
        </Card>
      ))}
    </div>
  );
}

function BatchList({ items }: { items: BackendBatchSummary[] }) {
  if (items.length === 0) {
    return (
      <Card className="px-6 py-10 text-center">
        <p className="text-sm font-semibold text-slate-900">조건에 맞는 배치가 없습니다.</p>
        <p className="mt-2 text-sm text-slate-500">필터를 초기화하거나 다른 배송일/상태 조건으로 다시 검색하세요.</p>
      </Card>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="hidden grid-cols-[minmax(0,1.35fr)_minmax(120px,0.7fr)_minmax(150px,0.8fr)_minmax(180px,0.9fr)] items-center gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-500 lg:grid">
        <span>배치</span>
        <span className="text-center">배송일</span>
        <span className="text-center">상태/검증</span>
        <span className="text-center">다음 작업</span>
      </div>
      <div className="divide-y divide-slate-100">
        {items.map((item) => (
          <article
            className="grid grid-cols-1 items-center gap-4 px-4 py-4 transition hover:bg-slate-50 lg:grid-cols-[minmax(0,1.35fr)_minmax(120px,0.7fr)_minmax(150px,0.8fr)_minmax(180px,0.9fr)]"
            key={item.id}
          >
            <div className="min-w-0">
              <Link className="font-mono text-sm font-semibold text-teal-700 hover:underline" to={`/batches/${item.id}`}>
                {item.batchNo}
              </Link>
              <p className="mt-1 text-xs text-slate-500">ID {item.id} · {item.memo ?? '메모 없음'}</p>
            </div>

            <div className="min-w-0 text-sm lg:text-center">
              <p className="font-semibold text-slate-900">{item.deliveryDate ?? '-'}</p>
              <p className="mt-1 text-xs text-slate-500">{formatDateTime(item.uploadedAt)}</p>
            </div>

            <div className="min-w-0 lg:text-center">
              <BatchStatusBadge status={item.status} />
              <p className="mt-2 font-mono text-xs text-slate-500">
                E {item.errorCount} / W {item.warningCount} / I {item.infoCount}
              </p>
            </div>

            <div className="min-w-0 lg:flex lg:justify-center">
              <BatchActionCell item={item} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function BatchActionCell({ item }: { item: BackendBatchSummary }) {
  const primaryHref = item.errorCount > 0 ? `/batches/${item.id}/validation` : `/batches/${item.id}`;
  const primaryAction = item.errorCount > 0 ? '오류 확인' : item.status === 'CONFIRMED' ? '상세 보기' : '상세/후속';
  const validationLabel = item.errorCount === 0 && (item.status === 'READY_TO_CONFIRM' || item.warningCount > 0 || item.infoCount > 0) ? '검증 결과' : null;

  return (
    <div className="flex flex-wrap justify-start gap-2 lg:justify-center">
      <Link
        className={`inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs font-semibold transition ${
          item.errorCount > 0
            ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
            : 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800'
        }`}
        to={primaryHref}
      >
        {primaryAction}
      </Link>
      {validationLabel ? (
        <Link
          className="inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          to={`/batches/${item.id}/validation`}
        >
          {validationLabel}
        </Link>
      ) : null}
    </div>
  );
}

function countActiveFilters(filters: BatchFilters) {
  return [
    filters.keyword.trim() !== '',
    filters.dateRange.preset !== 'ALL',
    filters.status !== 'ALL',
    filters.errorOnly,
  ].filter(Boolean).length;
}

function createFilterSummary(filters: BatchFilters) {
  const summary = [
    filters.keyword.trim() ? `검색어 ${filters.keyword.trim()}` : null,
    formatDateRangeFilterLabel(filters.dateRange, '배송일'),
    filters.status !== 'ALL' ? `상태 ${statusOptions.find((option) => option.value === filters.status)?.label ?? filters.status}` : null,
    filters.errorOnly ? '검증 실패만' : null,
  ].filter(Boolean);

  return summary.length > 0 ? summary.join(' · ') : '기본 조건으로 배치를 표시합니다.';
}

function filterBatches(items: BackendBatchSummary[], filters: BatchFilters) {
  return items.filter((item) => {
    const keyword = filters.keyword.trim().toLowerCase();
    const deliveryDate = item.deliveryDate ?? '';
    const matchesKeyword =
      !keyword || item.batchNo.toLowerCase().includes(keyword) || String(item.id).includes(keyword) || item.memo?.toLowerCase().includes(keyword);
    const matchesError = !filters.errorOnly || item.errorCount > 0 || item.status === 'VALIDATION_FAILED';
    const matchesDate = isDateInRange(deliveryDate, filters.dateRange);

    return matchesKeyword && matchesError && matchesDate;
  });
}

function createBatchSummary(items: BackendBatchSummary[]) {
  const confirmed = items.filter((item) => item.status === 'CONFIRMED').length;
  const errorBatches = items.filter((item) => item.errorCount > 0 || item.status === 'VALIDATION_FAILED').length;
  const readyToConfirm = items.filter((item) => item.status === 'READY_TO_CONFIRM' && item.errorCount === 0).length;

  return {
    confirmed,
    errorBatches,
    readyToConfirm,
    total: items.length,
  };
}

function ApiErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="border-red-200 bg-red-50 px-5 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-red-700">{message}</p>
        <Button onClick={onRetry} size="sm" variant="secondary">
          다시 조회
        </Button>
      </div>
    </Card>
  );
}

function LoadingCard({ message }: { message: string }) {
  return (
    <Card className="px-6 py-10 text-center">
      <p className="text-sm font-semibold text-slate-900">{message}</p>
    </Card>
  );
}

function formatApiError(error: unknown) {
  if (error instanceof OmsApiError) {
    const code = error.response.error?.code;
    return code ? `${code}: ${error.message}` : error.message;
  }

  return error instanceof Error ? error.message : 'API 요청 처리 중 오류가 발생했습니다.';
}

function formatDateTime(value?: string | null) {
  return value ? value.replace('T', ' ').slice(0, 16) : '-';
}
