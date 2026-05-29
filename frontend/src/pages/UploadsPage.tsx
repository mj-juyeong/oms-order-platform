import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { OmsApiError } from '../api/client';
import { mockBatches, mockProductVersions, mockStoreRouteVersions } from '../api/mock';
import { omsApi, type BatchValidationResult, type OisSheetResult, type OisUploadResponse } from '../api/oms';
import { fakeCurrentUser } from '../app/auth';
import { Badge, Button, Card, FullScreenLoadingOverlay, Input } from '../components/common';
import { DataTable, type DataTableColumn } from '../components/data';
import { BatchStatusBadge, FileUploadDropzone } from '../components/domain';
import type { SheetResult } from '../types/batch';
import type { MasterVersion } from '../types/master';

type UploadPhase = 'idle' | 'selected' | 'parsed' | 'validated';
type LoadingAction = 'upload' | 'validate' | null;

const phaseSteps: Array<{ key: UploadPhase; label: string; description: string }> = [
  { key: 'idle', label: '파일 선택', description: 'OIS 엑셀 선택' },
  { key: 'selected', label: '업로드 준비', description: '파일 정보 확인' },
  { key: 'parsed', label: '파일 확인', description: '검증 실행 전' },
  { key: 'validated', label: '검증 완료', description: '결과 확인' },
];

const statusTone: Record<SheetResult['status'], 'green' | 'amber' | 'red'> = {
  NORMAL: 'green',
  WARNING: 'amber',
  ERROR: 'red',
};

const statusLabel: Record<SheetResult['status'], string> = {
  NORMAL: '정상',
  WARNING: 'Warning',
  ERROR: 'Error',
};

