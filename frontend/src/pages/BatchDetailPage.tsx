import { Link, useParams } from 'react-router-dom';
import { mockBatches } from '../api/mock';
import { Button, Card } from '../components/common';
import { DataTable, type DataTableColumn } from '../components/data';
import { BatchStatusBadge, MetricCard } from '../components/domain';
import type { SheetResult } from '../types/batch';

const sheetColumns: DataTableColumn<SheetResult>[] = [
  { key: 'sheetName', header: '시트명', width: '180px', cell: (item) => <span className="font-mono text-slate-900">{item.sheetName}</span> },
  { key: 'sheetType', header: '시트유형', cell: (item) => item.sheetType },
  { key: 'suffix', header: 'suffix', cell: (item) => item.suffix ?? '-' },
  { key: 'rowCount', header: '행 수', align: 'right', cell: (item) => item.rowCount.toLocaleString() },
  { key: 'status', header: '파싱 상태', cell: (item) => item.status },
  { key: 'errorCount', header: 'Error', align: 'right', cell: (item) => item.errorCount },
  { key: 'warningCount', header: 'Warning', align: 'right', cell: (item) => item.warningCount },
];

export function BatchDetailPage() {
  const { batchId } = useParams();
  const batch = mockBatches.find((item) => item.id === batchId) ?? mockBatches[0];

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-lg font-bold text-slate-950">{batch.id}</span>
              <BatchStatusBadge status={batch.status} />
            </div>
            <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
              <Meta label="고객사" value={batch.clientName} />
              <Meta label="배송일" value={batch.deliveryDate} />
              <Meta label="원본 파일명" value={batch.fileName} />
              <Meta label="업로드자" value={batch.uploadedBy} />
              <Meta label="업로드시각" value={batch.uploadedAt} />
              <Meta label="상품 마스터" value={batch.productMasterVersion} />
              <Meta label="배송지/차량 마스터" value={batch.storeRouteMasterVersion} />
            </dl>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled>재검증 skeleton</Button>
            <Button disabled={batch.errorCount > 0} variant="primary">확정 skeleton</Button>
            <Button disabled variant="secondary">취소 skeleton</Button>
            <Button disabled variant="danger">롤백 skeleton</Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard description="전체 입력 시트 행 수" label="총 행 수" value={batch.totalRowCount.toLocaleString()} />
        <MetricCard description="확정 차단 오류" label="Error" value={batch.errorCount} tone="red" />
        <MetricCard description="운영 확인 필요" label="Warning" value={batch.warningCount} tone="amber" />
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          {['업로드', '파싱', '검증', '확정', '외부 제공/다운로드'].map((step, index) => (
            <span className="rounded-md bg-slate-100 px-3 py-1 font-medium" key={step}>
              {index + 1}. {step}
            </span>
          ))}
        </div>
        <p className="mt-3 text-sm text-red-700">Error가 있으면 확정 버튼은 비활성화됩니다. 실제 상태 변경 action은 구현하지 않았습니다.</p>
      </Card>

      <DataTable columns={sheetColumns} data={batch.sheetResults} emptyDescription="mock 배치에 시트 결과가 없습니다." getRowKey={(item) => item.sheetName} />
      <Link className="text-sm font-semibold text-teal-700 hover:underline" to={`/batches/${batch.id}/validation`}>
        검증 결과 skeleton 보기
      </Link>
    </div>
  );
}

function Meta({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-slate-900">{value ?? '-'}</dd>
    </div>
  );
}
