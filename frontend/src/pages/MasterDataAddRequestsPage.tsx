import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { OmsApiError } from '../api/client';
import { omsApi } from '../api/oms';
import { fakeCurrentUser } from '../app/auth';
import { Badge, Button, Card, Input, Modal, Select } from '../components/common';
import { DataTable, Pagination, type DataTableColumn } from '../components/data';
import type { PageResponse } from '../types/api';
import type { ClientSummary } from '../types/client';
import type { MasterDataAddRequest, MasterDataAddRequestReview, MasterDataAddRequestStatus, MasterDataAddRequestType } from '../types/master';

const pageSize = 20;

const statusOptions: Array<{ label: string; value: 'ALL' | MasterDataAddRequestStatus }> = [
  { label: '전체', value: 'ALL' },
  { label: '요청 대기', value: 'REQUESTED' },
  { label: '보완 요청', value: 'NEEDS_MORE_INFO' },
  { label: '반려', value: 'REJECTED' },
  { label: '승인', value: 'APPROVED' },
  { label: '반영 완료', value: 'APPLIED' },
];

const requestTypeOptions: Array<{ label: string; value: 'ALL' | MasterDataAddRequestType }> = [
  { label: '전체', value: 'ALL' },
  { label: '상품 추가', value: 'PRODUCT' },
  { label: '배송지/차량 추가', value: 'STORE_ROUTE' },
  { label: '상품 코드 매핑', value: 'PRODUCT_CODE_MAPPING' },
  { label: '배송지 코드 매핑', value: 'STORE_CODE_MAPPING' },
];

type ReviewAction = 'approve' | 'needsMoreInfo' | 'reject';

interface PendingReview {
  action: ReviewAction;
  request: MasterDataAddRequest;
}

interface PendingApply {
  request: MasterDataAddRequest;
}

