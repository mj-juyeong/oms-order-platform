import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { omsApi, type ApiKeyItem, type CreatedApiKey } from '../api/oms';
import { mockApiKeys } from '../api/mock';
import { Badge, Button, Card, DateInput, Input, Modal } from '../components/common';
import { DataTable, Pagination, type DataTableColumn } from '../components/data';
import { CodeCell } from '../components/domain';

const DEFAULT_TENANT_ID = 1;
const DEFAULT_CLIENT_ID = 1;

type ApiKeyScope = 'WOS_SCAN_READ' | 'PL_READ';

const scopeOptions: Array<{ label: string; scope: ApiKeyScope; description: string }> = [
  { label: 'WOS Scan 조회', scope: 'WOS_SCAN_READ', description: '스캔 데이터를 외부 API로 조회합니다.' },
  { label: 'PL Picking List 조회', scope: 'PL_READ', description: '피킹 리스트 데이터를 외부 API로 조회합니다.' },
];

export function ApiKeysPage() {
  const [activeOnly, setActiveOnly] = useState(true);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>(mockApiKeys);
  const [loading, setLoading] = useState(false);
  const [usingFallback, setUsingFallback] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let ignore = false;
    setLoading(true);

    omsApi.apiKeys.list({
      tenantId: DEFAULT_TENANT_ID,
      status: activeOnly ? 'ACTIVE' : undefined,
      page: 1,
      size: 50,
    })
      .then((response) => {
        if (ignore) {
          return;
        }
        setApiKeys(response.items);
        setUsingFallback(false);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (ignore) {
          return;
        }
        setApiKeys(mockApiKeys);
        setUsingFallback(true);
        setLoadError(error instanceof Error ? error.message : 'API Key 목록을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [activeOnly, refreshToken]);

  const filteredKeys = useMemo(() => {
    if (!activeOnly) {
      return apiKeys;
    }

    return apiKeys.filter((apiKey) => apiKey.status === 'ACTIVE');
  }, [activeOnly, apiKeys]);

  const activeCount = filteredKeys.filter((apiKey) => apiKey.status === 'ACTIVE').length;
  const wosScopeCount = filteredKeys.filter((apiKey) => apiKey.allowedScope.includes('WOS_SCAN_READ')).length;
  const plScopeCount = filteredKeys.filter((apiKey) => apiKey.allowedScope.includes('PL_READ')).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="활성 Key" value={activeCount} description="외부 API 호출 가능 상태" tone="green" />
        <Metric label="WOS 권한" value={wosScopeCount} description="WOS_SCAN_READ scope 보유" tone="teal" />
        <Metric label="PL 권한" value={plScopeCount} description="PL_READ scope 보유" tone="blue" />
      </div>

      <Card className="px-4 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-900">API Key 조회</p>
              {usingFallback ? <Badge tone="amber">샘플 데이터</Badge> : <Badge tone="green">API 연결</Badge>}
            </div>
            <p className="mt-1 text-xs text-slate-500">외부 시스템이 X-Api-Key 헤더로 사용하는 Key의 상태와 권한을 관리합니다.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              aria-pressed={activeOnly}
              className={`inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-semibold transition ${
                activeOnly
                  ? 'border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800'
                  : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
              }`}
              onClick={() => setActiveOnly((current) => !current)}
              type="button"
            >
              활성 Key만 보기
            </button>
            <Button onClick={() => setCreateModalOpen(true)} size="md" variant="primary">신규 발급</Button>
          </div>
        </div>
        {loadError ? (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
            백엔드 API 응답을 받지 못해 화면 확인용 샘플 데이터를 표시합니다. {loadError}
          </p>
        ) : null}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-bold text-slate-950">API Key 목록</p>
            <Badge tone="blue">원문 Key 재조회 불가</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            발급된 Key 값은 생성 직후 1회만 전달하고, 이후 화면에서는 이름, 상태, 권한, 만료와 사용 이력만 확인합니다.
          </p>
        </div>
        <DataTable
          columns={createColumns()}
          data={filteredKeys}
          emptyDescription="상태 조건을 변경하거나 API Key 발급 여부를 확인해 주세요."
          emptyTitle="표시할 API Key가 없습니다."
          getRowKey={(item) => String(item.id)}
        />
        <div className="px-5 py-4">
          <p className="mb-3 text-xs text-slate-500">{loading ? 'API Key 목록을 갱신하는 중입니다.' : '외부 API 호출자는 발급받은 Key를 X-Api-Key 헤더에 넣어 호출합니다.'}</p>
          <Pagination page={1} total={filteredKeys.length} totalPages={Math.max(1, Math.ceil(filteredKeys.length / 20))} />
        </div>
      </Card>

      <CreateApiKeyModal
        onClose={() => setCreateModalOpen(false)}
        onCreated={() => setRefreshToken((current) => current + 1)}
        open={createModalOpen}
      />
    </div>
  );
}

function CreateApiKeyModal({
  onClose,
  onCreated,
  open,
}: {
  onClose: () => void;
  onCreated: () => void;
  open: boolean;
}) {
  const [name, setName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<ApiKeyScope[]>([]);
  const [expiresDate, setExpiresDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<CreatedApiKey | null>(null);
  const [copied, setCopied] = useState(false);

  function resetAndClose() {
    if (createdKey) {
      onCreated();
    }
    setName('');
    setSelectedScopes([]);
    setExpiresDate('');
    setSubmitting(false);
    setFormError(null);
    setCreatedKey(null);
    setCopied(false);
    onClose();
  }

  function applyPreset(scopes: ApiKeyScope[], defaultName: string) {
    setSelectedScopes(scopes);
    setName((current) => current || defaultName);
  }

  function toggleScope(scope: ApiKeyScope) {
    setSelectedScopes((current) =>
      current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('Key 이름을 입력해 주세요.');
      return;
    }

    if (selectedScopes.length === 0) {
      setFormError('권한을 하나 이상 선택해 주세요.');
      return;
    }

    if (expiresDate && expiresDate < todayString()) {
      setFormError('만료일은 오늘 이후 날짜로 선택해 주세요.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const response = await omsApi.apiKeys.create({
        tenantId: DEFAULT_TENANT_ID,
        clientId: DEFAULT_CLIENT_ID,
        name: trimmedName,
        allowedScope: selectedScopes,
        expiresAt: expiresDate ? `${expiresDate}T23:59:59` : undefined,
      });
      setCreatedKey(response);
      setCopied(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'API Key 발급에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  async function copyCreatedKey() {
    if (!createdKey) {
      return;
    }

    try {
      await navigator.clipboard.writeText(createdKey.apiKey);
      setCopied(true);
    } catch {
      setFormError('클립보드 복사에 실패했습니다. Key를 직접 선택해 복사해 주세요.');
    }
  }

  return (
    <Modal onClose={resetAndClose} open={open} title={createdKey ? 'API Key 발급 완료' : 'API Key 신규 발급'}>
      {createdKey ? (
        <div className="space-y-5">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="green">발급 완료</Badge>
              <CodeCell value={`KEY-${createdKey.id}`} />
            </div>
            <p className="mt-3 text-sm leading-6 text-emerald-800">
              API Key 원문은 지금 한 번만 확인할 수 있습니다. 외부 시스템 담당자에게 전달하기 전에 반드시 복사해 주세요.
            </p>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-slate-600">발급된 API Key</p>
            <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 md:flex-row md:items-center">
              <code className="min-w-0 flex-1 break-all rounded-md bg-white px-3 py-2 font-mono text-sm text-slate-950">
                {createdKey.apiKey}
              </code>
              <Button onClick={copyCreatedKey} variant={copied ? 'primary' : 'secondary'}>
                {copied ? '복사 완료' : '복사'}
              </Button>
            </div>
          </div>

          <div className="grid gap-3 rounded-lg border border-slate-200 p-4 text-sm md:grid-cols-3">
            <SummaryItem label="Key 이름" value={name} />
            <SummaryItem label="권한" value={selectedScopes.join(', ')} />
            <SummaryItem label="만료" value={expiresDate ? `${expiresDate} 23:59:59` : '만료 없음'} />
          </div>

          {formError ? <ErrorMessage message={formError} /> : null}

          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={resetAndClose} variant="primary">닫기</Button>
          </div>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-900">이 Key는 특정 배치에 묶이지 않습니다.</p>
            <p className="mt-2 text-sm leading-6 text-blue-800">
              발급된 Key는 선택한 권한 범위 안에서 확정 완료된 데이터를 조회합니다. 배치 선택은 외부 API 호출 시 batchId 또는 deliveryDate 파라미터로 정합니다.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <PresetButton label="WOS용" onClick={() => applyPreset(['WOS_SCAN_READ'], 'WOS 운영 연동 Key')} />
            <PresetButton label="PL용" onClick={() => applyPreset(['PL_READ'], 'PL 운영 연동 Key')} />
            <PresetButton label="WOS + PL용" onClick={() => applyPreset(['WOS_SCAN_READ', 'PL_READ'], 'WOS/PL 운영 연동 Key')} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Key 이름" onChange={(event) => setName(event.target.value)} placeholder="예: WOS 운영 연동 Key" value={name} />
            <DateInput label="만료일" min={todayString()} onChange={(event) => setExpiresDate(event.target.value)} value={expiresDate} />
          </div>

          <section className="rounded-lg border border-slate-200">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="font-semibold text-slate-950">권한 선택</p>
              <p className="mt-1 text-xs text-slate-500">외부 시스템에 필요한 API 권한만 선택해 주세요.</p>
            </div>
            <div className="grid gap-0 divide-y divide-slate-100">
              {scopeOptions.map((option) => (
                <label className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-slate-50" key={option.scope}>
                  <input
                    checked={selectedScopes.includes(option.scope)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                    onChange={() => toggleScope(option.scope)}
                    type="checkbox"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900">{option.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">{option.description}</span>
                    <span className="mt-2 inline-block"><CodeCell value={option.scope} /></span>
                  </span>
                </label>
              ))}
            </div>
          </section>

          {formError ? <ErrorMessage message={formError} /> : null}

          <div className="flex flex-wrap justify-end gap-2">
            <Button disabled={submitting} onClick={resetAndClose} variant="secondary">취소</Button>
            <Button disabled={submitting} type="submit" variant="primary">{submitting ? '발급 중' : '발급'}</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function PresetButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 break-words font-medium text-slate-900">{value || '-'}</p>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">
      {message}
    </p>
  );
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function createColumns(): DataTableColumn<ApiKeyItem>[] {
  return [
    { key: 'name', header: 'Key 이름', width: '220px', cell: (item) => <KeyName item={item} /> },
    { key: 'status', header: '상태', width: '100px', cell: (item) => <Badge tone={item.status === 'ACTIVE' ? 'green' : 'neutral'}>{statusLabel(item.status)}</Badge> },
    { key: 'scope', header: '권한', width: '260px', cell: (item) => <ScopeList scopes={item.allowedScope} /> },
    { key: 'client', header: '고객사', width: '110px', cell: (item) => item.clientId ? <CodeCell value={String(item.clientId)} /> : '-' },
    { key: 'expiresAt', header: '만료', width: '160px', cell: (item) => formatDateTime(item.expiresAt) },
    { key: 'lastUsedAt', header: '마지막 사용', width: '160px', cell: (item) => formatDateTime(item.lastUsedAt) },
    { key: 'actions', header: '관리', align: 'center', width: '120px', cell: () => <Button size="sm" variant="secondary">상세</Button> },
  ];
}

function KeyName({ item }: { item: ApiKeyItem }) {
  return (
    <div className="space-y-1">
      <p className="font-semibold text-slate-900">{item.name}</p>
      <CodeCell muted value={`KEY-${item.id}`} />
    </div>
  );
}

function ScopeList({ scopes }: { scopes: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {scopes.map((scope) => (
        <CodeCell key={scope} value={scope} />
      ))}
    </div>
  );
}

function Metric({ description, label, tone, value }: { description: string; label: string; tone: 'blue' | 'green' | 'teal'; value: number }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-600">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{value.toLocaleString()}</p>
        </div>
        <Badge tone={tone}>{label}</Badge>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{description}</p>
    </Card>
  );
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    ACTIVE: '활성',
    REVOKED: '폐기',
  };

  return labels[status] ?? status;
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return '-';
  }

  return value.replace('T', ' ').slice(0, 16);
}
