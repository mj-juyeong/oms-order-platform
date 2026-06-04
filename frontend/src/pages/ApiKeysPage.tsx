import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { OmsApiError } from '../api/client';
import { omsApi } from '../api/oms';
import { canManageApiKeys, canRequestApiKeys, fakeCurrentUser } from '../app/auth';
import { Badge, Button, Card, Input, Modal, Select } from '../components/common';
import { DataTable, Pagination, type DataTableColumn } from '../components/data';
import type { PageResponse } from '../types/api';
import type { ApiKeyItem, ApiKeyRequestItem, ApiKeyRequestStatus } from '../types/apiKey';
import type { ClientSummary } from '../types/client';

type ApiKeyTab = 'requests' | 'keys';
type RequestStatusFilter = 'ALL' | ApiKeyRequestStatus;
type KeyStatusFilter = 'ALL' | 'ACTIVE' | 'REVOKED' | 'EXPIRED';

type RequestFormState = {
  name: string;
  purpose: string;
  systemName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  requestedExpiresAt: string;
  allowedScope: string[];
};

type DirectIssueFormState = {
  name: string;
  expiresAt: string;
  allowedScope: string[];
};

type RevealedKeyState = {
  apiKey: string;
  description: string;
  title: string;
};

const pageSize = 20;
const requestStatusOptions: Array<{ label: string; value: RequestStatusFilter }> = [
  { label: '전체', value: 'ALL' },
  { label: '요청 대기', value: 'REQUESTED' },
  { label: '발급 완료', value: 'ISSUED' },
  { label: '반려', value: 'REJECTED' },
  { label: '취소', value: 'CANCELED' },
];
const keyStatusOptions: Array<{ label: string; value: KeyStatusFilter }> = [
  { label: '전체', value: 'ALL' },
  { label: '활성', value: 'ACTIVE' },
  { label: '폐기', value: 'REVOKED' },
  { label: '만료', value: 'EXPIRED' },
];
const clientFilterBase = [{ label: '전체', value: 'ALL' }];
const scopeOptions = [
  { label: 'WOS Scan 조회', value: 'WOS_SCAN_READ' },
  { label: 'PL Picking List 조회', value: 'PL_READ' },
];

