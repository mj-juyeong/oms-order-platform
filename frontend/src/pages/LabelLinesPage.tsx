import { mockLabelLines } from '../api/mock';
import { Input, Select } from '../components/common';
import { DataTable, FilterBar, Pagination, type DataTableColumn } from '../components/data';
import type { LabelLine } from '../types/label';

const columns: DataTableColumn<LabelLine>[] = [
  { key: 'type', header: 'Label 유형', cell: (item) => item.labelType },
  { key: 'orderNo', header: '주문번호', width: '180px', cell: (item) => <span className="font-mono text-slate-900">{item.orderNo}</span> },
  { key: 'storeCode', header: '거래처코드', cell: (item) => <span className="font-mono">{item.storeCode}</span> },
  { key: 'storeName', header: '거래처명', cell: (item) => item.storeName },
  { key: 'productCode', header: '품목코드', cell: (item) => <span className="font-mono">{item.productCode}</span> },
  { key: 'productName', header: '품명', cell: (item) => item.productName },
  { key: 'qty', header: '주문량', align: 'right', cell: (item) => item.orderQty },
  { key: 'sequence', header: '순번', cell: (item) => item.sequence },
  { key: 'matchingCode', header: '매칭코드', width: '140px', cell: (item) => <span className="font-mono">{item.matchingCode}</span> },
  { key: 'qr', header: 'QR코드', width: '160px', cell: (item) => <span className="font-mono">{item.qrCode || '-'}</span> },
  { key: 'boxSequence', header: '박스순번', cell: (item) => item.boxSequence ?? '-' },
  { key: 'totalBoxQty', header: '총박스수량', align: 'right', cell: (item) => item.totalBoxQty ?? '-' },
  { key: 'rowNo', header: 'rowNo', align: 'right', cell: (item) => item.rowNo },
];

export function LabelLinesPage() {
  return (
    <div className="space-y-5">
      <FilterBar>
        <Input label="배치" placeholder="BATCH-" />
        <Select label="Label 유형" options={[{ label: '전체', value: 'all' }, { label: 'EA', value: 'EA' }, { label: 'BOX', value: 'BOX' }]} />
        <Input label="주문번호" placeholder="2025..." />
        <Input label="거래처코드" placeholder="S001" />
        <Input label="품목코드" placeholder="P000001" />
        <Input label="매칭코드" placeholder="M-" />
        <Input label="QR코드" placeholder="QR-" />
      </FilterBar>
      <DataTable columns={columns} data={mockLabelLines} getRowKey={(item) => item.id} />
      <Pagination page={1} total={mockLabelLines.length} totalPages={1} />
    </div>
  );
}
