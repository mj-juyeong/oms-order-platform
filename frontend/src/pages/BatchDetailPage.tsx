import { useEffect, useMemo, useState } from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { CheckCircle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { OmsApiError } from '../api/client';
import { omsApi, type BackendBatchDetail } from '../api/oms';
import { canAdministerBatches, canOperateBatches, fakeCurrentUser } from '../app/auth';
import { useClientScope } from '../app/clientContext';
import { Badge, Button, Card, FullScreenLoadingOverlay } from '../components/common';
import { DataTable, type DataTableColumn } from '../components/data';
import { BatchStatusBadge, ConfirmActionModal, MetricCard } from '../components/domain';
import type { SheetResult } from '../types/batch';

type ProgressStepKey = 'uploaded' | 'parsed' | 'validated' | 'confirmed' | 'available';
type ActionState = 'validate' | 'confirm' | 'cancel' | 'rollback' | null;
type PendingDangerAction = 'cancel' | 'rollback' | null;

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

export function BatchDetailPage() {
  const tenantId = fakeCurrentUser.tenantId ?? null;
  const { clientId } = useClientScope();
  const { batchId } = useParams();
  const numericBatchId = Number(batchId);
  const [batch, setBatch] = useState<BackendBatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionState, setActionState] = useState<ActionState>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmSuccessAlertOpen, setConfirmSuccessAlertOpen] = useState(false);
  const [pendingDangerAction, setPendingDangerAction] = useState<PendingDangerAction>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sheetResults = useMemo(() => mapSheetResults(batch), [batch]);
  const totalRowCount = useMemo(() => sheetResults.reduce((sum, sheet) => sum + sheet.rowCount, 0), [sheetResults]);
  const canOperateBatch = canOperateBatches();
  const canAdministerBatch = canAdministerBatches();
  const canValidate = canOperateBatch && batch ? batch.status === 'UPLOADED' || batch.status === 'VALIDATION_FAILED' || batch.status === 'READY_TO_CONFIRM' : false;
  const canConfirm = canOperateBatch && batch?.status === 'READY_TO_CONFIRM' && batch.errorCount === 0;
  const canCancel = canAdministerBatch && batch ? !['CONFIRMED', 'CANCELLED', 'ROLLED_BACK'].includes(batch.status) : false;
  const canRollback = canAdministerBatch && batch?.status === 'CONFIRMED';
  const confirmed = batch?.status === 'CONFIRMED';

  useEffect(() => {
    loadBatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, numericBatchId, tenantId]);

  async function loadBatch() {
    if (!tenantId) {
      setErrorMessage('물류사 계정 정보가 없습니다. 다시 로그인해 주세요.');
      setLoading(false);
      return;
    }

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
    if (!batch || !canOperateBatch || !tenantId) return;
    setActionState('validate');
    setErrorMessage(null);
    setConfirmSuccessAlertOpen(false);
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
    if (!batch || !canOperateBatch || !tenantId) return;
    setActionState('confirm');
    setErrorMessage(null);
    try {
      await omsApi.batches.confirm(batch.id, { tenantId, clientId, actorId: fakeCurrentUser.id ?? undefined });
      setConfirmModalOpen(false);
      await loadBatch();
      setConfirmSuccessAlertOpen(true);
    } catch (error) {
      setErrorMessage(formatApiError(error));
    } finally {
      setActionState(null);
    }
  }

  async function handleCancel() {
    if (!batch || !canAdministerBatch || !tenantId) return;
    setActionState('cancel');
    setErrorMessage(null);
    setConfirmSuccessAlertOpen(false);
    try {
      await omsApi.batches.cancel(
        batch.id,
        { tenantId, clientId },
        { actorId: fakeCurrentUser.id ?? undefined, reason: '운영자 요청으로 배치 취소' },
      );
      setPendingDangerAction(null);
      await loadBatch();
    } catch (error) {
      setErrorMessage(formatApiError(error));
    } finally {
      setActionState(null);
    }
  }

  async function handleRollback() {
    if (!batch || !canAdministerBatch || !tenantId) return;
    setActionState('rollback');
    setErrorMessage(null);
    setConfirmSuccessAlertOpen(false);
    try {
      await omsApi.batches.rollback(
        batch.id,
        { tenantId, clientId },
        { actorId: fakeCurrentUser.id ?? undefined, reason: '운영자 요청으로 확정 배치 롤백' },
      );
      setPendingDangerAction(null);
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
      {actionState === 'cancel' ? (
        <FullScreenLoadingOverlay
          description="배치 취소를 요청하고 최신 상태를 다시 불러오는 중입니다. 잠시만 기다려 주세요."
          detail={batch.batchNo}
          title="배치를 취소하고 있습니다"
        />
      ) : null}
      {actionState === 'rollback' ? (
        <FullScreenLoadingOverlay
          description="확정 배치 롤백을 요청하고 최신 상태를 다시 불러오는 중입니다. 잠시만 기다려 주세요."
          detail={batch.batchNo}
          title="배치를 롤백하고 있습니다"
        />
      ) : null}
      <ConfirmActionModal
        confirmLabel="확정"
        description="확정 후에는 이 배치가 외부 API 제공과 운영 다운로드 대상에 포함됩니다."
        loading={actionState === 'confirm'}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleConfirm}
        open={confirmModalOpen}
        title="주문을 확정하시겠습니까?"
      />
      <ConfirmActionModal
        confirmLabel="배치 취소"
        confirmVariant="danger"
        description="취소된 배치는 확정, 외부 API 제공, 라벨 다운로드 대상으로 사용할 수 없습니다. 계속 진행할까요?"
        loading={actionState === 'cancel'}
        onClose={() => setPendingDangerAction(null)}
        onConfirm={handleCancel}
        open={pendingDangerAction === 'cancel'}
        title="배치를 취소할까요?"
      />
      <ConfirmActionModal
        confirmLabel="롤백 실행"
        confirmVariant="danger"
        description="확정 상태를 되돌리면 외부 API 제공과 다운로드 대상에서 제외될 수 있습니다. 계속 진행할까요?"
        loading={actionState === 'rollback'}
        onClose={() => setPendingDangerAction(null)}
        onConfirm={handleRollback}
        open={pendingDangerAction === 'rollback'}
        title="확정 배치를 롤백할까요?"
      />
      <ConfirmedOrderAlert open={confirmSuccessAlertOpen} onClose={() => setConfirmSuccessAlertOpen(false)} />
      {errorMessage ? <ApiErrorCard message={errorMessage} onRetry={loadBatch} /> : null}
      <BatchHeader
        actionState={actionState}
        batch={batch}
        canAdministerBatch={canAdministerBatch}
        canCancel={canCancel}
        canConfirm={canConfirm}
        canOperateBatch={canOperateBatch}
        canRollback={canRollback}
        canValidate={canValidate}
        confirmed={Boolean(confirmed)}
        onConfirm={() => setConfirmModalOpen(true)}
        onRequestCancel={() => setPendingDangerAction('cancel')}
        onRequestRollback={() => setPendingDangerAction('rollback')}
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
      <BatchRecoveryPanel batch={batch} canOperateBatch={canOperateBatch} />

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

function ConfirmedOrderAlert({ onClose, open }: { onClose: () => void; open: boolean }) {
  return (
    <AlertDialog.Root open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-slate-950/40" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-200 bg-white p-6 text-left shadow-lg duration-150 data-[state=closed]:scale-95 data-[state=closed]:opacity-0 data-[state=open]:scale-100 data-[state=open]:opacity-100">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <CheckCircle aria-hidden="true" size={22} strokeWidth={2.3} />
            </div>
            <div className="min-w-0">
              <AlertDialog.Title className="text-base font-semibold text-slate-950">
                주문이 확정되었습니다.
              </AlertDialog.Title>
              <AlertDialog.Description className="mt-2 text-sm leading-6 text-slate-500">
                배치 상태가 확정 완료로 변경되었습니다.
              </AlertDialog.Description>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <AlertDialog.Action asChild>
              <Button onClick={onClose} variant="primary">
                확인
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function BatchHeader({
  actionState,
  batch,
  canAdministerBatch,
  canCancel,
  canConfirm,
  canOperateBatch,
  canRollback,
  canValidate,
  confirmed,
  onConfirm,
  onRequestCancel,
  onRequestRollback,
  onValidate,
}: {
  actionState: ActionState;
  batch: BackendBatchDetail;
  canAdministerBatch: boolean;
  canCancel: boolean;
  canConfirm: boolean;
  canOperateBatch: boolean;
  canRollback: boolean;
  canValidate: boolean;
  confirmed: boolean;
  onConfirm: () => void;
  onRequestCancel: () => void;
  onRequestRollback: () => void;
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
              canAdministerBatch={canAdministerBatch}
              canCancel={canCancel}
              canConfirm={canConfirm}
              canOperateBatch={canOperateBatch}
              canRollback={canRollback}
              canValidate={canValidate}
              confirmed={confirmed}
              onConfirm={onConfirm}
              onRequestCancel={onRequestCancel}
              onRequestRollback={onRequestRollback}
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
  canAdministerBatch,
  canCancel,
  canConfirm,
  canOperateBatch,
  canRollback,
  canValidate,
  confirmed,
  onConfirm,
  onRequestCancel,
  onRequestRollback,
  onValidate,
}: {
  actionState: ActionState;
  batch: BackendBatchDetail;
  canAdministerBatch: boolean;
  canCancel: boolean;
  canConfirm: boolean;
  canOperateBatch: boolean;
  canRollback: boolean;
  canValidate: boolean;
  confirmed: boolean;
  onConfirm: () => void;
  onRequestCancel: () => void;
  onRequestRollback: () => void;
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
        <Link
          className="inline-flex h-10 min-w-28 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          to={`/external-api/status?batchId=${batch.id}`}
        >
          API 제공 상태
        </Link>
        {canAdministerBatch ? (
          <Button className="min-w-24" disabled={!canRollback || actionState !== null} onClick={onRequestRollback} variant="danger">
            롤백
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 xl:justify-end">
      {canOperateBatch ? (
        <Button className="min-w-24" disabled={!canValidate || actionState !== null} onClick={onValidate} variant="secondary">
          {actionState === 'validate' ? '검증 중' : '검증 실행'}
        </Button>
      ) : null}
      <Link
        className="inline-flex h-10 min-w-24 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        to={`/batches/${batch.id}/validation`}
      >
        검증 결과
      </Link>
      {canOperateBatch ? (
        <Button className="min-w-24" disabled={!canConfirm || actionState !== null} onClick={onConfirm} variant="primary">
          {actionState === 'confirm' ? '확정 중' : '배치 확정'}
        </Button>
      ) : null}
      {canAdministerBatch ? (
        <Button className="min-w-24" disabled={!canCancel || actionState !== null} onClick={onRequestCancel} variant="danger">
          취소
        </Button>
      ) : null}
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

function BatchRecoveryPanel({ batch, canOperateBatch }: { batch: BackendBatchDetail; canOperateBatch: boolean }) {
  if (!canOperateBatch || batch.status === 'CONFIRMED' || batch.status === 'CANCELLED' || batch.status === 'ROLLED_BACK') {
    return null;
  }

  const hasErrors = batch.errorCount > 0 || batch.status === 'VALIDATION_FAILED';

  return (
    <Card className={`p-5 ${hasErrors ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-base font-bold text-slate-950">{hasErrors ? '검증 실패 후 처리' : '검증 후 처리 기준'}</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            실패한 배치는 그대로 보존하고 확정, 외부 API 제공, 라벨 다운로드만 차단합니다. 마스터 보완으로 해결되는 오류는 같은 배치를 재검증하고,
            엑셀 원본값 자체가 틀린 경우에는 수정한 새 엑셀을 업로드하세요.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            to="/masters/products"
          >
            상품 마스터
          </Link>
          <Link
            className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            to="/masters/store-routes"
          >
            배송지/차량 마스터
          </Link>
          <Link
            className="inline-flex h-9 items-center justify-center rounded-md border border-teal-700 bg-teal-700 px-3 text-sm font-semibold text-white hover:bg-teal-800"
            to="/uploads"
          >
            새 엑셀 업로드
          </Link>
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="border-l-4 border-blue-400 bg-white/70 px-4 py-3">
          <p className="text-sm font-bold text-slate-900">마스터 누락</p>
          <p className="mt-1 text-sm leading-5 text-slate-600">상품코드나 거래처코드를 마스터에 추가한 뒤 이 배치를 다시 검증합니다.</p>
        </div>
        <div className="border-l-4 border-amber-400 bg-white/70 px-4 py-3">
          <p className="text-sm font-bold text-slate-900">엑셀 원본 오류</p>
          <p className="mt-1 text-sm leading-5 text-slate-600">수량, 코드, 주문 구조가 잘못되었으면 OIS 엑셀을 수정해 새 배치로 업로드합니다.</p>
        </div>
        <div className="border-l-4 border-teal-400 bg-white/70 px-4 py-3">
          <p className="text-sm font-bold text-slate-900">재검증 가능 상태</p>
          <p className="mt-1 text-sm leading-5 text-slate-600">현재 배치 상태가 UPLOADED, VALIDATION_FAILED, READY_TO_CONFIRM이면 재검증할 수 있습니다.</p>
        </div>
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
  if (batch.errorCount > 0) return 'Error를 먼저 확인하세요. 마스터 누락은 보완 후 재검증하고, 엑셀 원본 오류는 수정 파일을 새로 업로드합니다.';
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
