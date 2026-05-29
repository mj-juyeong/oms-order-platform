import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { OmsApiError } from '../api/client';
import { omsApi, type BackendBatchDetail } from '../api/oms';
import { fakeCurrentUser } from '../app/auth';
import { Badge, Button, Card, FullScreenLoadingOverlay } from '../components/common';
import { DataTable, type DataTableColumn } from '../components/data';
import { BatchStatusBadge, MetricCard } from '../components/domain';
import type { SheetResult } from '../types/batch';

type ProgressStepKey = 'uploaded' | 'parsed' | 'validated' | 'confirmed' | 'available';
type ActionState = 'validate' | 'confirm' | null;

const progressSteps: Array<{ key: ProgressStepKey; label: string; description: string }> = [
  { key: 'uploaded', label: '업로드 완료', description: '파일 접수' },
  { key: 'parsed', label: '파일 확인', description: '데이터 인식' },
  { key: 'validated', label: '검증 완료', description: '오류 확인' },
  { key: 'confirmed', label: '배치 확정', description: '후속 처리 가능' },
  { key: 'available', label: '제공/다운로드', description: 'API 및 라벨' },
];

const sheetStatusTone: Record<SheetResult['status'], 'green' | 'amber' | 'red'> = {
  NORMAL: 'green',
  WARNING: 'amber',
  ERROR: 'red',
};

const sheetStatusLabel: Record<SheetResult['status'], string> = {
  NORMAL: '정상',
  WARNING: '확인 권장',
  ERROR: '오류 있음',
};

const tenantId = fakeCurrentUser.tenantId ?? 1;
const clientId = fakeCurrentUser.clientId ?? 1;

