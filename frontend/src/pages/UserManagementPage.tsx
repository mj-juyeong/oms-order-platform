import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { omsApi } from '../api/oms';
import { canManageUsers, fakeCurrentUser } from '../app/auth';
import { Badge, Button, Card, ErrorState, Input, LoadingState, Modal, Select } from '../components/common';
import { DataTable, Pagination, type DataTableColumn } from '../components/data';
import { CodeCell } from '../components/domain';
import type { ClientSummary } from '../types/client';
import type { TenantSummary } from '../types/tenant';
import type { UserRole, UserScopeType, UserSummary } from '../types/auth';

type UserStatus = 'ACTIVE' | 'DISABLED';
type UserFormMode = 'create' | 'edit';

interface UserFilters {
  keyword: string;
  status: string;
  userScopeType: string;
}

interface UserFormState {
  loginId: string;
  name: string;
  email: string;
  userScopeType: UserScopeType;
  tenantId: string;
  clientId: string;
  password: string;
  status: UserStatus;
  roleCodes: UserRole[];
}

const pageSize = 20;
const roleOptions: Array<{ label: string; value: UserRole; description: string }> = [
  { label: '시스템 관리자', value: 'SYSTEM_ADMIN', description: '물류사 생성과 전체 사용자 관리를 수행합니다.' },
  { label: '관리자', value: 'ADMIN', description: '사용자, API Key, 마스터와 운영 설정을 관리합니다.' },
  { label: '운영자', value: 'OPERATOR', description: '업로드, 검증, 확정, 다운로드 업무를 수행합니다.' },
  { label: '조회자', value: 'VIEWER', description: '대시보드와 조회 화면을 확인합니다.' },
];

const scopeOptions: Array<{ label: string; value: UserScopeType }> = [
  { label: '시스템', value: 'SYSTEM' },
  { label: '물류사', value: 'TENANT' },
  { label: '고객사', value: 'CLIENT' },
];

const initialFilters: UserFilters = {
  keyword: '',
  status: '',
  userScopeType: '',
};

const emptyForm: UserFormState = {
  loginId: '',
  name: '',
  email: '',
  userScopeType: 'TENANT',
  tenantId: '',
  clientId: '',
  password: '',
  status: 'ACTIVE',
  roleCodes: ['VIEWER'],
};

