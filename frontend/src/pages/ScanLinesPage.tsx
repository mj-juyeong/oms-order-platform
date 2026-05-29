import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { mockScanLines } from '../api/mock';
import {
  Badge,
  Button,
  Card,
  DateRangeQuickFilter,
  Input,
  ModalFrame,
} from '../components/common';
import { DataTable, Pagination, type DataTableColumn } from '../components/data';
import { CodeCell } from '../components/domain';
import type { ScanLine } from '../types/scan';
import { isDateInRange, type DateRangeValue } from '../utils/dateRange';

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
  deliveryDateRange: { preset: 'ALL', from: '', to: '' },
  productCode: '',
  productName: '',
  scanCenter: '',
  storeCode: '',
  storeName: '',
};

export function ScanLinesPage() {
  const [filters, setFilters] = useState<ScanFilters>(initialFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState<ScanLine | null>(null);

  const filteredLines = useMemo(() => filterScanLines(mockScanLines, filters), [filters]);
  const summary = useMemo(() => createScanSummary(mockScanLines), []);
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  function updateFilter<TKey extends keyof ScanFilters>(key: TKey, value: ScanFilters[TKey]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function resetFilters() {
    setFilters(initialFilters);
  }

  return (
    <div className="space-y-5">
      <ScanSummaryCards summary={summary} />

      <ScanFilterPanel
        activeFilterCount={activeFilterCount}
        filters={filters}
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
            <p className="mt-1 text-sm text-slate-500">
              총 <span className="font-semibold text-teal-700">{filteredLines.length.toLocaleString()}</span>건이 검색되었습니다.
              행을 선택하면 바코드, 상품, 배송지 정보를 큰 화면에서 확인합니다.
            </p>
          </div>
        </div>
        <DataTable
          columns={createColumns()}
          data={filteredLines}
          emptyDescription="배송일, Scan 센터, 거래처, 상품, 바코드 조건을 조정해 주세요."
          emptyTitle="조건에 맞는 Scan 데이터가 없습니다."
          getRowClassName={(item) => (item.id === selectedLine?.id ? 'bg-teal-50/80' : '')}
          getRowKey={(item) => item.id}
          onRowClick={setSelectedLine}
        />
        <div className="px-5 py-4">
          <Pagination page={1} total={filteredLines.length} totalPages={Math.max(1, Math.ceil(filteredLines.length / 20))} />
        </div>
      </Card>

      <ScanDetailModal line={selectedLine} onClose={() => setSelectedLine(null)} />
    </div>
  );
}

function ScanSummaryCards({ summary }: { summary: ReturnType<typeof createScanSummary> }) {
  const cards = [
    { label: 'Scan 행', value: summary.total, tone: 'teal' as const, description: '전체 스캔 건수' },
    { label: 'Scan 센터', value: summary.centers, tone: 'blue' as const, description: '센터 수' },
    { label: '거래처', value: summary.stores, tone: 'green' as const, description: '주문사업장 기준' },
    { label: '라벨 수량', value: summary.labelQty, tone: 'amber' as const, description: 'Scan 라벨수량 합계' },
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
          <p className="mt-3 text-xs leading-5 text-slate-500">{card.description}</p>
        </Card>
      ))}
    </div>
  );
}

