import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { OmsApiError } from '../api/client';
import { omsApi, type BackendBatchDetail, type ValidationErrorItem } from '../api/oms';
import { fakeCurrentUser } from '../app/auth';
import { Badge, Button, Card, Input, ModalFrame, Select } from '../components/common';
import { DataTable, Pagination, type DataTableColumn } from '../components/data';
import { CodeCell, MetricCard, SeverityBadge } from '../components/domain';
import type { PageResponse } from '../types/api';
import type { ValidationSeverity } from '../types/validation';

type SeverityFilter = ValidationSeverity | 'ALL';

const severityFilterOptions = [
  { label: 'Error', value: 'ERROR' },
  { label: 'Warning', value: 'WARNING' },
  { label: 'Info', value: 'INFO' },
  { label: '전체', value: 'ALL' },
];

const tenantId = fakeCurrentUser.tenantId ?? 1;
const clientId = fakeCurrentUser.clientId ?? 1;

export function ValidationResultsPage() {
  const { batchId } = useParams();
  const numericBatchId = Number(batchId);
  const [batch, setBatch] = useState<BackendBatchDetail | null>(null);
  const [response, setResponse] = useState<PageResponse<ValidationErrorItem> | null>(null);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ERROR');
  const [sheetName, setSheetName] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [keyword, setKeyword] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<ValidationErrorItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadValidationResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numericBatchId, severityFilter]);

  async function loadValidationResults(overrides?: Partial<ValidationFilters>) {
    if (!Number.isInteger(numericBatchId) || numericBatchId <= 0) {
      setErrorMessage('유효하지 않은 배치 ID입니다.');
      setLoading(false);
      return;
    }

    const nextSeverityFilter = overrides?.severityFilter ?? severityFilter;
    const nextSheetName = overrides?.sheetName ?? sheetName;
    const nextErrorCode = overrides?.errorCode ?? errorCode;

    setLoading(true);
    setErrorMessage(null);
    try {
      const [batchDetail, errors] = await Promise.all([
        omsApi.batches.detail(numericBatchId, { tenantId, clientId }),
        omsApi.batches.validationErrors(numericBatchId, {
          tenantId,
          clientId,
          page: 0,
          size: 200,
          severity: nextSeverityFilter === 'ALL' ? undefined : nextSeverityFilter,
          sheetName: nextSheetName.trim() || undefined,
          errorCode: nextErrorCode.trim() || undefined,
        }),
      ]);
      setBatch(batchDetail);
      setResponse(errors);
    } catch (error) {
      setErrorMessage(formatApiError(error));
    } finally {
      setLoading(false);
    }
  }

  const rows = useMemo(() => filterRows(response?.items ?? [], keyword), [keyword, response]);
  const summary = useMemo(() => getValidationSummary(response?.items ?? [], batch), [batch, response]);
  const canConfirm = batch?.errorCount === 0 && batch.status === 'READY_TO_CONFIRM';
  const activeFilterCount = useMemo(
    () => countActiveValidationFilters({ errorCode, keyword, severityFilter, sheetName }),
    [errorCode, keyword, severityFilter, sheetName],
  );

  async function applyValidationFilters() {
    await loadValidationResults();
    setFiltersOpen(false);
  }

  async function resetValidationFilters() {
    const defaultFilters = { errorCode: '', keyword: '', severityFilter: 'ERROR' as SeverityFilter, sheetName: '' };
    setSeverityFilter(defaultFilters.severityFilter);
    setSheetName(defaultFilters.sheetName);
    setErrorCode(defaultFilters.errorCode);
    setKeyword(defaultFilters.keyword);
    await loadValidationResults(defaultFilters);
  }

  if (loading) {
    return <LoadingCard message="검증 결과를 불러오는 중입니다." />;
  }

  if (!batch) {
    return <ApiErrorCard message={errorMessage ?? '검증 결과를 찾을 수 없습니다.'} onRetry={loadValidationResults} />;
  }

  return (
    <div className="space-y-5">
      {errorMessage ? <ApiErrorCard message={errorMessage} onRetry={loadValidationResults} /> : null}
      <ValidationHeader batch={batch} canConfirm={canConfirm} summary={summary} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard description="현재 조회 조건의 검증 항목" label="조회 항목" value={rows.length.toLocaleString()} />
        <MetricCard description="수정 후 재검증 필요" label="Error" tone="red" value={summary.error} />
        <MetricCard description="운영 확인 권장" label="Warning" tone="amber" value={summary.warning} />
        <MetricCard description="참고 안내" label="Info" tone="blue" value={summary.info} />
      </div>

      <ValidationFilterPanel
        activeFilterCount={activeFilterCount}
        errorCode={errorCode}
        keyword={keyword}
        onApply={applyValidationFilters}
        onReset={resetValidationFilters}
        onToggleOpen={() => setFiltersOpen((current) => !current)}
        open={filtersOpen}
        severityFilter={severityFilter}
        setErrorCode={setErrorCode}
        setKeyword={setKeyword}
        setSeverityFilter={setSeverityFilter}
        setSheetName={setSheetName}
        sheetName={sheetName}
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-base font-bold text-slate-950">검증 항목</p>
            <p className="mt-1 text-sm text-slate-500">행을 선택하면 원본값, 정규화값, 발생 위치를 확인합니다.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled size="sm" variant="secondary">
              오류 내역 다운로드
            </Button>
            <Link
              className="inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              to={`/batches/${batch.id}`}
            >
              배치 상세
            </Link>
          </div>
        </div>
        <div className="min-w-0 border-t border-slate-100">
          <DataTable
            columns={createColumns()}
            data={rows}
            emptyDescription="선택한 조건에 해당하는 검증 항목이 없습니다."
            getRowClassName={(item) => (item.id === selectedRow?.id ? 'bg-teal-50/80' : severityRowClassName(item.severity))}
            getRowKey={(item) => String(item.id)}
            onRowClick={setSelectedRow}
          />
          <div className="px-5 py-4">
            <Pagination page={(response?.page ?? 0) + 1} total={response?.totalElements ?? rows.length} totalPages={Math.max(1, response?.totalPages ?? 1)} />
          </div>
        </div>
        <OperatorValidationDetailModal batch={batch} onClose={() => setSelectedRow(null)} row={selectedRow} />
      </Card>
    </div>
  );
}

