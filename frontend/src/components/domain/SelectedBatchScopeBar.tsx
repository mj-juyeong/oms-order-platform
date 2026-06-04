import { Button, Card } from '../common';
import { CodeCell } from './CodeCell';

interface SelectedBatchScopeBarProps {
  batchId: string;
  batchNo?: string;
  batchActionLabel?: string;
  clientActionLabel?: string;
  clientName?: string;
  deliveryDate?: string | null;
  onChooseBatch: () => void;
  onChooseClient?: () => void;
}

export function SelectedBatchScopeBar({
  batchId,
  batchNo,
  batchActionLabel = '배치 선택하기',
  clientActionLabel = '고객사 선택하기',
  clientName,
  deliveryDate,
  onChooseBatch,
  onChooseClient,
}: SelectedBatchScopeBarProps) {
  const label = batchNo || (batchId ? `Batch ${batchId}` : '전체 배치');

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-end gap-2">
        {onChooseClient ? (
          <Button className="min-w-[124px]" onClick={onChooseClient} size="md" variant="ghost">
            {clientActionLabel}
          </Button>
        ) : null}
        <Button className="min-w-[118px]" onClick={onChooseBatch} size="md" variant="secondary">
          {batchActionLabel}
        </Button>
      </div>
      <Card className="px-4 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-xs font-semibold text-slate-500">조회 배치</span>
          <CodeCell value={label} />
          <span className="text-sm font-semibold text-slate-700">{clientName ?? '전체 고객사'}</span>
          {deliveryDate ? <span className="text-sm text-slate-500">납기일 {deliveryDate}</span> : null}
        </div>
      </Card>
    </div>
  );
}
