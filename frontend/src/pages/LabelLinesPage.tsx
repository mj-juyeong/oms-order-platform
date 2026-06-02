import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { fakeCurrentUser } from '../app/auth';
import { readBatchContextSelection, resetBatchContextSelection, saveBatchIdContextSelection } from '../app/batchContext';
import { useQueryScope } from '../hooks/useQueryScope';
import { omsApi, type BackendBatchSummary, type BackendLabelLine } from '../api/oms';
import { Badge, Button, Card, EmptyState, ErrorState, Input, LoadingState, ModalFrame } from '../components/common';
import { DataTable, Pagination, type DataTableColumn } from '../components/data';
import { BatchSelectionPanel, BatchStatusBadge, ClientSelectionPanel, CodeCell, SelectedBatchScopeBar } from '../components/domain';
import type { PageResponse } from '../types/api';
import type { LabelLine } from '../types/label';
import { areFilterStatesEqual } from '../utils/filterState';

interface LabelFilters {
  batchId: string;
  matchingCode: string;
  orderNo: string;
  brandName: string;
  productCode: string;
  productName: string;
  qrCode: string;
  storeCode: string;
  storeName: string;
}

type LabelTypeFilter = 'ALL' | LabelLine['labelType'];

const pageSize = 20;

const initialFilters: LabelFilters = {
  batchId: '',
  matchingCode: '',
  orderNo: '',
  brandName: '',
  productCode: '',
  productName: '',
  qrCode: '',
  storeCode: '',
  storeName: '',
};