export function ApiKeysPage() {
  const tenantId = fakeCurrentUser.tenantId ?? null;
  const userId = fakeCurrentUser.id ?? null;
  const canManage = canManageApiKeys(fakeCurrentUser);
  const canRequest = canRequestApiKeys(fakeCurrentUser);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'keys' && canManage ? 'keys' : 'requests';

  const [tab, setTab] = useState<ApiKeyTab>(initialTab);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [clientFilter, setClientFilter] = useState('ALL');
  const [requestStatus, setRequestStatus] = useState<RequestStatusFilter>('ALL');
  const [keyStatus, setKeyStatus] = useState<KeyStatusFilter>('ACTIVE');
  const [requestPage, setRequestPage] = useState(1);
  const [keyPage, setKeyPage] = useState(1);
  const [requestResponse, setRequestResponse] = useState<PageResponse<ApiKeyRequestItem> | null>(null);
  const [keyResponse, setKeyResponse] = useState<PageResponse<ApiKeyItem> | null>(null);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadSeq, setReloadSeq] = useState(0);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<ApiKeyRequestItem | null>(null);
  const [revealTarget, setRevealTarget] = useState<ApiKeyRequestItem | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyItem | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requestForm, setRequestForm] = useState<RequestFormState>(defaultRequestForm());
  const [issueForm, setIssueForm] = useState<DirectIssueFormState>(defaultIssueForm());
  const [revealedKey, setRevealedKey] = useState<RevealedKeyState | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    if (tab === 'keys' && !canManage) {
      setTab('requests');
      setSearchParams({ tab: 'requests' }, { replace: true });
      return;
    }
    setSearchParams({ tab }, { replace: true });
  }, [canManage, setSearchParams, tab]);

  useEffect(() => {
    if (!tenantId) {
      return;
    }
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
    if (!tenantId || !canRequest) {
      setRequestResponse(null);
      return;
    }
    let ignore = false;

    async function loadRequests() {
      setLoadingRequests(true);
      try {
        const result = await omsApi.apiKeys.requests.list({
          tenantId: tenantId ?? undefined,
          clientId: clientFilter === 'ALL' ? undefined : Number(clientFilter),
          status: requestStatus === 'ALL' ? undefined : requestStatus,
          page: requestPage - 1,
          size: pageSize,
        });
        if (!ignore) {
          setRequestResponse(result);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(formatApiError(error));
        }
      } finally {
        if (!ignore) {
          setLoadingRequests(false);
        }
      }
    }

    loadRequests();
    return () => {
      ignore = true;
    };
  }, [canRequest, clientFilter, reloadSeq, requestPage, requestStatus, tenantId]);

  useEffect(() => {
    if (!tenantId || !canManage) {
      setKeyResponse(null);
      return;
    }
    let ignore = false;

    async function loadKeys() {
      setLoadingKeys(true);
      try {
        const result = await omsApi.apiKeys.list({
          tenantId: tenantId as number,
          clientId: clientFilter === 'ALL' ? undefined : Number(clientFilter),
          status: keyStatus === 'ALL' ? undefined : keyStatus,
          page: keyPage - 1,
          size: pageSize,
        });
        if (!ignore) {
          setKeyResponse(result);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(formatApiError(error));
        }
      } finally {
        if (!ignore) {
          setLoadingKeys(false);
        }
      }
    }

    loadKeys();
    return () => {
      ignore = true;
    };
  }, [canManage, clientFilter, keyPage, keyStatus, reloadSeq, tenantId]);

  const requests = requestResponse?.items ?? [];
  const keys = keyResponse?.items ?? [];
  const clientOptions = useMemo(
    () => clientFilterBase.concat(clients.map((client) => ({ label: `${client.name} (${client.code})`, value: String(client.id) }))),
    [clients],
  );

  const requestSummary = useMemo(
    () => ({
      requested: requests.filter((item) => item.status === 'REQUESTED').length,
      issued: requests.filter((item) => item.status === 'ISSUED').length,
      rejected: requests.filter((item) => item.status === 'REJECTED').length,
      canceled: requests.filter((item) => item.status === 'CANCELED').length,
    }),
    [requests],
  );

  const keySummary = useMemo(
    () => ({
      active: keys.filter((item) => item.status === 'ACTIVE').length,
      revoked: keys.filter((item) => item.status === 'REVOKED').length,
      expired: keys.filter((item) => item.status === 'EXPIRED').length,
    }),
    [keys],
  );

  const requestColumns: DataTableColumn<ApiKeyRequestItem>[] = [
    {
      key: 'requestedAt',
      header: '요청일시',
      width: '150px',
      cell: (item) => <span className="text-sm text-slate-700">{formatDateTime(item.requestedAt)}</span>,
    },
    {
      key: 'name',
      header: '키 이름',
      width: '190px',
      cell: (item) => <div className="truncate font-semibold text-slate-950">{item.name}</div>,
    },
    {
      key: 'scope',
      header: '발급 범위',
      width: '140px',
      cell: (item) => <ScopeBadge item={item} />,
    },
    {
      key: 'systemName',
      header: '사용 시스템',
      width: '180px',
      cell: (item) => <div className="truncate text-sm text-slate-700">{item.systemName}</div>,
    },
    {
      key: 'allowedScope',
      header: '권한',
      width: '190px',
      cell: (item) => <ScopeList scopes={item.allowedScope} />,
    },
    {
      key: 'status',
      header: '상태',
      width: '110px',
      cell: (item) => <Badge tone={requestStatusTone(item.status)}>{requestStatusLabel(item.status)}</Badge>,
    },
    {
      key: 'reviewComment',
      header: '비고',
      width: '220px',
      cell: (item) => <div className="truncate text-sm text-slate-600">{item.reviewComment ?? item.purpose}</div>,
    },
    {
      key: 'actions',
      header: '처리',
      sticky: 'right',
      width: '250px',
      cell: (item) => (
        <div className="flex flex-wrap justify-end gap-2">
          {canManage && item.status === 'REQUESTED' ? (
            <>
              <Button onClick={() => handleApprove(item)} size="sm" variant="primary">
                승인
              </Button>
              <Button
                onClick={() => {
                  setRejectTarget(item);
                  setRejectComment('');
                }}
                size="sm"
                variant="danger"
              >
                반려
              </Button>
            </>
          ) : null}
          {canOpenReveal(item, userId) ? (
            <Button onClick={() => setRevealTarget(item)} size="sm" variant="secondary">
              Key 보기
            </Button>
          ) : null}
          {item.status === 'REQUESTED' && canCancel(item) ? (
            <Button onClick={() => handleCancel(item)} size="sm" variant="secondary">
              요청 취소
            </Button>
          ) : null}
          {item.status === 'ISSUED' && !item.keyRevealAvailable && hasRevealCompleted(item) && canReveal(item, userId) ? (
            <span className="inline-flex items-center text-xs font-semibold text-slate-400">열람 완료</span>
          ) : null}
        </div>
      ),
    },
  ];

  const keyColumns: DataTableColumn<ApiKeyItem>[] = [
    {
      key: 'name',
      header: '키 이름',
      width: '200px',
      cell: (item) => <div className="truncate font-semibold text-slate-950">{item.name}</div>,
    },
    {
      key: 'scope',
      header: '발급 범위',
      width: '150px',
      cell: (item) => <ScopeBadge item={item} />,
    },
    {
      key: 'allowedScope',
      header: '권한',
      width: '220px',
      cell: (item) => <ScopeList scopes={item.allowedScope} />,
    },
    {
      key: 'status',
      header: '상태',
      width: '110px',
      cell: (item) => <Badge tone={keyStatusTone(item.status)}>{keyStatusLabel(item.status)}</Badge>,
    },
    {
      key: 'expiresAt',
      header: '만료일시',
      width: '150px',
      cell: (item) => <span className="text-sm text-slate-700">{formatDateTime(item.expiresAt)}</span>,
    },
    {
      key: 'lastUsedAt',
      header: '마지막 호출',
      width: '150px',
      cell: (item) => <span className="text-sm text-slate-700">{formatDateTime(item.lastUsedAt)}</span>,
    },
    {
      key: 'actions',
      header: '처리',
      sticky: 'right',
      width: '160px',
      cell: (item) => (
        <div className="flex justify-end">
          {item.status === 'ACTIVE' ? (
            <Button
              onClick={() => {
                setRevokeTarget(item);
                setRevokeReason('');
              }}
              size="sm"
              variant="danger"
            >
              폐기
            </Button>
          ) : (
            <span className="text-xs text-slate-400">처리 완료</span>
          )}
        </div>
      ),
    },
  ];

  if (!tenantId) {
    return (
      <Card className="border-red-200 bg-red-50 px-5 py-4">
        <p className="text-sm font-semibold text-red-700">물류사 계정 정보가 없어 API Key 화면을 열 수 없습니다.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="teal">외부 연동</Badge>
              <Badge tone="neutral">tenant-wide API Key</Badge>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-950">API Key 요청/관리</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                물류사 운영자는 tenant-wide API Key 발급을 요청하고, 물류사 관리자는 요청 승인과 Key 발급, 폐기를 관리합니다.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {canRequest ? (
              <Button onClick={() => setRequestModalOpen(true)} variant="primary">
                API Key 요청
              </Button>
            ) : null}
            {canManage ? (
              <Button onClick={() => setIssueModalOpen(true)} variant="secondary">
                즉시 발급
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      {tab === 'requests' ? (
        <div className="grid gap-3 md:grid-cols-4">
          <SummaryCard label="요청 대기" tone="amber" value={requestSummary.requested} />
          <SummaryCard label="발급 완료" tone="teal" value={requestSummary.issued} />
          <SummaryCard label="반려" tone="red" value={requestSummary.rejected} />
          <SummaryCard label="취소" tone="neutral" value={requestSummary.canceled} />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          <SummaryCard label="활성 Key" tone="teal" value={keySummary.active} />
          <SummaryCard label="폐기" tone="red" value={keySummary.revoked} />
          <SummaryCard label="만료" tone="amber" value={keySummary.expired} />
        </div>
      )}

      <Card className="p-1">
        <div className="flex gap-1">
          <TabButton active={tab === 'requests'} label="신청 관리" onClick={() => setTab('requests')} />
          {canManage ? <TabButton active={tab === 'keys'} label="API Key 관리" onClick={() => setTab('keys')} /> : null}
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <div className={`grid gap-3 ${tab === 'requests' ? 'lg:grid-cols-[180px_180px_auto]' : 'lg:grid-cols-[180px_180px_auto]'}`}>
          <Select
            label="고객사"
            onChange={(event) => {
              setClientFilter(event.target.value);
              setRequestPage(1);
              setKeyPage(1);
            }}
            options={clientOptions}
            value={clientFilter}
          />
          {tab === 'requests' ? (
            <Select
              label="요청 상태"
              onChange={(event) => {
                setRequestStatus(event.target.value as RequestStatusFilter);
                setRequestPage(1);
              }}
              options={requestStatusOptions}
              value={requestStatus}
            />
          ) : (
            <Select
              label="Key 상태"
              onChange={(event) => {
                setKeyStatus(event.target.value as KeyStatusFilter);
                setKeyPage(1);
              }}
              options={keyStatusOptions}
              value={keyStatus}
            />
          )}
          <div className="flex items-end">
            <Button onClick={() => setReloadSeq((current) => current + 1)} variant="secondary">
              새로고침
            </Button>
          </div>
        </div>
      </Card>

      {errorMessage ? (
        <Card className="border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-semibold text-red-700">{errorMessage}</p>
        </Card>
      ) : null}

      {tab === 'requests' ? (
        <>
          <Card className="p-0">
            {loadingRequests ? (
              <div className="px-5 py-12 text-center text-sm text-slate-500">API Key 요청 목록을 불러오는 중입니다.</div>
            ) : (
              <DataTable
                columns={requestColumns}
                data={requests}
                emptyDescription="운영자가 등록한 API Key 요청이 아직 없습니다."
                emptyTitle="표시할 요청이 없습니다."
                getRowKey={(item) => String(item.id)}
                renderMobileCard={(item) => (
                  <RequestMobileCard
                    canManage={canManage}
                    item={item}
                    onApprove={handleApprove}
                    onCancel={handleCancel}
                    onReject={setRejectTarget}
                    onReveal={setRevealTarget}
                    userId={userId}
                  />
                )}
              />
            )}
          </Card>
          <Pagination
            onPageChange={setRequestPage}
            page={requestPage}
            total={requestResponse?.totalElements ?? 0}
            totalPages={Math.max(1, requestResponse?.totalPages ?? 1)}
          />
        </>
      ) : (
        <>
          <Card className="p-0">
            {loadingKeys ? (
              <div className="px-5 py-12 text-center text-sm text-slate-500">API Key 목록을 불러오는 중입니다.</div>
            ) : (
              <DataTable
                columns={keyColumns}
                data={keys}
                emptyDescription="발급된 tenant-wide API Key가 없습니다."
                emptyTitle="표시할 API Key가 없습니다."
                getRowKey={(item) => String(item.id)}
                renderMobileCard={(item) => <KeyMobileCard item={item} onRevoke={setRevokeTarget} />}
              />
            )}
          </Card>
          <Pagination
            onPageChange={setKeyPage}
            page={keyPage}
            total={keyResponse?.totalElements ?? 0}
            totalPages={Math.max(1, keyResponse?.totalPages ?? 1)}
          />
        </>
      )}

      <Modal onClose={() => !submitting && setRequestModalOpen(false)} open={requestModalOpen} title="tenant-wide API Key 요청">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="키 이름"
              onChange={(event) => updateRequestForm('name', event.target.value)}
              placeholder="예: WMS 운영 연동 Key"
              value={requestForm.name}
            />
            <Input
              label="사용 시스템"
              onChange={(event) => updateRequestForm('systemName', event.target.value)}
              placeholder="예: MJ WMS"
              value={requestForm.systemName}
            />
            <Input
              label="담당자명"
              onChange={(event) => updateRequestForm('contactName', event.target.value)}
              value={requestForm.contactName}
            />
            <Input
              label="담당자 이메일"
              onChange={(event) => updateRequestForm('contactEmail', event.target.value)}
              type="email"
              value={requestForm.contactEmail}
            />
            <Input
              label="담당자 연락처"
              onChange={(event) => updateRequestForm('contactPhone', event.target.value)}
              value={requestForm.contactPhone}
            />
            <Input
              label="희망 만료일시"
              onChange={(event) => updateRequestForm('requestedExpiresAt', event.target.value)}
              type="datetime-local"
              value={requestForm.requestedExpiresAt}
            />
          </div>
          <TextAreaField
            label="사용 목적"
            onChange={(value) => updateRequestForm('purpose', value)}
            placeholder="연동 목적, 사용 예정 업무, 운영 범위를 입력해 주세요."
            value={requestForm.purpose}
          />
          <ScopeCheckboxGroup selected={requestForm.allowedScope} onChange={(next) => updateRequestForm('allowedScope', next)} />
          <div className="flex justify-end gap-2">
            <Button onClick={() => setRequestModalOpen(false)} variant="secondary">
              닫기
            </Button>
            <Button disabled={submitting} onClick={submitRequest} variant="primary">
              요청 등록
            </Button>
          </div>
        </div>
      </Modal>

      <Modal onClose={() => !submitting && setIssueModalOpen(false)} open={issueModalOpen} title="tenant-wide API Key 즉시 발급">
        <div className="space-y-4">
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            즉시 발급은 관리자만 사용할 수 있습니다. 발급된 Key 원문은 완료 후 한 번만 표시됩니다.
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="키 이름"
              onChange={(event) => updateIssueForm('name', event.target.value)}
              placeholder="예: WMS 운영 기본 Key"
              value={issueForm.name}
            />
            <Input
              label="만료일시"
              onChange={(event) => updateIssueForm('expiresAt', event.target.value)}
              type="datetime-local"
              value={issueForm.expiresAt}
            />
          </div>
          <ScopeCheckboxGroup selected={issueForm.allowedScope} onChange={(next) => updateIssueForm('allowedScope', next)} />
          <div className="flex justify-end gap-2">
            <Button onClick={() => setIssueModalOpen(false)} variant="secondary">
              닫기
            </Button>
            <Button disabled={submitting} onClick={submitDirectIssue} variant="primary">
              발급
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        onClose={() => !submitting && setRejectTarget(null)}
        open={Boolean(rejectTarget)}
        title="API Key 요청 반려"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">반려 사유를 남기면 요청자가 확인할 수 있습니다.</p>
          <TextAreaField
            label="반려 사유"
            onChange={setRejectComment}
            placeholder="예: 운영 목적과 사용 권한 범위를 보완해 주세요."
            value={rejectComment}
          />
          <div className="flex justify-end gap-2">
            <Button onClick={() => setRejectTarget(null)} variant="secondary">
              닫기
            </Button>
            <Button disabled={submitting} onClick={submitReject} variant="danger">
              반려 처리
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        onClose={() => !submitting && setRevealTarget(null)}
        open={Boolean(revealTarget)}
        title="승인된 API Key 보기"
      >
        <div className="space-y-4">
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            이 API Key 원문은 확인을 누른 뒤 1회만 볼 수 있습니다. 닫은 후에는 다시 조회할 수 없습니다.
          </div>
          <p className="text-sm text-slate-600">지금 승인된 API Key 원문을 확인하시겠습니까?</p>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setRevealTarget(null)} variant="secondary">
              취소
            </Button>
            <Button disabled={submitting} onClick={submitRevealIssuedKey} variant="primary">
              확인
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        onClose={() => {
          setRevealedKey(null);
          setCopiedKey(false);
        }}
        open={Boolean(revealedKey)}
        title={revealedKey?.title ?? 'API Key 원문'}
      >
        {revealedKey ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-md border border-teal-200 bg-teal-50 px-4 py-3">
              <p className="min-w-0 flex-1 break-all font-mono text-sm font-semibold text-slate-950">{revealedKey.apiKey}</p>
              <Button
                onClick={() => void copyRevealedKey()}
                size="sm"
                variant="secondary"
              >
                {copiedKey ? '복사됨' : '복사'}
              </Button>
            </div>
            <p className="text-sm leading-6 text-slate-600">{revealedKey.description}</p>
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setRevealedKey(null);
                  setCopiedKey(false);
                }}
                variant="primary"
              >
                확인 완료
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal onClose={() => !submitting && setRevokeTarget(null)} open={Boolean(revokeTarget)} title="API Key 폐기">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">폐기 후에는 해당 Key로 외부 API를 호출할 수 없습니다.</p>
          <TextAreaField
            label="폐기 사유"
            onChange={setRevokeReason}
            placeholder="예: 로테이션 발급 완료"
            value={revokeReason}
          />
          <div className="flex justify-end gap-2">
            <Button onClick={() => setRevokeTarget(null)} variant="secondary">
              닫기
            </Button>
            <Button disabled={submitting} onClick={submitRevoke} variant="danger">
              폐기
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );

  function updateRequestForm<K extends keyof RequestFormState>(key: K, value: RequestFormState[K]) {
    setRequestForm((current) => ({ ...current, [key]: value }));
  }

  function updateIssueForm<K extends keyof DirectIssueFormState>(key: K, value: DirectIssueFormState[K]) {
    setIssueForm((current) => ({ ...current, [key]: value }));
  }

  async function submitRequest() {
    if (!tenantId || submitting) {
      return;
    }
    if (!requestForm.name.trim() || !requestForm.purpose.trim() || !requestForm.systemName.trim()) {
      setErrorMessage('키 이름, 사용 목적, 사용 시스템은 필수입니다.');
      return;
    }
    if (requestForm.allowedScope.length === 0) {
      setErrorMessage('최소 1개 API 권한을 선택해 주세요.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      await omsApi.apiKeys.requests.create({
        tenantId,
        scopeType: 'TENANT',
        name: requestForm.name.trim(),
        purpose: requestForm.purpose.trim(),
        systemName: requestForm.systemName.trim(),
        contactName: blankToUndefined(requestForm.contactName),
        contactEmail: blankToUndefined(requestForm.contactEmail),
        contactPhone: blankToUndefined(requestForm.contactPhone),
        allowedScope: requestForm.allowedScope,
        requestedExpiresAt: blankToUndefined(requestForm.requestedExpiresAt),
      });
      setRequestModalOpen(false);
      setRequestForm(defaultRequestForm());
      setRequestPage(1);
      setReloadSeq((current) => current + 1);
    } catch (error) {
      setErrorMessage(formatApiError(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitDirectIssue() {
    if (!tenantId || submitting) {
      return;
    }
    if (!issueForm.name.trim()) {
      setErrorMessage('키 이름을 입력해 주세요.');
      return;
    }
    if (issueForm.allowedScope.length === 0) {
      setErrorMessage('최소 1개 API 권한을 선택해 주세요.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const created = await omsApi.apiKeys.create({
        tenantId,
        clientId: null,
        scopeType: 'TENANT',
        name: issueForm.name.trim(),
        allowedScope: issueForm.allowedScope,
        expiresAt: blankToUndefined(issueForm.expiresAt) ?? null,
      });
      setCopiedKey(false);
      setRevealedKey({
        apiKey: created.apiKey,
        title: '발급된 API Key 원문',
        description: '보안 정책상 원문은 지금 1회만 확인할 수 있습니다.',
      });
      setIssueModalOpen(false);
      setIssueForm(defaultIssueForm());
      setTab('keys');
      setKeyPage(1);
      setReloadSeq((current) => current + 1);
    } catch (error) {
      setErrorMessage(formatApiError(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove(item: ApiKeyRequestItem) {
    if (!tenantId || submitting) {
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await omsApi.apiKeys.requests.approve(
        item.id,
        { tenantId, clientId: item.clientId ?? undefined },
        { comment: 'tenant-wide API Key 요청을 승인했습니다.' },
      );
      setTab('requests');
      setRequestStatus('ISSUED');
      setRequestPage(1);
      setReloadSeq((current) => current + 1);
    } catch (error) {
      setErrorMessage(formatApiError(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitReject() {
    if (!tenantId || !rejectTarget || submitting) {
      return;
    }
    if (!rejectComment.trim()) {
      setErrorMessage('반려 사유를 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      await omsApi.apiKeys.requests.reject(
        rejectTarget.id,
        { tenantId, clientId: rejectTarget.clientId ?? undefined },
        { comment: rejectComment.trim() },
      );
      setRejectTarget(null);
      setRejectComment('');
      setReloadSeq((current) => current + 1);
    } catch (error) {
      setErrorMessage(formatApiError(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitRevealIssuedKey() {
    if (!tenantId || !revealTarget || submitting) {
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const result = await omsApi.apiKeys.requests.reveal(revealTarget.id, {
        tenantId,
        clientId: revealTarget.clientId ?? undefined,
      });
      setRevealTarget(null);
      setCopiedKey(false);
      setRevealedKey({
        apiKey: result.apiKey,
        title: '승인된 API Key 원문',
        description: '이 원문은 방금 1회 열람 처리되어 다시 조회할 수 없습니다.',
      });
      setReloadSeq((current) => current + 1);
    } catch (error) {
      setErrorMessage(formatApiError(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(item: ApiKeyRequestItem) {
    if (!tenantId || submitting) {
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await omsApi.apiKeys.requests.cancel(item.id, { tenantId, clientId: item.clientId ?? undefined });
      setReloadSeq((current) => current + 1);
    } catch (error) {
      setErrorMessage(formatApiError(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitRevoke() {
    if (!revokeTarget || submitting) {
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await omsApi.apiKeys.revoke(revokeTarget.id, blankToUndefined(revokeReason));
      setRevokeTarget(null);
      setRevokeReason('');
      setReloadSeq((current) => current + 1);
    } catch (error) {
      setErrorMessage(formatApiError(error));
    } finally {
      setSubmitting(false);
    }
  }

  function canCancel(item: ApiKeyRequestItem) {
    return canManage || (userId !== null && item.requestedBy === userId);
  }

  async function copyRevealedKey() {
    if (!revealedKey?.apiKey) {
      return;
    }
    try {
      await navigator.clipboard.writeText(revealedKey.apiKey);
      setCopiedKey(true);
      window.setTimeout(() => setCopiedKey(false), 1500);
    } catch (error) {
      setErrorMessage(formatApiError(error));
    }
  }
}

function SummaryCard({ label, tone, value }: { label: string; tone: 'neutral' | 'teal' | 'amber' | 'red'; value: number }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-600">{label}</p>
        <Badge tone={tone}>{label}</Badge>
      </div>
      <p className="mt-3 text-3xl font-bold text-slate-950">{value}</p>
    </Card>
  );
}

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      className={`inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-semibold transition ${
        active ? 'bg-teal-700 text-white' : 'text-slate-600 hover:bg-slate-100'
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function ScopeCheckboxGroup({ onChange, selected }: { selected: string[]; onChange: (next: string[]) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-600">API 권한</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {scopeOptions.map((scope) => {
          const checked = selected.includes(scope.value);
          return (
            <label className="flex items-start gap-3 rounded-md border border-slate-200 px-3 py-3 text-sm text-slate-700" key={scope.value}>
              <input
                checked={checked}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-100"
                onChange={(event) =>
                  onChange(
                    event.target.checked ? [...selected, scope.value] : selected.filter((value) => value !== scope.value),
                  )
                }
                type="checkbox"
              />
              <span>{scope.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function TextAreaField({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>
      <textarea
        className="min-h-28 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function RequestMobileCard({
  canManage,
  item,
  onApprove,
  onCancel,
  onReject,
  onReveal,
  userId,
}: {
  canManage: boolean;
  item: ApiKeyRequestItem;
  onApprove: (item: ApiKeyRequestItem) => void;
  onCancel: (item: ApiKeyRequestItem) => void;
  onReject: (item: ApiKeyRequestItem) => void;
  onReveal: (item: ApiKeyRequestItem) => void;
  userId: number | null;
}) {
  const canCancel = canManage || (userId !== null && item.requestedBy === userId);
  const revealAvailable = canOpenReveal(item, userId);
  return (
    <div
      className={`space-y-3 ${revealAvailable ? 'cursor-pointer' : ''}`}
      onClick={revealAvailable ? () => onReveal(item) : undefined}
      role={revealAvailable ? 'button' : undefined}
      tabIndex={revealAvailable ? 0 : undefined}
      onKeyDown={
        revealAvailable
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onReveal(item);
              }
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-950">{item.name}</p>
          <p className="text-xs text-slate-500">{formatDateTime(item.requestedAt)}</p>
        </div>
        <Badge tone={requestStatusTone(item.status)}>{requestStatusLabel(item.status)}</Badge>
      </div>
      <div className="space-y-1 text-sm text-slate-600">
        <p>범위: {scopeText(item.scopeType, item.clientName)}</p>
        <p>시스템: {item.systemName}</p>
        <p>권한: {scopeNames(item.allowedScope)}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {canManage && item.status === 'REQUESTED' ? (
          <>
            <Button onClick={() => onApprove(item)} size="sm" variant="primary">
              승인
            </Button>
            <Button onClick={() => onReject(item)} size="sm" variant="danger">
              반려
            </Button>
          </>
        ) : null}
        {revealAvailable ? (
          <Button
            onClick={(event) => {
              event.stopPropagation();
              onReveal(item);
            }}
            size="sm"
            variant="secondary"
          >
            Key 보기
          </Button>
        ) : null}
        {item.status === 'REQUESTED' && canCancel ? (
          <Button onClick={() => onCancel(item)} size="sm" variant="secondary">
            요청 취소
          </Button>
        ) : null}
        {item.status === 'ISSUED' && !item.keyRevealAvailable && hasRevealCompleted(item) && canReveal(item, userId) ? (
          <span className="inline-flex items-center text-xs font-semibold text-slate-400">열람 완료</span>
        ) : null}
      </div>
    </div>
  );
}

function KeyMobileCard({ item, onRevoke }: { item: ApiKeyItem; onRevoke: (item: ApiKeyItem) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-950">{item.name}</p>
          <p className="text-xs text-slate-500">범위: {scopeText(item.scopeType, item.clientName)}</p>
        </div>
        <Badge tone={keyStatusTone(item.status)}>{keyStatusLabel(item.status)}</Badge>
      </div>
      <div className="space-y-1 text-sm text-slate-600">
        <p>권한: {scopeNames(item.allowedScope)}</p>
        <p>만료: {formatDateTime(item.expiresAt)}</p>
        <p>마지막 호출: {formatDateTime(item.lastUsedAt)}</p>
      </div>
      {item.status === 'ACTIVE' ? (
        <Button onClick={() => onRevoke(item)} size="sm" variant="danger">
          폐기
        </Button>
      ) : null}
    </div>
  );
}

function ScopeBadge({ item }: { item: Pick<ApiKeyItem, 'clientName' | 'scopeType'> | Pick<ApiKeyRequestItem, 'clientName' | 'scopeType'> }) {
  return <Badge tone={item.scopeType === 'TENANT' ? 'teal' : 'blue'}>{scopeText(item.scopeType, item.clientName)}</Badge>;
}

function ScopeList({ scopes }: { scopes: string[] }) {
  return <div className="truncate text-sm text-slate-700">{scopeNames(scopes)}</div>;
}

function canReveal(item: ApiKeyRequestItem, userId: number | null) {
  return userId !== null && item.requestedBy === userId;
}

function canOpenReveal(item: ApiKeyRequestItem, userId: number | null) {
  return item.status === 'ISSUED' && !hasRevealCompleted(item) && canReveal(item, userId);
}

function hasRevealCompleted(item: ApiKeyRequestItem) {
  return Boolean(item.keyRevealedAt);
}

function requestStatusLabel(status: ApiKeyRequestStatus) {
  switch (status) {
    case 'REQUESTED':
      return '요청 대기';
    case 'ISSUED':
      return '발급 완료';
    case 'REJECTED':
      return '반려';
    case 'CANCELED':
      return '취소';
    default:
      return status;
  }
}

function requestStatusTone(status: ApiKeyRequestStatus): 'amber' | 'teal' | 'red' | 'neutral' {
  switch (status) {
    case 'REQUESTED':
      return 'amber';
    case 'ISSUED':
      return 'teal';
    case 'REJECTED':
      return 'red';
    case 'CANCELED':
    default:
      return 'neutral';
  }
}

function keyStatusLabel(status: string) {
  switch (status) {
    case 'ACTIVE':
      return '활성';
    case 'REVOKED':
      return '폐기';
    case 'EXPIRED':
      return '만료';
    default:
      return status;
  }
}

function keyStatusTone(status: string): 'teal' | 'red' | 'amber' | 'neutral' {
  switch (status) {
    case 'ACTIVE':
      return 'teal';
    case 'REVOKED':
      return 'red';
    case 'EXPIRED':
      return 'amber';
    default:
      return 'neutral';
  }
}

function scopeText(scopeType: string, clientName?: string | null) {
  if (scopeType === 'TENANT') {
    return 'TENANT 전체';
  }
  return clientName ? `고객사 ${clientName}` : '고객사';
}

function scopeNames(scopes: string[]) {
  return scopes
    .map((scope) => {
      if (scope === 'WOS_SCAN_READ') {
        return 'WOS Scan 조회';
      }
      if (scope === 'PL_READ') {
        return 'PL Picking List 조회';
      }
      return scope;
    })
    .join(', ');
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function blankToUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function defaultRequestForm(): RequestFormState {
  return {
    name: '',
    purpose: '',
    systemName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    requestedExpiresAt: '',
    allowedScope: ['WOS_SCAN_READ'],
  };
}

function defaultIssueForm(): DirectIssueFormState {
  return {
    name: '',
    expiresAt: '',
    allowedScope: ['WOS_SCAN_READ'],
  };
}

function formatApiError(error: unknown) {
  if (error instanceof OmsApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return '서버 오류가 발생했습니다.';
}
