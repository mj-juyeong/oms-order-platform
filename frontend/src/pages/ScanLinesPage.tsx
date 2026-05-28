import { mockScanLines } from '../api/mock';
import { DateInput, Input } from '../components/common';
import { DataTable, FilterBar, Pagination, type DataTableColumn } from '../components/data';
import type { ScanLine } from '../types/scan';

const columns: DataTableColumn<ScanLine>[] = [
  { key: 'barcode', header: '바코드', width: '190px', cell: (item) => <span className="font-mono text-slate-900">{item.barcode}</span> },
  { key: 'batch', header: '배치번호', width: '190px', cell: (item) => <span className="font-mono">{item.batchId}</span> },
  { key: 'sheet', header: '시트명', width: '170px', cell: (item) => <span className="font-mono">{item.sheetName}</span> },
  { key: 'center', header: 'scanCenter', cell: (item) => item.scanCenter },
  { key: 'deliveryDate', header: '배송일', cell: (item) => item.deliveryDate },
  { key: 'bus', header: '버스', cell: (item) => item.bus },
  { key: 'storeCode', header: '주문사업장코드', cell: (item) => <span className="font-mono">{item.orderBusinessSiteCode}</span> },
  { key: 'storeName', header: '주문사업장명', cell: (item) => item.storeName },
  { key: 'productCode', header: '품목코드', cell: (item) => <span className="font-mono">{item.productCode}</span> },
  { key: 'productName', header: '품목명', cell: (item) => item.productName },
  { key: 'labelQty', header: '라벨수량', align: 'right', cell: (item) => item.labelQty },
  { key: 'unit', header: '단위', cell: (item) => item.unit },
  { key: 'temperature', header: '온도유형', cell: (item) => item.temperatureType },
  { key: 'rowNo', header: 'rowNo', align: 'right', cell: (item) => item.rowNo },
];

export function ScanLinesPage() {
  return (
    <div className="space-y-5">
      <FilterBar>
        <Input label="배치" placeholder="BATCH-" />
        <DateInput label="배송일" />
        <Input label="scanCenter" placeholder="장지" />
        <Input label="주문사업장코드" placeholder="S001" />
        <Input label="품목코드" placeholder="P000001" />
        <Input label="바코드" placeholder="880..." />
      </FilterBar>
      <DataTable columns={columns} data={mockScanLines} getRowKey={(item) => item.id} />
      <Pagination page={1} total={mockScanLines.length} totalPages={1} />
    </div>
  );
}