export function UserManagementPage() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [filters, setFilters] = useState<UserFilters>(initialFilters);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadSeq, setReloadSeq] = useState(0);
  const [modalMode, setModalMode] = useState<UserFormMode>('create');
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.keyword, filters.status, filters.userScopeType, page, reloadSeq]);

  const activeCount = useMemo(() => users.filter((user) => user.status === 'ACTIVE').length, [users]);
  const adminCount = useMemo(() => users.filter((user) => user.roles.includes('ADMIN') || user.roles.includes('SYSTEM_ADMIN')).length, [users]);
  const tenantUserCount = useMemo(() => users.filter((user) => user.userScopeType === 'TENANT').length, [users]);
  const canEditUsers = canManageUsers();
  const visibleScopeOptions = getAllowedScopeOptions();

  async function loadUsers() {
    setLoading(true);
    setError(null);

    try {
      const response = await omsApi.users.list({
        keyword: filters.keyword.trim() || undefined,
        status: filters.status || undefined,
        userScopeType: filters.userScopeType || undefined,
        page: page - 1,
        size: pageSize,
      });
      setUsers(response.items);
      setTotal(response.totalElements);
      setTotalPages(response.totalPages);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '사용자 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  function updateFilter<TKey extends keyof UserFilters>(key: TKey, value: UserFilters[TKey]) {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function openCreateModal() {
    setSelectedUser(null);
    setModalMode('create');
    setModalOpen(true);
  }

  function openEditModal(user: UserSummary) {
    setSelectedUser(user);
    setModalMode('edit');
    setModalOpen(true);
  }

  function handleSaved() {
    setModalOpen(false);
    setReloadSeq((current) => current + 1);
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="활성 사용자" value={activeCount} />
        <Metric label="관리자" value={adminCount} />
        <Metric label="물류사 사용자" value={tenantUserCount} />
      </div>

      <Card className="px-4 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-3 md:grid-cols-3">
            <Input
              label="검색어"
              onChange={(event) => updateFilter('keyword', event.target.value)}
              placeholder="아이디, 이름, 이메일"
              value={filters.keyword}
            />
            <Select
              label="상태"
              onChange={(event) => updateFilter('status', event.target.value)}
              options={[
                { label: '전체', value: '' },
                { label: '활성', value: 'ACTIVE' },
                { label: '비활성', value: 'DISABLED' },
              ]}
              value={filters.status}
            />
            <Select
              label="스코프"
              onChange={(event) => updateFilter('userScopeType', event.target.value)}
              options={[
                { label: '전체', value: '' },
                ...visibleScopeOptions,
              ]}
              value={filters.userScopeType}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setFilters(initialFilters)} variant="secondary">
              초기화
            </Button>
            <Button onClick={() => setReloadSeq((current) => current + 1)} variant="secondary">
              새로고침
            </Button>
            {canEditUsers ? (
              <Button onClick={openCreateModal} variant="primary">
                사용자 생성
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading && users.length === 0 ? (
          <div className="p-5">
            <LoadingState label="사용자 목록을 불러오는 중입니다." />
          </div>
        ) : null}
        {error && !loading ? (
          <div className="p-5">
            <ErrorState description={error} onRetry={() => setReloadSeq((current) => current + 1)} title="사용자 목록을 조회하지 못했습니다." />
          </div>
        ) : null}
        {!error ? (
          <DataTable
            columns={createColumns(openEditModal, canEditUsers)}
            data={users}
            emptyDescription="검색 조건을 바꾸거나 사용자를 생성해 주세요."
            emptyTitle="표시할 사용자가 없습니다."
            getRowKey={(user) => String(user.id)}
            onRowClick={canEditUsers ? openEditModal : undefined}
          />
        ) : null}
        <div className="px-5 py-4">
          <Pagination onPageChange={setPage} page={page} total={total} totalPages={Math.max(1, totalPages)} />
        </div>
      </Card>

      <UserFormModal
        mode={modalMode}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        open={modalOpen}
        user={selectedUser}
      />
    </div>
  );
}