export function UploadsPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);
  const [uploadResult, setUploadResult] = useState<OisUploadResponse | null>(null);
  const [validationResult, setValidationResult] = useState<BatchValidationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validationFinished = phase === 'validated';
  const sheetResults = useMemo(() => mapSheetResults(uploadResult?.sheetResults ?? []), [uploadResult]);
  const selectedFileName = selectedFile?.name ?? '';
  const uploading = loadingAction === 'upload';
  const validating = loadingAction === 'validate';
  const currentScope = getCurrentScope();

  const columns: DataTableColumn<SheetResult>[] = [
    {
      key: 'sheetName',
      header: '원본 시트명',
      width: '190px',
      cell: (item) => <span className="font-mono text-slate-900">{item.sheetName}</span>,
    },
    { key: 'sheetType', header: '데이터 유형', cell: (item) => sheetTypeLabel(item) },
    { key: 'suffix', header: '구분', cell: (item) => item.suffix ?? '-' },
    { key: 'rowCount', header: '데이터 행 수', align: 'right', cell: (item) => item.rowCount.toLocaleString() },
    {
      key: 'parseStatus',
      header: '인식 상태',
      cell: (item) => (
        <Badge tone={item.rowCount === 0 && item.sheetName.startsWith('Scan_upload_') ? 'blue' : 'green'}>
          {item.rowCount === 0 && item.sheetName.startsWith('Scan_upload_') ? '0건 정상' : '인식 완료'}
        </Badge>
      ),
    },
    {
      key: 'validationStatus',
      header: '검증 상태',
      cell: (item) =>
        validationFinished ? <Badge tone={statusTone[item.status]}>{statusLabel[item.status]}</Badge> : <Badge>검증 대기</Badge>,
    },
    {
      key: 'severityCount',
      header: '검증 요약',
      align: 'right',
      cell: () => (validationFinished && validationResult ? <span className="text-xs text-slate-500">상단 요약 참고</span> : '-'),
    },
    { key: 'message', header: '안내', width: '300px', cell: (item) => displaySheetMessage(item) },
  ];

  function handleFileSelect(file: File) {
    setSelectedFile(file);
    setUploadResult(null);
    setValidationResult(null);
    setErrorMessage(null);
    setPhase('selected');
  }

  function handleFileRemove() {
    setSelectedFile(null);
    setUploadResult(null);
    setValidationResult(null);
    setErrorMessage(null);
    setPhase('idle');
  }

  async function handleStartUpload() {
    if (!selectedFile || !currentScope) {
      setErrorMessage('로그인 사용자 범위와 업로드 파일을 확인하세요.');
      return;
    }

    setLoadingAction('upload');
    setErrorMessage(null);
    setValidationResult(null);

    try {
      const result = await omsApi.uploads.orderExcel({
        tenantId: currentScope.tenantId,
        clientId: currentScope.clientId,
        file: selectedFile,
        uploadedBy: fakeCurrentUser.id ?? undefined,
      });
      setUploadResult(result);
      setPhase('parsed');
    } catch (error) {
      setErrorMessage(formatUploadError(error));
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleValidate() {
    if (!uploadResult) {
      setErrorMessage('먼저 업로드를 완료하세요.');
      return;
    }

    setLoadingAction('validate');
    setErrorMessage(null);

    try {
      const result = await omsApi.batches.validate(uploadResult.batchId, {
        tenantId: uploadResult.tenantId,
        clientId: uploadResult.clientId,
        actorId: fakeCurrentUser.id ?? undefined,
      });
      setValidationResult(result);
      setPhase('validated');
    } catch (error) {
      setErrorMessage(formatUploadError(error));
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="space-y-5">
      {uploading ? (
        <FullScreenLoadingOverlay
          description="시트 구성과 데이터 건수를 확인하는 중입니다. 잠시만 기다려 주세요."
          detail={selectedFileName}
          title="엑셀 파일을 확인하고 있습니다"
        />
      ) : null}
      {validating ? (
        <FullScreenLoadingOverlay
          description="현재 마스터 기준으로 오류와 경고를 확인하는 중입니다. 잠시만 기다려 주세요."
          detail={uploadResult?.batchNo ?? selectedFileName}
          title="배치 검증을 실행하고 있습니다"
        />
      ) : null}

      <UploadProgress phase={phase} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <div className="space-y-5">
          <FileUploadDropzone
            accept=".xlsm,.xlsx,.xls"
            acceptLabel="XLSM, XLSX, XLS"
            description="OIS에서 내려받은 엑셀 파일을 선택하세요. 업로드 후 파일 내용을 확인하고 검증을 진행합니다."
            disabled={uploading || validating}
            onFileRemove={selectedFileName ? handleFileRemove : undefined}
            onFileSelect={handleFileSelect}
            selectedFileName={selectedFileName}
            title="OIS 엑셀 파일을 선택하거나 여기에 드롭"
          />

          <Card className="p-5">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold text-slate-500">업로드 기준</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge tone="teal">{fakeCurrentUser.tenantName ?? '현재 물류사'}</Badge>
                  <Badge tone="blue">{fakeCurrentUser.clientName ?? '현재 고객사'}</Badge>
                </div>
              </div>
              <Input label="대표 배송일" readOnly value={uploadResult?.deliveryDate ?? '엑셀 업로드 후 표시'} />
            </div>

            {errorMessage ? <UploadErrorMessage message={errorMessage} /> : null}
            {uploadResult ? <UploadResultSummary result={uploadResult} validationResult={validationResult} /> : null}

            <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">{actionTitle(phase, loadingAction)}</p>
                <p className="mt-1 text-sm text-slate-500">{actionDescription(phase, loadingAction)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {phase === 'parsed' ? (
                  <Button disabled={validating} onClick={handleValidate} variant="primary">
                    {validating ? '검증 중' : '검증 실행'}
                  </Button>
                ) : null}
                {phase === 'validated' && uploadResult ? (
                  <>
                    <Link
                      className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                      to={`/batches/${uploadResult.batchId}`}
                    >
                      배치 상세
                    </Link>
                    <Link
                      className="inline-flex h-10 items-center justify-center rounded-md border border-teal-700 bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
                      to={`/batches/${uploadResult.batchId}/validation`}
                    >
                      검증 결과
                    </Link>
                  </>
                ) : (
                  <Button disabled={!selectedFileName || phase !== 'selected' || uploading} onClick={handleStartUpload} variant="primary">
                    {uploading ? '업로드 중' : '업로드 시작'}
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {phase === 'idle' || phase === 'selected' ? (
            <Card className="p-6">
              <p className="text-sm font-semibold text-slate-900">시트 인식 결과</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                업로드가 완료되면 시트와 데이터 건수가 이곳에 표시됩니다.
              </p>
            </Card>
          ) : (
            <DataTable columns={columns} data={sheetResults} getRowKey={(item) => item.sheetName} />
          )}
        </div>

        <aside className="space-y-5">
          <CurrentMasterCriteriaPanel productMaster={mockProductVersions[0]} storeRouteMaster={mockStoreRouteVersions[0]} />
          <UploadHelpPanel />
          <RecentUploadsPanel />
        </aside>
      </div>
    </div>
  );
}

function UploadProgress({ phase }: { phase: UploadPhase }) {
  const currentIndex = phaseSteps.findIndex((step) => step.key === phase);

  return (
    <Card className="p-4">
      <div className="grid gap-3 md:grid-cols-4">
        {phaseSteps.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;

          return (
            <div
              aria-current={active ? 'step' : undefined}
              className={`rounded-md border px-4 py-3 transition-all duration-300 ${
                active
                  ? 'upload-step-active border-teal-300 bg-teal-50 shadow-sm'
                  : done
                    ? 'upload-step-done border-emerald-200 bg-emerald-50'
                    : 'border-slate-200 bg-slate-50 opacity-85'
              }`}
              key={step.key}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                    done
                      ? 'upload-step-check bg-teal-700 text-white'
                      : active
                        ? 'bg-teal-700 text-white ring-4 ring-teal-100'
                        : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {done ? '✓' : index + 1}
                </span>
                <span className="text-sm font-semibold text-slate-950">{step.label}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">{step.description}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function UploadResultSummary({
  result,
  validationResult,
}: {
  result: OisUploadResponse;
  validationResult: BatchValidationResult | null;
}) {
  const countItems = [
    { label: 'Scan', value: result.scanLineCount },
    { label: 'PL', value: result.plLineCount },
    { label: 'Label', value: result.labelLineCount },
    { label: 'Order', value: result.orderLineCount },
  ];

  return (
    <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-sm font-semibold text-slate-950">Batch #{result.batchId}</p>
          <p className="mt-1 text-xs text-slate-500">
            {result.batchNo} · {result.fileName}
          </p>
        </div>
        <BatchStatusBadge status={validationResult?.status ?? result.status} />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        {countItems.map((item) => (
          <div className="rounded-md border border-white bg-white px-3 py-2" key={item.label}>
            <p className="text-xs font-semibold text-slate-500">{item.label}</p>
            <p className="mt-1 font-mono text-sm font-bold text-slate-950">{item.value.toLocaleString()}</p>
          </div>
        ))}
      </div>
      {validationResult ? (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Badge tone={validationResult.errorCount > 0 ? 'red' : 'green'}>Error {validationResult.errorCount}</Badge>
          <Badge tone={validationResult.warningCount > 0 ? 'amber' : 'green'}>Warning {validationResult.warningCount}</Badge>
          <Badge tone="blue">Info {validationResult.infoCount}</Badge>
        </div>
      ) : null}
    </div>
  );
}

function UploadErrorMessage({ message }: { message: string }) {
  return (
    <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
      {message}
    </div>
  );
}

function CurrentMasterCriteriaPanel({
  productMaster,
  storeRouteMaster,
}: {
  productMaster: MasterVersion;
  storeRouteMaster: MasterVersion;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-bold text-slate-950">현재 검증 기준 마스터</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">검증에 필요한 기준 데이터가 준비되어 있습니다.</p>
        </div>
        <Badge tone="green">검증 가능</Badge>
      </div>
      <div className="mt-5 space-y-3">
        <MasterCriteriaRow label="상품 마스터" rowCount={productMaster.rowCount} uploadedAt={productMaster.uploadedAt} />
        <MasterCriteriaRow label="배송지/차량 마스터" rowCount={storeRouteMaster.rowCount} uploadedAt={storeRouteMaster.uploadedAt} />
      </div>
    </Card>
  );
}

function MasterCriteriaRow({ label, rowCount, uploadedAt }: { label: string; rowCount: number; uploadedAt: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <Badge tone="blue">{rowCount.toLocaleString()}건</Badge>
      </div>
      <p className="mt-1 text-xs text-slate-500">마지막 업로드: {uploadedAt}</p>
    </div>
  );
}

function UploadHelpPanel() {
  return (
    <Card className="p-5">
      <p className="text-base font-bold text-slate-950">업로드 후 진행</p>
      <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
        <li>
          <span className="font-semibold text-slate-900">1. 파일 확인</span>
          <br />
          업로드된 엑셀의 데이터 구성을 확인합니다.
        </li>
        <li>
          <span className="font-semibold text-slate-900">2. 검증 실행</span>
          <br />
          상품과 배송지 정보를 기준으로 누락이나 오류를 확인합니다.
        </li>
        <li>
          <span className="font-semibold text-slate-900">3. 결과 확인</span>
          <br />
          오류가 있으면 검증 결과에서 먼저 확인합니다.
        </li>
      </ol>
    </Card>
  );
}

function RecentUploadsPanel() {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-bold text-slate-950">최근 업로드</p>
        <Link className="text-sm font-semibold text-teal-700 hover:text-teal-800" to="/batches">
          전체 보기
        </Link>
      </div>
      <div className="mt-4 space-y-3">
        {mockBatches.slice(0, 3).map((batch) => (
          <Link
            className="block rounded-md border border-slate-200 px-3 py-3 transition hover:border-teal-200 hover:bg-teal-50/40"
            key={batch.id}
            to={`/batches/${batch.id}`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-sm font-semibold text-slate-950">{batch.id}</span>
              <BatchStatusBadge status={batch.status} />
            </div>
            <p className="mt-1 truncate text-xs text-slate-500">{batch.fileName}</p>
            <p className="mt-1 text-xs text-slate-500">{batch.uploadedAt}</p>
          </Link>
        ))}
      </div>
    </Card>
  );
}

function mapSheetResults(results: OisSheetResult[]): SheetResult[] {
  return results.map((item) => ({
    sheetName: item.sheetName,
    sheetType: mapSheetType(item.sheetType),
    suffix: item.suffixValue ?? undefined,
    rowCount: item.dataRowCount,
    status: item.status === 'PARSED' ? 'NORMAL' : 'ERROR',
    message: item.message ?? '',
    errorCount: 0,
    warningCount: 0,
  }));
}

function mapSheetType(sheetType: string): SheetResult['sheetType'] {
  if (sheetType === 'SCAN_UPLOAD') {
    return 'SCAN';
  }

  if (sheetType === 'PL_EA' || sheetType === 'PL_BOX' || sheetType === 'LABEL_EA' || sheetType === 'LABEL_BOX') {
    return sheetType;
  }

  return 'SCAN';
}

function sheetTypeLabel(item: SheetResult) {
  if (item.sheetType === 'SCAN') {
    return 'Scan';
  }

  if (item.sheetType === 'PL_EA') {
    return 'PL EA';
  }

  if (item.sheetType === 'PL_BOX') {
    return 'PL Box';
  }

  if (item.sheetType === 'LABEL_EA') {
    return 'Label EA';
  }

  return 'Label Box';
}

function actionTitle(phase: UploadPhase, loadingAction: LoadingAction) {
  if (loadingAction === 'upload') {
    return '엑셀 파일을 확인하고 있습니다';
  }

  if (loadingAction === 'validate') {
    return '배치 검증을 실행 중입니다';
  }

  if (phase === 'idle') {
    return '파일을 선택하세요';
  }

  if (phase === 'selected') {
    return '업로드를 시작할 수 있습니다';
  }

  if (phase === 'parsed') {
    return '파일 확인 완료, 검증 대기';
  }

  return '검증이 완료되었습니다';
}

function actionDescription(phase: UploadPhase, loadingAction: LoadingAction) {
  if (loadingAction === 'upload') {
    return '시트 구성과 데이터 건수를 확인하는 중입니다.';
  }

  if (loadingAction === 'validate') {
    return '현재 마스터 기준으로 오류와 경고를 확인합니다.';
  }

  if (phase === 'idle') {
    return 'OIS 엑셀 파일을 선택하세요. 업로드 범위는 로그인 사용자 기준으로 자동 적용됩니다.';
  }

  if (phase === 'selected') {
    return '업로드를 시작하면 파일 확인 결과가 표시됩니다.';
  }

  if (phase === 'parsed') {
    return '파일 확인 결과를 확인한 뒤 검증을 실행하세요.';
  }

  return '오류가 있으면 검증 결과를 먼저 확인하세요.';
}

function displaySheetMessage(item: SheetResult) {
  if (item.message) {
    return item.message;
  }

  if (item.rowCount === 0 && item.sheetName.startsWith('Scan_upload_')) {
    return '0건 Scan 시트로 정상 인식되었습니다.';
  }

  if (item.rowCount === 0) {
    return '입력된 데이터가 없습니다.';
  }

  if (item.status === 'ERROR') {
    return '확인이 필요한 오류가 있습니다.';
  }

  if (item.status === 'WARNING') {
    return '확인 권장 항목이 있습니다.';
  }

  return '정상적으로 확인되었습니다.';
}

function getCurrentScope() {
  const tenantId = fakeCurrentUser.tenantId;
  const clientId = fakeCurrentUser.clientId;
  return tenantId && clientId ? { tenantId, clientId } : null;
}

function formatUploadError(error: unknown) {
  if (error instanceof OmsApiError) {
    return error.message || '처리 중 문제가 발생했습니다. 파일과 업로드 기준을 확인해 주세요.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '처리 중 문제가 발생했습니다. 파일과 업로드 기준을 확인해 주세요.';
}
