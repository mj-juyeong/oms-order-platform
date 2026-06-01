import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { omsApi, type ClientSummary, type TenantSummary } from '../api/oms';
import { fakeCurrentUser } from '../app/auth';
import { saveClientContextSelection } from '../app/clientContext';
import { Badge, Button, Card, ErrorState, Input, LoadingState, Modal, Select } from '../components/common';
import { DataTable, type DataTableColumn } from '../components/data';
import { CodeCell } from '../components/domain';
import { generateObjectCode, normalizeObjectCode } from '../utils/codeGenerator';

type ClientStatus = 'ACTIVE' | 'DISABLED';

interface ClientFormState {
  tenantId: string;
  code: string;
  name: string;
  externalCode: string;
  status: ClientStatus;
}

const emptyForm: ClientFormState = {
  tenantId: '',
  code: '',
  name: '',
  externalCode: '',
  status: 'ACTIVE',
};

export function ClientManagementPage() {
  const isSystemAdmin = fakeCurrentUser.userScopeType === 'SYSTEM' && fakeCurrentUser.roles.includes('SYSTEM_ADMIN');
  const fixedTenantId = fakeCurrentUser.userScopeType === 'TENANT' ? fakeCurrentUser.tenantId ?? null : null;
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>(fixedTenantId ? String(fixedTenantId) : '');
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadSeq, setReloadSeq] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientSummary | null>(null);

  useEffect(() => {
    if (!isSystemAdmin) return;

    let ignore = false;
    omsApi.tenants.list({ status: 'ACTIVE' })
      .then((items) => {
        if (ignore) return;
        setTenants(items);
        setSelectedTenantId((current) => current || (items[0] ? String(items[0].id) : ''));
      })
      .catch(() => {
        if (!ignore) setTenants([]);
      });

    return () => {
      ignore = true;
    };
  }, [isSystemAdmin]);

  useEffect(() => {
    const tenantId = toOptionalNumber(selectedTenantId);
    if (!tenantId) {
      setClients([]);
      setLoading(false);
      return;
    }
    const resolvedTenantId = tenantId;

    let ignore = false;
    async function loadClients() {
      setLoading(true);
      setError(null);
      try {
        const result = await omsApi.clients.list({ tenantId: resolvedTenantId });
        if (!ignore) setClients(result);
      } catch (loadError) {
        if (!ignore) setError(loadError instanceof Error ? loadError.message : '고객사 목록을 불러오지 못했습니다.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void loadClients();
    return () => {
      ignore = true;
    };
  }, [selectedTenantId, reloadSeq]);

  const activeCount = useMemo(() => clients.filter((client) => client.status === 'ACTIVE').length, [clients]);
  const selectedTenant = tenants.find((tenant) => String(tenant.id) === selectedTenantId);
  const tenantOptions = useMemo(
    () => tenants.map((tenant) => ({ label: tenant.name, value: String(tenant.id) })),
    [tenants],
  );

  function openCreateModal() {
    setSelectedClient(null);
    setModalOpen(true);
  }

  function openEditModal(client: ClientSummary) {
    setSelectedClient(client);
    setModalOpen(true);
  }

  function handleSaved() {
    setModalOpen(false);
    saveClientContextSelection({ mode: 'all' });
    setReloadSeq((current) => current + 1);
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 md:grid-cols-3">
        <Metric label="전체 고객사" value={clients.length} />
        <Metric label="활성 고객사" value={activeCount} />
        <Metric label="비활성 고객사" value={clients.length - activeCount} />
      </section>

      <Card className="px-4 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-base font-bold text-slate-950">고객사 관리</p>
            <p className="mt-1 text-sm text-slate-500">고객사명만 입력하면 내부 코드는 자동 생성되고, OIS 코드가 있으면 별도로 보관합니다.</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            {isSystemAdmin ? (
              <Select
                label="물류사"
                onChange={(event) => setSelectedTenantId(event.target.value)}
                options={tenantOptions.length ? tenantOptions : [{ label: '등록된 물류사 없음', value: '' }]}
                value={selectedTenantId}
              />
            ) : (
              <div className="min-w-48 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                현재 물류사: {fakeCurrentUser.tenantName ?? fixedTenantId ?? '-'}
              </div>
            )}
            <Button onClick={() => setReloadSeq((current) => current + 1)} variant="secondary">
              새로고침
            </Button>
            <Button disabled={!toOptionalNumber(selectedTenantId)} onClick={openCreateModal} variant="primary">
              고객사 생성
            </Button>
          </div>
        </div>
      </Card>

      {isSystemAdmin && !selectedTenantId ? (
        <Card className="border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-semibold text-amber-800">고객사를 만들려면 먼저 물류사를 생성하거나 선택해 주세요.</p>
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        {loading && clients.length === 0 ? (
          <div className="p-5">
            <LoadingState label="고객사 목록을 불러오는 중입니다." />
          </div>
        ) : null}
        {error && !loading ? (
          <div className="p-5">
            <ErrorState description={error} onRetry={() => setReloadSeq((current) => current + 1)} title="고객사 목록을 조회하지 못했습니다." />
          </div>
        ) : null}
        {!error ? (
          <DataTable
            columns={createColumns(openEditModal)}
            data={clients}
            emptyDescription="고객사를 먼저 생성한 뒤 CLIENT_VIEWER 사용자를 생성하세요."
            emptyTitle="등록된 고객사가 없습니다."
            getRowKey={(client) => String(client.id)}
            onRowClick={openEditModal}
          />
        ) : null}
      </Card>

      <ClientFormModal
        client={selectedClient}
        defaultTenantId={toOptionalNumber(selectedTenantId)}
        existingClients={clients}
        isSystemAdmin={isSystemAdmin}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        open={modalOpen}
        selectedTenant={selectedTenant}
      />
    </div>
  );
}

function ClientFormModal({
  client,
  defaultTenantId,
  existingClients,
  isSystemAdmin,
  onClose,
  onSaved,
  open,
  selectedTenant,
}: {
  client: ClientSummary | null;
  defaultTenantId: number | null;
  existingClients: ClientSummary[];
  isSystemAdmin: boolean;
  onClose: () => void;
  onSaved: () => void;
  open: boolean;
  selectedTenant?: TenantSummary;
}) {
  const [form, setForm] = useState<ClientFormState>(emptyForm);
  const [autoCode, setAutoCode] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const usedCodes = useMemo(
    () => existingClients.filter((item) => item.id !== client?.id).map((item) => item.code),
    [client?.id, existingClients],
  );

  useEffect(() => {
    if (!open) return;
    setForm(
      client
        ? {
            tenantId: String(client.tenantId),
            code: client.code,
            name: client.name,
            externalCode: client.externalCode ?? '',
            status: client.status === 'ACTIVE' ? 'ACTIVE' : 'DISABLED',
          }
        : {
            ...emptyForm,
            tenantId: defaultTenantId ? String(defaultTenantId) : '',
            code: generateObjectCode('', 'CLIENT', usedCodes),
          },
    );
    setAutoCode(!client);
    setFormError(null);
    setSubmitting(false);
  }, [client, defaultTenantId, open, usedCodes]);

  function updateName(name: string) {
    setForm((current) => ({
      ...current,
      name,
      code: autoCode ? generateObjectCode(name, 'CLIENT', usedCodes) : current.code,
    }));
  }

  function updateCode(code: string) {
    setAutoCode(false);
    setForm((current) => ({ ...current, code }));
  }

  function resetGeneratedCode() {
    setAutoCode(true);
    setForm((current) => ({
      ...current,
      code: generateObjectCode(current.name, 'CLIENT', usedCodes),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const tenantId = toOptionalNumber(form.tenantId);
    const code = normalizeObjectCode(form.code);
    const name = form.name.trim();
    const externalCode = form.externalCode.trim();
    if (!tenantId) {
      setFormError('물류사를 먼저 선택해 주세요.');
      return;
    }
    if (!name) {
      setFormError('고객사명을 입력해 주세요.');
      return;
    }
    if (!code) {
      setFormError('고객사 코드를 자동 생성하지 못했습니다. 코드를 직접 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      if (client) {
        await omsApi.clients.update(tenantId, client.id, { code, name, externalCode, status: form.status });
      } else {
        await omsApi.clients.create({ tenantId: isSystemAdmin ? tenantId : null, code, name, externalCode: externalCode || null });
      }
      onSaved();
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : '고객사 저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose} open={open} title={client ? '고객사 수정' : '고객사 생성'}>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          물류사: {(selectedTenant?.name ?? fakeCurrentUser.tenantName ?? form.tenantId) || '-'}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            disabled={submitting}
            label="고객사명"
            onChange={(event) => updateName(event.target.value)}
            placeholder="예: 웰스토리"
            value={form.name}
          />
          <Input
            disabled={submitting}
            label="외부/OIS 고객사 코드"
            onChange={(event) => setForm((current) => ({ ...current, externalCode: event.target.value }))}
            placeholder="있으면 입력"
            value={form.externalCode}
          />
          <div className="grid gap-2 md:col-span-2">
            <Input
              disabled={submitting}
              label="고객사 코드"
              onChange={(event) => updateCode(event.target.value)}
              placeholder="자동 생성됨"
              value={form.code}
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-slate-500">{autoCode ? '자동 생성 중이며 필요하면 수정할 수 있습니다.' : '직접 수정한 코드입니다.'}</p>
              <Button disabled={submitting} onClick={resetGeneratedCode} size="sm" variant="ghost">
                자동 생성
              </Button>
            </div>
          </div>
        </div>
        {client ? (
          <Select
            disabled={submitting}
            label="상태"
            onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ClientStatus }))}
            options={[
              { label: '활성', value: 'ACTIVE' },
              { label: '비활성', value: 'DISABLED' },
            ]}
            value={form.status}
          />
        ) : null}
        {formError ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p> : null}
        <div className="flex justify-end gap-2">
          <Button disabled={submitting} onClick={onClose} variant="secondary">
            취소
          </Button>
          <Button disabled={submitting} type="submit" variant="primary">
            {submitting ? '저장 중' : '저장'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function createColumns(onEdit: (client: ClientSummary) => void): DataTableColumn<ClientSummary>[] {
  return [
    { key: 'name', header: '고객사명', width: '220px', cell: (client) => <span className="font-semibold text-slate-900">{client.name}</span> },
    { key: 'code', header: '고객사 코드', width: '180px', cell: (client) => <CodeCell value={client.code} /> },
    { key: 'externalCode', header: '외부/OIS 코드', width: '160px', cell: (client) => client.externalCode ? <CodeCell value={client.externalCode} /> : '-' },
    { key: 'status', header: '상태', width: '100px', cell: (client) => <StatusBadge status={client.status} /> },
    {
      key: 'actions',
      header: '관리',
      align: 'center',
      width: '100px',
      cell: (client) => (
        <Button onClick={() => onEdit(client)} size="sm" variant="secondary">
          수정
        </Button>
      ),
    },
  ];
}

function StatusBadge({ status }: { status: string }) {
  return <Badge tone={status === 'ACTIVE' ? 'green' : 'neutral'}>{status === 'ACTIVE' ? '활성' : '비활성'}</Badge>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value.toLocaleString()}</p>
    </Card>
  );
}

function toOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const numberValue = Number(trimmed);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}