export function BatchDetailPage() {
  const { batchId } = useParams();
  const numericBatchId = Number(batchId);
  const [batch, setBatch] = useState<BackendBatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionState, setActionState] = useState<ActionState>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sheetResults = useMemo(() => mapSheetResults(batch), [batch]);
  const totalRowCount = useMemo(() => sheetResults.reduce((sum, sheet) => sum + sheet.rowCount, 0), [sheetResults]);
  const canValidate = batch ? batch.status === 'UPLOADED' || batch.status === 'VALIDATION_FAILED' || batch.status === 'READY_TO_CONFIRM' : false;
  const canConfirm = batch?.status === 'READY_TO_CONFIRM' && batch.errorCount === 0;
  const confirmed = batch?.status === 'CONFIRMED';

  useEffect(() => {
    loadBatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numericBatchId]);

  async function loadBatch() {
    if (!Number.isInteger(numericBatchId) || numericBatchId <= 0) {
      setErrorMessage('유효하지 않은 배치 ID입니다.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await omsApi.batches.detail(numericBatchId, { tenantId, clientId });
      setBatch(result);
    } catch (error) {
      setErrorMessage(formatApiError(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleValidate() {
    if (!batch) return;
    setActionState('validate');
    setErrorMessage(null);
    try {
      await omsApi.batches.validate(batch.id, { tenantId, clientId, actorId: fakeCurrentUser.id ?? undefined });
      await loadBatch();
    } catch (error) {
      setErrorMessage(formatApiError(error));
    } finally {
      setActionState(null);
    }
  }

  async function handleConfirm() {
    if (!batch) return;
    setActionState('confirm');
    setErrorMessage(null);
    try {
      await omsApi.batches.confirm(batch.id, { tenantId, clientId, actorId: fakeCurrentUser.id ?? undefined });
      await loadBatch();
    } catch (error) {
      setErrorMessage(formatApiError(error));
    } finally {
      setActionState(null);
    }
  }

  if (loading) {
    return <LoadingCard message="배치 상세를 불러오는 중입니다." />;
  }

  if (!batch) {
    return <ApiErrorCard message={errorMessage ?? '배치 정보를 찾을 수 없습니다.'} onRetry={loadBatch} />;
  }

  return (
    <div className="space-y-5">
      {actionState === 'validate' ? (
        <FullScreenLoadingOverlay
          description="현재 마스터 기준으로 오류와 경고를 확인하는 중입니다. 잠시만 기다려 주세요."
          detail={batch.batchNo}
          title="배치 검증을 실행하고 있습니다"
        />
      ) : null}
      {actionState === 'confirm' ? (
        <FullScreenLoadingOverlay
          description="확정 가능 여부를 확인하고 배치를 확정하는 중입니다. 잠시만 기다려 주세요."
          detail={batch.batchNo}
          title="배치를 확정하고 있습니다"
        />
      ) : null}
      {errorMessage ? <ApiErrorCard message={errorMessage} onRetry={loadBatch} /> : null}
      <BatchHeader
        actionState={actionState}
        batch={batch}
        canConfirm={canConfirm}
        canValidate={canValidate}
        confirmed={Boolean(confirmed)}
        onConfirm={handleConfirm}
        onValidate={handleValidate}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard description="업로드된 전체 데이터 행 수" label="총 행 수" value={totalRowCount.toLocaleString()} />
        <MetricCard description="확정 전 반드시 확인" label="Error" value={batch.errorCount} tone="red" />
        <MetricCard description="운영 확인 권장" label="Warning" value={batch.warningCount} tone="amber" />
        <MetricCard description="참고 안내" label="Info" value={batch.infoCount} tone="blue" />
      </div>

      <BatchProgress batch={batch} />
      <ValidationPolicyPanel batch={batch} canConfirm={canConfirm} />

      <Card className="p-5">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-base font-bold text-slate-950">데이터 인식 결과</p>
            <p className="mt-1 text-sm text-slate-500">업로드된 엑셀에서 Backend가 인식한 시트와 검증 요약입니다.</p>
          </div>
          <Link className="text-sm font-semibold text-teal-700 hover:text-teal-800" to={`/batches/${batch.id}/validation`}>
            검증 결과 전체 보기
          </Link>
        </div>
        <div className="mt-4">
          <DataTable columns={createSheetColumns()} data={sheetResults} getRowClassName={sheetRowClassName} getRowKey={(item) => item.sheetName} />
        </div>
      </Card>
    </div>
  );
}

function BatchHeader({
  actionState,
  batch,
  canConfirm,
  canValidate,
  confirmed,
  onConfirm,
  onValidate,
}: {
  actionState: ActionState;
  batch: BackendBatchDetail;
  canConfirm: boolean;
  canValidate: boolean;
  confirmed: boolean;
  onConfirm: () => void;
  onValidate: () => void;
}) {
  const uploadedFile = batch.uploadedFiles[0];

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-lg font-bold text-slate-950">{batch.batchNo}</span>
            <BatchStatusBadge status={batch.status} />
            {batch.errorCount > 0 ? <Badge tone="red">확정 불가</Badge> : null}
            {confirmed ? <Badge tone="green">후속 처리 가능</Badge> : null}
          </div>

          <div className="shrink-0">
            <BatchPrimaryActions
              actionState={actionState}
              batch={batch}
              canConfirm={canConfirm}
              canValidate={canValidate}
              confirmed={confirmed}
              onConfirm={onConfirm}
              onValidate={onValidate}
            />
          </div>
        </div>

        <BatchStatusSummary batch={batch} canConfirm={canConfirm} confirmed={confirmed} />
        <p className="text-xs leading-5 text-slate-500">{actionHint(batch, canConfirm, confirmed)}</p>
        <dl className="grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-4">
          <Meta label="배송일" value={batch.deliveryDate ?? undefined} />
          <Meta label="원본 파일명" value={uploadedFile?.originalFileName} />
          <Meta label="업로드시각" value={formatDateTime(batch.uploadedAt)} />
          <Meta label="파일 크기" value={uploadedFile ? formatFileSize(uploadedFile.fileSize) : undefined} />
          <Meta label="메모" value={batch.memo ?? undefined} />
        </dl>
      </div>
    </Card>
  );
}

function BatchPrimaryActions({
  actionState,
  batch,
  canConfirm,
  canValidate,
  confirmed,
  onConfirm,
  onValidate,
}: {
  actionState: ActionState;
  batch: BackendBatchDetail;
  canConfirm: boolean;
  canValidate: boolean;
  confirmed: boolean;
  onConfirm: () => void;
  onValidate: () => void;
}) {
  if (confirmed) {
    return (
      <div className="flex flex-wrap gap-2 xl:justify-end">
        <Link
          className="inline-flex h-10 min-w-28 items-center justify-center rounded-md border border-teal-700 bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
          to="/downloads/labels"
        >
          라벨 다운로드
        </Link>
        <Button className="min-w-28" variant="secondary">API 제공 상태</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 xl:justify-end">
      <Button className="min-w-24" disabled={!canValidate || actionState !== null} onClick={onValidate} variant="secondary">
        {actionState === 'validate' ? '검증 중' : '검증 실행'}
      </Button>
      <Link
        className="inline-flex h-10 min-w-24 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        to={`/batches/${batch.id}/validation`}
      >
        검증 결과
      </Link>
      <Button className="min-w-24" disabled={!canConfirm || actionState !== null} onClick={onConfirm} variant="primary">
        {actionState === 'confirm' ? '확정 중' : '배치 확정'}
      </Button>
    </div>
  );
}

function BatchStatusSummary({ batch, canConfirm, confirmed }: { batch: BackendBatchDetail; canConfirm: boolean; confirmed: boolean }) {
  const tone = confirmed ? 'green' : batch.errorCount > 0 ? 'red' : canConfirm ? 'blue' : 'slate';
  const toneClass = {
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    red: 'border-red-200 bg-red-50 text-red-800',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
  }[tone];
  const title = confirmed
    ? '확정된 배치입니다'
    : batch.errorCount > 0
      ? `Error ${batch.errorCount}건이 있어 확정할 수 없습니다`
      : canConfirm
        ? 'Error가 없어 배치 확정이 가능합니다'
        : '검증 상태를 확인한 뒤 다음 작업을 진행하세요';
  const description = confirmed
    ? '라벨 다운로드와 외부 API 제공 상태를 확인할 수 있습니다.'
    : batch.errorCount > 0
      ? '검증 결과에서 오류 항목을 먼저 확인하세요.'
      : canConfirm
        ? 'Warning 항목을 확인한 뒤 확정을 진행하세요.'
        : '검증 전 또는 검증 진행 중인 배치는 확정할 수 없습니다.';

  return (
    <div className={`rounded-md border px-4 py-3 ${toneClass}`}>
      <p className="text-sm font-bold">{title}</p>
      <p className="mt-1 text-sm leading-5">{description}</p>
    </div>
  );
}

function BatchProgress({ batch }: { batch: BackendBatchDetail }) {
  const currentIndex = getProgressIndex(batch);

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-base font-bold text-slate-950">처리 진행 상태</p>
          <p className="mt-1 text-sm text-slate-500">배치가 현재 어느 단계까지 진행되었는지 확인합니다.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          {progressSteps.map((step, index) => {
            const complete = index < currentIndex;
            const active = index === currentIndex;
            const blockedValidation = step.key === 'validated' && active && batch.errorCount > 0;

            return (
              <div
                className={`rounded-md border px-4 py-3 ${
                  blockedValidation
                    ? 'border-red-300 bg-red-50'
                    : active
                      ? 'border-teal-300 bg-teal-50'
                      : complete
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-slate-200 bg-slate-50'
                }`}
                key={step.key}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      blockedValidation
                        ? 'bg-red-600 text-white'
                        : active || complete
                          ? 'bg-teal-700 text-white'
                          : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {complete ? '✓' : index + 1}
                  </span>
                  <span className="text-sm font-semibold text-slate-950">{blockedValidation ? '검증 확인 필요' : step.label}</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">{blockedValidation ? 'Error 확인 후 확정 가능' : step.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function ValidationPolicyPanel({ batch, canConfirm }: { batch: BackendBatchDetail; canConfirm: boolean }) {
  const tone = batch.errorCount > 0 ? 'red' : batch.status === 'CONFIRMED' ? 'green' : 'blue';
  const title =
    batch.errorCount > 0
      ? '오류가 있어 배치를 확정할 수 없습니다'
      : batch.status === 'CONFIRMED'
        ? '확정된 배치입니다'
        : canConfirm
          ? '배치 확정이 가능합니다'
          : '검증 결과 확인이 필요합니다';
  const message =
    batch.errorCount > 0
      ? '검증 결과에서 Error 항목을 먼저 확인하세요. Error가 남아 있으면 외부 제공과 라벨 다운로드를 진행할 수 없습니다.'
      : batch.status === 'CONFIRMED'
        ? '외부 API 제공과 라벨 다운로드 대상입니다. 필요한 후속 작업을 진행하세요.'
        : canConfirm
          ? 'Error가 없습니다. Warning 항목을 확인한 뒤 배치를 확정할 수 있습니다.'
          : '검증이 끝나지 않았거나 확정할 수 없는 상태입니다.';

  const toneClass = {
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    red: 'border-red-200 bg-red-50 text-red-800',
  }[tone];

  return (
    <Card className={`p-5 ${toneClass}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-bold">{title}</p>
          <p className="mt-2 text-sm leading-6">{message}</p>
        </div>
        {batch.status !== 'CONFIRMED' ? (
          <div className="flex flex-wrap gap-2">
            <Badge tone="neutral">외부 API 제공 불가</Badge>
            <Badge tone="neutral">라벨 다운로드 불가</Badge>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function createSheetColumns(): DataTableColumn<SheetResult>[] {
  return [
    { key: 'sheetName', header: '원본 시트명', width: '190px', cell: (item) => <span className="font-mono text-slate-900">{item.sheetName}</span> },
    { key: 'sheetType', header: '데이터 유형', cell: (item) => sheetTypeLabel(item) },
    { key: 'suffix', header: '구분', cell: (item) => item.suffix ?? '-' },
    { key: 'rowCount', header: '데이터 행 수', align: 'right', cell: (item) => item.rowCount.toLocaleString() },
    { key: 'status', header: '상태', cell: (item) => <Badge tone={sheetStatusTone[item.status]}>{sheetStatusLabel[item.status]}</Badge> },
    { key: 'message', header: '안내', width: '260px', cell: (item) => sheetMessage(item) },
  ];
}

function mapSheetResults(batch: BackendBatchDetail | null): SheetResult[] {
  return (batch?.sheetResults ?? []).map((sheet) => ({
    sheetName: sheet.sheetName,
    sheetType: mapSheetType(sheet.sheetType),
    suffix: sheet.suffixValue ?? undefined,
    rowCount: sheet.dataRowCount,
    status: sheet.status === 'PARSED' ? 'NORMAL' : 'ERROR',
    message: sheet.message ?? '',
    errorCount: 0,
    warningCount: 0,
  }));
}

function mapSheetType(sheetType: string): SheetResult['sheetType'] {
  if (sheetType === 'SCAN_UPLOAD') return 'SCAN';
  if (sheetType === 'PL_EA' || sheetType === 'PL_BOX' || sheetType === 'LABEL_EA' || sheetType === 'LABEL_BOX') return sheetType;
  return 'SCAN';
}

function sheetRowClassName(item: SheetResult) {
  if (item.status === 'ERROR') return 'bg-red-50/60';
  if (item.warningCount > 0) return 'bg-amber-50/60';
  return '';
}

function Meta({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-slate-900">{value ?? '-'}</dd>
    </div>
  );
}

function getProgressIndex(batch: BackendBatchDetail) {
  if (batch.status === 'CONFIRMED') return 4;
  if (batch.status === 'READY_TO_CONFIRM' || batch.status === 'VALIDATION_FAILED' || batch.status === 'VALIDATING') return 2;
  return 1;
}

function sheetTypeLabel(item: SheetResult) {
  if (item.sheetType === 'SCAN') return 'Scan';
  if (item.sheetType === 'PL_EA') return 'PL EA';
  if (item.sheetType === 'PL_BOX') return 'PL Box';
  if (item.sheetType === 'LABEL_EA') return 'Label EA';
  return 'Label Box';
}

function sheetMessage(item: SheetResult) {
  if (item.message) return item.message;
  if (item.rowCount === 0 && item.sheetName.startsWith('Scan_upload_')) return '0건 Scan 시트로 정상 인식되었습니다.';
  if (item.rowCount === 0) return '입력된 데이터가 없습니다.';
  if (item.status === 'ERROR') return '확인이 필요한 오류가 있습니다.';
  return '정상적으로 확인되었습니다.';
}

function actionHint(batch: BackendBatchDetail, canConfirm: boolean, confirmed: boolean) {
  if (confirmed) return '확정 완료 상태이므로 라벨 다운로드와 외부 API 제공 상태를 확인할 수 있습니다.';
  if (batch.errorCount > 0) return 'Error를 먼저 확인해야 배치 확정이 가능합니다.';
  if (canConfirm) return 'Error가 없어 확정할 수 있습니다. Warning은 운영 확인 후 진행하세요.';
  return '검증 상태를 확인한 뒤 후속 작업을 진행하세요.';
}

function ApiErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="border-red-200 bg-red-50 px-5 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-red-700">{message}</p>
        <Button onClick={onRetry} size="sm" variant="secondary">
          다시 조회
        </Button>
      </div>
    </Card>
  );
}

function LoadingCard({ message }: { message: string }) {
  return (
    <Card className="px-6 py-10 text-center">
      <p className="text-sm font-semibold text-slate-900">{message}</p>
    </Card>
  );
}

function formatApiError(error: unknown) {
  if (error instanceof OmsApiError) {
    const code = error.response.error?.code;
    return code ? `${code}: ${error.message}` : error.message;
  }

  return error instanceof Error ? error.message : 'API 요청 처리 중 오류가 발생했습니다.';
}

function formatDateTime(value?: string | null) {
  return value ? value.replace('T', ' ').slice(0, 16) : '-';
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes.toLocaleString()} bytes`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
