import { useEffect, useState } from 'react';
import { CalendarDays, ListFilter, RotateCw } from 'lucide-react';
import { omsApi, type BackendBatchSummary } from '../../api/oms';
import { saveBatchContextSelection } from '../../app/batchContext';
import { todayString } from '../../utils/dateRange';
import { Badge, Button, Card, EmptyState, ErrorState, Input, LoadingState, Select } from '../common';

type BatchListMode = 'UPCOMING' | 'RECENT' | 'ALL';

interface BatchSelectionPanelProps {
  tenantId: number;
  clientId: number;
  clientName?: string;
  onChooseClient?: () => void;
  onSelectAllBatches: () => void;
  onSelectBatch: (batch: BackendBatchSummary) => void;
  title?: string;
  description?: string;
}

const pageSize = 24;

const modeOptions = [
  { label: '오늘 이후 예정', value: 'UPCOMING' },
  { label: '최근 업로드', value: 'RECENT' },
  { label: '전체', value: 'ALL' },
];

export function BatchSelectionPanel({
  tenantId,
  clientId,
  clientName,
  onChooseClient,
  onSelectAllBatches,
  onSelectBatch,
  title = '배치를 선택하세요',
  description = '선택한 배치 기준으로 주문, Scan, PL, Label 데이터를 조회합니다.',
}: BatchSelectionPanelProps) {
  const [mode, setMode] = useState<BatchListMode>('UPCOMING');
  const [appliedMode, setAppliedMode] = useState<BatchListMode>('UPCOMING');
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [batches, setBatches] = useState<BackendBatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadSeq, setReloadSeq] = useState(0);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(null);

    omsApi.batches
      .list({
        tenantId,
        clientId,
        page: 0,
        size: pageSize,
        keyword: appliedKeyword.trim() || undefined,
        status: 'CONFIRMED',
        deliveryDateFrom: appliedMode === 'UPCOMING' ? todayString() : undefined,
      })
      .then((response) => {
        if (!ignore) setBatches(response.items.filter((batch) => batch.status === 'CONFIRMED'));
      })
      .catch((loadError: unknown) => {
        if (!ignore) setError(loadError instanceof Error ? loadError.message : '배치 목록을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [appliedKeyword, appliedMode, clientId, reloadSeq, tenantId]);

  const hasPendingSearch = keyword.trim() !== appliedKeyword.trim() || mode !== appliedMode;
  const subtitle = clientName ? `${clientName} 고객사의 배치를 선택합니다.` : description;

  function applySearch() {
    setAppliedKeyword(keyword);
    setAppliedMode(mode);
  }

  function resetSearch() {
    setKeyword('');
    setAppliedKeyword('');
    setMode('UPCOMING');
    setAppliedMode('UPCOMING');
  }

  function selectBatch(batch: BackendBatchSummary) {
    if (batch.status !== 'CONFIRMED') {
      return;
    }
    saveBatchContextSelection(batch);
    onSelectBatch(batch);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        {onChooseClient ? (
          <Button onClick={onChooseClient} variant="ghost">
            고객사 선택하기
          </Button>
        ) : null}
        <Button onClick={onSelectAllBatches} variant="secondary">
          전체 배치 보기
        </Button>
      </div>
      <Card className="p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <CalendarDays aria-hidden="true" className="h-5 w-5 text-teal-700" />
              <h2 className="text-base font-bold text-slate-950">{title}</h2>
              {clientName ? <Badge tone="blue">{clientName}</Badge> : null}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
          </div>
          <div className="grid w-full gap-2 sm:grid-cols-[minmax(0,1fr)_160px_auto_auto] xl:max-w-3xl">
            <Input
              label="배치 찾기"
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') applySearch();
              }}
              placeholder="배치번호, 파일명"
              value={keyword}
            />
            <Select label="조회 범위" onChange={(event) => setMode(event.target.value as BatchListMode)} options={modeOptions} value={mode} />
            <Button className="self-end" onClick={applySearch} variant={hasPendingSearch ? 'primary' : 'secondary'}>
              <ListFilter aria-hidden="true" size={16} />
              배치 찾기
            </Button>
            <Button className="self-end" onClick={resetSearch} variant="ghost">
              초기화
            </Button>
          </div>
        </div>
      </Card>

      {loading ? (
        <LoadingState label="배치 목록을 불러오는 중입니다." />
      ) : error ? (
        <ErrorState description={error} onRetry={() => setReloadSeq((value) => value + 1)} title="배치 목록을 조회하지 못했습니다." />
      ) : batches.length === 0 ? (
        <EmptyState
          action={
            <Button
              onClick={() => {
                const nextMode = appliedMode === 'UPCOMING' ? 'RECENT' : 'UPCOMING';
                setMode(nextMode);
                setAppliedMode(nextMode);
              }}
              variant="secondary"
            >
              <RotateCw aria-hidden="true" size={16} />
              {appliedMode === 'UPCOMING' ? '최근 업로드 보기' : '오늘 이후 예정 보기'}
            </Button>
          }
          description="조회 범위와 검색어를 조정해 주세요."
          title="선택할 배치가 없습니다."
        />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {batches.map((batch) => {
            return (
              <Card className="p-4" key={batch.id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-slate-950">{batch.batchNo}</p>
                    <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <BatchFact label="납기일" value={batch.deliveryDate ?? '-'} />
                      <BatchFact label="업로드" value={formatDateTime(batch.uploadedAt)} />
                      <BatchFact label="오류" value={`E ${batch.errorCount} / W ${batch.warningCount} / I ${batch.infoCount}`} />
                      <BatchFact label="개정" value={`rev.${batch.revisionNo}`} />
                    </dl>
                  </div>
                  <Button
                    className="w-full lg:w-auto"
                    onClick={() => selectBatch(batch)}
                    variant="primary"
                  >
                    이 배치 조회
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BatchFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-2">
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="truncate text-slate-900">{value}</dd>
    </div>
  );
}

function formatDateTime(value: string) {
  if (!value) return '-';
  return value.replace('T', ' ').slice(0, 16);
}