export function MasterDataAddRequestsPage() {
  const tenantId = fakeCurrentUser.tenantId ?? null;
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [clientId, setClientId] = useState('ALL');
  const [status, setStatus] = useState<'ALL' | MasterDataAddRequestStatus>('REQUESTED');
  const [requestType, setRequestType] = useState<'ALL' | MasterDataAddRequestType>('ALL');
  const [page, setPage] = useState(1);
  const [response, setResponse] = useState<PageResponse<MasterDataAddRequest> | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadSeq, setReloadSeq] = useState(0);
  const [actionId, setActionId] = useState<number | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<MasterDataAddRequest | null>(null);
  const [pendingReview, setPendingReview] = useState<PendingReview | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [pendingApply, setPendingApply] = useState<PendingApply | null>(null);
  const [applyFields, setApplyFields] = useState<Record<string, string>>({});
  const [applyComment, setApplyComment] = useState('');
  const [applyError, setApplyError] = useState<string | null>(null);
  const [createClientScope, setCreateClientScope] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    let ignore = false;

    omsApi.clients
      .list({ tenantId })
      .then((items) => {
        if (!ignore) {
          setClients(items);
        }
      })
      .catch((error) => {
        if (!ignore) {
          setErrorMessage(formatApiError(error));
        }
      });

    return () => {
      ignore = true;
    };
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      setErrorMessage('물류사 계정 정보가 없습니다. 다시 로그인해 주세요.');
      return;
    }

    let ignore = false;

    async function loadRequests() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const result = await omsApi.masters.masterDataAddRequests.list({
          tenantId: tenantId ?? undefined,
          clientId: clientId === 'ALL' ? undefined : Number(clientId),
          status: status === 'ALL' ? undefined : status,
          requestType: requestType === 'ALL' ? undefined : requestType,
          page: page - 1,
          size: pageSize,
        });
        if (!ignore) {
          setResponse(result);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(formatApiError(error));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadRequests();
    return () => {
      ignore = true;
    };
  }, [clientId, page, reloadSeq, requestType, status, tenantId]);

  const requests = response?.items ?? [];
  const clientNameMap = useMemo(
    () => new Map(clients.map((client) => [client.id, `${client.name} (${client.code})`])),
    [clients],
  );
  const summary = useMemo(
    () => ({
      requested: requests.filter((item) => item.status === 'REQUESTED').length,
      needsMoreInfo: requests.filter((item) => item.status === 'NEEDS_MORE_INFO').length,
      rejected: requests.filter((item) => item.status === 'REJECTED').length,
      approved: requests.filter((item) => item.status === 'APPROVED').length,
      applied: requests.filter((item) => item.status === 'APPLIED').length,
    }),
    [requests],
  );

  const columns: DataTableColumn<MasterDataAddRequest>[] = [
    {
      key: 'requestedAt',
      header: '요청일시',
      width: '160px',
      cell: (item) => <span className="text-sm text-slate-700">{formatDateTime(item.requestedAt)}</span>,
    },
    {
      key: 'clientId',
      header: '고객사',
      width: '180px',
      cell: (item) => <div className="min-w-0 truncate text-sm text-slate-700">{clientNameMap.get(item.clientId) ?? `#${item.clientId}`}</div>,
    },
    {
      key: 'requestType',
      header: '요청 유형',
      width: '140px',
      cell: (item) => requestTypeLabel(item.requestType),
    },
    {
      key: 'title',
      header: '제목',
      width: '280px',
      cell: (item) => <div className="min-w-0 truncate font-semibold text-slate-950">{item.title}</div>,
    },
    {
      key: 'status',
      header: '상태',
      width: '120px',
      cell: (item) => <Badge tone={requestStatusTone(item.status)}>{requestStatusLabel(item.status)}</Badge>,
    },
    {
      key: 'reviewComment',
      header: '처리 메모',
      width: '240px',
      cell: (item) => <div className="min-w-0 truncate text-sm text-slate-600">{item.reviewComment ?? item.requestMemo ?? '-'}</div>,
    },
    {
      key: 'actions',
      header: '처리',
      sticky: 'right',
      width: '280px',
      cell: (item) => <RequestActions actionId={actionId} item={item} onOpenApply={openApply} onOpenReview={openReview} />,
    },
  ];

  function openReview(request: MasterDataAddRequest, action: ReviewAction) {
    if (actionId !== null) return;
    setPendingReview({ request, action });
    setReviewComment(defaultReviewComment(action));
    setReviewError(null);
  }

  function openApply(request: MasterDataAddRequest) {
    if (actionId !== null) return;
    setPendingApply({ request });
    setApplyFields(buildApplyDraft(request));
    setApplyComment(defaultApplyComment());
    setApplyError(null);
    setCreateClientScope(true);
  }

  function closeReview() {
    if (actionId !== null) return;
    setPendingReview(null);
    setReviewComment('');
    setReviewError(null);
  }

  function closeApply() {
    if (actionId !== null) return;
    setPendingApply(null);
    setApplyFields({});
    setApplyComment('');
    setApplyError(null);
    setCreateClientScope(true);
  }

  function updateApplyField(key: string, value: string) {
    setApplyFields((current) => ({ ...current, [key]: value }));
  }

  async function submitReview() {
    if (!pendingReview || !tenantId || actionId !== null) return;

    const { request, action } = pendingReview;
    const comment = reviewComment.trim();
    if ((action === 'needsMoreInfo' || action === 'reject') && comment.length === 0) {
      setReviewError(action === 'reject' ? '반려 사유를 입력해 주세요.' : '보완 요청 사유를 입력해 주세요.');
      return;
    }

    setActionId(request.id);
    setReviewError(null);
    try {
      const params = { tenantId, clientId: request.clientId };
      const body: MasterDataAddRequestReview = {
        actorId: fakeCurrentUser.id ?? undefined,
        comment: comment || defaultReviewComment(action),
      };
      if (action === 'approve') {
        await omsApi.masters.masterDataAddRequests.approve(request.id, params, body);
      } else if (action === 'needsMoreInfo') {
        await omsApi.masters.masterDataAddRequests.needsMoreInfo(request.id, params, body);
      } else if (action === 'reject') {
        await omsApi.masters.masterDataAddRequests.reject(request.id, params, body);
      }
      setPendingReview(null);
      setReviewComment('');
      setReloadSeq((current) => current + 1);
    } catch (error) {
      const message = formatApiError(error);
      setReviewError(message);
      setErrorMessage(message);
    } finally {
      setActionId(null);
    }
  }

  async function submitApply() {
    if (!pendingApply || !tenantId || actionId !== null) return;

    const { request } = pendingApply;
    const validationError = validateApplyFields(request.requestType, applyFields);
    if (validationError) {
      setApplyError(validationError);
      return;
    }

    setActionId(request.id);
    setApplyError(null);
    try {
      const body: MasterDataAddRequestReview = {
        actorId: fakeCurrentUser.id ?? undefined,
        comment: applyComment.trim() || defaultApplyComment(),
        requestFields: normalizeApplyFields(applyFields),
        createClientScope,
      };
      await omsApi.masters.masterDataAddRequests.apply(
        request.id,
        { tenantId, clientId: request.clientId },
        body,
      );
      closeApply();
      setReloadSeq((current) => current + 1);
    } catch (error) {
      const message = formatApiError(error);
      setApplyError(message);
      setErrorMessage(message);
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-5">
        <SummaryCard label="요청 대기" tone="amber" value={summary.requested} />
        <SummaryCard label="보완 요청" tone="neutral" value={summary.needsMoreInfo} />
        <SummaryCard label="반려" tone="red" value={summary.rejected} />
        <SummaryCard label="승인" tone="teal" value={summary.approved} />
        <SummaryCard label="반영 완료" tone="green" value={summary.applied} />
      </div>

      <Card className="p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_180px_180px_auto] lg:items-end">
          <Select
            label="고객사"
            onChange={(event) => {
              setClientId(event.target.value);
              setPage(1);
            }}
            options={[
              { label: '전체 고객사', value: 'ALL' },
              ...clients.map((client) => ({
                label: `${client.name} (${client.code})`,
                value: String(client.id),
              })),
            ]}
            value={clientId}
          />
          <Select
            label="상태"
            onChange={(event) => {
              setStatus(event.target.value as 'ALL' | MasterDataAddRequestStatus);
              setPage(1);
            }}
            options={statusOptions}
            value={status}
          />
          <Select
            label="요청 유형"
            onChange={(event) => {
              setRequestType(event.target.value as 'ALL' | MasterDataAddRequestType);
              setPage(1);
            }}
            options={requestTypeOptions}
            value={requestType}
          />
          <Button onClick={() => setReloadSeq((current) => current + 1)} variant="secondary">새로고침</Button>
        </div>
      </Card>

      {errorMessage ? (
        <Card className="border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-semibold text-red-700">{errorMessage}</p>
        </Card>
      ) : null}

      <Card className="p-0">
        {loading ? (
          <div className="px-5 py-12 text-center text-sm text-slate-500">마스터 요청 목록을 불러오는 중입니다.</div>
        ) : requests.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-500">조건에 맞는 마스터 요청이 없습니다.</div>
        ) : (
          <DataTable
            columns={columns}
            data={requests}
            getRowKey={(item) => String(item.id)}
            onRowClick={(item) => setSelectedRequest(item)}
            renderMobileCard={(item) => (
              <RequestMobileCard
                actionId={actionId}
                clientName={clientNameMap.get(item.clientId)}
                item={item}
                onOpenApply={() => openApply(item)}
                onOpenDetail={() => setSelectedRequest(item)}
                onOpenReview={openReview}
              />
            )}
          />
        )}
      </Card>

      <Pagination
        onPageChange={setPage}
        page={page}
        total={response?.totalElements ?? 0}
        totalPages={Math.max(1, response?.totalPages ?? 1)}
      />

      <RequestDetailModal
        clientName={selectedRequest ? clientNameMap.get(selectedRequest.clientId) : undefined}
        onClose={() => setSelectedRequest(null)}
        request={selectedRequest}
      />

      <ApplyModal
        applyComment={applyComment}
        applyError={applyError}
        applyFields={applyFields}
        createClientScope={createClientScope}
        loading={actionId !== null}
        onChangeComment={setApplyComment}
        onClose={closeApply}
        onConfirm={submitApply}
        onToggleClientScope={setCreateClientScope}
        onUpdateField={updateApplyField}
        request={pendingApply?.request ?? null}
      />

      <ReviewModal
        action={pendingReview?.action ?? null}
        comment={reviewComment}
        loading={actionId !== null}
        onChangeComment={setReviewComment}
        onClose={closeReview}
        onConfirm={submitReview}
        request={pendingReview?.request ?? null}
        reviewError={reviewError}
      />
    </div>
  );
}

