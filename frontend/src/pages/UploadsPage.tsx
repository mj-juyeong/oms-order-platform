import { mockBatches, mockProductVersions, mockStoreRouteVersions } from '../api/mock';
import { Button, Card, Input, Select } from '../components/common';
import { DataTable, type DataTableColumn } from '../components/data';
import { FileUploadDropzone, MasterVersionSelector } from '../components/domain';
import type { SheetResult } from '../types/batch';

const columns: DataTableColumn<SheetResult>[] = [
  { key: 'sheetName', header: '시트명', width: '180px', cell: (item) => <span className="font-mono text-slate-900">{item.sheetName}</span> },
  { key: 'sheetType', header: '시트유형', cell: (item) => item.sheetType },
  { key: 'suffix', header: 'suffix', cell: (item) => item.suffix ?? '-' },
  { key: 'rowCount', header: '데이터 행 수', align: 'right', cell: (item) => item.rowCount.toLocaleString() },
  { key: 'status', header: '상태', cell: (item) => item.status },
  { key: 'message', header: '메시지', width: '260px', cell: (item) => item.message },
];

export function UploadsPage() {
  const sheetResults = mockBatches[0]?.sheetResults ?? [];

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <FileUploadDropzone acceptLabel="XLSM" description="실제 업로드, 파싱, 저장은 Phase 4 이후 구현합니다." />
        <Card className="p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="배송일" type="date" value="2025-12-15" readOnly />
            <Select label="고객사" options={[{ label: '웰스토리', value: 'wellstory' }]} />
            <MasterVersionSelector label="상품 마스터 버전" versions={mockProductVersions} />
            <MasterVersionSelector label="배송지/차량 마스터 버전" versions={mockStoreRouteVersions} />
          </div>
          <div className="mt-5 flex justify-end">
            <Button disabled variant="primary">
              업로드 시작 skeleton
            </Button>
          </div>
        </Card>
      </div>
      <DataTable columns={columns} data={sheetResults} getRowKey={(item) => item.sheetName} />
    </div>
  );
}
