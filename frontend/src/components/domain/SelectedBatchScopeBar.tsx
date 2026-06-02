import { Button, Card } from '../common';
import { CodeCell } from './CodeCell';

interface SelectedBatchScopeBarProps {
  batchId: string;
  batchNo?: string;
  clientName?: string;
  deliveryDate?: string | null;
  onChooseBatch: () => void;
}

export function SelectedBatchScopeBar({
  batchId,
  batchNo,
  clientName,
  deliveryDate,
  onChooseBatch,
}: SelectedBatchScopeBarProps) {
  const label = batchNo || (batchId ? `Batch ${batchId}` : '-');

  return (
    <Card className="px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-xs font-semibold text-slate-500">선택 배치</span>
          <CodeCell value={label} />
          {clientName ? <span className="text-sm font-semibold text-slate-700">{clientName}</span> : null}
          {deliveryDate ? <span className="text-sm text-slate-500">납기일 {deliveryDate}</span> : null}
        </div>
        <Button className="shrink-0" onClick={onChooseBatch} size="sm" variant="secondary">
          배치 선택하기
        </Button>
      </div>
    </Card>
  );
}
