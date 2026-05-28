import { mockOrderLines } from '../api/mock';
import { Button, DateInput, Input, Select } from '../components/common';
import { DataTable, FilterBar, Pagination, type DataTableColumn } from '../components/data';
import type { OrderLine } from '../types/order';

const columns: DataTableColumn<OrderLine>[] = [
  { key: 'orderNo', header: '주문번호', width: '180px', cell: (item) => <span className="font-mono text-slate-900">{item.orderNo}</span> },
  { key: 'batchId', header: '배치번호', width: '190px', cell: (item) => <span className="font-mono">{item.batchId}</span> },
  { key: 'dueDate', header: '배송일/납기일', cell: (item) => item.dueDate },
  { key: 'storeCode', header: '거래처코드', cell: (item) => <span className="font-mono">{item.storeCode}</span> },
  { key: 'storeName', header: '거래처명', cell: (item) => item.storeName },
  { key: 'brand', header: '브랜드', cell: (item) => item.brandName },
  { key: 'productCode', header: '품목코드', cell: (item) => <span className="font-mono">{item.productCode}</span> },
  { key: 'productName', header: '품명', cell: (item) => item.productName },
  { key: 'unit', header: '단위', cell: (item) => item.unit },
  { key: 'qty', header: '주문량', align: 'right', cell: (item) => item.orderQty },
  { key: 'vehicle', header: '차량명', cell: (item) => item.vehicleName },
  { key: 'round', header: '차수', cell: (item) => item.deliveryRound },
  { key: 'area', header: '권역', cell: (item) => item.area },
];

export function OrdersPage() {
  return (
    <div className="space-y-5">
      <FilterBar>
        <Input label="배치" placeholder="BATCH-" />
        <DateInput label="배송일/납기일" />
        <Input label="주문번호" placeholder="2025..." />
        <Input label="거래처코드" placeholder="S001" />
        <Input label="거래처명" placeholder="강남점" />
        <Input label="품목코드" placeholder="P000001" />
        <Input label="품명" placeholder="상품명" />
        <Select label="단위" options={[{ label: '전체', value: 'all' }, { label: 'EA', value: 'EA' }, { label: 'BOX', value: 'BOX' }]} />
      </FilterBar>
      <div className="flex justify-end">
        <Button disabled variant="secondary">
          다운로드 skeleton
        </Button>
      </div>
      <DataTable columns={columns} data={mockOrderLines} getRowKey={(item) => item.id} />
      <Pagination page={1} total={mockOrderLines.length} totalPages={1} />
    </div>
  );
}
