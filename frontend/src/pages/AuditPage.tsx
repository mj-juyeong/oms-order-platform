import { useMemo, useState } from 'react';
import { mockAuditLogs } from '../api/mock';
import { DateRangeQuickFilter, Input, Select } from '../components/common';
import { DataTable, FilterBar, Pagination, type DataTableColumn } from '../components/data';
import type { AuditLog } from '../types/audit';
import { isDateInRange, type DateRangeValue } from '../utils/dateRange';

interface AuditFilters {
  action: string;
  actor: string;
  batchId: string;
  dateRange: DateRangeValue;
  logType: 'ALL' | AuditLog['logType'];
}

const initialFilters: AuditFilters = {
  action: '',
  actor: '',
  batchId: '',
  dateRange: { preset: 'ALL', from: '', to: '' },
  logType: 'ALL',
};

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
  const [filters, setFilters] = useState<AuditFilters>(initialFilters);
  const rows = useMemo(() => filterAuditLogs(mockAuditLogs, filters), [filters]);

  function updateFilter<TKey extends keyof AuditFilters>(key: TKey, value: AuditFilters[TKey]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="space-y-5">
      <FilterBar onReset={() => setFilters(initialFilters)}>
        <DateRangeQuickFilter label="발생시각" onChange={(value) => updateFilter('dateRange', value)} value={filters.dateRange} />
        <Select
          label="로그 유형"
          onChange={(event) => updateFilter('logType', event.target.value as AuditFilters['logType'])}
          options={[{ label: '전체', value: 'ALL' }, { label: '배치', value: 'BATCH' }, { label: '다운로드', value: 'DOWNLOAD' }, { label: 'API', value: 'API' }]}
          value={filters.logType}
        />
        <Input label="배치번호" onChange={(event) => updateFilter('batchId', event.target.value)} placeholder="BATCH-" value={filters.batchId} />
        <Input label="action/path" onChange={(event) => updateFilter('action', event.target.value)} placeholder="CONFIRM" value={filters.action} />
        <Input label="actor" onChange={(event) => updateFilter('actor', event.target.value)} placeholder="운영자" value={filters.actor} />
      </FilterBar>
      <DataTable columns={columns} data={rows} getRowKey={(item) => item.id} />
      <Pagination page={1} total={rows.length} totalPages={1} />
    </div>
  );
}

function filterAuditLogs(rows: AuditLog[], filters: AuditFilters) {
  return rows.filter((row) => {
    if (!isDateInRange(row.occurredAt, filters.dateRange)) {
      return false;
    }

    if (filters.logType !== 'ALL' && row.logType !== filters.logType) {
      return false;
    }

    return (
      includesText(row.batchId ?? '', filters.batchId) &&
      includesText(row.actionOrPath, filters.action) &&
      includesText(row.actorName, filters.actor)
    );
  });
}

function includesText(value: string, query: string) {
  return value.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
}
