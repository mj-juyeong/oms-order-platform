import { mockProductMasterItems, mockProductVersions } from '../api/mock';
import { Button, Card, Input, Select } from '../components/common';
import { DataTable, FilterBar, Pagination, type DataTableColumn } from '../components/data';
import { FileUploadDropzone, MasterVersionSelector } from '../components/domain';
import type { ProductMasterItem } from '../types/master';

const columns: DataTableColumn<ProductMasterItem>[] = [
  { key: 'ezadminCode', header: 'ezadminCode', width: '140px', cell: (item) => <span className="font-mono text-slate-900">{item.ezadminCode}</span> },
  { key: 'productName', header: '상품명', cell: (item) => item.productName },
  { key: 'clientProductCode', header: '거래처 상품코드', cell: (item) => <span className="font-mono">{item.clientProductCode}</span> },
  { key: 'boxQty', header: '박스입수량', align: 'right', cell: (item) => item.boxQty },
  { key: 'unit', header: '출고단위', cell: (item) => item.outboundUnit },
  { key: 'temp', header: '보관온도', cell: (item) => item.storageTemperature },
  { key: 'cbm', header: 'CBM', align: 'right', cell: (item) => item.cbm },
  { key: 'status', header: '운영여부', cell: (item) => item.operationStatus },
  { key: 'rowNo', header: 'rowNo', align: 'right', cell: (item) => item.rowNo },
];

export function ProductMasterPage() {
  const active = mockProductVersions.find((version) => version.active);

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">현재 활성 상품 마스터</p>
            <p className="mt-1 text-sm text-slate-500">{active?.versionName} · {active?.uploadedAt} · {active?.rowCount.toLocaleString()} rows</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled>CSV 업로드 skeleton</Button>
            <Button disabled variant="primary">활성화 skeleton</Button>
          </div>
        </div>
      </Card>
      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <FileUploadDropzone acceptLabel="CSV" title="상품 마스터 CSV skeleton" />
        <FilterBar>
          <MasterVersionSelector label="버전" versions={mockProductVersions} />
          <Select label="활성 여부" options={[{ label: '전체', value: 'all' }, { label: '활성', value: 'active' }]} />
          <Input label="이지어드민 상품코드" placeholder="P000001" />
          <Input label="상품명" placeholder="상품명" />
          <Select label="운영여부" options={[{ label: '전체', value: 'all' }, { label: '운영', value: 'ACTIVE' }]} />
          <Input label="보관온도" placeholder="냉장" />
        </FilterBar>
      </div>
      <DataTable columns={columns} data={mockProductMasterItems} getRowKey={(item) => item.id} />
      <Pagination page={1} total={mockProductMasterItems.length} totalPages={1} />
    </div>
  );
}