function RequestActions({
  actionId,
  item,
  onOpenApply,
  onOpenReview,
}: {
  actionId: number | null;
  item: MasterDataAddRequest;
  onOpenApply: (request: MasterDataAddRequest) => void;
  onOpenReview: (request: MasterDataAddRequest, action: ReviewAction) => void;
}) {
  if (item.status === 'REQUESTED') {
    return (
      <div className="flex flex-nowrap gap-2">
        <Button
          disabled={actionId !== null}
          onClick={(event) => {
            event.stopPropagation();
            onOpenReview(item, 'approve');
          }}
          size="sm"
          variant="primary"
        >
          승인
        </Button>
        <Button
          disabled={actionId !== null}
          onClick={(event) => {
            event.stopPropagation();
            onOpenReview(item, 'needsMoreInfo');
          }}
          size="sm"
          variant="secondary"
        >
          보완 요청
        </Button>
        <Button
          disabled={actionId !== null}
          onClick={(event) => {
            event.stopPropagation();
            onOpenReview(item, 'reject');
          }}
          size="sm"
          variant="danger"
        >
          반려
        </Button>
      </div>
    );
  }
  if (item.status === 'APPROVED') {
    return (
      <div className="flex flex-nowrap gap-2">
        <Button
          disabled={actionId !== null}
          onClick={(event) => {
            event.stopPropagation();
            onOpenApply(item);
          }}
          size="sm"
          variant="primary"
        >
          반영 완료
        </Button>
      </div>
    );
  }
  return <span className="text-xs text-slate-500">{item.reviewComment ?? '처리 완료'}</span>;
}