function ScanFilterPanel({
  activeFilterCount,
  filters,
  onReset,
  onToggleOpen,
  open,
  updateFilter,
}: {
  activeFilterCount: number;
  filters: ScanFilters;
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
          </div>
          <p className="mt-1 text-xs text-slate-500">Scan 센터, 배송일, 바코드, 거래처와 상품을 조합해 데이터를 찾습니다.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
          <Button disabled={activeFilterCount === 0} onClick={onReset} size="sm" variant="ghost">초기화</Button>
          <Button aria-expanded={open} onClick={onToggleOpen} size="sm" variant="secondary">{open ? '필터 접기' : '상세 필터'}</Button>
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
            <Input label="Scan 센터" onChange={(event) => updateFilter('scanCenter', event.target.value)} placeholder="장지" value={filters.scanCenter} />
            <Input label="바코드" onChange={(event) => updateFilter('barcode', event.target.value)} placeholder="880..." value={filters.barcode} />
            <Input label="거래처코드" onChange={(event) => updateFilter('storeCode', event.target.value)} placeholder="S001" value={filters.storeCode} />
            <Input label="거래처명" onChange={(event) => updateFilter('storeName', event.target.value)} placeholder="강남점" value={filters.storeName} />
            <Input label="품목코드" onChange={(event) => updateFilter('productCode', event.target.value)} placeholder="P000001" value={filters.productCode} />
            <Input label="상품명" onChange={(event) => updateFilter('productName', event.target.value)} placeholder="상품명" value={filters.productName} />
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function createColumns(): DataTableColumn<ScanLine>[] {
  return [
    { key: 'barcode', header: '바코드', width: '190px', cell: (item) => <CodeCell value={item.barcode} /> },
    { key: 'source', header: '파일 위치', width: '170px', cell: (item) => <SourceCell sheetName={item.sheetName} rowNo={item.rowNo} /> },
    { key: 'center', header: 'Scan 센터', width: '110px', cell: (item) => <Badge tone="teal">{item.scanCenter}</Badge> },
    { key: 'deliveryDate', header: '배송일', width: '120px', cell: (item) => item.deliveryDate },
    { key: 'store', header: '거래처', width: '190px', cell: (item) => <NameCode name={item.storeName} code={item.orderBusinessSiteCode} /> },
    { key: 'product', header: '상품', width: '220px', cell: (item) => <NameCode name={item.productName} code={item.productCode} /> },
    { key: 'labelQty', header: '라벨수량', align: 'right', width: '90px', cell: (item) => item.labelQty.toLocaleString() },
    { key: 'unit', header: '단위', width: '80px', cell: (item) => <Badge tone={item.unit === 'BOX' ? 'teal' : 'blue'}>{item.unit}</Badge> },
    { key: 'temperature', header: '온도', width: '90px', cell: (item) => item.temperatureType },
    { key: 'bus', header: '버스', width: '90px', cell: (item) => item.bus },
  ];
}

function ScanDetailModal({ line, onClose }: { line: ScanLine | null; onClose: () => void }) {
  if (!line) {
    return null;
  }

  return (
    <ModalFrame onClose={onClose} panelClassName="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-bold text-slate-950">Scan 상세</p>
              <Badge tone="teal">{line.scanCenter}</Badge>
              <Badge tone={line.unit === 'BOX' ? 'teal' : 'blue'}>{line.unit}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500">바코드, 거래처, 품목, 라벨수량을 기준으로 Scan 데이터를 확인합니다.</p>
          </div>
          <Button aria-label="Scan 상세 닫기" onClick={onClose} size="sm" variant="ghost">닫기</Button>
        </div>

        <div className="overflow-y-auto bg-slate-50 px-6 py-5">
          <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <p className="text-base font-bold text-slate-950">{line.productName}</p>
                <p className="mt-1 text-sm text-slate-600">{line.storeName} · {line.labelQty.toLocaleString()} {line.unit}</p>
                <p className="mt-3 text-sm leading-6 text-teal-800">Scan_upload_* 시트에서 저장된 정식 입력 데이터입니다.</p>
              </div>
              <div className="grid min-w-[280px] gap-2 sm:grid-cols-3">
                <ScanSummaryPill label="거래처" value={line.storeName} />
                <ScanSummaryPill label="라벨수량" value={`${line.labelQty.toLocaleString()} ${line.unit}`} />
                <ScanSummaryPill label="센터" value={line.scanCenter} />
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-3">
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
            <dl className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <DetailItem label="시트" value={<CodeCell value={line.sheetName} />} />
              <DetailItem label="엑셀 행" value={`${line.rowNo}행`} />
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

function ScanSummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/70 bg-white/70 px-3 py-2">
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

function filterScanLines(lines: ScanLine[], filters: ScanFilters) {
  return lines.filter((line) => (
    includesText(line.batchId, filters.batchId) &&
    isDateInRange(line.deliveryDate, filters.deliveryDateRange) &&
    includesText(line.scanCenter, filters.scanCenter) &&
    includesText(line.barcode, filters.barcode) &&
    includesText(line.orderBusinessSiteCode, filters.storeCode) &&
    includesText(line.storeName, filters.storeName) &&
    includesText(line.productCode, filters.productCode) &&
    includesText(line.productName, filters.productName)
  ));
}

function countActiveFilters(filters: ScanFilters) {
  return [
    filters.barcode.trim(),
    filters.batchId.trim(),
    filters.deliveryDateRange.preset !== 'ALL' ? filters.deliveryDateRange.preset : '',
    filters.productCode.trim(),
    filters.productName.trim(),
    filters.scanCenter.trim(),
    filters.storeCode.trim(),
    filters.storeName.trim(),
  ].filter(Boolean).length;
}

function createScanSummary(lines: ScanLine[]) {
  return {
    centers: uniqueValues(lines.map((line) => line.scanCenter)).length,
    labelQty: lines.reduce((sum, line) => sum + line.labelQty, 0),
    stores: uniqueValues(lines.map((line) => line.orderBusinessSiteCode)).length,
    total: lines.length,
  };
}

function includesText(value: string, query: string) {
  return value.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
}

function uniqueValues(values: string[]) {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}
