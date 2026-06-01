import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { omsApi, type TenantSummary } from '../api/oms';
import { Badge, Button, Card, ErrorState, Input, LoadingState, Modal, Select } from '../components/common';
import { DataTable, type DataTableColumn } from '../components/data';
import { CodeCell } from '../components/domain';
import { generateObjectCode, normalizeObjectCode } from '../utils/codeGenerator';

type TenantStatus = 'ACTIVE' | 'DISABLED';

interface TenantFormState {
  code: string;
  name: string;
  status: TenantStatus;
}

const emptyForm: TenantFormState = {
  code: '',
  name: '',
  status: 'ACTIVE',
};

export function TenantManagementPage() {
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadSeq, setReloadSeq] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantSummary | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadTenants() {
      setLoading(true);
      setError(null);
      try {
        const result = await omsApi.tenants.list();
        if (!ignore) setTenants(result);
      } catch (loadError) {
        if (!ignore) setError(loadError instanceof Error ? loadError.message : '물류사 목록을 불러오지 못했습니다.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void loadTenants();
    return () => {
      ignore = true;
    };
  }, [reloadSeq]);

  const activeCount = useMemo(() => tenants.filter((tenant) => tenant.status === 'ACTIVE').length, [tenants]);

  function openCreateModal() {
    setSelectedTenant(null);
    setModalOpen(true);
  }

  function openEditModal(tenant: TenantSummary) {
    setSelectedTenant(tenant);
    setModalOpen(true);
  }

  function handleSaved() {
    setModalOpen(false);
    setReloadSeq((current) => current + 1);
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 md:grid-cols-3">
        <Metric label="전체 물류사" value={tenants.length} />
        <Metric label="활성 물류사" value={activeCount} />
        <Metric label="비활성 물류사" value={tenants.length - activeCount} />
      </section>

      <Card className="px-4 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-base font-bold text-slate-950">물류사 관리</p>
            <p className="mt-1 text-sm text-slate-500">물류사명만 입력하면 내부 연동용 코드는 자동으로 생성됩니다.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setReloadSeq((current) => current + 1)} variant="secondary">
              새로고침
            </Button>
            <Button onClick={openCreateModal} variant="primary">
              물류사 생성
            </Button>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading && tenants.length === 0 ? (
          <div className="p-5">
            <LoadingState label="물류사 목록을 불러오는 중입니다." />
          </div>
        ) : null}
        {error && !loading ? (
          <div className="p-5">
            <ErrorState description={error} onRetry={() => setReloadSeq((current) => current + 1)} title="물류사 목록을 조회하지 못했습니다." />
          </div>
        ) : null}
        {!error ? (
          <DataTable
            columns={createColumns(openEditModal)}
            data={tenants}
            emptyDescription="물류사를 먼저 생성한 뒤 해당 물류사의 관리자 사용자를 생성하세요."
            emptyTitle="등록된 물류사가 없습니다."
            getRowKey={(tenant) => String(tenant.id)}
            onRowClick={openEditModal}
          />
        ) : null}
      </Card>

      <TenantFormModal
        existingTenants={tenants}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        open={modalOpen}
        tenant={selectedTenant}
      />
    </div>
  );
}

function TenantFormModal({
  existingTenants,
  onClose,
  onSaved,
  open,
  tenant,
}: {
  existingTenants: TenantSummary[];
  onClose: () => void;
  onSaved: () => void;
  open: boolean;
  tenant: TenantSummary | null;
}) {
  const [form, setForm] = useState<TenantFormState>(emptyForm);
  const [autoCode, setAutoCode] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const usedCodes = useMemo(
    () => existingTenants.filter((item) => item.id !== tenant?.id).map((item) => item.code),
    [existingTenants, tenant?.id],
  );

  useEffect(() => {
    if (!open) return;
    setForm(
      tenant
        ? {
            code: tenant.code,
            name: tenant.name,
            status: tenant.status === 'ACTIVE' ? 'ACTIVE' : 'DISABLED',
          }
        : {
            ...emptyForm,
            code: generateObjectCode('', 'TENANT', usedCodes),
          },
    );
    setAutoCode(!tenant);
    setFormError(null);
    setSubmitting(false);
  }, [open, tenant, usedCodes]);

  function updateName(name: string) {
    setForm((current) => ({
      ...current,
      name,
      code: autoCode ? generateObjectCode(name, 'TENANT', usedCodes) : current.code,
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
      code: generateObjectCode(current.name, 'TENANT', usedCodes),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = normalizeObjectCode(form.code);
    const name = form.name.trim();
    if (!name) {
      setFormError('물류사명을 입력해 주세요.');
      return;
    }
    if (!code) {
      setFormError('물류사 코드를 자동 생성하지 못했습니다. 코드를 직접 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      if (tenant) {
        await omsApi.tenants.update(tenant.id, { code, name, status: form.status });
      } else {
        await omsApi.tenants.create({ code, name });
      }
      onSaved();
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : '물류사 저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose} open={open} title={tenant ? '물류사 수정' : '물류사 생성'}>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            disabled={submitting}
            label="물류사명"
            onChange={(event) => updateName(event.target.value)}
            placeholder="예: 대한로지스틱스"
            value={form.name}
          />
          <div className="grid gap-2">
            <Input
              disabled={submitting}
              label="물류사 코드"
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
        {tenant ? (
          <Select
            disabled={submitting}
            label="상태"
            onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as TenantStatus }))}
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

function createColumns(onEdit: (tenant: TenantSummary) => void): DataTableColumn<TenantSummary>[] {
  return [
    { key: 'name', header: '물류사명', width: '240px', cell: (tenant) => <span className="font-semibold text-slate-900">{tenant.name}</span> },
    { key: 'code', header: '물류사 코드', width: '180px', cell: (tenant) => <CodeCell value={tenant.code} /> },
    { key: 'status', header: '상태', width: '100px', cell: (tenant) => <StatusBadge status={tenant.status} /> },
    {
      key: 'actions',
      header: '관리',
      align: 'center',
      width: '100px',
      cell: (tenant) => (
        <Button onClick={() => onEdit(tenant)} size="sm" variant="secondary">
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