function RequestMobileCard({
  actionId,
  clientName,
  item,
  onOpenApply,
  onOpenDetail,
  onOpenReview,
}: {
  actionId: number | null;
  clientName?: string;
  item: MasterDataAddRequest;
  onOpenApply: () => void;
  onOpenDetail: () => void;
  onOpenReview: (request: MasterDataAddRequest, action: ReviewAction) => void;
}) {
  return (
    <button className="w-full space-y-3 text-left" onClick={onOpenDetail} type="button">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">{item.title}</p>
          <p className="mt-1 text-xs text-slate-500">{clientName ?? `고객사 #${item.clientId}`}</p>
        </div>
        <Badge tone={requestStatusTone(item.status)}>{requestStatusLabel(item.status)}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
        <MobileField label="요청 유형" value={requestTypeLabel(item.requestType)} />
        <MobileField label="요청일시" value={formatDateTime(item.requestedAt)} />
        <MobileField label="요청 메모" value={item.requestMemo ?? '-'} />
        <MobileField label="처리 메모" value={item.reviewComment ?? '-'} />
      </div>
      <div className="flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
        {item.status === 'REQUESTED' ? (
          <>
            <Button disabled={actionId !== null} onClick={() => onOpenReview(item, 'approve')} size="sm" variant="primary">승인</Button>
            <Button disabled={actionId !== null} onClick={() => onOpenReview(item, 'needsMoreInfo')} size="sm" variant="secondary">보완 요청</Button>
            <Button disabled={actionId !== null} onClick={() => onOpenReview(item, 'reject')} size="sm" variant="danger">반려</Button>
          </>
        ) : item.status === 'APPROVED' ? (
          <Button disabled={actionId !== null} onClick={onOpenApply} size="sm" variant="primary">반영 완료</Button>
        ) : null}
      </div>
    </button>
  );
}

