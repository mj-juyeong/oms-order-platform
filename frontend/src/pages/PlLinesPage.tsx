import { mockPlLines } from '../api/mock';
import { DateInput, Input, Select } from '../components/common';
import { DataTable, FilterBar, Pagination, type DataTableColumn } from '../components/data';
import type { PlLine } from '../types/pl';

const columns: DataTableColumn<PlLine>[] = [
  { key: 'type', header: 'PL 유형', cell: (item) => item.plType },
  { key: 'orderNo', header: '주문번호', width: '180px', cell: (item) => <span className="font-mono text-slate-900">{item.orderNo}</span> },
  { key: 'storeCode', header: '거래처코드', cell: (item) => <span className="font-mono">{item.storeCode}</span> },
  { key: 'storeName', header: '거래처명', cell: (item) => item.storeName },
  { key: 'brand', header: '브랜드', cell: (item) => item.brandName },
  { key: 'productCode', header: '품목코드', cell: (item) => <span className="font-mono">{item.productCode}</span> },
  { key: 'productName', header: '품명', cell: (item) => item.productName },
  { key: 'unit', header: '단위', cell: (item) => item.unit },
  { key: 'temp', header: '보관온도', cell: (item) => item.storageTemperature },
  { key: 'dueDate', header: '납기요청일', cell: (item) => item.dueDate },
  { key: 'qty', header: '주문량', align: 'right', cell: (item) => item.orderQty },
  { key: 'vehicle', header: '차량명', cell: (item) => item.vehicleName },
  { key: 'cbm', header: 'CBM', align: 'right', cell: (item) => item.cbm },
  { key: 'qr', header: 'QR코드', width: '150px', cell: (item) => <span className="font-mono">{item.qrCode}</span> },
  { key: 'rowNo', header: 'rowNo', align: 'right', cell: (item) => item.rowNo },
];

export function PlLinesPage() {
  return (
    <div className="space-y-5">
      <FilterBar>
        <Input label="배치" placeholder="BATCH-" />
        <Select label="PL 유형" options={[{ label: '전체', value: 'all' }, { label: 'EA', value: 'EA' }, { label: 'BOX', value: 'BOX' }]} />
        <DateInput label="납기일" />
        <Input label="주문번호" placeholder="2025..." />
        <Input label="거래처코드" placeholder="S001" />
        <Input label="품목코드" placeholder="P000001" />
        <Input label="차량명" placeholder="11가" />
      </FilterBar>
      <DataTable columns={columns} data={mockPlLines} getRowKey={(item) => item.id} />
      <Pagination page={1} total={mockPlLines.length} totalPages={1} />
    </div>
  );
}
