import { useEffect, useMemo, useState } from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { CheckCircle, FileSpreadsheet, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { OmsApiError } from '../api/client';
import {
  omsApi,
  type BackendBatchSummary,
  type BatchValidationResult,
  type ClientResolveCandidate,
  type ClientSummary,
  type OisSheetResult,
  type OisUploadResponse,
} from '../api/oms';
import { fakeCurrentUser } from '../app/auth';
import { readClientContextSelection, subscribeClientContextSelection } from '../app/clientContext';
import { Badge, Button, Card, FullScreenLoadingOverlay, Input, Select } from '../components/common';
import { DataTable, type DataTableColumn } from '../components/data';
import { BatchStatusBadge, ConfirmActionModal, FileUploadDropzone } from '../components/domain';
import type { SheetResult } from '../types/batch';
import type { MasterUploadStatus, ProductMasterUploadHistory, StoreRouteMasterUploadHistory } from '../types/master';

type UploadPhase = 'idle' | 'selected' | 'parsed' | 'validated';
type LoadingAction = 'upload' | 'validate' | 'confirm' | null;
type ValidationOverlayStage = 'running' | 'ready' | 'blocked' | 'request-error' | null;
type ClientInputMode = 'select' | 'direct';

const DIRECT_CLIENT_VALUE = '__direct__';

interface MasterCriteria {
  latestUploadedAt?: string;
  latestUploadFileName?: string;
  latestUploadStatus?: MasterUploadStatus;
  rowCount: number;
}

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
  const tenantId = fakeCurrentUser.tenantId ?? null;
  const [searchParams] = useSearchParams();
  const supplementOfParam = searchParams.get('supplementOf');
  const supplementBatchId = supplementOfParam ? Number(supplementOfParam) : NaN;
  const activeSupplementBatchId = Number.isInteger(supplementBatchId) && supplementBatchId > 0 ? supplementBatchId : null;
  const userFixedClientId = fakeCurrentUser.clientId ?? null;
  const isClientUser = fakeCurrentUser.userScopeType === 'CLIENT';
  const [clientContextSelection, setClientContextSelection] = useState(readClientContextSelection);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);
  const [uploadResult, setUploadResult] = useState<OisUploadResponse | null>(null);
  const [validationResult, setValidationResult] = useState<BatchValidationResult | null>(null);
  const [productMasterCriteria, setProductMasterCriteria] = useState<MasterCriteria | null>(null);
  const [storeRouteMasterCriteria, setStoreRouteMasterCriteria] = useState<MasterCriteria | null>(null);
  const [recentBatches, setRecentBatches] = useState<BackendBatchSummary[]>([]);
  const [supplementBatch, setSupplementBatch] = useState<BackendBatchSummary | null>(null);
  const [supplementLoading, setSupplementLoading] = useState(false);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [clientInputMode, setClientInputMode] = useState<ClientInputMode>('select');
  const [clientSearchText, setClientSearchText] = useState('');
  const [clientCandidates, setClientCandidates] = useState<ClientResolveCandidate[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(userFixedClientId ?? (clientContextSelection.mode === 'client' ? clientContextSelection.clientId : null));
  const [clientResolving, setClientResolving] = useState(false);
  const [clientResolveMessage, setClientResolveMessage] = useState<string | null>(null);
  const [sidebarLoading, setSidebarLoading] = useState(true);
  const [sidebarErrorMessage, setSidebarErrorMessage] = useState<string | null>(null);
  const [sidebarReloadSeq, setSidebarReloadSeq] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmSuccessAlertOpen, setConfirmSuccessAlertOpen] = useState(false);
  const [validationOverlayStage, setValidationOverlayStage] = useState<ValidationOverlayStage>(null);

  const validationFinished = phase === 'validated';
  const sheetResults = useMemo(() => mapSheetResults(uploadResult?.sheetResults ?? []), [uploadResult]);
  const selectedFileName = selectedFile?.name ?? '';
  const uploading = loadingAction === 'upload';
  const validating = loadingAction === 'validate' || validationOverlayStage !== null;
  const confirming = loadingAction === 'confirm';
  const contextClientId = userFixedClientId ?? (clientContextSelection.mode === 'client' ? clientContextSelection.clientId : null);
  const contextClientName = fakeCurrentUser.clientName ?? (clientContextSelection.mode === 'client' ? clientContextSelection.clientName ?? null : null);
  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? clientCandidates.find((candidate) => candidate.client.id === selectedClientId)?.client;
  const selectedClientName = contextClientName ?? selectedClient?.name ?? null;
  const contextClientDisplayName = contextClientId ? selectedClientName ?? `고객사 #${contextClientId}` : null;
  const activeClientId = contextClientId ?? selectedClientId;
  const supplementMode = Boolean(activeSupplementBatchId);
  const canConfirm = Boolean(validationResult && validationResult.status === 'READY_TO_CONFIRM' && validationResult.errorCount === 0);
  const confirmationRequested = validationResult?.status === 'CONFIRMATION_REQUESTED' || uploadResult?.status === 'CONFIRMATION_REQUESTED';
  const confirmed = validationResult?.status === 'CONFIRMED' || uploadResult?.status === 'CONFIRMED';
  const validationOverlayCopy = getValidationOverlayCopy(validationOverlayStage);

  useEffect(() => subscribeClientContextSelection(setClientContextSelection), []);

  useEffect(() => {
    let ignore = false;

    async function loadSupplementBatch() {
      if (!tenantId || !activeSupplementBatchId) {
        setSupplementBatch(null);
        return;
      }

      setSupplementLoading(true);
      try {
        const result = await omsApi.batches.detail(activeSupplementBatchId, { tenantId, clientId: contextClientId ?? undefined });
        if (ignore) return;
        setSupplementBatch(result);
        setSelectedClientId(result.clientId);
        setClientResolveMessage(`${result.batchNo} 배치의 보완본으로 업로드합니다.`);
      } catch (error) {
        if (!ignore) {
          setSupplementBatch(null);
          setErrorMessage(formatUploadError(error));
        }
      } finally {
        if (!ignore) setSupplementLoading(false);
      }
    }

    loadSupplementBatch();
    return () => {
      ignore = true;
    };
  }, [activeSupplementBatchId, contextClientId, tenantId]);

  useEffect(() => {
    if (!tenantId || userFixedClientId) {
      setClients([]);
      return;
    }

    let ignore = false;
    omsApi.clients.list({ tenantId })
      .then((items) => {
        if (!ignore) setClients(dedupeClientsByName(items));
      })
      .catch(() => {
        if (!ignore) setClients([]);
      });
    return () => {
      ignore = true;
    };
  }, [tenantId, userFixedClientId]);

  useEffect(() => {
    if (supplementBatch) {
      setSelectedClientId(supplementBatch.clientId);
      setClientResolveMessage(`${supplementBatch.batchNo} 배치의 보완본으로 업로드합니다.`);
      return;
    }

    if (contextClientId) {
      setSelectedClientId(contextClientId);
      setClientResolveMessage(`${contextClientDisplayName ?? `고객사 #${contextClientId}`} 고객사로 업로드합니다.`);
      return;
    }

    setSelectedClientId(null);
    setClientInputMode('select');
  }, [contextClientDisplayName, contextClientId, selectedFile, supplementBatch]);

  useEffect(() => {
    let ignore = false;

    async function loadSidebarData() {
      setSidebarLoading(true);
      setSidebarErrorMessage(null);
      try {
        if (!tenantId) {
          setProductMasterCriteria(null);
          setStoreRouteMasterCriteria(null);
          setRecentBatches([]);
          return;
        }
        if (isClientUser) {
          const [productPage, storeRoutePage, batchPage] = await Promise.all([
            omsApi.masters.clientMasters.products.list({ page: 0, size: 1 }),
            omsApi.masters.clientMasters.storeRoutes.list({ page: 0, size: 1 }),
            activeClientId
              ? omsApi.batches.list({ tenantId, clientId: activeClientId, page: 0, size: 6 })
              : Promise.resolve({ items: [] as BackendBatchSummary[] }),
          ]);

          if (ignore) return;

          setProductMasterCriteria({ rowCount: productPage.totalElements });
          setStoreRouteMasterCriteria({ rowCount: storeRoutePage.totalElements });
          setRecentBatches(hideResolvedSupplementParents(batchPage.items).slice(0, 3));
          return;
        }
        const [productPage, productUploads, storeRoutePage, storeRouteUploads, batchPage] = await Promise.all([
          omsApi.masters.products.list({ tenantId, page: 0, size: 1 }),
          omsApi.masters.products.uploads({ tenantId, page: 0, size: 1 }).catch(() => null),
          omsApi.masters.storeRoutes.list({ tenantId, page: 0, size: 1 }),
          omsApi.masters.storeRoutes.uploads({ tenantId, page: 0, size: 1 }).catch(() => null),
          activeClientId
            ? omsApi.batches.list({ tenantId, clientId: activeClientId, page: 0, size: 6 })
            : Promise.resolve({ items: [] as BackendBatchSummary[] }),
        ]);

        if (ignore) return;

        setProductMasterCriteria(toMasterCriteria(productPage.totalElements, productUploads?.items[0]));
        setStoreRouteMasterCriteria(toMasterCriteria(storeRoutePage.totalElements, storeRouteUploads?.items[0]));
        setRecentBatches(hideResolvedSupplementParents(batchPage.items).slice(0, 3));
      } catch (error) {
        if (!ignore) {
          setSidebarErrorMessage(formatUploadError(error));
          setProductMasterCriteria(null);
          setStoreRouteMasterCriteria(null);
          setRecentBatches([]);
        }
      } finally {
        if (!ignore) {
          setSidebarLoading(false);
        }
      }
    }

    loadSidebarData();
    return () => {
      ignore = true;
    };
  }, [activeClientId, isClientUser, sidebarReloadSeq, tenantId]);

  useEffect(() => {
    let ignore = false;

    async function loadClientCandidates() {
      if (supplementBatch) {
        setClientCandidates([]);
        setSelectedClientId(supplementBatch.clientId);
        setClientResolveMessage(`${supplementBatch.batchNo} 배치의 보완본으로 업로드합니다.`);
        return;
      }

      if (contextClientId || clientInputMode !== 'direct') {
        setClientCandidates([]);
        if (contextClientId) {
          setSelectedClientId(contextClientId);
          setClientResolveMessage(`${contextClientDisplayName ?? `고객사 #${contextClientId}`} 고객사로 업로드합니다.`);
        } else {
          setClientResolveMessage(null);
        }
        return;
      }

      const sourceText = clientSearchText.trim();
      if (!sourceText) {
        setClientCandidates([]);
        setSelectedClientId(null);
        setClientResolveMessage('직접 입력한 이름과 유사한 기존 고객사를 추천합니다.');
        return;
      }
      if (!tenantId) {
        setClientCandidates([]);
        setSelectedClientId(null);
        setClientResolveMessage('현재 물류사 정보를 확인할 수 없어 고객사를 검색할 수 없습니다.');
        return;
      }
      const resolvedTenantId = tenantId;

      setClientResolving(true);
      setClientResolveMessage(null);
      try {
        const candidates = await omsApi.clients.resolveCandidates({ tenantId: resolvedTenantId, sourceText, limit: 5 });
        if (ignore) return;
        setClientCandidates(candidates);
        setSelectedClientId((current) => (current && candidates.some((candidate) => candidate.client.id === current) ? current : null));
        setClientResolveMessage(candidates.length ? null : '일치하는 기존 고객사를 찾지 못했습니다. 고객사 관리에서 먼저 등록한 뒤 다시 선택해 주세요.');
      } catch {
        if (!ignore) {
          try {
            const clients = await omsApi.clients.list({ tenantId: resolvedTenantId });
            if (ignore) return;
            const candidates = createFallbackClientCandidates(dedupeClientsByName(clients), sourceText);
            setClientCandidates(candidates);
            setSelectedClientId((current) => (current && candidates.some((candidate) => candidate.client.id === current) ? current : null));
            setClientResolveMessage(
              candidates.length
                ? '고객사 자동 추천 일부를 불러오지 못해 고객사 목록 기준으로 매칭했습니다.'
                : '고객사를 찾지 못했습니다. 고객사 관리에서 먼저 등록한 뒤 다시 선택해 주세요.',
            );
          } catch {
            setClientCandidates([]);
            setSelectedClientId(null);
            setClientResolveMessage('고객사 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
          }
        }
      } finally {
        if (!ignore) {
          setClientResolving(false);
        }
      }
    }

    loadClientCandidates();
    return () => {
      ignore = true;
    };
  }, [clientInputMode, clientSearchText, contextClientDisplayName, contextClientId, supplementBatch, tenantId]);

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
    setConfirmSuccessAlertOpen(false);
    setConfirmModalOpen(false);
    setValidationOverlayStage(null);
    setClientInputMode('select');
    setClientSearchText(extractClientSearchText(file.name));
    setSelectedClientId(supplementBatch?.clientId ?? contextClientId);
    setPhase('selected');
  }

  function handleFileRemove() {
    setSelectedFile(null);
    setUploadResult(null);
    setValidationResult(null);
    setErrorMessage(null);
    setConfirmSuccessAlertOpen(false);
    setConfirmModalOpen(false);
    setValidationOverlayStage(null);
    setClientSearchText('');
    setClientInputMode('select');
    setSelectedClientId(supplementBatch?.clientId ?? contextClientId);
    setPhase('idle');
  }

  async function handleStartUpload() {
    if (!selectedFile) {
      setErrorMessage('업로드할 파일을 먼저 선택하세요.');
      return;
    }
    if (!tenantId) {
      setErrorMessage('현재 물류사 정보를 확인할 수 없습니다. 다시 로그인해 주세요.');
      return;
    }
    const uploadClientId = supplementBatch?.clientId ?? selectedClientId ?? contextClientId;
    if (!uploadClientId) {
      setErrorMessage('고객사를 선택하세요. 목록에 없으면 고객사 관리에서 먼저 등록한 뒤 선택해 주세요.');
      return;
    }

    setLoadingAction('upload');
    setErrorMessage(null);
    setValidationResult(null);
    setConfirmSuccessAlertOpen(false);

    try {
      const result = await omsApi.uploads.orderExcel({
        tenantId,
        clientId: uploadClientId,
        file: selectedFile,
        uploadedBy: fakeCurrentUser.id ?? undefined,
        parentBatchId: supplementBatch?.id,
        reuploadReason: supplementBatch ? `보완 요청 배치 ${supplementBatch.batchNo}의 파일 보완본` : undefined,
      });
      setUploadResult(result);
      setPhase('parsed');
      setSidebarReloadSeq((current) => current + 1);
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
    setValidationOverlayStage('running');
    setErrorMessage(null);
    setConfirmSuccessAlertOpen(false);

    try {
      const result = await omsApi.batches.validate(uploadResult.batchId, {
        tenantId: uploadResult.tenantId,
        clientId: uploadResult.clientId,
        actorId: fakeCurrentUser.id ?? undefined,
      });
      setValidationResult(result);
      setPhase('validated');
      finishValidationOverlay(result.status === 'READY_TO_CONFIRM' && result.errorCount === 0 ? 'ready' : 'blocked');
      setSidebarReloadSeq((current) => current + 1);
    } catch (error) {
      setErrorMessage(formatUploadError(error));
      finishValidationOverlay('request-error');
    } finally {
      setLoadingAction(null);
    }
  }

  function finishValidationOverlay(stage: Exclude<ValidationOverlayStage, 'running' | null>) {
    setValidationOverlayStage(stage);
    window.setTimeout(() => setValidationOverlayStage(null), 950);
  }

  async function handleConfirmOrder() {
    if (!uploadResult || !validationResult || !canConfirm) {
      return;
    }

    setLoadingAction('confirm');
    setErrorMessage(null);
    setConfirmSuccessAlertOpen(false);

    try {
      await omsApi.batches.requestConfirmation(uploadResult.batchId, {
        tenantId: uploadResult.tenantId,
        clientId: uploadResult.clientId,
      }, {
        actorId: fakeCurrentUser.id ?? undefined,
      });
      setUploadResult((current) => (current ? { ...current, status: 'CONFIRMATION_REQUESTED' } : current));
      setValidationResult({ ...validationResult, status: 'CONFIRMATION_REQUESTED' });
      setConfirmModalOpen(false);
      setConfirmSuccessAlertOpen(true);
      setSidebarReloadSeq((current) => current + 1);
    } catch (error) {
      setErrorMessage(formatUploadError(error));
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="min-w-0 space-y-5 overflow-x-hidden">
      {uploading ? (
        <FullScreenLoadingOverlay
          description="시트 구성과 데이터 건수를 확인하는 중입니다. 잠시만 기다려 주세요."
          detail={selectedFileName}
          title="엑셀 파일을 확인하고 있습니다"
        />
      ) : null}
      {validationOverlayCopy ? (
        <FullScreenLoadingOverlay
          description={validationOverlayCopy.description}
          detail={uploadResult?.batchNo ?? selectedFileName}
          title={validationOverlayCopy.title}
        />
      ) : null}
      {confirming ? (
        <FullScreenLoadingOverlay
          description="검증이 끝난 배치를 물류사 담당자에게 전달하고 있습니다."
          detail={uploadResult?.batchNo ?? selectedFileName}
          title="배치 확정을 요청하고 있습니다"
        />
      ) : null}

      <UploadProgress phase={phase} />

      {supplementMode ? <SupplementUploadBanner batch={supplementBatch} loading={supplementLoading} /> : null}

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <div className="min-w-0 space-y-5">
          {phase === 'idle' ? (
            <FileUploadDropzone
              accept=".xlsm,.xlsx,.xls"
              acceptLabel="XLSM, XLSX, XLS"
              description="OIS에서 내려받은 엑셀 파일을 선택하세요. 업로드 후 파일 내용을 확인하고 검증을 진행합니다."
              disabled={uploading || validating || confirming}
              onFileSelect={handleFileSelect}
              title="OIS 엑셀 파일을 선택하거나 여기에 드롭"
            />
          ) : null}

          {phase !== 'idle' ? (
          <Card className="upload-phase-panel min-w-0 overflow-hidden" key={phase}>
            {selectedFile ? <SelectedFileSummary file={selectedFile} onRemove={phase === 'selected' ? handleFileRemove : undefined} prominent /> : null}
            <UploadStageHeader confirmationRequested={confirmationRequested} confirmed={confirmed} phase={phase} validationResult={validationResult} />
            <div className="min-w-0 p-5">
            <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <div className="min-w-0 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold text-slate-500">업로드 기준</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge tone="teal">{fakeCurrentUser.tenantName ?? '현재 물류사'}</Badge>
                  <Badge tone={selectedClientName ? 'blue' : 'amber'}>{selectedClientName ?? '고객사 선택 필요'}</Badge>
                  {uploadResult?.parentBatchId ? <Badge tone="blue">보완본 R{uploadResult.revisionNo}</Badge> : null}
                </div>
              </div>
              <Input label="대표 배송일" readOnly value={uploadResult?.deliveryDate ?? '엑셀 업로드 후 표시'} />
            </div>

            {phase === 'selected' ? (
              <ClientResolvePanel
                candidates={clientCandidates}
                clients={clients}
                disabled={uploading || validating || confirming || Boolean(contextClientId) || supplementMode}
                inputMode={clientInputMode}
                lockedClientName={supplementBatch ? selectedClientName ?? `고객사 #${supplementBatch.clientId}` : contextClientId ? contextClientDisplayName : null}
                loading={clientResolving}
                message={clientResolveMessage}
                onInputModeChange={setClientInputMode}
                onSearchTextChange={setClientSearchText}
                onSelectClient={setSelectedClientId}
                searchText={clientSearchText}
                selectedClientId={selectedClientId}
              />
            ) : null}
            {errorMessage ? <UploadErrorMessage message={errorMessage} /> : null}
            {uploadResult ? <UploadResultSummary result={uploadResult} validationResult={validationResult} /> : null}
            {phase === 'validated' && validationResult ? <ValidationOutcomeNotice canConfirm={canConfirm} confirmationRequested={confirmationRequested} confirmed={confirmed} result={validationResult} /> : null}

            <div className="mt-5 flex min-w-0 flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{actionTitle(phase, loadingAction, canConfirm, confirmationRequested, confirmed)}</p>
                {actionDescription(phase, loadingAction, canConfirm, confirmationRequested, confirmed) ? (
                  <p className="mt-1 text-sm text-slate-500">{actionDescription(phase, loadingAction, canConfirm, confirmationRequested, confirmed)}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
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
                    {canConfirm && !confirmed ? (
                      <Button disabled={confirming} onClick={() => setConfirmModalOpen(true)} variant="primary">
                        배치 확정 요청
                      </Button>
                    ) : null}
                  </>
                ) : phase === 'selected' ? (
                  <>
                    <Button disabled={uploading || validating || confirming} onClick={handleFileRemove} variant="secondary">
                      파일 변경
                    </Button>
                    <Button disabled={!selectedFileName || uploading || validating || confirming} onClick={handleStartUpload} variant="primary">
                      {uploading ? '업로드 중' : '업로드 시작'}
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
            </div>
          </Card>
          ) : null}

          {uploadResult ? (
            <div className="min-w-0">
              <DataTable columns={columns} data={sheetResults} getRowKey={(item) => item.sheetName} />
            </div>
          ) : null}
        </div>

        <aside className="min-w-0 space-y-5">
          <CurrentMasterCriteriaPanel
            errorMessage={sidebarErrorMessage}
            loading={sidebarLoading}
            productMaster={productMasterCriteria}
            publicView={isClientUser}
            storeRouteMaster={storeRouteMasterCriteria}
          />
          <UploadHelpPanel />
          <RecentUploadsPanel errorMessage={sidebarErrorMessage} loading={sidebarLoading} recentBatches={recentBatches} />
        </aside>
      </div>

      <ConfirmActionModal
        confirmLabel="확정 요청"
        description="검증 결과를 물류사 담당자에게 전달합니다. 물류사가 최종 확정한 뒤 외부 API와 운영 다운로드 대상에 포함됩니다."
        loading={confirming}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleConfirmOrder}
        open={confirmModalOpen}
        title="배치 확정을 요청하시겠습니까?"
      />
      <ConfirmationRequestedAlert open={confirmSuccessAlertOpen} onClose={() => setConfirmSuccessAlertOpen(false)} />
    </div>
  );
}

function ConfirmationRequestedAlert({ onClose, open }: { onClose: () => void; open: boolean }) {
  return (
    <AlertDialog.Root open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-slate-950/40 data-[state=closed]:animate-none data-[state=open]:animate-in" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-200 bg-white p-6 text-left shadow-lg duration-150 data-[state=closed]:scale-95 data-[state=closed]:opacity-0 data-[state=open]:scale-100 data-[state=open]:opacity-100">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700">
              <CheckCircle aria-hidden="true" size={22} strokeWidth={2.3} />
            </div>
            <div className="min-w-0">
              <AlertDialog.Title className="text-base font-semibold text-slate-950">
                배치 확정을 요청했습니다.
              </AlertDialog.Title>
              <AlertDialog.Description className="mt-2 text-sm leading-6 text-slate-500">
                물류사 담당자가 검토한 뒤 최종 확정합니다.
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

function SupplementUploadBanner({ batch, loading }: { batch: BackendBatchSummary | null; loading: boolean }) {
  return (
    <Card className="border-amber-200 bg-amber-50 p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-bold text-slate-950">보완본 업로드</p>
            <Badge tone="amber">{loading ? '원 배치 확인 중' : '원 배치 연결'}</Badge>
          </div>
          {!batch ? (
            <p className="mt-2 text-sm leading-6 text-slate-700">보완 요청된 원 배치를 확인한 뒤 수정한 OIS 엑셀을 업로드합니다.</p>
          ) : null}
        </div>
        {batch ? (
          <Link
            className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            to={`/batches/${batch.id}`}
          >
            원 배치 보기
          </Link>
        ) : null}
      </div>
    </Card>
  );
}

function UploadProgress({ phase }: { phase: UploadPhase }) {
  const currentIndex = phaseSteps.findIndex((step) => step.key === phase);

  return (
    <Card className="min-w-0 p-3 sm:p-4">
      <div className="grid min-w-0 grid-cols-4 gap-2 sm:gap-3">
        {phaseSteps.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          const compactLabel = step.label.replace(/\s+/g, '');

          return (
            <div
              aria-current={active ? 'step' : undefined}
              className={`min-w-0 rounded-md border px-1 py-3 transition-all duration-300 sm:px-4 ${
                active
                  ? 'upload-step-active border-teal-300 bg-teal-50 shadow-sm'
                  : done
                    ? 'upload-step-done border-teal-200 bg-teal-50'
                    : 'border-slate-200 bg-slate-50 opacity-85'
              }`}
              key={step.key}
            >
              <div className="flex min-w-0 flex-col items-center gap-2 text-center sm:flex-row sm:text-left">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                    done
                      ? 'upload-step-check bg-teal-700 text-white'
                      : active
                        ? 'bg-teal-700 text-white ring-4 ring-teal-100'
                        : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {done ? '✓' : index + 1}
                </span>
                <span className="min-w-0 whitespace-nowrap text-[11px] font-semibold leading-tight text-slate-950 sm:text-sm" title={step.label}>
                  {compactLabel}
                </span>
              </div>
              <p className="mt-2 hidden text-xs text-slate-500 sm:block">{step.description}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function UploadStageHeader({
  confirmationRequested,
  confirmed,
  phase,
  validationResult,
}: {
  confirmationRequested: boolean;
  confirmed: boolean;
  phase: UploadPhase;
  validationResult: BatchValidationResult | null;
}) {
  const canConfirm = Boolean(validationResult && validationResult.status === 'READY_TO_CONFIRM' && validationResult.errorCount === 0);
  const tone = confirmed ? 'green' : confirmationRequested ? 'teal' : phase === 'validated' && !canConfirm ? 'red' : phase === 'parsed' ? 'blue' : 'teal';
  const label = confirmed ? '확정 완료' : confirmationRequested ? '확정 요청 완료' : phase === 'validated' ? (canConfirm ? '확정 요청 가능' : '확정 불가') : phase === 'parsed' ? '검증 대기' : '파일 정보';
  const title =
    phase === 'selected'
      ? '선택한 파일을 확인해 주세요'
      : phase === 'parsed'
        ? '파일 확인이 끝났습니다'
        : confirmed
          ? '처리 완료'
          : confirmationRequested
            ? '물류사 검토를 기다리고 있습니다'
          : canConfirm
            ? '검증 결과를 물류사에 전달할 수 있습니다'
            : '검증 결과 확인이 필요합니다';
  const description =
    phase === 'selected'
      ? '선택한 파일과 업로드 기준을 한 번 더 확인한 뒤 업로드를 시작합니다.'
      : phase === 'parsed'
        ? '시트 인식 결과를 확인한 뒤 검증 실행만 진행하면 됩니다.'
        : confirmed
          ? '이 배치는 후속 업무에서 사용할 수 있는 상태입니다.'
          : confirmationRequested
            ? '물류사 담당자가 요청 내용을 확인한 뒤 최종 확정합니다.'
          : canConfirm
            ? 'Error가 없어 배치 확정을 요청할 수 있습니다. Warning은 필요 시 검증 결과에서 확인하세요.'
            : 'Error가 남아 있어 확정할 수 없습니다. 검증 결과에서 원인을 먼저 확인하세요.';

  return (
    <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-base font-bold text-slate-950">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        <div className="shrink-0">
          <Badge tone={tone}>{label}</Badge>
        </div>
      </div>
    </div>
  );
}

function SelectedFileSummary({
  file,
  onRemove,
  prominent = false,
}: {
  file: File;
  onRemove?: () => void;
  prominent?: boolean;
}) {
  return (
    <div className={`${prominent ? 'upload-file-highlight border-b border-teal-100 bg-teal-50/70 px-5 py-4' : 'mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-4'}`}>
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-teal-200 bg-white text-teal-700 shadow-sm">
            <FileSpreadsheet aria-hidden="true" size={24} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500">선택된 파일</p>
            <p className="mt-1 break-all font-mono text-sm font-semibold text-slate-950">{file.name}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <FileMetaChip label="크기" value={formatFileSize(file.size)} />
              <FileMetaChip label="형식" value={(file.name.split('.').pop() ?? '-').toUpperCase()} />
            </div>
          </div>
        </div>
        <div className="hidden">
          <div className="rounded-md bg-white px-3 py-2">
            <p className="text-xs font-semibold text-slate-500">크기</p>
            <p className="mt-1 font-mono text-sm font-bold text-slate-950">{formatFileSize(file.size)}</p>
          </div>
          <div className="rounded-md bg-white px-3 py-2">
            <p className="text-xs font-semibold text-slate-500">형식</p>
            <p className="mt-1 font-mono text-sm font-bold uppercase text-slate-950">{file.name.split('.').pop() ?? '-'}</p>
          </div>
        </div>
        {onRemove ? (
          <button
            aria-label="선택한 파일 제거"
            className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-base font-bold leading-none text-slate-500 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            onClick={onRemove}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={2.4} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function FileMetaChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs leading-none text-slate-600">
      <span className="font-semibold">{label}</span>
      <span className="font-mono font-bold text-slate-900">{value}</span>
    </span>
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
    <div className="mt-4 min-w-0 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold text-slate-950">Batch #{result.batchId}</p>
          <p className="mt-1 break-all text-xs text-slate-500">
            {result.batchNo} · {result.fileName}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {result.parentBatchId ? <Badge tone="blue">보완본 R{result.revisionNo}</Badge> : null}
          <BatchStatusBadge status={validationResult?.status ?? result.status} />
        </div>
      </div>
      {result.parentBatchId ? (
        <p className="mt-2 text-xs leading-5 text-slate-500">
          원 배치 #{result.parentBatchId}에 연결된 보완본입니다. 이 배치를 검증한 뒤 새 확정 요청을 보내세요.
        </p>
      ) : null}
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

function ValidationOutcomeNotice({
  canConfirm,
  confirmationRequested,
  confirmed,
  result,
}: {
  canConfirm: boolean;
  confirmationRequested: boolean;
  confirmed: boolean;
  result: BatchValidationResult;
}) {
  if (confirmed) {
    return null;
  }
  if (confirmationRequested) {
    return (
      <div className="mt-4 rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800">
        물류사 담당자에게 배치 확정을 요청했습니다.
      </div>
    );
  }

  return (
    <div
      className={`mt-4 rounded-md border px-4 py-3 text-sm font-medium ${
        canConfirm ? 'border-teal-200 bg-teal-50 text-teal-800' : 'border-red-200 bg-red-50 text-red-700'
      }`}
    >
      {canConfirm
        ? `Error ${result.errorCount}건입니다. 현재 상태에서 배치 확정을 요청할 수 있습니다.`
        : `Error ${result.errorCount}건이 확인되어 확정할 수 없습니다. 검증 결과에서 조치가 필요합니다.`}
    </div>
  );
}

function ClientResolvePanel({
  candidates,
  clients,
  disabled,
  inputMode,
  lockedClientName,
  loading,
  message,
  onInputModeChange,
  onSearchTextChange,
  onSelectClient,
  searchText,
  selectedClientId,
}: {
  candidates: ClientResolveCandidate[];
  clients: ClientSummary[];
  disabled: boolean;
  inputMode: ClientInputMode;
  lockedClientName: string | null;
  loading: boolean;
  message: string | null;
  onInputModeChange: (mode: ClientInputMode) => void;
  onSearchTextChange: (value: string) => void;
  onSelectClient: (clientId: number | null) => void;
  searchText: string;
  selectedClientId: number | null;
}) {
  const clientSelectOptions = [
    { label: '고객사 선택', value: '' },
    ...clients.map((client) => ({ label: client.name, value: String(client.id) })),
    { label: '직접 입력으로 기존 고객사 검색', value: DIRECT_CLIENT_VALUE },
  ];
  const selectedValue = inputMode === 'direct' ? DIRECT_CLIENT_VALUE : selectedClientId ? String(selectedClientId) : '';

  function handleClientSelect(value: string) {
    if (value === DIRECT_CLIENT_VALUE) {
      onInputModeChange('direct');
      onSelectClient(null);
      return;
    }

    onInputModeChange('select');
    onSelectClient(value ? Number(value) : null);
  }

  if (lockedClientName) {
    return (
      <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">상단에서 선택한 고객사로 업로드합니다</p>
        <p className="mt-1 text-sm text-slate-600">{lockedClientName}</p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-md border border-slate-200 bg-white px-4 py-4">
      <div className="grid gap-3">
        <Select
          disabled={disabled}
          label="고객사"
          onChange={(event) => handleClientSelect(event.target.value)}
          options={clientSelectOptions}
          value={selectedValue}
        />
        {inputMode === 'direct' ? (
          <Input
            disabled={disabled}
            label="기존 고객사명 또는 별칭"
            onChange={(event) => onSearchTextChange(event.target.value)}
            placeholder="예: 웰스토리, 삼성웰스토리"
            value={searchText}
          />
        ) : null}
      </div>

      {inputMode === 'direct' ? (
        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-700">
          직접 입력은 기존 고객사를 찾기 위한 검색입니다. OIS 업로드 과정에서 신규 고객사는 생성되지 않습니다.
        </div>
      ) : null}

      {message ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-800">
          {message}
        </div>
      ) : null}

      {inputMode === 'direct' && candidates.length ? (
        <div className="mt-3 grid gap-2 lg:grid-cols-2">
          {candidates.map((candidate) => {
            const selected = candidate.client.id === selectedClientId;
            return (
              <button
                className={`min-h-[76px] rounded-md border px-3 py-3 text-left transition ${
                  selected ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-100' : 'border-slate-200 bg-slate-50 hover:border-teal-200 hover:bg-teal-50/50'
                }`}
                disabled={disabled}
                key={candidate.client.id}
                onClick={() => onSelectClient(candidate.client.id)}
                type="button"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-950">{candidate.client.name}</p>
                    <p className="mt-1 truncate font-mono text-xs text-slate-500">{candidate.client.code}</p>
                  </div>
                  <Badge tone={candidate.score >= 90 ? 'green' : candidate.score >= 70 ? 'blue' : 'amber'}>{candidate.score}%</Badge>
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                  {candidate.reason} {candidate.matchedText ? `(${candidate.matchedText})` : ''}
                </p>
              </button>
            );
          })}
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
  errorMessage,
  loading,
  productMaster,
  publicView,
  storeRouteMaster,
}: {
  errorMessage: string | null;
  loading: boolean;
  productMaster: MasterCriteria | null;
  publicView: boolean;
  storeRouteMaster: MasterCriteria | null;
}) {
  const ready = Boolean(productMaster?.rowCount && storeRouteMaster?.rowCount);

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-bold text-slate-950">현재 검증 기준 마스터</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {loading
              ? '현재 마스터 기준 정보를 불러오는 중입니다.'
              : ready
                ? '검증에 필요한 기준 데이터가 준비되어 있습니다.'
                : '마스터 데이터 상태를 확인해 주세요.'}
          </p>
        </div>
        <Badge tone={loading ? 'neutral' : ready ? 'green' : 'amber'}>{loading ? '조회 중' : ready ? '검증 가능' : '확인 필요'}</Badge>
      </div>
      {errorMessage ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-xs font-semibold leading-5 text-amber-800">
          {errorMessage}
        </div>
      ) : null}
      <div className="mt-5 space-y-3">
        <MasterCriteriaRow label="상품 마스터" loading={loading} master={productMaster} to={publicView ? '/client-masters' : '/masters/products'} />
        <MasterCriteriaRow label="배송지/차량 마스터" loading={loading} master={storeRouteMaster} to={publicView ? '/client-masters' : '/masters/store-routes'} />
      </div>
    </Card>
  );
}

function MasterCriteriaRow({ label, loading, master, to }: { label: string; loading: boolean; master: MasterCriteria | null; to: string }) {
  const hasRows = Boolean(master?.rowCount);

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <Badge tone={loading ? 'neutral' : hasRows ? 'blue' : 'amber'}>{loading ? '조회 중' : `${(master?.rowCount ?? 0).toLocaleString()}건`}</Badge>
      </div>
      <p className="mt-1 text-xs text-slate-500">마지막 업로드: {formatDateTime(master?.latestUploadedAt)}</p>
      {master?.latestUploadFileName ? <p className="mt-1 truncate text-xs text-slate-500">{master.latestUploadFileName}</p> : null}
      <div className="mt-3 flex items-center justify-between gap-2">
        {master?.latestUploadStatus ? <MasterUploadStatusBadge status={master.latestUploadStatus} /> : <span className="text-xs text-slate-400">업로드 이력 없음</span>}
        <Link className="text-xs font-semibold text-teal-700 hover:text-teal-800" to={to}>
          마스터 보기
        </Link>
      </div>
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
        <li>
          <span className="font-semibold text-slate-900">4. 실패 조치</span>
          <br />
          마스터 누락은 기준 데이터를 보완한 뒤 같은 배치를 재검증하고, 엑셀 원본 오류는 수정 파일을 새로 업로드합니다.
        </li>
      </ol>
    </Card>
  );
}

function RecentUploadsPanel({
  errorMessage,
  loading,
  recentBatches,
}: {
  errorMessage: string | null;
  loading: boolean;
  recentBatches: BackendBatchSummary[];
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-bold text-slate-950">최근 업로드</p>
        <Link className="text-sm font-semibold text-teal-700 hover:text-teal-800" to="/batches">
          전체 보기
        </Link>
      </div>
      <div className="mt-4 space-y-3">
        {loading ? <PanelPlaceholder message="최근 업로드를 불러오는 중입니다." /> : null}
        {!loading && errorMessage ? <PanelPlaceholder message="최근 업로드를 불러오지 못했습니다." tone="amber" /> : null}
        {!loading && !errorMessage && recentBatches.length === 0 ? <PanelPlaceholder message="최근 업로드 배치가 없습니다." /> : null}
        {!loading && !errorMessage
          ? recentBatches.map((batch) => (
              <Link
                className="block rounded-md border border-slate-200 px-3 py-3 transition hover:border-teal-200 hover:bg-teal-50/40"
                key={batch.id}
                to={`/batches/${batch.id}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-sm font-semibold text-slate-950">{batch.batchNo}</span>
                  <BatchStatusBadge status={batch.status} />
                </div>
                <p className="mt-1 text-xs text-slate-500">배송일 {batch.deliveryDate ?? '-'}</p>
                <p className="mt-1 text-xs text-slate-500">업로드 {formatDateTime(batch.uploadedAt)}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone={batch.errorCount > 0 ? 'red' : 'green'}>E {batch.errorCount}</Badge>
                  <Badge tone={batch.warningCount > 0 ? 'amber' : 'green'}>W {batch.warningCount}</Badge>
                  <Badge tone="blue">I {batch.infoCount}</Badge>
                </div>
              </Link>
            ))
          : null}
      </div>
    </Card>
  );
}

function hideResolvedSupplementParents(items: BackendBatchSummary[]) {
  const confirmedSupplementParentIds = new Set(
    items
      .filter((item) => item.status === 'CONFIRMED' && item.parentBatchId)
      .map((item) => item.parentBatchId as number),
  );

  if (confirmedSupplementParentIds.size === 0) {
    return items;
  }

  return items.filter((item) => !(item.status === 'NEEDS_MORE_INFO' && confirmedSupplementParentIds.has(item.id)));
}

function toMasterCriteria(
  rowCount: number,
  latestUpload?: ProductMasterUploadHistory | StoreRouteMasterUploadHistory,
): MasterCriteria {
  return {
    latestUploadedAt: latestUpload?.appliedAt ?? latestUpload?.uploadedAt,
    latestUploadFileName: latestUpload?.fileName,
    latestUploadStatus: latestUpload?.status,
    rowCount,
  };
}

function MasterUploadStatusBadge({ status }: { status: MasterUploadStatus }) {
  const tone =
    status === 'APPLIED' || status === 'SUCCESS'
      ? 'green'
      : status === 'FAILED'
        ? 'red'
        : status === 'PROCESSING' || status === 'UPLOADED' || status === 'READY_TO_APPLY'
          ? 'blue'
          : status === 'CANCELLED'
            ? 'neutral'
            : 'amber';
  const label: Record<MasterUploadStatus, string> = {
    APPLIED: '반영 완료',
    CANCELLED: '취소',
    FAILED: '실패',
    PARTIAL_FAILED: '부분 실패',
    PROCESSING: '처리 중',
    READY_TO_APPLY: '반영 대기',
    REVIEW_REQUIRED: '확인 필요',
    SUCCESS: '성공',
    UPLOADED: '업로드',
  };

  return <Badge tone={tone}>{label[status] ?? status}</Badge>;
}

function PanelPlaceholder({ message, tone = 'neutral' }: { message: string; tone?: 'neutral' | 'amber' }) {
  const className =
    tone === 'amber'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-slate-200 bg-slate-50 text-slate-500';

  return <div className={`rounded-md border px-3 py-4 text-center text-sm font-semibold ${className}`}>{message}</div>;
}

function createFallbackClientCandidates(clients: ClientSummary[], sourceText: string): ClientResolveCandidate[] {
  const normalizedSource = normalizeClientSearchText(sourceText);
  const candidates = clients
    .map((client) => {
      const normalizedName = normalizeClientSearchText(client.name);
      const normalizedCode = normalizeClientSearchText(client.code);
      const score =
        normalizedName === normalizedSource || normalizedCode === normalizedSource
          ? 100
          : normalizedName.includes(normalizedSource) || normalizedSource.includes(normalizedName)
            ? 92
            : normalizedCode.includes(normalizedSource) || normalizedSource.includes(normalizedCode)
              ? 88
              : 0;

      return {
        client,
        matchType: normalizedCode.includes(normalizedSource) ? 'CLIENT_CODE' : 'CLIENT_NAME',
        matchedText: normalizedName.includes(normalizedSource) ? client.name : client.code,
        reason: '고객사 목록에서 파일명과 가까운 항목을 찾았습니다.',
        score,
      } satisfies ClientResolveCandidate;
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.client.name.localeCompare(right.client.name))
    .slice(0, 5);

  return candidates;
}

function dedupeClientsByName(clients: ClientSummary[]) {
  const seen = new Set<string>();
  return clients.filter((client) => {
    const key = normalizeClientSearchText(client.name);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function normalizeClientSearchText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\.(xlsx|xlsm|xls|csv)$/i, '')
    .replace(/[\s_\-()[\]{}.,]+/g, '');
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

function actionTitle(phase: UploadPhase, loadingAction: LoadingAction, canConfirm: boolean, confirmationRequested: boolean, confirmed: boolean) {
  if (loadingAction === 'upload') {
    return '엑셀 파일을 확인하고 있습니다';
  }

  if (loadingAction === 'validate') {
    return '배치 검증을 실행 중입니다';
  }

  if (loadingAction === 'confirm') {
    return '배치 확정 요청 처리 중입니다';
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

  if (confirmed) {
    return '주문이 확정되었습니다';
  }
  if (confirmationRequested) {
    return '배치 확정을 요청했습니다';
  }

  return canConfirm ? '검증 완료, 확정 요청 가능' : '검증 완료, 조치 필요';
}

function actionDescription(phase: UploadPhase, loadingAction: LoadingAction, canConfirm: boolean, confirmationRequested: boolean, confirmed: boolean) {
  if (loadingAction === 'upload') {
    return '시트 구성과 데이터 건수를 확인하는 중입니다.';
  }

  if (loadingAction === 'validate') {
    return '현재 마스터 기준으로 오류와 경고를 확인합니다.';
  }

  if (loadingAction === 'confirm') {
    return '물류사 담당자에게 전달할 요청을 저장하고 있습니다.';
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

  if (confirmed) {
    return '';
  }
  if (confirmationRequested) {
    return '물류사 담당자가 검토한 뒤 최종 확정합니다.';
  }

  return canConfirm ? '검증 결과를 확인한 뒤 물류사에 배치 확정을 요청할 수 있습니다.' : '오류가 있으면 검증 결과를 먼저 확인하세요.';
}

function getValidationOverlayCopy(stage: ValidationOverlayStage) {
  if (!stage) {
    return null;
  }

  if (stage === 'ready') {
    return {
      title: '검증 완료, 확정을 요청할 수 있습니다',
      description: 'Error가 없어 배치 확정 요청 단계로 이동할 수 있습니다.',
    };
  }

  if (stage === 'blocked') {
    return {
      title: '검증 결과 Error가 확인되었습니다',
      description: '확정할 수 없는 항목이 있습니다. 검증 결과에서 원인을 확인해 주세요.',
    };
  }

  if (stage === 'request-error') {
    return {
      title: '검증을 완료하지 못했습니다',
      description: '검증 요청 처리 중 문제가 발생했습니다. 파일과 업로드 기준을 확인해 주세요.',
    };
  }

  return {
    title: '배치 검증을 실행하고 있습니다',
    description: '현재 마스터 기준으로 오류와 경고를 확인하는 중입니다. 잠시만 기다려 주세요.',
  };
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

function extractClientSearchText(fileName: string) {
  const withoutExtension = fileName.replace(/\.[^.]+$/, '');
  const normalized = normalizeClientSearchText(withoutExtension);
  if (normalized.includes('웰스토리') || normalized.includes('웰스트리')) {
    return '웰스토리';
  }
  const [firstSegment] = withoutExtension.split(/[_-]/);
  return (firstSegment || withoutExtension).trim();
}

function formatDateTime(value?: string | null) {
  return value ? value.replace('T', ' ').slice(0, 16) : '-';
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024)).toLocaleString()}KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)}MB`;
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
