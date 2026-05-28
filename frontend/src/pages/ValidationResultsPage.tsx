import { mockValidationErrors } from '../api/mock';
import { Input, Select } from '../components/common';
import { DataTable, FilterBar, Pagination, type DataTableColumn } from '../components/data';
import { SeverityBadge, ValidationErrorPanel } from '../components/domain';
import type { ValidationError } from '../types/validation';

const columns: DataTableColumn<ValidationError>[] = [
  { key: 'severity', header: 'Severity', cell: (item) => <SeverityBadge severity={item.severity} /> },
  { key: 'code', header: '오류 코드', cell: (item) => item.errorCode },
  { key: 'sheet', header: '시트명', width: '160px', cell: (item) => <span className="font-mono">{item.sheetName}</span> },
  { key: 'rowNo', header: 'rowNo', align: 'right', cell: (item) => item.rowNo },
  { key: 'column', header: '컬럼명', cell: (item) => item.columnName },
  { key: 'raw', header: '원본값', width: '150px', cell: (item) => <span className="font-mono text-slate-900">{item.rawValue}</span> },
  { key: 'normalized', header: '정규화값', width: '150px', cell: (item) => <span className="font-mono text-slate-900">{item.normalizedValue}</span> },
  { key: 'message', header: '메시지', width: '280px', cell: (item) => item.message },
  { key: 'related', header: '관련 코드', width: '140px', cell: (item) => <span className="font-mono">{item.relatedCode}</span> },
  { key: 'resolved', header: '처리 여부', cell: (item) => (item.resolved ? '처리됨' : '미처리') },
];

export function ValidationResultsPage() {
  return (
    <div className="space-y-5">
      <ValidationErrorPanel errorCount={2} infoCount={1} warningCount={1} />
      <FilterBar>
        <Select label="Severity" options={[{ label: '전체', value: 'all' }, { label: 'Error', value: 'ERROR' }, { label: 'Warning', value: 'WARNING' }, { label: 'Info', value: 'INFO' }]} />
        <Input label="시트명" placeholder="PL_EA" />
        <Input label="오류 코드" placeholder="VAL-010" />
        <Input label="컬럼명" placeholder="품목코드" />
        <Input label="rowNo" placeholder="12" />
        <Input label="상품코드" placeholder="P000001" />
        <Input label="거래처코드" placeholder="S001" />
      </FilterBar>
      <DataTable columns={columns} data={mockValidationErrors} getRowKey={(item) => item.id} />
      <Pagination page={1} total={mockValidationErrors.length} totalPages={1} />
    </div>
  );
}