function UserFormModal({
  mode,
  onClose,
  onSaved,
  open,
  user,
}: {
  mode: UserFormMode;
  onClose: () => void;
  onSaved: () => void;
  open: boolean;
  user: UserSummary | null;
}) {
  const [form, setForm] = useState<UserFormState>(() => createInitialForm(mode, user));
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const allowedScopeOptions = getAllowedScopeOptions();
  const allowedRoleOptions = getAllowedRoleOptions(form.userScopeType);
  const canEditTenantId = fakeCurrentUser.userScopeType === 'SYSTEM' && fakeCurrentUser.roles.includes('SYSTEM_ADMIN');
  const tenantOptions = getTenantOptions(tenants);
  const clientOptions = getClientOptions(clients);

  useEffect(() => {
    if (open) {
      setForm(createInitialForm(mode, user));
      setFormError(null);
      setSubmitting(false);
    }
  }, [mode, open, user]);

  useEffect(() => {
    if (!open || !canEditTenantId) {
      return;
    }

    let ignore = false;
    omsApi.tenants.list({ status: 'ACTIVE' })
      .then((items) => {
        if (!ignore) setTenants(items);
      })
      .catch(() => {
        if (!ignore) setTenants([]);
      });

    return () => {
      ignore = true;
    };
  }, [canEditTenantId, open]);

  useEffect(() => {
    const tenantId = toOptionalNumber(form.tenantId);
    if (!open || form.userScopeType !== 'CLIENT' || !tenantId) {
      setClients([]);
      return;
    }

    let ignore = false;
    omsApi.clients.list({ tenantId })
      .then((items) => {
        if (!ignore) setClients(items);
      })
      .catch(() => {
        if (!ignore) setClients([]);
      });

    return () => {
      ignore = true;
    };
  }, [form.tenantId, form.userScopeType, open]);

  function updateForm<TKey extends keyof UserFormState>(key: TKey, value: UserFormState[TKey]) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'tenantId') {
        next.clientId = '';
      }
      return normalizeScopeValues(next);
    });
  }

  function toggleRole(role: UserRole) {
    setForm((current) => ({
      ...current,
      roleCodes: normalizeRoleSelection(
        form.userScopeType,
        current.roleCodes.includes(role)
          ? current.roleCodes.filter((item) => item !== role)
          : [...current.roleCodes, role],
      ),
    }));
  }

  function generateTemporaryPassword() {
    const suffix = Math.random().toString(36).slice(2, 8);
    updateForm('password', `Oms!${new Date().getFullYear()}${suffix}`);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationMessage = validateForm(form, mode);
    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      if (mode === 'create') {
        await omsApi.users.create({
          loginId: form.loginId.trim(),
          name: form.name.trim(),
          email: form.email.trim() || null,
          userScopeType: form.userScopeType,
          tenantId: toOptionalNumber(form.tenantId),
          clientId: toOptionalNumber(form.clientId),
          password: form.password,
          roleCodes: form.roleCodes,
        });
      } else if (user) {
        await omsApi.users.update(user.id, {
          name: form.name.trim(),
          email: form.email.trim() || null,
          userScopeType: form.userScopeType,
          tenantId: toOptionalNumber(form.tenantId),
          clientId: toOptionalNumber(form.clientId),
          status: form.status,
          roleCodes: form.roleCodes,
        });
      }
      onSaved();
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : '사용자 저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose} open={open} title={mode === 'create' ? '사용자 생성' : '사용자 수정'}>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            disabled={mode === 'edit' || submitting}
            label="아이디"
            onChange={(event) => updateForm('loginId', event.target.value)}
            placeholder="ops02"
            value={form.loginId}
          />
          <Input
            disabled={submitting}
            label="이름"
            onChange={(event) => updateForm('name', event.target.value)}
            placeholder="운영자 2"
            value={form.name}
          />
          <Input
            disabled={submitting}
            label="이메일"
            onChange={(event) => updateForm('email', event.target.value)}
            placeholder="ops02@example.com"
            type="email"
            value={form.email}
          />
          {mode === 'edit' ? (
            <Select
              disabled={submitting}
              label="상태"
              onChange={(event) => updateForm('status', event.target.value as UserStatus)}
              options={[
                { label: '활성', value: 'ACTIVE' },
                { label: '비활성', value: 'DISABLED' },
              ]}
              value={form.status}
            />
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Select
            disabled={submitting}
            label="스코프"
            onChange={(event) => updateForm('userScopeType', event.target.value as UserScopeType)}
            options={allowedScopeOptions}
            value={form.userScopeType}
          />
          <Select
            disabled={submitting || form.userScopeType === 'SYSTEM' || !canEditTenantId}
            label="소속 물류사"
            onChange={(event) => updateForm('tenantId', event.target.value)}
            options={
              canEditTenantId
                ? [{ label: '물류사 선택', value: '' }, ...tenantOptions]
                : [{ label: fakeCurrentUser.tenantName ?? (form.tenantId ? `물류사 #${form.tenantId}` : '현재 물류사'), value: form.tenantId }]
            }
            value={form.tenantId}
          />
          <Select
            disabled={submitting || form.userScopeType !== 'CLIENT'}
            label="소속 고객사"
            onChange={(event) => updateForm('clientId', event.target.value)}
            options={[{ label: form.userScopeType === 'CLIENT' ? '고객사 선택' : '고객사 해당 없음', value: '' }, ...clientOptions]}
            value={form.clientId}
          />
        </div>

        {mode === 'create' ? (
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <Input
              disabled={submitting}
              label="초기 비밀번호"
              onChange={(event) => updateForm('password', event.target.value)}
              placeholder="초기 비밀번호"
              type="text"
              value={form.password}
            />
            <Button disabled={submitting} onClick={generateTemporaryPassword} variant="secondary">
              임시 비밀번호 생성
            </Button>
          </div>
        ) : null}

        <section className="rounded-lg border border-slate-200">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="font-semibold text-slate-950">권한</p>
          </div>
          <div className="grid gap-0 divide-y divide-slate-100">
            {allowedRoleOptions.map((role) => (
              <label className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-slate-50" key={role.value}>
                <input
                  checked={form.roleCodes.includes(role.value)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                  disabled={submitting}
                  onChange={() => toggleRole(role.value)}
                  type="checkbox"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{role.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">{role.description}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        {formError ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p> : null}

        <div className="flex flex-wrap justify-end gap-2">
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

function createColumns(onEdit: (user: UserSummary) => void, canEditUsers: boolean): DataTableColumn<UserSummary>[] {
  const columns: DataTableColumn<UserSummary>[] = [
    { key: 'loginId', header: '아이디', width: '160px', cell: (user) => <CodeCell value={user.loginId} /> },
    { key: 'name', header: '이름', width: '180px', cell: (user) => <UserName user={user} /> },
    { key: 'scope', header: '스코프', width: '110px', cell: (user) => <Badge tone="blue">{scopeLabel(user.userScopeType)}</Badge> },
    { key: 'tenant', header: '소속 물류사', width: '160px', cell: (user) => user.tenantName ?? (user.tenantId ? `물류사 #${user.tenantId}` : '-') },
    { key: 'client', header: '소속 고객사', width: '160px', cell: (user) => user.clientName ?? (user.clientId ? `고객사 #${user.clientId}` : '-') },
    { key: 'roles', header: '권한', width: '240px', cell: (user) => <RoleBadges roles={user.roles} /> },
    { key: 'status', header: '상태', width: '100px', cell: (user) => <StatusBadge status={user.status} /> },
    { key: 'lastLoginAt', header: '마지막 로그인', width: '170px', cell: (user) => formatDateTime(user.lastLoginAt) },
  ];

  if (canEditUsers) {
    columns.push({
      key: 'actions',
      header: '관리',
      align: 'center',
      width: '100px',
      cell: (user) => (
        <Button onClick={() => onEdit(user)} size="sm" variant="secondary">
          수정
        </Button>
      ),
    });
  }

  return columns;
}

function UserName({ user }: { user: UserSummary }) {
  return (
    <div className="space-y-1">
      <p className="font-semibold text-slate-900">{user.name}</p>
      <p className="text-xs text-slate-500">{user.email || '-'}</p>
    </div>
  );
}

function RoleBadges({ roles }: { roles: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {roles.map((role) => (
        <Badge key={role} tone={role === 'ADMIN' || role === 'SYSTEM_ADMIN' ? 'red' : role === 'OPERATOR' ? 'teal' : 'neutral'}>
          {roleLabel(role)}
        </Badge>
      ))}
    </div>
  );
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

function createInitialForm(mode: UserFormMode, user: UserSummary | null): UserFormState {
  if (mode === 'edit' && user) {
    return normalizeScopeValues({
      loginId: user.loginId,
      name: user.name,
      email: user.email ?? '',
      userScopeType: user.userScopeType,
      tenantId: user.tenantId ? String(user.tenantId) : '',
      clientId: user.clientId ? String(user.clientId) : '',
      password: '',
      status: (user.status === 'ACTIVE' ? 'ACTIVE' : 'DISABLED'),
      roleCodes: normalizeRoles(user.roles),
    });
  }

  return normalizeScopeValues({
    ...emptyForm,
    tenantId: fakeCurrentUser.tenantId ? String(fakeCurrentUser.tenantId) : '',
  });
}

function normalizeScopeValues(form: UserFormState): UserFormState {
  const allowedScopeValues = getAllowedScopeOptions().map((option) => option.value);
  const userScopeType = allowedScopeValues.includes(form.userScopeType) ? form.userScopeType : (allowedScopeValues[0] ?? 'TENANT');
  const nextForm = { ...form, userScopeType };
  const roleCodes = normalizeRoleSelection(userScopeType, nextForm.roleCodes);

  if (userScopeType === 'SYSTEM') {
    return { ...nextForm, tenantId: '', clientId: '', roleCodes };
  }

  const tenantId = nextForm.tenantId || (fakeCurrentUser.tenantId ? String(fakeCurrentUser.tenantId) : '');
  if (userScopeType === 'TENANT') {
    return { ...nextForm, tenantId, clientId: '', roleCodes };
  }

  return { ...nextForm, tenantId, roleCodes };
}

function normalizeRoles(roles: string[]): UserRole[] {
  const validRoles = roles.filter((role): role is UserRole => role === 'SYSTEM_ADMIN' || role === 'ADMIN' || role === 'OPERATOR' || role === 'VIEWER');
  return validRoles.length > 0 ? validRoles : ['VIEWER'];
}

function validateForm(form: UserFormState, mode: UserFormMode) {
  if (!form.loginId.trim()) return '아이디를 입력해 주세요.';
  if (!form.name.trim()) return '이름을 입력해 주세요.';
  if (mode === 'create' && !form.password.trim()) return '초기 비밀번호를 입력해 주세요.';
  if (!getAllowedScopeOptions().some((option) => option.value === form.userScopeType)) return '현재 계정으로 선택할 수 없는 스코프입니다.';
  if (form.roleCodes.length === 0) return '권한을 하나 이상 선택해 주세요.';
  if (form.roleCodes.some((role) => !isRoleAllowedForScope(form.userScopeType, role))) return '선택한 스코프에서 허용되지 않는 권한이 포함되어 있습니다.';
  if (form.userScopeType !== 'SYSTEM' && !toOptionalNumber(form.tenantId)) return '물류사를 선택해 주세요.';
  if (form.userScopeType === 'CLIENT' && !toOptionalNumber(form.clientId)) return '고객사를 선택해 주세요.';
  return null;
}

function getTenantOptions(tenants: TenantSummary[]) {
  return tenants.map((tenant) => ({
    label: tenant.name,
    value: String(tenant.id),
  }));
}

function getClientOptions(clients: ClientSummary[]) {
  return clients.map((client) => ({
    label: client.name,
    value: String(client.id),
  }));
}

function getAllowedScopeOptions() {
  if (fakeCurrentUser.userScopeType === 'SYSTEM' && fakeCurrentUser.roles.includes('SYSTEM_ADMIN')) {
    return scopeOptions;
  }

  return scopeOptions.filter((option) => option.value !== 'SYSTEM');
}

function getAllowedRoleOptions(scope: UserScopeType) {
  return roleOptions.filter((role) => isRoleAllowedForScope(scope, role.value));
}

function isRoleAllowedForScope(scope: UserScopeType, role: UserRole) {
  if (scope === 'SYSTEM') return role === 'SYSTEM_ADMIN';
  if (scope === 'TENANT') return role === 'ADMIN' || role === 'OPERATOR' || role === 'VIEWER';
  return role === 'VIEWER';
}

function normalizeRoleSelection(scope: UserScopeType, roles: UserRole[]): UserRole[] {
  const allowedRoles = roles.filter((role) => isRoleAllowedForScope(scope, role));
  if (allowedRoles.length > 0) {
    return allowedRoles;
  }

  if (scope === 'SYSTEM') return ['SYSTEM_ADMIN'];
  return ['VIEWER'];
}

function scopeLabel(scope: UserScopeType) {
  return scopeOptions.find((option) => option.value === scope)?.label ?? scope;
}

function roleLabel(role: string) {
  return roleOptions.find((option) => option.value === role)?.label ?? role;
}

function toOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const numberValue = Number(trimmed);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
