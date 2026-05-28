import { mockLabelDownloadRows } from '../api/mock';
import { Button, Input, Select } from '../components/common';
import { DataTable, FilterBar, Pagination, type DataTableColumn } from '../components/data';
import { BatchStatusBadge } from '../components/domain';
import type { LabelDownloadRow } from '../types/label';

const columns: DataTableColumn<LabelDownloadRow>[] = [
  { key: 'batch', header: '배치번호', width: '190px', cell: (item) => <span className="font-mono text-slate-900">{item.batchId}</span> },
  { key: 'client', header: '고객사', cell: (item) => item.clientName },
  { key: 'deliveryDate', header: '배송일', cell: (item) => item.deliveryDate },
  { key: 'status', header: '상태', cell: (item) => <BatchStatusBadge status={item.status} /> },
  { key: 'ea', header: 'Label EA', align: 'right', cell: (item) => item.labelEaCount },
  { key: 'box', header: 'Label BOX', align: 'right', cell: (item) => item.labelBoxCount },
  { key: 'downloadable', header: '다운로드 가능', cell: (item) => (item.downloadable ? '가능' : '확정 후 가능') },
  { key: 'last', header: '최근 다운로드시각', width: '160px', cell: (item) => item.lastDownloadedAt ?? '-' },
  { key: 'by', header: '다운로드자', cell: (item) => item.downloadedBy ?? '-' },
  { key: 'action', header: '액션', cell: (item) => <Button disabled size="sm" variant={item.downloadable ? 'primary' : 'secondary'}>다운로드 skeleton</Button> },
];

export function LabelDownloadsPage() {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        확정된 배치만 라벨 다운로드 대상입니다. 실제 다운로드 요청은 이번 Phase 3에서 구현하지 않습니다.
      </div>
      <FilterBar>
        <Input label="배치" placeholder="BATCH-" />
        <Select label="Label 유형" options={[{ label: '전체', value: 'all' }, { label: 'EA', value: 'EA' }, { label: 'BOX', value: 'BOX' }]} />
        <Input label="거래처코드" placeholder="S001" />
        <Input label="차량명" placeholder="11가" />
        <Input label="차수" placeholder="1" />
      </FilterBar>
      <DataTable columns={columns} data={mockLabelDownloadRows} getRowKey={(item) => item.id} />
      <Pagination page={1} total={mockLabelDownloadRows.length} totalPages={1} />
    </div>
  );
}