function RequestDetailModal({
  clientName,
  onClose,
  request,
}: {
  clientName?: string;
  onClose: () => void;
  request: MasterDataAddRequest | null;
}) {
  if (!request) return null;

  return (
    <Modal open size="wide" title="마스터 요청 상세" onClose={onClose}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={requestStatusTone(request.status)}>{requestStatusLabel(request.status)}</Badge>
          <Badge tone="neutral">{requestTypeLabel(request.requestType)}</Badge>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <DetailSection title="요청 정보">
            <DetailItem label="고객사" value={clientName ?? `#${request.clientId}`} />
            <DetailItem label="제목" value={request.title} />
            <DetailItem label="요청일시" value={formatDateTime(request.requestedAt)} />
            <DetailItem label="요청 메모" value={request.requestMemo ?? '-'} />
          </DetailSection>
          <DetailSection title="처리 정보">
            <DetailItem label="상태" value={requestStatusLabel(request.status)} />
            <DetailItem label="검토일시" value={formatDateTime(request.reviewedAt)} />
            <DetailItem label="처리 메모" value={request.reviewComment ?? '-'} />
            <DetailItem
              label="반영 마스터"
              value={request.appliedMasterType && request.appliedMasterItemId ? `${request.appliedMasterType} #${request.appliedMasterItemId}` : '-'}
            />
          </DetailSection>
        </div>

        <DetailSection title="요청 필드">
          <div className="grid gap-3 lg:grid-cols-2">
            {Object.entries(request.requestFields).length === 0 ? (
              <p className="text-sm text-slate-500">입력된 상세 필드가 없습니다.</p>
            ) : (
              Object.entries(request.requestFields).map(([key, value]) => (
                <DetailItem key={key} label={requestFieldLabel(key)} value={value || '-'} />
              ))
            )}
          </div>
        </DetailSection>

        <div className="flex justify-end">
          <Button onClick={onClose} variant="primary">확인</Button>
        </div>
      </div>
    </Modal>
  );
}

