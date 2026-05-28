import { mockStoreRouteMasterItems, mockStoreRouteVersions } from '../api/mock';
import { Button, Card, Input, Select } from '../components/common';
import { DataTable, FilterBar, Pagination, type DataTableColumn } from '../components/data';
import { FileUploadDropzone, MasterVersionSelector } from '../components/domain';
import type { StoreRouteMasterItem } from '../types/master';

const columns: DataTableColumn<StoreRouteMasterItem>[] = [
  { key: 'baljugoCode', header: 'baljugoCode', width: '140px', cell: (item) => <span className="font-mono text-slate-900">{item.baljugoCode}</span> },
  { key: 'storeCode', header: '거래처코드', cell: (item) => <span className="font-mono">{item.storeCode}</span> },
  { key: 'brand', header: '브랜드명', cell: (item) => item.brandName },
  { key: 'store', header: '지점명', cell: (item) => item.storeName },
  { key: 'area', header: '권역', cell: (item) => item.area },
  { key: 'round', header: '차수', cell: (item) => item.deliveryRound },
  { key: 'vehicle', header: '차량명', cell: (item) => item.vehicleName },
  { key: 'driver', header: '담당기사', cell: (item) => item.driverName },
  { key: 'status', header: '운영여부', cell: (item) => item.operationStatus },
  { key: 'rowNo', header: 'rowNo', align: 'right', cell: (item) => item.rowNo },
];

export function StoreRouteMasterPage() {
  const active = mockStoreRouteVersions.find((version) => version.active);

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">현재 활성 배송지/차량 마스터</p>
            <p className="mt-1 text-sm text-slate-500">{active?.versionName} · {active?.uploadedAt} · {active?.rowCount.toLocaleString()} rows</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled>XLSX 업로드 skeleton</Button>
            <Button disabled variant="primary">활성화 skeleton</Button>
          </div>
        </div>
      </Card>
      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <FileUploadDropzone acceptLabel="XLSX" title="배송지/차량 마스터 XLSX skeleton" />
        <FilterBar>
          <MasterVersionSelector label="버전" versions={mockStoreRouteVersions} />
          <Select label="활성 여부" options={[{ label: '전체', value: 'all' }, { label: '활성', value: 'active' }]} />
          <Input label="발주고코드" placeholder="S001" />
          <Input label="거래처코드" placeholder="C001" />
          <Input label="브랜드명" placeholder="Brand" />
          <Input label="지점명" placeholder="강남점" />
          <Input label="권역" placeholder="수도권" />
          <Input label="차량명" placeholder="11가" />
        </FilterBar>
      </div>
      <DataTable columns={columns} data={mockStoreRouteMasterItems} getRowKey={(item) => item.id} />
      <Pagination page={1} total={mockStoreRouteMasterItems.length} totalPages={1} />
    </div>
  );
}
