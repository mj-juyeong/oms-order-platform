import { Link } from 'react-router-dom';
import { mockBatches } from '../api/mock';
import { DateInput, Input, Select } from '../components/common';
import { DataTable, FilterBar, Pagination, type DataTableColumn } from '../components/data';
import { BatchStatusBadge } from '../components/domain';
import type { UploadBatch } from '../types/batch';

const columns: DataTableColumn<UploadBatch>[] = [
  { key: 'id', header: '배치번호', width: '190px', cell: (item) => <Link className="font-mono text-teal-700 hover:underline" to={`/batches/${item.id}`}>{item.id}</Link> },
  { key: 'client', header: '고객사', cell: (item) => item.clientName },
  { key: 'fileName', header: '파일명', width: '300px', cell: (item) => item.fileName },
  { key: 'deliveryDate', header: '배송일', cell: (item) => item.deliveryDate },
  { key: 'status', header: '상태', cell: (item) => <BatchStatusBadge status={item.status} /> },
  { key: 'counts', header: 'E/W/I', cell: (item) => `${item.errorCount}/${item.warningCount}/${item.infoCount}` },
  { key: 'total', header: '총 행 수', align: 'right', cell: (item) => item.totalRowCount.toLocaleString() },
  { key: 'uploadedBy', header: '업로드자', cell: (item) => item.uploadedBy },
  { key: 'uploadedAt', header: '업로드시각', width: '150px', cell: (item) => item.uploadedAt },
  { key: 'confirmedAt', header: '확정시각', width: '150px', cell: (item) => item.confirmedAt ?? '-' },
];

export function BatchesPage() {
  return (
    <div className="space-y-5">
      <FilterBar>
        <Select label="고객사" options={[{ label: '전체', value: 'all' }, { label: '웰스토리', value: 'wellstory' }]} />
        <DateInput label="배송일 시작" />
        <DateInput label="배송일 종료" />
        <Select label="배치 상태" options={[{ label: '전체', value: 'all' }, { label: '확정 완료', value: 'CONFIRMED' }, { label: '검증 실패', value: 'VALIDATION_FAILED' }]} />
        <Input label="업로드자" placeholder="운영자" />
        <Input label="파일명" placeholder="xlsm" />
        <Input label="배치번호" placeholder="BATCH-" />
      </FilterBar>
      <DataTable columns={columns} data={mockBatches} getRowKey={(item) => item.id} />
      <Pagination page={1} total={mockBatches.length} totalPages={1} />
    </div>
  );
}
