import { mockAuditLogs } from '../api/mock';
import { DateInput, Input, Select } from '../components/common';
import { DataTable, FilterBar, Pagination, type DataTableColumn } from '../components/data';
import type { AuditLog } from '../types/audit';

const columns: DataTableColumn<AuditLog>[] = [
  { key: 'type', header: '로그 유형', cell: (item) => item.logType },
  { key: 'batch', header: '배치번호', width: '190px', cell: (item) => item.batchId ? <span className="font-mono">{item.batchId}</span> : '-' },
  { key: 'action', header: 'action/path', width: '230px', cell: (item) => <span className="font-mono text-slate-900">{item.actionOrPath}</span> },
  { key: 'status', header: '상태', cell: (item) => item.status },
  { key: 'actor', header: 'actor/API key', cell: (item) => item.actorName },
  { key: 'occurredAt', header: '발생시각', width: '160px', cell: (item) => item.occurredAt },
  { key: 'responseTime', header: '응답시간', align: 'right', cell: (item) => item.responseTimeMs ? `${item.responseTimeMs}ms` : '-' },
  { key: 'message', header: '메시지', width: '240px', cell: (item) => item.message },
];

export function AuditPage() {
  return (
    <div className="space-y-5">
      <FilterBar>
        <DateInput label="기간 시작" />
        <DateInput label="기간 종료" />
        <Select label="로그 유형" options={[{ label: '전체', value: 'all' }, { label: '배치', value: 'BATCH' }, { label: '다운로드', value: 'DOWNLOAD' }, { label: 'API', value: 'API' }]} />
        <Input label="배치번호" placeholder="BATCH-" />
        <Input label="action/path" placeholder="CONFIRM" />
        <Input label="actor" placeholder="운영자" />
      </FilterBar>
      <DataTable columns={columns} data={mockAuditLogs} getRowKey={(item) => item.id} />
      <Pagination page={1} total={mockAuditLogs.length} totalPages={1} />
    </div>
  );
}
