import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { OmsApiError } from '../api/client';
import { omsApi } from '../api/oms';
import { fakeCurrentUser } from '../app/auth';
import { dispatchNotificationsChanged } from '../app/notificationEvents';
import { Badge, Button, Card, ModalFrame } from '../components/common';
import { DataTable, Pagination, type DataTableColumn } from '../components/data';
import { BatchStatusBadge, ConfirmActionModal } from '../components/domain';
import type { PageResponse } from '../types/api';
import type { BatchConfirmationRequest, BatchConfirmationRequestStatus, BatchSupplementRequestType } from '../types/batch';

const requestStatusOptions: Array<{ label: string; value: 'ALL' | BatchConfirmationRequestStatus }> = [
  { label: '전체', value: 'ALL' },
  { label: '요청 대기', value: 'REQUESTED' },
  { label: '보완 요청', value: 'NEEDS_MORE_INFO' },
  { label: '반려', value: 'REJECTED' },
  { label: '승인 완료', value: 'APPROVED' },
];

const supplementTypeOptions: Array<{ label: string; value: BatchSupplementRequestType; description: string }> = [
  { label: '파일 보완 필요', value: 'FILE_REUPLOAD', description: '고객사가 수정한 OIS 엑셀을 보완본으로 다시 업로드합니다.' },
  { label: '마스터 보완 필요', value: 'MASTER_DATA', description: '물류사가 마스터를 수정한 뒤 기존 배치를 재검증합니다.' },
  { label: '내용 확인 필요', value: 'CLARIFICATION', description: '파일 수정 없이 고객사의 설명이나 확인이 필요합니다.' },
];

type ReviewAction = 'approve' | 'reject' | 'needsMoreInfo';

interface PendingReviewAction {
  request: BatchConfirmationRequest;
  action: ReviewAction;
}