interface ValidationFilters {
  errorCode: string;
  keyword: string;
  severityFilter: SeverityFilter;
  sheetName: string;
}

function ValidationFilterPanel({
  activeFilterCount,
  errorCode,
  keyword,
  onApply,
  onReset,
  onToggleOpen,
  open,
  severityFilter,
  setErrorCode,
  setKeyword,
  setSeverityFilter,
  setSheetName,
  sheetName,
}: ValidationFilters & {
  activeFilterCount: number;
  onApply: () => void;
  onReset: () => void;
  onToggleOpen: () => void;
  open: boolean;
  setErrorCode: (value: string) => void;
  setKeyword: (value: string) => void;
  setSeverityFilter: (value: SeverityFilter) => void;
  setSheetName: (value: string) => void;
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
            {activeFilterCount > 0 ? <Badge tone="blue">적용 {activeFilterCount}</Badge> : <Badge>Error 기본 필터</Badge>}
          </div>
          <p className="mt-1 text-xs text-slate-500">{createValidationFilterSummary({ errorCode, keyword, severityFilter, sheetName })}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
          <Button disabled={activeFilterCount === 0} onClick={onReset} size="sm" variant="ghost">
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
            <Select
              label="유형"
              onChange={(event) => setSeverityFilter(event.target.value as SeverityFilter)}
              options={severityFilterOptions}
              value={severityFilter}
            />
            <Input label="시트명" onChange={(event) => setSheetName(event.target.value)} placeholder="Scan_upload_장지" value={sheetName} />
            <Input label="오류 코드" onChange={(event) => setErrorCode(event.target.value)} placeholder="MASTER_PRODUCT_NOT_FOUND" value={errorCode} />
            <Input label="코드/값 검색" onChange={(event) => setKeyword(event.target.value)} placeholder="품목코드, 거래처코드, 원본값" value={keyword} />
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={onApply} size="sm" variant="primary">
              적용하고 접기
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function ValidationHeader({
  batch,
  canConfirm,
  summary,
}: {
  batch: BackendBatchDetail;
  canConfirm: boolean;
  summary: ReturnType<typeof getValidationSummary>;
}) {
  const blocked = summary.error > 0;
  const fileName = batch.uploadedFiles[0]?.originalFileName ?? '파일명 없음';

  return (
    <Card className={`p-5 ${blocked ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <CodeCell value={batch.batchNo} />
            <span className="text-sm text-slate-500">{fileName}</span>
            <Badge tone="neutral">Batch ID {batch.id}</Badge>
          </div>
          <p className={`mt-3 text-base font-bold ${blocked ? 'text-red-900' : 'text-emerald-900'}`}>
            {blocked ? '확정 가능 여부: 불가' : canConfirm ? '확정 가능 여부: 가능' : '검증 결과 확인이 필요합니다'}
          </p>
          <p className={`mt-1 text-sm leading-6 ${blocked ? 'text-red-800' : 'text-emerald-800'}`}>
            {blocked
              ? 'Error 항목을 수정한 뒤 재검증해야 배치 확정, 외부 API 제공, 라벨 다운로드를 진행할 수 있습니다.'
              : 'Error가 없습니다. Warning 항목을 확인한 뒤 배치를 확정할 수 있습니다.'}
          </p>
        </div>
        <div className="grid min-w-[260px] gap-2 sm:grid-cols-3">
          <SeveritySummaryPill label="Error" tone="red" value={summary.error} />
          <SeveritySummaryPill label="Warning" tone="amber" value={summary.warning} />
          <SeveritySummaryPill label="Info" tone="blue" value={summary.info} />
        </div>
      </div>
    </Card>
  );
}

function SeveritySummaryPill({ label, tone, value }: { label: string; tone: 'red' | 'amber' | 'blue'; value: number }) {
  const toneClass = {
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    red: 'border-red-200 bg-red-50 text-red-800',
  }[tone];

  return (
    <div className={`rounded-md border px-3 py-2 ${toneClass}`}>
      <p className="text-xs font-semibold">{label}</p>
      <p className="mt-1 font-mono text-lg font-bold leading-none">{value}</p>
    </div>
  );
}

function createColumns(): DataTableColumn<ValidationErrorItem>[] {
  return [
    { key: 'severity', header: '유형', width: '96px', cell: (item) => <SeverityBadge severity={item.severity} /> },
    { key: 'problem', header: '문제', width: '320px', cell: (item) => <ProblemCell row={item} /> },
    { key: 'target', header: '대상 정보', width: '280px', cell: (item) => <TargetCell row={item} /> },
    { key: 'location', header: '엑셀 위치', width: '190px', cell: (item) => <ValidationLocation row={item} /> },
    { key: 'action', header: '처리 방법', width: '340px', cell: (item) => <span className="whitespace-normal text-slate-700">{item.actionGuide || severityGuide(item.severity)}</span> },
  ];
}

function ProblemCell({ row }: { row: ValidationErrorItem }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="whitespace-normal font-semibold text-slate-900">{row.userTitle || row.message}</span>
      <span className="whitespace-normal text-xs text-slate-500">{row.userMessage || row.message}</span>
    </div>
  );
}

function TargetCell({ row }: { row: ValidationErrorItem }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-semibold text-slate-900">{targetPrimaryLabel(row)}</span>
      {row.sourceSummary ? <span className="whitespace-normal text-xs text-slate-500">{row.sourceSummary}</span> : null}
    </div>
  );
}

function ValidationLocation({ row }: { row: ValidationErrorItem }) {
  return (
    <div className="flex flex-col gap-1">
      <CodeCell muted={!row.sheetName} value={row.sheetName ?? '-'} />
      <span className="text-xs text-slate-500">행 {row.rowNo ?? '-'}</span>
    </div>
  );
}

function OperatorValidationDetailModal({ batch, onClose, row }: { batch: BackendBatchDetail; onClose: () => void; row: ValidationErrorItem | null }) {
  if (!row) {
    return null;
  }

  const impact = validationImpact(row.severity);
  const actionGuide = row.actionGuide || severityGuide(row.severity);

  return (
    <ModalFrame onClose={onClose} panelClassName="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-bold text-slate-950">검증 상세</p>
            <SeverityBadge severity={row.severity} />
            <Badge tone={impact.tone}>{impact.label}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">엑셀에서 확인할 위치와 운영자가 처리할 다음 작업을 먼저 보여줍니다.</p>
        </div>
        <Button aria-label="검증 상세 닫기" onClick={onClose} size="sm" variant="ghost">
          닫기
        </Button>
      </div>

      <div className="overflow-y-auto bg-slate-50 px-6 py-5">
        <div className={`rounded-lg border p-4 ${severitySummaryClassName(row.severity)}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base font-bold text-slate-950">{row.userTitle || row.message}</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{row.userMessage || row.message}</p>
            </div>
            <Badge tone={row.resolvedYn ? 'green' : 'neutral'}>{row.resolvedYn ? '처리됨' : '미처리'}</Badge>
          </div>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-800">{actionGuide}</p>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white">
            <ModalSectionHeader description="원본 엑셀에서 먼저 확인할 위치입니다." title="엑셀 확인 위치" />
            <dl className="grid gap-3 p-4 text-sm">
              <DetailItem label="시트" value={<CodeCell muted={!row.sheetName} value={row.sheetName ?? '-'} />} />
              <DetailItem label="행" value={row.rowNo ? `${row.rowNo}행` : '-'} />
              <DetailItem label="컬럼" value={row.columnName ?? '-'} />
              <DetailItem label="입력값" value={<CodeCell muted={!row.originalValue} value={row.originalValue ?? '-'} />} />
            </dl>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white">
            <ModalSectionHeader description="수정할 주문, 거래처, 품목을 찾는 데 필요한 정보입니다." title="문제 대상" />
            <dl className="grid gap-3 p-4 text-sm">
              <DetailItem label="대상" value={<span className="whitespace-normal font-semibold">{targetPrimaryLabel(row)}</span>} />
              <DetailItem label="주문번호" value={<CodeCell muted={!row.orderNo} value={row.orderNo ?? '-'} />} />
              <DetailItem label="거래처" value={storeDisplay(row)} />
              <DetailItem label="수량" value={formatQuantity(row)} />
            </dl>
          </section>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white">
            <ModalSectionHeader description="OMS가 현재 마스터와 비교해 판단한 결과입니다." title="확인 결과" />
            <dl className="grid gap-3 p-4 text-sm">
              <DetailItem label="업무 영역" value={<Badge tone="neutral">{domainLabel(row.domain)}</Badge>} />
              <DetailItem label="기준" value={expectedRule(row)} />
              <DetailItem label="결과" value={masterMatchResult(row)} />
              <DetailItem label="영향" value={<span className="whitespace-normal">{impact.description}</span>} />
            </dl>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white">
            <ModalSectionHeader description="배치 확정 전에 진행할 운영 조치입니다." title="다음 작업" />
            <div className="grid gap-3 p-4 text-sm">
              {nextActions(row).map((action) => (
                <div key={action} className="rounded-md border border-slate-200 bg-white px-4 py-3 text-slate-800">
                  {action}
                </div>
              ))}
            </div>
          </section>
        </div>

        <details className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
          <summary className="cursor-pointer font-semibold text-slate-700">관리자 참고 정보</summary>
          <dl className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <DetailItem label="배치" value={<CodeCell value={batch.batchNo} />} />
            <DetailItem label="오류 코드" value={<CodeCell value={row.errorCode} />} />
            <DetailItem label="원천 테이블" value={<CodeCell muted={!row.lineTable} value={row.lineTable ?? '-'} />} />
            <DetailItem label="원천 ID" value={<CodeCell muted={!row.lineId} value={row.lineId ? String(row.lineId) : '-'} />} />
            <DetailItem label="오류 ID" value={<CodeCell value={String(row.id)} />} />
            <DetailItem label="정규화값" value={<CodeCell muted={!row.normalizedValue} value={row.normalizedValue ?? '-'} />} />
          </dl>
        </details>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button onClick={onClose} variant="primary">
            확인
          </Button>
        </div>
      </div>
    </ModalFrame>
  );
}

function ModalSectionHeader({ description, title }: { description: string; title: string }) {
  return (
    <div className="border-b border-slate-100 px-4 py-3">
      <p className="text-sm font-bold text-slate-950">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-3 rounded-md border border-slate-200 bg-white p-4">
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="min-w-0 text-slate-900">{value}</dd>
    </div>
  );
}

function severitySummaryClassName(severity: ValidationSeverity) {
  if (severity === 'ERROR') return 'border-red-200 bg-red-50';
  if (severity === 'WARNING') return 'border-amber-200 bg-amber-50';
  return 'border-blue-200 bg-blue-50';
}

function validationImpact(severity: ValidationSeverity): { description: string; label: string; tone: 'amber' | 'blue' | 'red' } {
  if (severity === 'ERROR') {
    return {
      description: '배치 확정, 외부 API 제공, 라벨 다운로드가 막힙니다.',
      label: '확정 불가',
      tone: 'red',
    };
  }

  if (severity === 'WARNING') {
    return {
      description: '확정은 가능하지만 운영 확인 후 진행하는 것이 좋습니다.',
      label: '확인 권장',
      tone: 'amber',
    };
  }

  return {
    description: '참고 안내이며 배치 확정을 차단하지 않습니다.',
    label: '참고',
    tone: 'blue',
  };
}

function storeDisplay(row: ValidationErrorItem) {
  const code = row.storeCode ?? null;
  const name = row.storeName ?? null;
  if (code && name) return `${name} (${code})`;
  return name ?? code ?? '-';
}

function expectedRule(row: ValidationErrorItem) {
  if (row.errorCode.includes('PRODUCT')) return '품목코드는 상품 마스터의 ezadminCode와 일치해야 합니다.';
  if (row.errorCode.includes('STORE')) return '거래처/배송지 코드는 배송지/차량 마스터의 baljugoCode와 일치해야 합니다.';
  if (row.errorCode.includes('VEHICLE')) return '차량명과 배송 조건은 배송지/차량 마스터 기준과 맞아야 합니다.';
  if (row.columnName) return `${row.columnName} 값이 OMS 검증 기준에 맞아야 합니다.`;
  return '원본 엑셀 값이 OMS 검증 기준에 맞아야 합니다.';
}

function nextActions(row: ValidationErrorItem) {
  const actions = [row.actionGuide || severityGuide(row.severity)];

  if (row.errorCode.includes('PRODUCT')) {
    actions.push('상품 마스터에서 품목코드를 검색하고, 없으면 마스터를 먼저 반영하세요.');
  } else if (row.errorCode.includes('STORE') || row.errorCode.includes('VEHICLE')) {
    actions.push('배송지/차량 마스터에서 거래처 또는 차량 정보를 확인하세요.');
  } else if (row.sheetName || row.rowNo || row.columnName) {
    actions.push('원본 엑셀의 시트, 행, 컬럼을 확인하고 값을 수정하세요.');
  }

  if (row.severity === 'ERROR') {
    actions.push('수정한 파일을 다시 업로드하거나 기준 마스터를 보정한 뒤 재검증하세요.');
  } else {
    actions.push('내용을 확인한 뒤 문제가 없으면 배치 확정을 진행할 수 있습니다.');
  }

  return Array.from(new Set(actions));
}

function targetPrimaryLabel(row: ValidationErrorItem) {
  const code = targetCode(row);
  const name = targetName(row);
  if (name !== '-' && code !== '-') return `${name} (${code})`;
  if (name !== '-') return name;
  if (code !== '-') return code;
  if (row.productName || row.productCode) return `${row.productName ?? '품목'} (${row.productCode ?? '-'})`;
  if (row.storeName || row.storeCode) return `${row.storeName ?? '거래처'} (${row.storeCode ?? '-'})`;
  return '-';
}

function targetCode(row: ValidationErrorItem) {
  return row.targetCode ?? row.originalValue ?? row.productCode ?? row.storeCode ?? '-';
}

function targetName(row: ValidationErrorItem) {
  return row.targetName ?? row.productName ?? row.storeName ?? '-';
}

function formatQuantity(row: ValidationErrorItem) {
  if (!row.orderQty) return '-';
  return row.unit ? `${row.orderQty} ${row.unit}` : row.orderQty;
}

function masterMatchResult(row: ValidationErrorItem) {
  if (row.normalizedValue) return <CodeCell value={row.normalizedValue} />;
  if (row.errorCode.includes('PRODUCT')) return '상품 마스터에 없음';
  if (row.errorCode.includes('STORE')) return '배송지/차량 마스터에 없음';
  if (row.errorCode.includes('VEHICLE')) return row.normalizedValue ? <CodeCell value={row.normalizedValue} /> : '마스터 기준값 없음';
  return '-';
}

function domainLabel(domain: ValidationErrorItem['domain']) {
  return (
    {
      LABEL: '라벨',
      MASTER: '마스터',
      ORDER: '주문',
      PL: 'PL',
      SCAN: 'Scan',
    } as Record<ValidationErrorItem['domain'], string>
  )[domain] ?? domain;
}

function getValidationSummary(rows: ValidationErrorItem[], batch: BackendBatchDetail | null) {
  if (batch && rows.length === 0) {
    return {
      error: batch.errorCount,
      info: batch.infoCount,
      total: batch.errorCount + batch.warningCount + batch.infoCount,
      warning: batch.warningCount,
    };
  }

  return rows.reduce(
    (summary, row) => ({
      total: summary.total + 1,
      error: summary.error + (row.severity === 'ERROR' ? 1 : 0),
      warning: summary.warning + (row.severity === 'WARNING' ? 1 : 0),
      info: summary.info + (row.severity === 'INFO' ? 1 : 0),
    }),
    { error: 0, info: 0, total: 0, warning: 0 },
  );
}

function filterRows(rows: ValidationErrorItem[], keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) return rows;

  return rows.filter((row) =>
    [
      row.errorCode,
      row.sheetName,
      row.columnName,
      row.message,
      row.userTitle,
      row.userMessage,
      row.actionGuide,
      row.originalValue,
      row.normalizedValue,
      row.targetCode,
      row.targetName,
      row.orderNo,
      row.storeCode,
      row.storeName,
      row.productCode,
      row.productName,
      row.sourceSummary,
      row.lineTable,
      row.lineId ? String(row.lineId) : null,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedKeyword)),
  );
}

function countActiveValidationFilters(filters: ValidationFilters) {
  return [
    filters.severityFilter !== 'ERROR',
    filters.sheetName.trim() !== '',
    filters.errorCode.trim() !== '',
    filters.keyword.trim() !== '',
  ].filter(Boolean).length;
}

function createValidationFilterSummary(filters: ValidationFilters) {
  const severityLabel = severityFilterOptions.find((option) => option.value === filters.severityFilter)?.label ?? filters.severityFilter;
  const summary = [
    `유형 ${severityLabel}`,
    filters.sheetName.trim() ? `시트 ${filters.sheetName.trim()}` : null,
    filters.errorCode.trim() ? `오류 코드 ${filters.errorCode.trim()}` : null,
    filters.keyword.trim() ? `검색어 ${filters.keyword.trim()}` : null,
  ].filter(Boolean);

  return summary.join(' · ');
}

function severityRowClassName(severity: ValidationSeverity) {
  if (severity === 'ERROR') return 'bg-red-50/50';
  if (severity === 'WARNING') return 'bg-amber-50/50';
  return '';
}

function severityGuide(severity: ValidationSeverity) {
  if (severity === 'ERROR') return '수정 후 재검증해야 배치를 확정할 수 있습니다.';
  if (severity === 'WARNING') return '확정은 가능할 수 있지만 운영 확인을 권장합니다.';
  return '참고용 안내입니다. 배치 확정을 차단하지 않습니다.';
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