function ApplyModal({
  applyComment,
  applyError,
  applyFields,
  createClientScope,
  loading,
  onChangeComment,
  onClose,
  onConfirm,
  onToggleClientScope,
  onUpdateField,
  request,
}: {
  applyComment: string;
  applyError: string | null;
  applyFields: Record<string, string>;
  createClientScope: boolean;
  loading: boolean;
  onChangeComment: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  onToggleClientScope: (value: boolean) => void;
  onUpdateField: (key: string, value: string) => void;
  request: MasterDataAddRequest | null;
}) {
  if (!request) return null;

  const fieldSpecs = applyFieldSpecsByType[request.requestType];

  return (
    <Modal open size="wide" title="마스터 반영" onClose={onClose}>
      <div className="space-y-5">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">{request.title}</p>
          <p className="mt-1 text-xs text-slate-500">
            고객사 {request.clientId} 요청을 실제 마스터 데이터로 반영합니다.
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {fieldSpecs.map((field) => (
            field.type === 'select' ? (
              <Select
                key={field.key}
                label={field.label}
                onChange={(event) => onUpdateField(field.key, event.target.value)}
                options={field.options ?? []}
                value={applyFields[field.key] ?? ''}
              />
            ) : (
              <Input
                key={field.key}
                label={field.label}
                onChange={(event) => onUpdateField(field.key, event.target.value)}
                placeholder={field.placeholder}
                value={applyFields[field.key] ?? ''}
              />
            )
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            checked={createClientScope}
            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            onChange={(event) => onToggleClientScope(event.target.checked)}
            type="checkbox"
          />
          반영 후 이 고객사의 공개 마스터 범위에도 바로 포함
        </label>

        <div>
          <label className="text-sm font-semibold text-slate-700" htmlFor="master-request-apply-comment">
            반영 메모
          </label>
          <textarea
            className="mt-1 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            id="master-request-apply-comment"
            onChange={(event) => onChangeComment(event.target.value)}
            value={applyComment}
          />
        </div>

        {applyError ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{applyError}</div> : null}

        <div className="flex justify-end gap-2">
          <Button disabled={loading} onClick={onClose} variant="ghost">닫기</Button>
          <Button disabled={loading} onClick={onConfirm} variant="primary">
            {loading ? '반영 중' : '반영 완료'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ReviewModal({
  action,
  comment,
  loading,
  onChangeComment,
  onClose,
  onConfirm,
  request,
  reviewError,
}: {
  action: ReviewAction | null;
  comment: string;
  loading: boolean;
  onChangeComment: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  request: MasterDataAddRequest | null;
  reviewError: string | null;
}) {
  if (!action || !request) return null;

  return (
    <Modal open title={reviewModalTitle(action)} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{request.title}</span> 요청을 {reviewActionLabel(action)} 처리합니다.
        </p>
        <div>
          <label className="text-sm font-semibold text-slate-700" htmlFor="master-request-review-comment">
            {action === 'reject' ? '반려 사유' : action === 'needsMoreInfo' ? '보완 요청 메모' : '처리 메모'}
          </label>
          <textarea
            className="mt-1 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            id="master-request-review-comment"
            onChange={(event) => onChangeComment(event.target.value)}
            value={comment}
          />
        </div>
        {reviewError ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{reviewError}</div> : null}
        <div className="flex justify-end gap-2">
          <Button disabled={loading} onClick={onClose} variant="ghost">닫기</Button>
          <Button disabled={loading} onClick={onConfirm} variant={action === 'reject' ? 'danger' : 'primary'}>
            {loading ? '처리 중' : reviewActionLabel(action)}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function DetailSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="text-sm font-bold text-slate-950">{title}</p>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="break-all text-sm text-slate-900">{value}</p>
    </div>
  );
}

function MobileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="font-semibold text-slate-400">{label}</p>
      <p className="mt-1 truncate text-slate-700">{value}</p>
    </div>
  );
}

function SummaryCard({ label, tone, value }: { label: string; tone: 'amber' | 'neutral' | 'red' | 'teal' | 'green'; value: number }) {
  const toneClass =
    tone === 'red'
      ? 'text-red-700'
      : tone === 'amber'
        ? 'text-amber-700'
        : tone === 'teal'
          ? 'text-teal-700'
          : tone === 'green'
            ? 'text-emerald-700'
            : 'text-slate-700';

  return (
    <Card className="p-4">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${toneClass}`}>{value.toLocaleString()}</p>
    </Card>
  );
}

function requestTypeLabel(value: MasterDataAddRequestType) {
  switch (value) {
    case 'PRODUCT':
      return '상품 추가';
    case 'STORE_ROUTE':
      return '배송지/차량 추가';
    case 'PRODUCT_CODE_MAPPING':
      return '상품 코드 매핑';
    case 'STORE_CODE_MAPPING':
      return '배송지 코드 매핑';
    default:
      return value;
  }
}

function requestStatusLabel(value: MasterDataAddRequestStatus) {
  switch (value) {
    case 'REQUESTED':
      return '요청 대기';
    case 'NEEDS_MORE_INFO':
      return '보완 요청';
    case 'REJECTED':
      return '반려';
    case 'APPROVED':
      return '승인';
    case 'APPLIED':
      return '반영 완료';
    default:
      return value;
  }
}

function requestStatusTone(value: MasterDataAddRequestStatus): 'neutral' | 'teal' | 'amber' | 'red' | 'green' {
  switch (value) {
    case 'REQUESTED':
      return 'amber';
    case 'NEEDS_MORE_INFO':
      return 'neutral';
    case 'REJECTED':
      return 'red';
    case 'APPROVED':
      return 'teal';
    case 'APPLIED':
      return 'green';
    default:
      return 'neutral';
  }
}

function requestFieldLabel(key: string) {
  const labels: Record<string, string> = {
    productName: '상품명',
    customerProductCode: '거래처 상품코드',
    outboundUnit: '출고단위',
    boxQty: '박스입수량',
    temperatureType: '보관온도',
    storeName: '배송지명',
    customerCode: '거래처코드',
    brandName: '브랜드명',
    area: '권역',
    deliveryRound: '차수',
    vehicleName: '차량명',
    address: '주소',
    clientProductCode: '고객사 상품코드',
    ezadminCode: 'OMS 상품코드',
    clientStoreCode: '고객사 배송지코드',
    baljugoCode: '발주고 코드',
  };
  return labels[key] ?? key;
}

type ApplyFieldSpec = {
  key: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'select';
  options?: Array<{ label: string; value: string }>;
};

const activeYnOptions = [
  { label: '운영', value: 'Y' },
  { label: '중지', value: 'N' },
];

const applyFieldSpecsByType: Record<MasterDataAddRequestType, ApplyFieldSpec[]> = {
  PRODUCT: [
    { key: 'ezadminCode', label: 'OMS 상품코드', placeholder: '예: 45091' },
    { key: 'productName', label: '상품명' },
    { key: 'customerProductCode', label: '거래처 상품코드' },
    { key: 'outboundUnit', label: '출고단위', placeholder: 'EA / BOX' },
    { key: 'boxQty', label: '박스입수량', placeholder: '예: 20' },
    { key: 'temperatureType', label: '보관온도', placeholder: '상온 / 냉장 / 냉동' },
    { key: 'cbm', label: 'CBM', placeholder: '예: 0.003612' },
    { key: 'activeYn', label: '운영상태', type: 'select', options: activeYnOptions },
  ],
  STORE_ROUTE: [
    { key: 'baljugoCode', label: '발주고코드', placeholder: '예: BJ0017' },
    { key: 'storeName', label: '지점명' },
    { key: 'customerCode', label: '거래처코드' },
    { key: 'brandName', label: '브랜드명' },
    { key: 'area', label: '권역' },
    { key: 'deliveryDay', label: '배송요일' },
    { key: 'deliveryRound', label: '차수' },
    { key: 'vehicleName', label: '차량명' },
    { key: 'driverName', label: '기사명' },
    { key: 'address', label: '주소' },
    { key: 'activeYn', label: '운영상태', type: 'select', options: activeYnOptions },
  ],
  PRODUCT_CODE_MAPPING: [
    { key: 'clientProductCode', label: '고객사 상품코드' },
    { key: 'ezadminCode', label: 'OMS 상품코드' },
    { key: 'memo', label: '메모' },
    { key: 'activeYn', label: '사용상태', type: 'select', options: activeYnOptions },
  ],
  STORE_CODE_MAPPING: [
    { key: 'clientStoreCode', label: '고객사 배송지코드' },
    { key: 'baljugoCode', label: 'OMS 발주고코드' },
    { key: 'memo', label: '메모' },
    { key: 'activeYn', label: '사용상태', type: 'select', options: activeYnOptions },
  ],
};

function buildApplyDraft(request: MasterDataAddRequest) {
  const base = { ...request.requestFields };
  if (!base.activeYn) {
    base.activeYn = 'Y';
  }
  return base;
}

function normalizeApplyFields(fields: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(fields)
      .map(([key, value]) => [key.trim(), value.trim()])
      .filter(([key, value]) => key.length > 0 && value.length > 0),
  );
}

function validateApplyFields(requestType: MasterDataAddRequestType, fields: Record<string, string>) {
  const normalized = normalizeApplyFields(fields);
  const requiredKeysByType: Record<MasterDataAddRequestType, string[]> = {
    PRODUCT: ['ezadminCode'],
    STORE_ROUTE: ['baljugoCode'],
    PRODUCT_CODE_MAPPING: ['clientProductCode', 'ezadminCode'],
    STORE_CODE_MAPPING: ['clientStoreCode', 'baljugoCode'],
  };
  const missingKey = requiredKeysByType[requestType].find((key) => !normalized[key]);
  if (missingKey) {
    return `${requestFieldLabel(missingKey)} 값을 입력해 주세요.`;
  }
  return null;
}

function reviewModalTitle(action: ReviewAction) {
  switch (action) {
    case 'approve':
      return '마스터 요청 승인';
    case 'needsMoreInfo':
      return '마스터 요청 보완 요청';
    case 'reject':
      return '마스터 요청 반려';
    default:
      return '마스터 요청 처리';
  }
}

function reviewActionLabel(action: ReviewAction) {
  switch (action) {
    case 'approve':
      return '승인';
    case 'needsMoreInfo':
      return '보완 요청';
    case 'reject':
      return '반려';
    default:
      return '처리';
  }
}

function defaultReviewComment(action: ReviewAction) {
  switch (action) {
    case 'approve':
      return '마스터 추가 요청을 승인했습니다.';
    case 'needsMoreInfo':
      return '';
    case 'reject':
      return '';
    default:
      return '';
  }
}

function defaultApplyComment() {
  return '마스터 반영을 완료했습니다.';
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  return value.replace('T', ' ').slice(0, 16);
}

function formatApiError(error: unknown) {
  if (error instanceof OmsApiError || error instanceof Error) return error.message;
  return '요청 처리 중 오류가 발생했습니다.';
}