export function BatchConfirmationRequestsPage() {
  const tenantId = fakeCurrentUser.tenantId ?? null;
  const [status, setStatus] = useState<'ALL' | BatchConfirmationRequestStatus>('REQUESTED');
  const [page, setPage] = useState(1);
  const [response, setResponse] = useState<PageResponse<BatchConfirmationRequest> | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingReview, setPendingReview] = useState<PendingReviewAction | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [supplementType, setSupplementType] = useState<BatchSupplementRequestType>('FILE_REUPLOAD');
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reloadSeq, setReloadSeq] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadRequests() {
      if (!tenantId) {
        setErrorMessage('물류사 계정 정보가 없습니다. 다시 로그인해 주세요.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage(null);
      try {
        const result = await omsApi.batches.confirmationRequests.list({
          tenantId,
          status: status === 'ALL' ? undefined : status,
          page: page - 1,
          size: 20,
        });
        if (!ignore) setResponse(result);
      } catch (error) {
        if (!ignore) setErrorMessage(formatApiError(error));
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadRequests();
    return () => {
      ignore = true;
    };
  }, [page, reloadSeq, status, tenantId]);

  const requests = useMemo(() => response?.items ?? [], [response?.items]);
  const summary = useMemo(() => summarizeRequests(requests), [requests]);

  function openReview(request: BatchConfirmationRequest, action: ReviewAction) {
    if (actionId !== null) return;
    setPendingReview({ request, action });
    setReviewComment('');
    setSupplementType('FILE_REUPLOAD');
    setErrorMessage(null);
    setReviewError(null);
  }

  function closeReview() {
    if (actionId !== null) return;
    setPendingReview(null);
    setReviewComment('');
    setSupplementType('FILE_REUPLOAD');
    setReviewError(null);
  }

  async function submitReview() {
    if (!pendingReview) return;
    const { action, request } = pendingReview;
    if (!tenantId || actionId !== null) return;

    const comment = reviewComment.trim();
    if (action === 'reject' && comment.length === 0) {
      setReviewError('반려 사유를 입력해 주세요.');
      return;
    }
    if (action === 'needsMoreInfo' && comment.length === 0) {
      setReviewError('보완 요청 사유를 입력해 주세요.');
      return;
    }

    setActionId(request.id);
    setReviewError(null);
    try {
      const body = {
        actorId: fakeCurrentUser.id ?? undefined,
        comment:
          comment ||
          (action === 'approve'
            ? '물류사 검토 후 확정 승인'
            : action === 'reject'
              ? '물류사 검토 후 확정 요청 반려'
              : '물류사 검토 후 고객사 보완 요청'),
        supplementType: action === 'needsMoreInfo' ? supplementType : undefined,
      };
      if (action === 'approve') {
        await omsApi.batches.confirmationRequests.approve(request.id, { tenantId, clientId: request.clientId }, body);
      } else if (action === 'reject') {
        await omsApi.batches.confirmationRequests.reject(request.id, { tenantId, clientId: request.clientId }, body);
      } else {
        await omsApi.batches.confirmationRequests.needsMoreInfo(request.id, { tenantId, clientId: request.clientId }, body);
      }
      setPendingReview(null);
      setReviewComment('');
      setSupplementType('FILE_REUPLOAD');
      setReloadSeq((current) => current + 1);
      dispatchNotificationsChanged();
    } catch (error) {
      const message = formatApiError(error);
      setReviewError(message);
      if (action !== 'needsMoreInfo') {
        setErrorMessage(message);
      }
    } finally {
      setActionId(null);
    }
  }

  const columns: DataTableColumn<BatchConfirmationRequest>[] = [
    {
      key: 'requestedAt',
      header: '요청일시',
      width: '160px',
      cell: (item) => <span className="text-sm text-slate-700">{formatDateTime(item.requestedAt)}</span>,
    },
    {
      key: 'batchNo',
      header: '배치',
      width: '180px',
      cell: (item) => (
        <Link className="font-mono text-sm font-semibold text-teal-700 hover:underline" to={`/batches/${item.batchId}`}>
          {item.batchNo}
        </Link>
      ),
    },
    { key: 'clientId', header: '고객사', width: '96px', cell: (item) => <span className="font-mono text-sm">#{item.clientId}</span> },
    { key: 'deliveryDate', header: '배송일', width: '120px', cell: (item) => item.deliveryDate ?? '-' },
    {
      key: 'batchStatus',
      header: '배치 상태',
      width: '130px',
      cell: (item) => <BatchStatusBadge status={item.batchStatus} />,
    },
    {
      key: 'severity',
      header: '검증',
      width: '190px',
      cell: (item) => (
        <div className="flex flex-wrap gap-1">
          <Badge tone={item.errorCount > 0 ? 'red' : 'neutral'}>E {item.errorCount}</Badge>
          <Badge tone={item.warningCount > 0 ? 'amber' : 'neutral'}>W {item.warningCount}</Badge>
          <Badge tone="neutral">I {item.infoCount}</Badge>
        </div>
      ),
    },
    {
      key: 'status',
      header: '요청 상태',
      width: '120px',
      cell: (item) => <RequestStatusBadge status={item.status} />,
    },
    {
      key: 'actions',
      header: '처리',
      sticky: 'right',
      width: '240px',
      cell: (item) =>
        item.status === 'REQUESTED' ? (
          <div className="flex flex-nowrap gap-2">
            <Button disabled={actionId !== null} onClick={() => openReview(item, 'approve')} size="sm" variant="primary">
              승인
            </Button>
            <Button disabled={actionId !== null} onClick={() => openReview(item, 'needsMoreInfo')} size="sm" variant="secondary">
              보완 요청
            </Button>
            <Button disabled={actionId !== null} onClick={() => openReview(item, 'reject')} size="sm" variant="danger">
              반려
            </Button>
          </div>
        ) : item.status === 'REJECTED' ? null : (
          <span className="text-xs text-slate-500">{item.reviewComment ?? '처리 완료'}</span>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard label="요청 대기" tone="amber" value={summary.requested} />
        <SummaryCard label="보완 요청" tone="neutral" value={summary.needsMoreInfo} />
        <SummaryCard label="반려" tone="red" value={summary.rejected} />
        <SummaryCard label="승인 완료" tone="teal" value={summary.approved} />
      </div>

      <Card className="p-4 sm:p-5">
        <div className="grid grid-cols-[minmax(0,1fr)_140px] items-center gap-3 md:flex md:items-center md:justify-between">
          <div>
            <p className="text-base font-bold text-slate-950">배치 확정 요청</p>
            <p className="mt-1 hidden text-sm text-slate-500 sm:block">Error 0건 배치의 최종 확정 여부를 물류사가 검토합니다.</p>
          </div>
          <select
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 md:w-auto"
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value as 'ALL' | BatchConfirmationRequestStatus);
            }}
            value={status}
          >
            {requestStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {errorMessage ? (
        <Card className="border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-semibold text-red-700">{errorMessage}</p>
        </Card>
      ) : null}

      <Card className="p-0">
        {loading ? (
          <div className="px-5 py-12 text-center text-sm text-slate-500">확정 요청을 불러오는 중입니다.</div>
        ) : requests.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-500">조건에 맞는 확정 요청이 없습니다.</div>
        ) : (
          <DataTable
            columns={columns}
            data={requests}
            getRowKey={(item) => String(item.id)}
            renderMobileCard={(item) => (
              <BatchConfirmationMobileCard actionId={actionId} item={item} onOpenReview={openReview} />
            )}
          />
        )}
      </Card>

      <Pagination
        onPageChange={setPage}
        page={(response?.page ?? page - 1) + 1}
        total={response?.totalElements ?? requests.length}
        totalPages={Math.max(1, response?.totalPages ?? 1)}
      />

      <ConfirmActionModal
        confirmLabel="승인"
        description={pendingReview?.action === 'approve' ? `${pendingReview.request.batchNo} 배치를 정말로 승인하시겠습니까? 승인하면 배치가 최종 확정됩니다.` : ''}
        loading={actionId !== null}
        onClose={closeReview}
        onConfirm={submitReview}
        open={pendingReview?.action === 'approve'}
        title="배치 확정 승인"
      />
      <ConfirmActionModal
        confirmLabel="반려"
        confirmVariant="danger"
        description={pendingReview?.action === 'reject' ? `${pendingReview.request.batchNo} 확정 요청을 정말로 반려하시겠습니까? 반려 후 고객사가 다시 확인해야 합니다.` : ''}
        loading={actionId !== null}
        onClose={closeReview}
        onConfirm={submitReview}
        open={false}
        title="확정 요청 반려"
      />
      <RejectRequestModal
        batchNo={pendingReview?.request.batchNo ?? ''}
        errorMessage={reviewError}
        loading={actionId !== null}
        onChange={setReviewComment}
        onClose={closeReview}
        onConfirm={submitReview}
        open={pendingReview?.action === 'reject'}
        value={reviewComment}
      />
      <NeedsMoreInfoModal
        batchNo={pendingReview?.request.batchNo ?? ''}
        errorMessage={reviewError}
        loading={actionId !== null}
        onChange={setReviewComment}
        onClose={closeReview}
        onConfirm={submitReview}
        open={pendingReview?.action === 'needsMoreInfo'}
        supplementType={supplementType}
        onSupplementTypeChange={setSupplementType}
        value={reviewComment}
      />
    </div>
  );
}

function RejectRequestModal({
  batchNo,
  errorMessage,
  loading,
  onChange,
  onClose,
  onConfirm,
  open,
  value,
}: {
  batchNo: string;
  errorMessage: string | null;
  loading: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  open: boolean;
  value: string;
}) {
  if (!open) {
    return null;
  }

  return (
    <ModalFrame onClose={onClose} panelClassName="w-full max-w-lg">
      <Card className="p-5">
        <p className="text-base font-semibold text-slate-900">반려 사유 입력</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {batchNo} 확정 요청을 반려하는 사유를 입력해 주세요. 이 내용은 고객사 알림과 배치 상세에 표시됩니다.
        </p>
        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-semibold text-slate-600">반려 사유</span>
          <textarea
            className="min-h-32 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            disabled={loading}
            maxLength={1000}
            onChange={(event) => onChange(event.target.value)}
            placeholder="예: 배송일/거래처 기준이 맞지 않아 확정할 수 없습니다. 원 데이터를 확인한 뒤 다시 요청해 주세요."
            value={value}
          />
        </label>
        <div className="mt-1 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-red-600">{errorMessage ?? ''}</p>
          <p className="text-xs text-slate-500">{value.length.toLocaleString()} / 1000</p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button disabled={loading} onClick={onClose} variant="secondary">
            취소
          </Button>
          <Button disabled={loading} onClick={onConfirm} variant="danger">
            {loading ? '처리 중' : '반려 처리'}
          </Button>
        </div>
      </Card>
    </ModalFrame>
  );
}

function NeedsMoreInfoModal({
  batchNo,
  errorMessage,
  loading,
  onChange,
  onClose,
  onConfirm,
  onSupplementTypeChange,
  open,
  supplementType,
  value,
}: {
  batchNo: string;
  errorMessage: string | null;
  loading: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  onSupplementTypeChange: (value: BatchSupplementRequestType) => void;
  open: boolean;
  supplementType: BatchSupplementRequestType;
  value: string;
}) {
  if (!open) {
    return null;
  }

  return (
    <ModalFrame onClose={onClose} panelClassName="w-full max-w-lg">
      <Card className="p-5">
        <p className="text-base font-semibold text-slate-900">보완 요청 사유 입력</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {batchNo} 배치에 대해 고객사에게 전달할 보완 요청 사유를 입력해 주세요.
        </p>
        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-semibold text-slate-600">보완 유형</span>
          <select
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            disabled={loading}
            onChange={(event) => onSupplementTypeChange(event.target.value as BatchSupplementRequestType)}
            value={supplementType}
          >
            {supplementTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            {supplementTypeOptions.find((option) => option.value === supplementType)?.description}
          </span>
        </label>
        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-semibold text-slate-600">보완 요청 사유</span>
          <textarea
            className="min-h-32 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            disabled={loading}
            maxLength={1000}
            onChange={(event) => onChange(event.target.value)}
            placeholder="예: 상품코드 P-001의 마스터 등록이 필요합니다. 수정 후 다시 확정 요청해 주세요."
            value={value}
          />
        </label>
        <div className="mt-1 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-red-600">{errorMessage ?? ''}</p>
          <p className="text-xs text-slate-500">{value.length.toLocaleString()} / 1000</p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button disabled={loading} onClick={onClose} variant="secondary">
            취소
          </Button>
          <Button disabled={loading} onClick={onConfirm} variant="primary">
            {loading ? '처리 중' : '보완 요청 보내기'}
          </Button>
        </div>
      </Card>
    </ModalFrame>
  );
}

function RequestStatusBadge({ status }: { status: BatchConfirmationRequestStatus }) {
  const labels: Record<BatchConfirmationRequestStatus, string> = {
    REQUESTED: '요청 대기',
    NEEDS_MORE_INFO: '보완 요청',
    REJECTED: '반려',
    APPROVED: '승인 완료',
  };
  const tones: Record<BatchConfirmationRequestStatus, 'amber' | 'neutral' | 'teal' | 'red'> = {
    REQUESTED: 'amber',
    NEEDS_MORE_INFO: 'neutral',
    REJECTED: 'red',
    APPROVED: 'teal',
  };
  return <Badge tone={tones[status]}>{labels[status]}</Badge>;
}

function BatchConfirmationMobileCard({
  actionId,
  item,
  onOpenReview,
}: {
  actionId: number | null;
  item: BatchConfirmationRequest;
  onOpenReview: (request: BatchConfirmationRequest, action: ReviewAction) => void;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <RequestStatusBadge status={item.status} />
            <BatchStatusBadge status={item.batchStatus} />
          </div>
          <Link className="mt-2 block truncate font-mono text-sm font-bold text-teal-700 hover:underline" to={`/batches/${item.batchId}`}>
            {item.batchNo}
          </Link>
          <p className="mt-1 text-xs text-slate-500">{formatDateTime(item.requestedAt)}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-semibold text-slate-500">배송일</p>
          <p className="text-sm font-bold text-slate-950">{item.deliveryDate ?? '-'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-600">
        <MobileFact label="고객사" value={`#${item.clientId}`} />
        <MobileFact label="검증" value={<SeverityBadges item={item} />} />
      </div>

      {item.status === 'REQUESTED' ? (
        <div className="grid grid-cols-3 gap-1.5 pt-0.5">
          <Button className="w-full px-1" disabled={actionId !== null} onClick={() => onOpenReview(item, 'approve')} size="sm" variant="primary">
            승인
          </Button>
          <Button className="w-full px-1" disabled={actionId !== null} onClick={() => onOpenReview(item, 'needsMoreInfo')} size="sm" variant="secondary">
            보완
          </Button>
          <Button className="w-full px-1" disabled={actionId !== null} onClick={() => onOpenReview(item, 'reject')} size="sm" variant="danger">
            반려
          </Button>
        </div>
      ) : item.status === 'REJECTED' ? null : (
        <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {item.reviewComment ?? '처리 완료'}
        </p>
      )}
    </div>
  );
}

function SeverityBadges({ item }: { item: BatchConfirmationRequest }) {
  return (
    <div className="flex flex-wrap gap-1">
      <Badge tone={item.errorCount > 0 ? 'red' : 'neutral'}>E {item.errorCount}</Badge>
      <Badge tone={item.warningCount > 0 ? 'amber' : 'neutral'}>W {item.warningCount}</Badge>
      <Badge tone="neutral">I {item.infoCount}</Badge>
    </div>
  );
}

function MobileFact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs">
      <span className="shrink-0 font-semibold text-slate-500">{label}</span>
      <div className="min-w-0 truncate font-semibold text-slate-800">{value}</div>
    </div>
  );
}

function SummaryCard({ label, tone, value }: { label: string; tone: 'amber' | 'neutral' | 'teal' | 'red'; value: number }) {
  return (
    <Card className="p-2.5 sm:p-4">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1.5 text-xl font-bold text-slate-950 sm:mt-2 sm:text-2xl">{value.toLocaleString()}</p>
      <div className="mt-3 hidden sm:block">
        <Badge tone={tone}>현재 페이지</Badge>
      </div>
    </Card>
  );
}

function summarizeRequests(items: BatchConfirmationRequest[]) {
  return {
    requested: items.filter((item) => item.status === 'REQUESTED').length,
    needsMoreInfo: items.filter((item) => item.status === 'NEEDS_MORE_INFO').length,
    rejected: items.filter((item) => item.status === 'REJECTED').length,
    approved: items.filter((item) => item.status === 'APPROVED').length,
  };
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatApiError(error: unknown) {
  if (error instanceof OmsApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return '요청 처리 중 오류가 발생했습니다.';
}
