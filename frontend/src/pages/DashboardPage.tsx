import { Link } from 'react-router-dom';
import { Select } from '../components/common';
import { DataTable, FilterBar, type DataTableColumn } from '../components/data';
import { BatchStatusBadge, MetricCard } from '../components/domain';
import { mockBatches } from '../api/mock';
import type { UploadBatch } from '../types/batch';

const columns: DataTableColumn<UploadBatch>[] = [
  { key: 'id', header: '배치번호', width: '190px', cell: (item) => <Link className="font-mono text-teal-700 hover:underline" to={`/batches/${item.id}`}>{item.id}</Link> },
  { key: 'client', header: '고객사', cell: (item) => item.clientName },
  { key: 'deliveryDate', header: '배송일', cell: (item) => item.deliveryDate },
  { key: 'status', header: '상태', cell: (item) => <BatchStatusBadge status={item.status} /> },
  { key: 'errors', header: 'Error/Warning', cell: (item) => `${item.errorCount} / ${item.warningCount}` },
  { key: 'uploadedBy', header: '업로드자', cell: (item) => item.uploadedBy },
  { key: 'uploadedAt', header: '업로드시각', width: '150px', cell: (item) => item.uploadedAt },
  { key: 'confirmedAt', header: '확정시각', width: '150px', cell: (item) => item.confirmedAt ?? '-' },
];

export function DashboardPage() {
  const confirmedCount = mockBatches.filter((batch) => batch.status === 'CONFIRMED').length;
  const errorCount = mockBatches.filter((batch) => batch.errorCount > 0).length;

  return (
    <div className="space-y-5">
      <FilterBar>
        <Select label="고객사" options={[{ label: '웰스토리', value: 'wellstory' }]} />
        <Select label="기간" options={[{ label: '오늘', value: 'today' }, { label: '최근 7일', value: '7days' }]} />
        <Select label="상태" options={[{ label: '전체', value: 'all' }, { label: '확정 완료', value: 'CONFIRMED' }]} />
        <div className="flex items-end">
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            to="/uploads"
          >
            업로드 화면
          </Link>
        </div>
      </FilterBar>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard description="mock 기준 오늘 생성된 배치" label="오늘 업로드" value={2} tone="blue" />
        <MetricCard description="외부 API와 라벨 다운로드 가능" label="확정 완료" value={confirmedCount} tone="green" />
        <MetricCard description="Error 존재로 확정 차단" label="검증 실패" value={errorCount} tone="red" />
        <MetricCard description="Error는 없고 확정 대기" label="확정 대기" value={1} tone="amber" />
      </div>

      <DataTable columns={columns} data={mockBatches} getRowKey={(item) => item.id} />
    </div>
  );
}