export function LabelLinesPage() {
  const queryScope = useQueryScope();
  const [filters, setFilters] = useState<LabelFilters>(() => labelFiltersForScope(queryScope.tenantId, queryScope.clientId));
  const [appliedFilters, setAppliedFilters] = useState<LabelFilters>(() => labelFiltersForScope(queryScope.tenantId, queryScope.clientId));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [labelType, setLabelType] = useState<LabelTypeFilter>('ALL');
  const [appliedLabelType, setAppliedLabelType] = useState<LabelTypeFilter>('ALL');
  const [selectedLine, setSelectedLine] = useState<LabelLine | null>(null);
  const [page, setPage] = useState(1);
  const [pageData, setPageData] = useState<PageResponse<BackendLabelLine> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const previousClientIdRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    void loadLines();
  }, [appliedFilters, appliedLabelType, page, queryScope.canQuery, queryScope.clientId, queryScope.tenantId]);

  const lines = useMemo(() => (pageData?.items ?? []).map(toLabelLine), [pageData]);
  const summary = useMemo(() => createLabelSummary(lines, pageData?.totalElements ?? 0), [lines, pageData]);
  const activeFilterCount = useMemo(() => countActiveFilters(appliedFilters) + (appliedLabelType === 'ALL' ? 0 : 1), [appliedFilters, appliedLabelType]);
  const hasPendingFilters = useMemo(
    () => !areFilterStatesEqual(filters, appliedFilters) || labelType !== appliedLabelType,
    [appliedFilters, appliedLabelType, filters, labelType],
  );
  const needsBatchSelection = queryScope.canQuery && !parseNumericFilter(appliedFilters.batchId);
  const selectedBatchSelection = useMemo(() => {
    const batchId = parseNumericFilter(appliedFilters.batchId);
    const selection = readBatchContextSelection(queryScope.tenantId, queryScope.clientId);
    return selection && selection.batchId === batchId ? selection : null;
  }, [appliedFilters.batchId, queryScope.clientId, queryScope.tenantId]);
  const uniqueBatchIds = useMemo(() => uniqueVisibleBatchIds(lines), [lines]);
  const canDownloadCurrent = uniqueBatchIds.length === 1 && lines.length > 0 && lines.every((line) => line.batchStatus === 'CONFIRMED');

  useEffect(() => {
    const previousClientId = previousClientIdRef.current;
    if (previousClientId !== undefined && previousClientId !== queryScope.clientId) {
      const nextFilters = labelFiltersForScope(queryScope.tenantId, queryScope.clientId);
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

  async function loadLines() {
    setLoading(true);
    setError(null);
    try {
      if (!queryScope.canQuery || needsBatchSelection) {
        setPageData({ items: [], page: page - 1, size: pageSize, totalElements: 0, totalPages: 0 });
        return;
      }
      const data = await omsApi.labelLines.list({
        tenantId: requireTenantId(queryScope.tenantId),
        clientId: queryScope.clientId,
        page: page - 1,
        size: pageSize,
        batchId: parseNumericFilter(appliedFilters.batchId),
        labelType: appliedLabelType === 'ALL' ? undefined : appliedLabelType,
        orderNo: textFilter(appliedFilters.orderNo),
        storeCode: textFilter(appliedFilters.storeCode),
        storeName: textFilter(appliedFilters.storeName),
        brandName: textFilter(appliedFilters.brandName),
        productCode: textFilter(appliedFilters.productCode),
        productName: textFilter(appliedFilters.productName),
        matchingCode: textFilter(appliedFilters.matchingCode),
        qrCode: textFilter(appliedFilters.qrCode),
      });
      setPageData(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Label 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  function updateFilter<TKey extends keyof LabelFilters>(key: TKey, value: LabelFilters[TKey]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function updateLabelType(value: LabelTypeFilter) {
    setLabelType(value);
  }

  function applyFilters() {
    setPage(1);
    setAppliedFilters(filters);
    setAppliedLabelType(labelType);
    setFiltersOpen(false);
  }

  function resetFilters() {
    const nextFilters = labelFiltersForScope(queryScope.tenantId, queryScope.clientId);
    setPage(1);
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setLabelType('ALL');
    setAppliedLabelType('ALL');
  }

  function selectBatch(batch: BackendBatchSummary) {
    const nextFilters: LabelFilters = { ...filters, batchId: String(batch.id) };
    setPage(1);
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
  }

  function chooseDifferentBatch() {
    resetBatchContextSelection(queryScope.tenantId, queryScope.clientId);
    const nextFilters: LabelFilters = { ...filters, batchId: '' };
    setPage(1);
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setPageData(null);
  }

  async function handleDownloadCurrent() {
    if (!canDownloadCurrent) {
      setError('다운로드할 배치를 하나로 좁혀 주세요. 다시 배치를 선택하거나 같은 배치의 조회 결과에서 실행할 수 있습니다.');
      return;
    }
    await downloadLabels({
      batchId: uniqueBatchIds[0],
      key: 'current',
        labelType: appliedLabelType,
    });
  }

  async function handleDownloadLine(line: LabelLine) {
    if (!line.batchNumericId) {
      setError('다운로드할 배치 ID를 확인할 수 없습니다.');
      return;
    }
    if (line.batchStatus !== 'CONFIRMED') {
      setError('확정 완료된 배치의 Label 데이터만 다운로드할 수 있습니다.');
      return;
    }
    await downloadLabels({
      batchId: line.batchNumericId,
      key: `line-${line.id}`,
      labelType: appliedLabelType === 'ALL' ? line.labelType : appliedLabelType,
    });
  }

  async function downloadLabels({
    batchId,
    key,
    labelType: requestedLabelType,
  }: {
    batchId: number;
    key: string;
    labelType: LabelTypeFilter;
  }) {
    setDownloadingKey(key);
    setError(null);
    setDownloadMessage(null);
    try {
      if (!queryScope.tenantId) {
        setError('물류사 계정 정보가 없습니다. 다시 로그인해 주세요.');
        return;
      }
      const downloaded = await omsApi.downloads.labels({
        tenantId: queryScope.tenantId,
        clientId: queryScope.clientId,
        batchId,
        labelType: requestedLabelType === 'ALL' ? undefined : requestedLabelType,
        orderNo: textFilter(appliedFilters.orderNo),
        storeCode: textFilter(appliedFilters.storeCode),
        brandName: textFilter(appliedFilters.brandName),
        productCode: textFilter(appliedFilters.productCode),
        matchingCode: textFilter(appliedFilters.matchingCode),
        qrCode: textFilter(appliedFilters.qrCode),
        downloadedBy: fakeCurrentUser.id ?? undefined,
      });
      const fileName = downloaded.fileName ?? defaultFileName(batchId, requestedLabelType);
      saveBlob(downloaded.blob, fileName);
      setDownloadMessage(`${fileName} 다운로드를 시작했습니다.`);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : '라벨 다운로드에 실패했습니다.');
    } finally {
      setDownloadingKey(null);
    }
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
        description="선택한 배치 기준으로 Label 데이터를 조회합니다."
        onSelectBatch={selectBatch}
        tenantId={queryScope.tenantId}
        title="Label 데이터를 조회할 배치를 선택하세요"
      />
    );
  }

  if (loading && !pageData) {
    return <LoadingState label="Label 데이터를 불러오는 중입니다." />;
  }

  return (
    <div className="space-y-5">
      {error ? <ErrorState description={error} onRetry={loadLines} title="Label 조회를 처리할 수 없습니다." /> : null}
      {downloadMessage ? (
        <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-800">
          {downloadMessage}
        </div>
      ) : null}

      <LabelSummaryCards summary={summary} />

      <SelectedBatchScopeBar
        batchId={appliedFilters.batchId}
        batchNo={selectedBatchSelection?.batchNo}
        clientName={queryScope.clientName}
        deliveryDate={selectedBatchSelection?.deliveryDate}
        onChooseBatch={chooseDifferentBatch}
      />

      <LabelFilterPanel
        activeFilterCount={activeFilterCount}
        filters={filters}
        hasPendingFilters={hasPendingFilters}
        labelType={labelType}
        onApply={applyFilters}
        onReset={resetFilters}
        onToggleOpen={() => setFiltersOpen((current) => !current)}
        open={filtersOpen}
        setLabelType={updateLabelType}
        updateFilter={updateFilter}
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-bold text-slate-950">Label 데이터</p>
              <Badge tone="blue">EA</Badge>
              <Badge tone="teal">BOX</Badge>
            </div>
            <p className="mt-1 hidden text-sm text-slate-500 sm:block">
              총 <span className="font-semibold text-teal-700">{(pageData?.totalElements ?? 0).toLocaleString()}</span>건이 검색되었습니다.
              행을 선택하면 라벨 출력에 필요한 코드와 상품 정보를 확인합니다.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button disabled={!canDownloadCurrent || downloadingKey === 'current'} onClick={handleDownloadCurrent} size="sm" variant="secondary">
              {downloadingKey === 'current' ? '다운로드 중' : '현재 조건 다운로드'}
            </Button>
          </div>
        </div>
        <DataTable
          columns={createColumns(handleDownloadLine, downloadingKey)}
          data={lines}
          emptyDescription="Label 유형, 주문번호, 거래처, 상품, 매칭코드, QR코드 조건을 조정해 주세요."
          emptyTitle="조건에 맞는 Label 데이터가 없습니다."
          getRowClassName={(item) => (item.id === selectedLine?.id ? 'bg-teal-50/80' : '')}
          getRowKey={(item) => item.id}
          onRowClick={setSelectedLine}
          renderMobileCard={renderLabelMobileCard}
        />
        <div className="px-5 py-4">
          <Pagination
            onPageChange={setPage}
            page={page}
            total={pageData?.totalElements ?? 0}
            totalPages={Math.max(1, pageData?.totalPages ?? 1)}
          />
        </div>
      </Card>

      <LabelDetailModal line={selectedLine} onClose={() => setSelectedLine(null)} onDownload={handleDownloadLine} />
    </div>
  );
}

function LabelSummaryCards({ summary }: { summary: ReturnType<typeof createLabelSummary> }) {
  const cards = [
    { label: '검색 결과', value: summary.total, description: '현재 조건의 전체 라벨 건수' },
    { label: '현재 EA', value: summary.ea, description: '현재 페이지의 EA 라벨 건수' },
    { label: '현재 BOX', value: summary.box, description: '현재 페이지의 BOX 라벨 건수' },
    { label: '현재 QR 보유', value: summary.qrReady, description: '현재 페이지에서 QR코드가 있는 행' },
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

function renderLabelMobileCard(line: LabelLine) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CodeCell value={line.orderNo} />
            <Badge tone={line.labelType === 'EA' ? 'blue' : 'teal'}>{line.labelType}</Badge>
            {line.batchStatus ? <BatchStatusBadge status={line.batchStatus} /> : <Badge>미확정</Badge>}
          </div>
          <p className="mt-2 truncate text-sm font-bold text-slate-950" title={line.productName}>{line.productName}</p>
          <p className="mt-1 truncate text-xs text-slate-500" title={line.storeName}>{line.storeName}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-bold text-slate-950">{line.orderQty.toLocaleString()}</p>
          <p className="text-xs font-semibold text-slate-500">{line.labelType}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
        <MobileFact label="상품" value={<CodeCell value={line.productCode} />} />
        <MobileFact label="거래처" value={<CodeCell value={line.storeCode} />} />
        <MobileFact label="매칭" value={<CodeCell value={line.matchingCode} />} />
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

function LabelFilterPanel({
  activeFilterCount,
  filters,
  hasPendingFilters,
  labelType,
  onApply,
  onReset,
  onToggleOpen,
  open,
  setLabelType,
  updateFilter,
}: {
  activeFilterCount: number;
  filters: LabelFilters;
  hasPendingFilters: boolean;
  labelType: LabelTypeFilter;
  onApply: () => void;
  onReset: () => void;
  onToggleOpen: () => void;
  open: boolean;
  setLabelType: (value: LabelTypeFilter) => void;
  updateFilter: <TKey extends keyof LabelFilters>(key: TKey, value: LabelFilters[TKey]) => void;
}) {
  return (
    <Card className="px-4 py-4">
      <div className="flex cursor-pointer flex-col gap-3 rounded-md lg:flex-row lg:items-center lg:justify-between" onClick={onToggleOpen}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">조회 조건</p>
            {activeFilterCount > 0 ? <Badge tone="blue">적용 {activeFilterCount}</Badge> : <Badge>전체 조회</Badge>}
            {hasPendingFilters ? <Badge tone="amber">검색 필요</Badge> : null}
          </div>
          <p className="mt-1 hidden text-xs text-slate-500 sm:block">Label 유형, 주문번호, 매칭코드, QR코드와 상품 정보를 조합해 데이터를 찾습니다.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
          <SegmentButton active={labelType === 'ALL'} onClick={() => setLabelType('ALL')}>전체</SegmentButton>
          <SegmentButton active={labelType === 'EA'} onClick={() => setLabelType('EA')}>EA</SegmentButton>
          <SegmentButton active={labelType === 'BOX'} onClick={() => setLabelType('BOX')}>BOX</SegmentButton>
          <Button disabled={!hasPendingFilters} onClick={onApply} size="sm" variant="primary">검색</Button>
          <Button disabled={activeFilterCount === 0 && !hasPendingFilters} onClick={onReset} size="sm" variant="ghost">초기화</Button>
          <Button aria-expanded={open} onClick={onToggleOpen} size="sm" variant="secondary">{open ? '필터 접기' : '상세 필터'}</Button>
        </div>
      </div>

      {open ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="grid gap-3 lg:grid-cols-4">
            <Input label="주문번호" onChange={(event) => updateFilter('orderNo', event.target.value)} placeholder="2025..." value={filters.orderNo} />
            <Input label="매칭코드" onChange={(event) => updateFilter('matchingCode', event.target.value)} placeholder="M-" value={filters.matchingCode} />
            <Input label="QR코드" onChange={(event) => updateFilter('qrCode', event.target.value)} placeholder="QR-" value={filters.qrCode} />
            <Input label="거래처코드" onChange={(event) => updateFilter('storeCode', event.target.value)} placeholder="S001" value={filters.storeCode} />
            <Input label="거래처명" onChange={(event) => updateFilter('storeName', event.target.value)} placeholder="강남점" value={filters.storeName} />
            <Input label="브랜드" onChange={(event) => updateFilter('brandName', event.target.value)} placeholder="백소정" value={filters.brandName} />
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

function createColumns(
  onDownload: (line: LabelLine) => void,
  downloadingKey: string | null,
): DataTableColumn<LabelLine>[] {
  return [
    { key: 'type', header: 'Label 유형', width: '100px', cell: (item) => <Badge tone={item.labelType === 'EA' ? 'blue' : 'teal'}>{item.labelType}</Badge> },
    { key: 'batch', header: '배치 ID', width: '100px', cell: (item) => <CodeCell value={item.batchId} /> },
    { key: 'status', header: '배치 상태', width: '150px', cell: (item) => (item.batchStatus ? <BatchStatusBadge status={item.batchStatus} /> : '-') },
    { key: 'orderNo', header: '주문번호', width: '180px', cell: (item) => <CodeCell value={item.orderNo} /> },
    { key: 'source', header: '행 번호', width: '110px', cell: (item) => <span className="text-xs text-slate-500">{item.rowNo}행</span> },
    { key: 'brand', header: '브랜드', width: '130px', cell: (item) => item.brandName || '-' },
    { key: 'store', header: '거래처', width: '190px', cell: (item) => <NameCode name={item.storeName} code={item.storeCode} /> },
    { key: 'product', header: '상품', width: '220px', cell: (item) => <NameCode name={item.productName} code={item.productCode} /> },
    { key: 'qty', header: '주문량', align: 'right', width: '90px', cell: (item) => item.orderQty.toLocaleString() },
    { key: 'sequence', header: '순번', width: '80px', cell: (item) => item.sequence },
    { key: 'matchingCode', header: '매칭코드', width: '140px', cell: (item) => <CodeCell value={item.matchingCode} /> },
    { key: 'qr', header: 'QR코드', width: '160px', cell: (item) => <CodeCell muted={!item.qrCode} value={item.qrCode || '-'} /> },
    { key: 'boxSequence', header: '박스', width: '120px', cell: (item) => <BoxCell line={item} /> },
    {
      key: 'download',
      header: '다운로드',
      width: '120px',
      cell: (item) => {
        const key = `line-${item.id}`;
        const downloadable = item.batchStatus === 'CONFIRMED';
        return (
          <Button disabled={!downloadable || downloadingKey === key} onClick={() => onDownload(item)} size="sm" variant="secondary">
            {downloadingKey === key ? '처리 중' : '다운로드'}
          </Button>
        );
      },
    },
  ];
}

function LabelDetailModal({
  line,
  onClose,
  onDownload,
}: {
  line: LabelLine | null;
  onClose: () => void;
  onDownload: (line: LabelLine) => void;
}) {
  if (!line) {
    return null;
  }

  return (
    <ModalFrame onClose={onClose} panelClassName="flex max-h-[92dvh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-bold text-slate-950">Label 상세</p>
              <Badge tone={line.labelType === 'EA' ? 'blue' : 'teal'}>{line.labelType}</Badge>
              {line.batchStatus ? <BatchStatusBadge status={line.batchStatus} /> : null}
              {line.qrCode ? <Badge tone="green">QR 있음</Badge> : <Badge tone="amber">QR 없음</Badge>}
            </div>
            <p className="mt-1 hidden text-sm text-slate-500 sm:block">라벨 출력에 필요한 주문, 거래처, 품목, 매칭 정보를 확인합니다.</p>
          </div>
          <Button aria-label="Label 상세 닫기" onClick={onClose} size="sm" variant="ghost">닫기</Button>
        </div>

        <div className="overflow-y-auto bg-slate-50 px-4 py-4 sm:px-6 sm:py-5">
          <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <p className="break-words text-base font-bold text-slate-950">{line.productName || '-'}</p>
                <p className="mt-1 text-sm text-slate-600">{line.storeName || '-'} · {line.orderQty.toLocaleString()}개</p>
                <p className="mt-3 hidden text-sm leading-6 text-teal-800 sm:block">Label_EA / Label_Box 데이터는 라벨 다운로드의 기준 데이터입니다.</p>
              </div>
              <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 xl:w-auto xl:min-w-[280px]">
                <LabelSummaryPill label="브랜드" value={line.brandName || '-'} />
                <LabelSummaryPill label="거래처" value={line.storeName || '-'} />
                <LabelSummaryPill label="주문량" value={line.orderQty.toLocaleString()} />
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DetailSection description="라벨과 연결된 주문 정보입니다." title="주문 정보">
              <DetailItem label="주문번호" value={<CodeCell value={line.orderNo} />} />
              <DetailItem label="배치 ID" value={<CodeCell value={line.batchId} />} />
              <DetailItem label="배치 상태" value={line.batchStatus ? <BatchStatusBadge status={line.batchStatus} /> : '-'} />
              <DetailItem label="시트명" value={line.sheetName ?? '-'} />
              <DetailItem label="Label 유형" value={<Badge tone={line.labelType === 'EA' ? 'blue' : 'teal'}>{line.labelType}</Badge>} />
            </DetailSection>
            <DetailSection description="라벨에 표시되는 품목과 수량 정보입니다." title="품목/수량">
              <DetailItem label="품목코드" value={<CodeCell value={line.productCode} />} />
              <DetailItem label="품목명" value={line.productName || '-'} />
              <DetailItem label="주문량" value={line.orderQty.toLocaleString()} />
              <DetailItem label="순번" value={line.sequence || '-'} />
            </DetailSection>
            <DetailSection description="거래처와 라벨 매칭 기준을 확인합니다." title="거래처/매칭">
              <DetailItem label="거래처코드" value={<CodeCell value={line.storeCode} />} />
              <DetailItem label="거래처명" value={line.storeName || '-'} />
              <DetailItem label="브랜드" value={line.brandName || '-'} />
              <DetailItem label="매칭코드" value={<CodeCell value={line.matchingCode} />} />
              <DetailItem label="박스" value={labelBoxSummary(line)} />
            </DetailSection>
          </div>

          <details className="mt-5 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
            <summary className="cursor-pointer font-semibold text-slate-700">원천 Label 정보</summary>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <DetailItem label="Label 유형" value={<Badge tone={line.labelType === 'EA' ? 'blue' : 'teal'}>{line.labelType}</Badge>} />
              <DetailItem label="엑셀 행" value={`${line.rowNo}행`} />
              <DetailItem label="QR코드" value={<CodeCell muted={!line.qrCode} value={line.qrCode || '-'} />} />
              <DetailItem label="매칭코드" value={<CodeCell value={line.matchingCode} />} />
            </dl>
          </details>

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Link className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50" to={`/batches/${line.batchId}`}>
              배치 상세
            </Link>
            <Button onClick={() => onDownload(line)} variant="secondary">이 배치 다운로드</Button>
            <Button onClick={onClose} variant="primary">확인</Button>
          </div>
        </div>
    </ModalFrame>
  );
}

function toLabelLine(row: BackendLabelLine): LabelLine {
  return {
    id: String(row.id),
    numericId: row.id,
    batchId: String(row.batchId),
    batchNumericId: row.batchId,
    batchStatus: row.batchStatus,
    sheetName: row.sheetName,
    labelType: row.labelType,
    orderNo: row.orderNo ?? '',
    storeCode: row.storeCode ?? '',
    storeName: row.storeName ?? '',
    brandName: row.brandName ?? '',
    productCode: row.productCode ?? '',
    productName: row.productName ?? '',
    orderQty: toNumber(row.orderQty),
    sequence: row.sequenceNo ?? '',
    matchingCode: row.matchingCode ?? '',
    qrCode: row.qrCode ?? '',
    boxSequence: row.boxSequence ?? undefined,
    totalBoxQty: row.totalBoxQty === null || row.totalBoxQty === undefined ? undefined : toNumber(row.totalBoxQty),
    rowNo: row.rowNo,
    rawRowJson: row.rawRowJson ?? undefined,
  };
}

function LabelSummaryPill({ label, value }: { label: string; value: string }) {
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
      <span className="truncate font-semibold text-slate-900" title={name}>{name || '-'}</span>
      <CodeCell value={code || '-'} />
    </div>
  );
}

function BoxCell({ line }: { line: LabelLine }) {
  if (line.labelType !== 'BOX') {
    return <span className="text-slate-400">-</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="font-semibold text-slate-900">{line.boxSequence ?? '-'}</span>
      <span className="text-xs text-slate-500">총 {line.totalBoxQty ?? '-'}박스</span>
    </div>
  );
}

function labelBoxSummary(line: LabelLine) {
  if (line.labelType !== 'BOX') {
    return 'EA 라벨';
  }

  const sequence = line.boxSequence ?? '-';
  const total = line.totalBoxQty?.toLocaleString() ?? '-';
  return `${sequence} / 총 ${total}박스`;
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

function countActiveFilters(filters: LabelFilters) {
  return Object.entries(filters).filter(([key, value]) => key !== 'batchId' && value.trim().length > 0).length;
}

function createLabelSummary(lines: LabelLine[], totalElements: number) {
  return {
    box: lines.filter((line) => line.labelType === 'BOX').length,
    ea: lines.filter((line) => line.labelType === 'EA').length,
    qrReady: lines.filter((line) => line.qrCode.trim().length > 0).length,
    total: totalElements,
  };
}

function uniqueVisibleBatchIds(lines: LabelLine[]) {
  return Array.from(new Set(lines.map((line) => line.batchNumericId).filter((value): value is number => typeof value === 'number')));
}

function textFilter(value: string) {
  return value.trim() || undefined;
}

function parseNumericFilter(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }
  const parsed = Number(normalized);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
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

function requireTenantId(tenantId: number | null) {
  if (!tenantId) {
    throw new Error('물류사 계정 정보가 없습니다.');
  }
  return tenantId;
}

function defaultFileName(batchId: number, labelType: LabelTypeFilter) {
  const suffix = labelType === 'ALL' ? 'ALL' : labelType;
  return `labels_batch_${batchId}_${suffix}.xlsx`;
}

function labelFiltersForScope(tenantId?: number | null, clientId?: number): LabelFilters {
  const storedBatch = readBatchContextSelection(tenantId, clientId);
  return {
    ...initialFilters,
    batchId: storedBatch ? String(storedBatch.batchId) : '',
  };
}
