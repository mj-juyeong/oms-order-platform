import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { OmsApiError } from '../api/client';
import { omsApi, type BackendBatchSummary, type ClientSummary, type ValidationErrorItem } from '../api/oms';
import { fakeCurrentUser } from '../app/auth';
import { saveAllBatchContextSelection } from '../app/batchContext';
import { clientSelectionFromValue, clientSelectionValue, saveClientContextSelection, useClientScope } from '../app/clientContext';
import { Badge, Button, Card, Select } from '../components/common';
import { FilterBar } from '../components/data';
import { BatchStatusBadge } from '../components/domain';
import type { BackendOrderLine } from '../types/order';
import type { ValidationSeverity } from '../types/validation';

type PeriodFilter = 'TODAY' | '7DAYS' | 'ALL';

interface IssueSummary {
  batchId?: number;
  label: string;
  count: number;
  errorCode?: string;
  severity: ValidationSeverity;
}

interface DueDateSummaryRow {
  dueDate: string;
  confirmedLineCount: number;
  errorBatchId?: number;
  errorCount: number;
  orderLineCount: number;
  orderNoCount: number;
  productCount: number;
  storeCount: number;
  totalQty: number;
  warningCount: number;
}

const dashboardBatchPageSize = 100;
const dashboardOrderPageSize = 500;
const issueBatchLimit = 8;

export function DashboardPage() {
  if (fakeCurrentUser.userScopeType === 'SYSTEM') {
    return <PlatformAdminDashboard />;
  }

  if (fakeCurrentUser.userScopeType === 'CLIENT') {
    return <ClientOperationsDashboard />;
  }

  return <TenantOperationsDashboard />;
}

function PlatformAdminDashboard() {
  const [tenants, setTenants] = useState<Array<{ id: number; code: string; name: string; status: string }>>([]);
  const [clientCount, setClientCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadSeq, setReloadSeq] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadPlatformSummary() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const tenantItems = await omsApi.tenants.list();
        const activeTenantItems = tenantItems.filter((tenant) => tenant.status === 'ACTIVE');
        const [clientLists, users] = await Promise.all([
          Promise.all(activeTenantItems.map((tenant) => omsApi.clients.list({ tenantId: tenant.id }).catch(() => []))),
          omsApi.users.list({ page: 0, size: 1 }).catch(() => ({ totalElements: 0 })),
        ]);

        if (ignore) return;
        setTenants(tenantItems);
        setClientCount(clientLists.reduce((sum, clients) => sum + clients.length, 0));
        setUserCount(users.totalElements ?? 0);
      } catch (error) {
        if (!ignore) {
          setTenants([]);
          setClientCount(0);
          setUserCount(0);
          setErrorMessage(formatApiError(error));
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void loadPlatformSummary();
    return () => {
      ignore = true;
    };
  }, [reloadSeq]);

  const activeTenants = tenants.filter((tenant) => tenant.status === 'ACTIVE');
  const disabledTenants = tenants.filter((tenant) => tenant.status !== 'ACTIVE');
  const recentTenants = tenants.slice(-5).reverse();

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-clip">
      {errorMessage ? <DashboardError message={errorMessage} onRetry={() => setReloadSeq((current) => current + 1)} /> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PlatformMetric loading={loading} label="전체 물류사" value={tenants.length} />
        <PlatformMetric loading={loading} label="활성 물류사" tone="green" value={activeTenants.length} />
        <PlatformMetric loading={loading} label="고객사" tone="blue" value={clientCount} />
        <PlatformMetric loading={loading} label="사용자" tone="slate" value={userCount} />
      </section>

      <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <Card className="min-w-0 overflow-hidden p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-950">플랫폼 관리 홈</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                SYSTEM_ADMIN은 물류사를 만들고, 물류사별 관리자와 고객사 기반을 준비합니다. 운영 데이터 조회는 지원 모드가 열릴 때 별도로 접근합니다.
              </p>
            </div>
            <Badge tone="blue">SYSTEM_ADMIN</Badge>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <PlatformActionLink description="OMS를 사용할 물류사를 생성하고 상태를 관리합니다." label="물류사 관리" to="/tenants" />
            <PlatformActionLink description="물류사를 선택한 뒤 고객사를 생성하고 상태를 관리합니다." label="고객사 관리" to="/clients" />
            <PlatformActionLink description="SYSTEM/TENANT/CLIENT 사용자를 생성하고 권한을 조정합니다." label="사용자 관리" to="/users" />
          </div>
        </Card>

        <Card className="min-w-0 overflow-hidden p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-950">물류사 상태</h2>
              <p className="mt-1 text-sm text-slate-600">활성/비활성 물류사를 빠르게 확인합니다.</p>
            </div>
            <Link className="text-sm font-semibold text-teal-700 hover:underline" to="/tenants">
              전체 보기
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {loading ? <DashboardEmpty message="물류사 정보를 불러오는 중입니다." /> : null}
            {!loading && recentTenants.length === 0 ? <DashboardEmpty message="등록된 물류사가 없습니다." /> : null}
            {!loading
              ? recentTenants.map((tenant) => (
                  <Link
                    className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-3 transition hover:border-teal-200 hover:bg-teal-50/40"
                    key={tenant.id}
                    to="/tenants"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">{tenant.name}</p>
                      <p className="mt-1 font-mono text-xs text-slate-500">{tenant.code}</p>
                    </div>
                    <Badge tone={tenant.status === 'ACTIVE' ? 'green' : 'neutral'}>{tenant.status === 'ACTIVE' ? '활성' : '비활성'}</Badge>
                  </Link>
                ))
              : null}
          </div>
          {!loading && disabledTenants.length > 0 ? (
            <p className="mt-4 text-xs font-semibold text-slate-500">비활성 물류사 {disabledTenants.length.toLocaleString()}건이 있습니다.</p>
          ) : null}
        </Card>
      </section>
    </div>
  );
}

function TenantOperationsDashboard() {
  const tenantId = fakeCurrentUser.tenantId ?? null;
  const { clientId, selection } = useClientScope();
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('TODAY');
  const [batches, setBatches] = useState<BackendBatchSummary[]>([]);
  const [validationIssues, setValidationIssues] = useState<ValidationErrorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadSeq, setReloadSeq] = useState(0);

  useEffect(() => {
    if (!tenantId) {
      setClients([]);
      return;
    }

    let ignore = false;
    omsApi.clients.list({ tenantId })
      .then((items) => {
        if (!ignore) {
          const uniqueClients = dedupeClientsByName(items);
          setClients(uniqueClients);
          if (selection.mode === 'client' && !uniqueClients.some((client) => client.id === selection.clientId)) {
            saveClientContextSelection({ mode: 'all' });
          }
        }
      })
      .catch(() => {
        if (!ignore) setClients([]);
      });
    return () => {
      ignore = true;
    };
  }, [selection, tenantId]);

  const clientOptions = useMemo(() => {
    return [
      { label: '전체 고객사', value: 'all' },
      ...clients.map((client) => ({ label: `고객사: ${client.name}`, value: String(client.id) })),
    ];
  }, [clients]);

  useEffect(() => {
    let ignore = false;

    async function loadDashboardBatches() {
      setLoading(true);
      setErrorMessage(null);
      try {
        if (!tenantId) {
          setBatches([]);
          return;
        }
        const result = await omsApi.batches.list({
          tenantId,
          clientId,
          page: 0,
          size: dashboardBatchPageSize,
        });
        if (!ignore) {
          setBatches(result.items);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(formatApiError(error));
          setBatches([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadDashboardBatches();
    return () => {
      ignore = true;
    };
  }, [clientId, reloadSeq, tenantId]);

  const latestOperatingDate = useMemo(() => getLatestOperatingDate(batches), [batches]);
  const visibleBatches = useMemo(
    () => filterBatchesByPeriod(batches, periodFilter, latestOperatingDate),
    [batches, latestOperatingDate, periodFilter],
  );
  const summary = useMemo(() => createDashboardSummary(visibleBatches), [visibleBatches]);
  const priorityItems = useMemo(() => priorityBatches(visibleBatches), [visibleBatches]);
  const issueSummary = useMemo(() => createIssueSummary(validationIssues, visibleBatches), [validationIssues, visibleBatches]);
  const maxIssueCount = Math.max(...issueSummary.map((issue) => issue.count), 1);

  useEffect(() => {
    let ignore = false;

    async function loadIssueSummary() {
      const targetBatches = visibleBatches
        .filter((batch) => batch.errorCount > 0 || batch.warningCount > 0 || batch.infoCount > 0)
        .slice(0, issueBatchLimit);

      if (targetBatches.length === 0) {
        setValidationIssues([]);
        return;
      }

      setIssuesLoading(true);
      try {
        const responses = await Promise.all(
          targetBatches.map((batch) =>
            omsApi.batches
              .validationErrors(batch.id, {
                tenantId: tenantId ?? batch.tenantId,
                clientId: batch.clientId,
                page: 0,
                size: 50,
              })
              .then((page) =>
                page.items.map((issue) => ({
                  ...issue,
                  batchId: issue.batchId ?? batch.id,
                })),
              )
              .catch(() => []),
          ),
        );

        if (!ignore) {
          setValidationIssues(responses.flat());
        }
      } finally {
        if (!ignore) {
          setIssuesLoading(false);
        }
      }
    }

    loadIssueSummary();
    return () => {
      ignore = true;
    };
  }, [tenantId, visibleBatches]);

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-clip">
      <FilterBar hideActions>
        <Select
          aria-label="dashboard-client-context"
          label="고객사"
          onChange={(event) => saveClientContextSelection(clientSelectionFromValue(event.target.value, clients))}
          options={clientOptions}
          value={clientSelectionValue(selection)}
        />
        <Select
          label="기간"
          onChange={(event) => setPeriodFilter(event.target.value as PeriodFilter)}
          options={[
            { label: latestOperatingDate ? `최근 업로드일 (${latestOperatingDate})` : '최근 업로드일', value: 'TODAY' },
            { label: '최근 7일', value: '7DAYS' },
            { label: '전체', value: 'ALL' },
          ]}
          value={periodFilter}
        />
      </FilterBar>

      {errorMessage ? <DashboardError message={errorMessage} onRetry={() => setReloadSeq((current) => current + 1)} /> : null}

      <section className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1.2fr)_minmax(420px,1fr)]">
        <Card className="min-w-0 overflow-hidden p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-950">처리 현황</h2>
              <p className="mt-1 text-sm text-slate-600">{dashboardScopeText(periodFilter, latestOperatingDate)}</p>
            </div>
            <Badge tone={summary.blockedBatches.length > 0 ? 'red' : 'green'}>
              {summary.blockedBatches.length > 0 ? `Error 배치 ${summary.blockedBatches.length}건` : '확정 차단 없음'}
            </Badge>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <SummaryNumber label="업로드" loading={loading} value={visibleBatches.length} />
            <SummaryNumber label="확정 대기" loading={loading} tone="navy" value={summary.readyBatches.length} />
            <SummaryNumber label="확정 완료" loading={loading} tone="green" value={summary.confirmedBatches.length} />
            <SummaryNumber label="외부 제외" loading={loading} tone="slate" value={summary.externalExcludedBatches.length} />
          </div>

          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-700">
              <span>배치 상태 분포</span>
              <span className="font-mono text-slate-900">{visibleBatches.length.toLocaleString()}개 배치</span>
            </div>
            <StackedStatusBar summary={summary} totalBatches={Math.max(visibleBatches.length, 1)} />
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-600 sm:grid-cols-3">
              <LegendDot color="bg-slate-700" label="확정 대기" value={summary.readyBatches.length} />
              <LegendDot color="bg-teal-600" label="확정 완료" value={summary.confirmedBatches.length} />
              <LegendDot color="bg-red-500" label="Error" value={summary.blockedBatches.length} />
            </div>
          </div>
        </Card>

        <Card className="min-w-0 overflow-hidden p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-950">검증 이슈 요약</h2>
              <p className="mt-1 text-sm text-slate-600">배치에 저장된 Error, Warning, Info 건수를 비교합니다.</p>
            </div>
            <Link className="text-sm font-semibold text-teal-700 hover:underline" to={firstErrorLink(summary.blockedBatches)}>
              Error 보기
            </Link>
          </div>

          <div className="mt-7 space-y-6">
            <SeverityBar label="Error" severityTotals={summary.severityTotals} tone="red" value={summary.severityTotals.ERROR} />
            <SeverityBar label="Warning" severityTotals={summary.severityTotals} tone="amber" value={summary.severityTotals.WARNING} />
            <SeverityBar label="Info" severityTotals={summary.severityTotals} tone="neutral" value={summary.severityTotals.INFO} />
          </div>

          <div className="mt-7 rounded-md border border-red-100 bg-red-50 px-4 py-4">
            <p className="text-sm font-semibold text-red-800">확정 차단 기준</p>
            <p className="mt-1 text-xs leading-5 text-red-700">Error가 1건 이상 있으면 배치를 확정할 수 없습니다. Warning은 운영 확인 후 확정 가능합니다.</p>
          </div>
        </Card>
      </section>

      <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,1fr)]">
        <Card className="min-w-0 overflow-hidden p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-950">우선 처리 배치</h2>
              <p className="mt-1 text-xs text-slate-500">Error가 있는 배치와 바로 확정 검토할 배치만 표시합니다.</p>
            </div>
            <Link className="text-sm font-semibold text-teal-700 hover:underline" to="/batches">
              전체 보기
            </Link>
          </div>
          {loading ? (
            <DashboardEmpty message="배치 데이터를 불러오는 중입니다." />
          ) : priorityItems.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {priorityItems.map((batch) => (
                <PriorityBatchCard key={batch.id} batch={batch} />
              ))}
            </div>
          ) : (
            <DashboardEmpty message="우선 처리할 배치가 없습니다." />
          )}
        </Card>

        <Card className="min-w-0 overflow-hidden p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-950">오류 유형 TOP 3</h2>
              <p className="mt-1 text-xs text-slate-500">우선 처리 배치의 검증 항목을 기준으로 집계합니다.</p>
            </div>
            {issuesLoading ? <Badge>조회 중</Badge> : null}
          </div>
          <div className="mt-6 space-y-6">
            {issueSummary.length > 0 ? (
              issueSummary
                .slice(0, 3)
                .map((issue) => (
                  <IssueBar count={issue.count} key={`${issue.severity}-${issue.label}`} label={issue.label} max={maxIssueCount} severity={issue.severity} to={validationIssueLink(issue)} />
                ))
            ) : (
              <DashboardEmpty message="표시할 검증 이슈가 없습니다." />
            )}
          </div>
        </Card>
      </section>

      <Card className="min-w-0 overflow-hidden p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950">외부 제공 준비 상태</h2>
            <p className="mt-1 text-xs text-slate-500">확정 완료 배치만 외부 API 응답과 라벨 다운로드 대상입니다.</p>
          </div>
          <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:w-[560px]">
            <ExternalStatusTile label="API 제공 가능" tone="green" value={summary.confirmedBatches.length} />
            <ExternalStatusTile label="라벨 가능" tone="green" value={summary.confirmedBatches.length} />
            <ExternalStatusTile label="제외" tone="amber" value={summary.externalExcludedBatches.length} />
          </div>
        </div>
      </Card>
    </div>
  );
}

function ClientOperationsDashboard() {
  const tenantId = fakeCurrentUser.tenantId ?? null;
  const clientId = fakeCurrentUser.clientId ?? null;
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('TODAY');
  const [batches, setBatches] = useState<BackendBatchSummary[]>([]);
  const [orders, setOrders] = useState<BackendOrderLine[]>([]);
  const [validationIssues, setValidationIssues] = useState<ValidationErrorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadSeq, setReloadSeq] = useState(0);
  const [calendarMonth, setCalendarMonth] = useState(monthKey(new Date()));
  const [selectedDueDate, setSelectedDueDate] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadClientDashboard() {
      setLoading(true);
      setErrorMessage(null);
      try {
        if (!tenantId || !clientId) {
          setBatches([]);
          setOrders([]);
          return;
        }

        const batchPage = await omsApi.batches.list({ tenantId, clientId, page: 0, size: dashboardBatchPageSize });
        const latestUploadDate = getLatestOperatingDate(batchPage.items);
        const targetBatches = filterBatchesByPeriod(batchPage.items, periodFilter, latestUploadDate);
        const orderItems = await loadDashboardOrdersForBatches(tenantId, clientId, targetBatches);

        if (!ignore) {
          setBatches(batchPage.items);
          setOrders(orderItems);
        }
      } catch (error) {
        if (!ignore) {
          setBatches([]);
          setOrders([]);
          setErrorMessage(formatApiError(error));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadClientDashboard();
    return () => {
      ignore = true;
    };
  }, [clientId, periodFilter, reloadSeq, tenantId]);

  const latestOperatingDate = useMemo(() => getLatestOperatingDate(batches), [batches]);
  const visibleBatches = useMemo(
    () => filterBatchesByPeriod(batches, periodFilter, latestOperatingDate),
    [batches, latestOperatingDate, periodFilter],
  );
  const visibleBatchIds = useMemo(() => new Set(visibleBatches.map((batch) => batch.id)), [visibleBatches]);
  const visibleOrders = useMemo(() => orders.filter((order) => visibleBatchIds.has(order.batchId)), [orders, visibleBatchIds]);
  const orderSummary = useMemo(() => createClientOrderSummary(visibleOrders), [visibleOrders]);
  const requestSummary = useMemo(() => createClientRequestSummary(visibleBatches), [visibleBatches]);
  const validationImpact = useMemo(() => createValidationImpactSummary(validationIssues, visibleBatches), [validationIssues, visibleBatches]);
  const dueDateRows = useMemo(() => groupOrdersByDueDate(visibleOrders, validationIssues, visibleBatches), [validationIssues, visibleBatches, visibleOrders]);
  const upcomingRows = dueDateRows.slice(0, 5);
  const selectedDueDateRow = dueDateRows.find((row) => row.dueDate === selectedDueDate) ?? dueDateRows[0] ?? null;
  const priorityItems = useMemo(() => priorityBatches(visibleBatches).slice(0, 3), [visibleBatches]);

  function selectAllBatchesForOrderView() {
    if (!tenantId || !clientId) return;
    saveAllBatchContextSelection({ tenantId, clientId });
  }

  useEffect(() => {
    const firstDatedRow = dueDateRows.find((row) => isIsoDate(row.dueDate));
    if (!firstDatedRow) {
      setSelectedDueDate('');
      return;
    }

    if (!selectedDueDate || !dueDateRows.some((row) => row.dueDate === selectedDueDate)) {
      setSelectedDueDate(firstDatedRow.dueDate);
    }
    if (!dueDateRows.some((row) => isIsoDate(row.dueDate) && row.dueDate.startsWith(calendarMonth))) {
      setCalendarMonth(monthKeyFromDateString(firstDatedRow.dueDate));
    }
  }, [calendarMonth, dueDateRows, selectedDueDate]);

  useEffect(() => {
    let ignore = false;

    async function loadClientIssueImpact() {
      const targetBatches = visibleBatches
        .filter((batch) => batch.errorCount > 0 || batch.warningCount > 0 || batch.infoCount > 0)
        .slice(0, issueBatchLimit);

      if (!tenantId || targetBatches.length === 0) {
        setValidationIssues([]);
        return;
      }

      setIssuesLoading(true);
      try {
        const responses = await Promise.all(
          targetBatches.map((batch) =>
            omsApi.batches
              .validationErrors(batch.id, { tenantId, clientId: batch.clientId, page: 0, size: 50 })
              .then((page) =>
                page.items.map((issue) => ({
                  ...issue,
                  batchId: issue.batchId ?? batch.id,
                })),
              )
              .catch(() => []),
          ),
        );
        if (!ignore) {
          setValidationIssues(responses.flat());
        }
      } finally {
        if (!ignore) {
          setIssuesLoading(false);
        }
      }
    }

    void loadClientIssueImpact();
    return () => {
      ignore = true;
    };
  }, [tenantId, visibleBatches]);

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-clip">
      <FilterBar hideActions>
        <Select
          label="업로드 기간"
          onChange={(event) => setPeriodFilter(event.target.value as PeriodFilter)}
          options={[
            { label: latestOperatingDate ? `최근 업로드일 배치 (${latestOperatingDate})` : '최근 업로드일 배치', value: 'TODAY' },
            { label: '최근 7일 업로드 배치', value: '7DAYS' },
            { label: '전체 배치', value: 'ALL' },
          ]}
          value={periodFilter}
        />
      </FilterBar>

      {errorMessage ? <DashboardError message={errorMessage} onRetry={() => setReloadSeq((current) => current + 1)} /> : null}

      <Card className="border-teal-100 bg-teal-50/70 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950">고객사 업무 현황</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-700">
              주문 현황, 확인이 필요한 오류, 확정 요청 진행 상태를 한눈에 확인합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="inline-flex h-9 items-center justify-center rounded-md border border-teal-700 bg-teal-700 px-3 text-sm font-semibold text-white hover:bg-teal-800" to="/batches">
              내 배치 보기
            </Link>
            <Link className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50" to="/orders">
              주문 요약 보기
            </Link>
          </div>
        </div>
      </Card>

      <section className="grid min-w-0 max-w-full gap-5 2xl:grid-cols-[minmax(0,1.45fr)_minmax(420px,0.9fr)]">
        <Card className="min-w-0 overflow-hidden p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-950">주문 현황</h2>
              <p className="mt-1 text-sm text-slate-600">선택한 업로드 기간의 주문을 납기일 기준으로 확인합니다.</p>
            </div>
            <Badge tone={orderSummary.unconfirmedLineCount > 0 ? 'amber' : 'neutral'}>
              {orderSummary.unconfirmedLineCount > 0 ? `확정 전 ${orderSummary.unconfirmedLineCount}건` : '확정 완료'}
            </Badge>
          </div>

          <div className="mt-5 grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4">
            <ClientSmallStat label="주문 항목" value={orderSummary.orderLineCount} />
            <ClientSmallStat label="납품처" value={orderSummary.storeCount} />
            <ClientSmallStat label="품목" value={orderSummary.productCount} />
            <ClientSmallStat label="총 수량" value={orderSummary.totalQty} />
          </div>

          <div className="mt-6 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <DueDateVolumeChart
              loading={loading}
              onOpenOrders={selectAllBatchesForOrderView}
              onSelectDueDate={setSelectedDueDate}
              rows={dueDateRows}
              selectedDueDate={selectedDueDateRow?.dueDate ?? ''}
            />
            <DueDateDetailPanel loading={loading} onOpenOrders={selectAllBatchesForOrderView} row={selectedDueDateRow} />
          </div>

          <div className="mt-5 flex justify-end">
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              onClick={() => setCalendarOpen((current) => !current)}
              type="button"
            >
              {calendarOpen ? <ChevronUp aria-hidden="true" size={18} /> : <ChevronDown aria-hidden="true" size={18} />}
              {calendarOpen ? '캘린더 접기' : '캘린더 펼치기'}
            </button>
          </div>

          {calendarOpen ? (
            <div className="mt-4">
              <DueDateCalendar
                month={calendarMonth}
                rows={dueDateRows}
                selectedDueDate={selectedDueDateRow?.dueDate ?? ''}
                onMonthChange={setCalendarMonth}
                onSelectDate={setSelectedDueDate}
              />
            </div>
          ) : null}

          <div className="mt-5 overflow-hidden rounded-lg border border-slate-200">
            <div className="grid grid-cols-[minmax(0,1fr)_48px_48px_48px] gap-1 bg-slate-50 px-2.5 py-3 text-[11px] font-bold text-slate-600 sm:grid-cols-[1fr_96px_96px_96px] sm:px-4 sm:text-xs">
              <span>최근 일정</span>
              <span className="text-right">주문</span>
              <span className="text-right">납품처</span>
              <span className="text-right">항목</span>
            </div>
            {loading ? <DashboardEmpty message="주문 요약을 불러오는 중입니다." /> : null}
            {!loading && upcomingRows.length === 0 ? <DashboardEmpty message="표시할 주문 현황이 없습니다." /> : null}
            {!loading
              ? upcomingRows.map((row) => (
                  <Link
                    className="grid grid-cols-[minmax(0,1fr)_48px_48px_48px] items-center gap-1 border-t border-slate-100 px-2.5 py-3 text-[13px] transition hover:bg-teal-50/50 sm:grid-cols-[1fr_96px_96px_96px] sm:px-4 sm:text-sm"
                    key={row.dueDate}
                    onClick={selectAllBatchesForOrderView}
                    to={isIsoDate(row.dueDate) ? `/orders?dueDateFrom=${row.dueDate}&dueDateTo=${row.dueDate}` : '/orders'}
                  >
                    <span className="min-w-0 truncate font-semibold text-slate-950">{row.dueDate || '-'}</span>
                    <span className="text-right font-mono text-slate-900">{row.orderNoCount.toLocaleString()}</span>
                    <span className="text-right font-mono text-slate-900">{row.storeCount.toLocaleString()}</span>
                    <span className="text-right font-mono text-slate-900">{row.orderLineCount.toLocaleString()}</span>
                  </Link>
                ))
              : null}
          </div>
        </Card>

        <Card className="flex min-w-0 flex-col overflow-hidden p-5">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-950">확인 필요 오류</h2>
              <p className="mt-1 text-sm text-slate-600">우선 확인할 오류가 어떤 주문, 납품처, 품목에 영향을 주는지 보여줍니다.</p>
            </div>
            {issuesLoading ? <Badge>조회 중</Badge> : <Badge tone={validationImpact.errorCount > 0 ? 'red' : 'neutral'}>Error {validationImpact.errorCount}</Badge>}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <ClientSmallStat label="영향 주문" tone={validationImpact.errorCount > 0 ? 'red' : validationImpact.warningCount > 0 ? 'amber' : 'slate'} value={validationImpact.affectedOrderNoCount} />
            <ClientSmallStat label="영향 납품처" value={validationImpact.affectedStoreCount} />
            <ClientSmallStat label="영향 품목" value={validationImpact.affectedProductCount} />
          </div>

          <div className="mt-5 flex-1 space-y-3">
            {validationImpact.topReasons.length > 0 ? (
              validationImpact.topReasons.map((reason) => (
                <Link
                  className="block rounded-md border border-slate-200 px-3 py-3 transition hover:border-teal-300 hover:bg-teal-50/50"
                  key={`${reason.severity}-${reason.label}`}
                  to={validationIssueLink(reason)}
                >
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-semibold text-slate-900">{reason.label}</p>
                    <Badge tone={reason.severity === 'ERROR' ? 'red' : reason.severity === 'WARNING' ? 'amber' : 'neutral'}>{reason.count}건</Badge>
                  </div>
                </Link>
              ))
            ) : (
              <DashboardEmpty message="확인 필요 오류가 없습니다." />
            )}
          </div>

          <Link
            className="mt-5 inline-flex h-9 w-full items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            to={firstErrorLink(visibleBatches.filter((batch) => batch.errorCount > 0 || batch.warningCount > 0 || batch.infoCount > 0))}
          >
            전체 오류 보기
          </Link>
        </Card>
      </section>

      <section className="grid min-w-0 grid-cols-2 gap-3 md:gap-4 xl:grid-cols-5">
        <ClientMetricCard label="업로드 배치" loading={loading} value={visibleBatches.length} />
        <ClientMetricCard label="주문 건수" loading={loading} value={orderSummary.orderNoCount} />
        <ClientMetricCard label="오류 영향 주문" loading={loading} tone={validationImpact.errorCount > 0 ? 'red' : validationImpact.warningCount > 0 ? 'amber' : 'default'} value={validationImpact.affectedOrderNoCount} />
        <ClientMetricCard label="확정 요청 가능" loading={loading} tone="primary" value={requestSummary.readyToRequest} />
        <ClientMetricCard label="확정 완료" loading={loading} value={requestSummary.confirmed} />
      </section>

      <section className="grid min-w-0 max-w-full gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <Card className="min-w-0 overflow-hidden p-5">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-950">확정 요청 상태</h2>
              <p className="mt-1 hidden text-sm text-slate-600 sm:block">검증 후 확정 요청 가능한 파일과 처리 완료 파일을 확인합니다.</p>
            </div>
            <Link className="text-sm font-semibold text-teal-700 hover:underline" to="/batches">
              전체 보기
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ClientRequestTile label="검증 필요" value={requestSummary.needsValidation} />
            <ClientRequestTile label="요청 가능" tone="primary" value={requestSummary.readyToRequest} />
            <ClientRequestTile label="요청/검토 중" tone="amber" value={requestSummary.inReview} />
            <ClientRequestTile label="확정 완료" value={requestSummary.confirmed} />
          </div>
        </Card>

        <Card className="min-w-0 overflow-hidden p-5">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-950">우선 확인 배치</h2>
              <p className="mt-1 text-sm text-slate-600">오류가 있거나 확정 검토가 필요한 배치입니다.</p>
            </div>
          </div>
          {loading ? <DashboardEmpty message="배치 데이터를 불러오는 중입니다." /> : null}
          {!loading && priorityItems.length === 0 ? <DashboardEmpty message="우선 확인할 배치가 없습니다." /> : null}
          <div className="space-y-3">
            {!loading
              ? priorityItems.map((batch) => (
                  <Link
                    className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-3 transition hover:border-teal-200 hover:bg-teal-50/40"
                    key={batch.id}
                    to={batch.errorCount > 0 ? `/batches/${batch.id}/validation?severity=ERROR` : `/batches/${batch.id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-sm font-bold text-slate-950">{batch.batchNo}</p>
                      <p className="mt-1 text-xs text-slate-500">업로드 {formatDateTime(batch.uploadedAt)}</p>
                    </div>
                    <BatchStatusBadge status={batch.status} />
                  </Link>
                ))
              : null}
          </div>
        </Card>
      </section>
    </div>
  );
}

function PlatformMetric({
  label,
  loading,
  tone = 'default',
  value,
}: {
  label: string;
  loading: boolean;
  tone?: 'default' | 'green' | 'blue' | 'slate';
  value: number;
}) {
  const toneClasses = {
    default: 'border-teal-100 bg-teal-50 text-teal-900',
    green: 'border-teal-100 bg-teal-50 text-teal-900',
    blue: 'border-slate-200 bg-slate-50 text-slate-900',
    slate: 'border-slate-200 bg-slate-50 text-slate-900',
  };

  return (
    <Card className={`p-4 ${toneClasses[tone]}`}>
      <p className="text-xs font-semibold opacity-75">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-normal">{loading ? '-' : value.toLocaleString()}</p>
    </Card>
  );
}

function PlatformActionLink({ description, label, to }: { description: string; label: string; to: string }) {
  return (
    <Link
      className="block rounded-md border border-slate-200 px-4 py-4 transition hover:border-teal-300 hover:bg-teal-50/60 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
      to={to}
    >
      <span className="text-sm font-bold text-slate-950">{label}</span>
      <span className="mt-2 block text-xs leading-5 text-slate-600">{description}</span>
    </Link>
  );
}

function SummaryNumber({
  label,
  loading,
  tone = 'default',
  value,
}: {
  label: string;
  loading: boolean;
  tone?: 'default' | 'navy' | 'green' | 'slate';
  value: number;
}) {
  const toneClasses = {
    default: 'bg-slate-50 text-slate-800',
    navy: 'bg-slate-100 text-slate-800',
    green: 'bg-teal-50 text-teal-800',
    slate: 'bg-slate-100 text-slate-800',
  };

  return (
    <div className={`rounded-lg border border-white/70 px-5 py-4 shadow-sm ${toneClasses[tone]}`}>
      <p className="text-xs font-semibold opacity-80">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-normal">{loading ? '-' : value.toLocaleString()}</p>
    </div>
  );
}

function StackedStatusBar({
  summary,
  totalBatches,
}: {
  summary: ReturnType<typeof createDashboardSummary>;
  totalBatches: number;
}) {
  const segments = [
    { label: '확정 대기', value: summary.readyBatches.length, className: 'bg-slate-700 text-white' },
    { label: '확정 완료', value: summary.confirmedBatches.length, className: 'bg-teal-600 text-white' },
    { label: 'Error', value: summary.blockedBatches.length, className: 'bg-red-500 text-white' },
  ].filter((segment) => segment.value > 0);

  if (segments.length === 0) {
    return (
      <div className="flex h-20 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-500 ring-1 ring-inset ring-slate-200">
        표시할 배치가 없습니다
      </div>
    );
  }

  return (
    <div className="relative flex h-20 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-inset ring-slate-200">
      <div className="pointer-events-none absolute inset-y-0 left-1/4 border-l border-white/55" />
      <div className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-white/55" />
      <div className="pointer-events-none absolute inset-y-0 left-3/4 border-l border-white/55" />
      {segments.map((segment, index) => (
        <div
          aria-label={`${segment.label} ${segment.value}건`}
          className={`${segment.className} dashboard-chart-enter flex min-w-12 origin-left items-center justify-center px-2 text-center text-xs font-bold shadow-sm`}
          key={segment.label}
          style={{ animationDelay: `${index * 100}ms`, width: `${(segment.value / totalBatches) * 100}%` }}
          title={`${segment.label} ${segment.value}건`}
        >
          <span className="truncate">{segment.value}건</span>
        </div>
      ))}
    </div>
  );
}

function SeverityBar({
  label,
  severityTotals,
  tone,
  value,
}: {
  label: string;
  severityTotals: Record<ValidationSeverity, number>;
  tone: 'red' | 'amber' | 'neutral';
  value: number;
}) {
  const total = Math.max(severityTotals.ERROR + severityTotals.WARNING + severityTotals.INFO, 1);
  const colors = {
    red: {
      accentColor: '',
      barColor: 'bg-red-600',
      borderColor: 'border-red-100',
      textColor: 'text-red-700',
    },
    amber: {
      accentColor: '',
      barColor: 'bg-amber-300',
      borderColor: 'border-amber-100',
      textColor: 'text-amber-700',
    },
    neutral: {
      accentColor: '',
      barColor: 'bg-slate-500',
      borderColor: 'border-slate-100',
      textColor: 'text-slate-700',
    },
  };
  const { accentColor, barColor, borderColor, textColor } = colors[tone];
  const width = Math.max((value / total) * 100, value > 0 ? 10 : 0);

  return (
    <div className={`rounded-lg border ${borderColor} ${accentColor} bg-white px-3 py-3 shadow-sm`}>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-800">{label}</span>
        <span className={`font-mono text-sm font-bold ${textColor}`}>{value.toLocaleString()}건</span>
      </div>
      <div className="relative h-7 overflow-hidden rounded-md bg-slate-100 ring-1 ring-inset ring-slate-200">
        <div className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-white/80" />
        <div
          className={`${barColor} dashboard-chart-enter flex h-full origin-left items-center justify-end rounded-md px-2 text-xs font-bold text-white shadow-sm`}
          style={{ width: `${width}%` }}
        >
          {value > 0 ? `${Math.round((value / total) * 100)}%` : ''}
        </div>
      </div>
    </div>
  );
}

function IssueBar({ count, label, max, severity, to }: { count: number; label: string; max: number; severity: ValidationSeverity; to: string }) {
  const color =
    severity === 'ERROR'
      ? {
          accentColor: '',
          barColor: 'bg-red-600',
          borderColor: 'border-red-100',
          textColor: 'text-red-700',
        }
      : severity === 'WARNING'
        ? {
            accentColor: '',
            barColor: 'bg-amber-300',
            borderColor: 'border-amber-100',
            textColor: 'text-amber-700',
          }
        : {
            accentColor: '',
            barColor: 'bg-slate-500',
            borderColor: 'border-slate-100',
            textColor: 'text-slate-700',
          };
  const { accentColor, barColor, borderColor, textColor } = color;

  return (
    <Link className={`block min-w-0 rounded-lg border ${borderColor} ${accentColor} bg-white px-3 py-3 shadow-sm transition hover:border-teal-300 hover:bg-teal-50/40`} to={to}>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="min-w-0 truncate font-semibold text-slate-800">{label}</span>
        <span className={`shrink-0 whitespace-nowrap font-mono text-sm font-bold ${textColor}`}>{count.toLocaleString()}건</span>
      </div>
      <div className="relative h-5 overflow-hidden rounded-md bg-slate-100 ring-1 ring-inset ring-slate-200">
        <div
          className={`${barColor} dashboard-chart-enter h-full origin-left rounded-md shadow-sm`}
          style={{ width: `${Math.max((count / max) * 100, 14)}%` }}
        />
      </div>
    </Link>
  );
}

function PriorityBatchCard({ batch }: { batch: BackendBatchSummary }) {
  const hasError = batch.errorCount > 0;

  return (
    <div className={`min-w-0 overflow-hidden rounded-lg border bg-white px-4 py-4 shadow-sm ${hasError ? 'border-red-200 border-l-4 border-l-red-500' : 'border-slate-200 border-l-4 border-l-slate-500'}`}>
      <div className="flex min-w-0 items-center justify-between gap-3">
        <Link className="min-w-0 truncate font-mono text-sm font-bold text-slate-950 hover:text-teal-700" title={batch.batchNo} to={`/batches/${batch.id}`}>
          {batch.batchNo}
        </Link>
        <BatchStatusBadge status={batch.status} />
      </div>
      <p className="mt-2 truncate text-sm text-slate-700">
        배송일 {batch.deliveryDate ?? '-'} · 업로드 {formatDateTime(batch.uploadedAt)}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge tone={hasError ? 'red' : 'green'}>{hasError ? `Error ${batch.errorCount}` : 'Error 0'}</Badge>
        <Badge tone="amber">Warning {batch.warningCount}</Badge>
        <Link
          className="ml-auto shrink-0 text-xs font-semibold text-teal-700 hover:underline"
          to={hasError ? `/batches/${batch.id}/validation?severity=ERROR` : `/batches/${batch.id}`}
        >
          {hasError ? '오류 확인' : '확정 검토'}
        </Link>
      </div>
    </div>
  );
}

function ExternalStatusTile({ label, tone, value }: { label: string; tone: 'green' | 'amber'; value: number }) {
  const toneClasses =
    tone === 'green'
      ? 'border-teal-200 bg-teal-50 text-teal-800'
      : value > 0
        ? 'border-amber-200 bg-amber-50 text-amber-900'
        : 'border-slate-200 bg-slate-50 text-slate-700';

  return (
    <div className={`min-w-0 rounded-lg border px-3 py-3 sm:px-4 ${toneClasses}`}>
      <p className="truncate text-xs font-semibold opacity-80">{label}</p>
      <p className="mt-2 font-mono text-2xl font-bold">{value.toLocaleString()}</p>
    </div>
  );
}

function ClientMetricCard({
  label,
  loading,
  tone = 'default',
  value,
}: {
  label: string;
  loading: boolean;
  tone?: 'amber' | 'default' | 'primary' | 'red';
  value: number;
}) {
  const toneClasses = {
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    default: 'border-slate-200 bg-white text-slate-950',
    primary: 'border-teal-200 bg-teal-50 text-teal-900',
    red: 'border-red-200 bg-red-50 text-red-900',
  };

  return (
    <Card className={`min-w-0 overflow-hidden p-3 sm:p-4 ${toneClasses[tone]}`}>
      <p className="truncate text-xs font-semibold opacity-75">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-normal sm:text-3xl">{loading ? '-' : value.toLocaleString()}</p>
    </Card>
  );
}

function ClientSmallStat({ label, tone = 'slate', value }: { label: string; tone?: 'amber' | 'red' | 'slate'; value: number }) {
  const toneClass = {
    amber: 'bg-amber-50 text-amber-800',
    red: 'bg-red-50 text-red-800',
    slate: 'bg-slate-50 text-slate-800',
  }[tone];

  return (
    <div className={`min-w-0 rounded-md px-3 py-3 ${toneClass}`}>
      <p className="truncate text-xs font-semibold opacity-75">{label}</p>
      <p className="mt-1 font-mono text-xl font-bold">{value.toLocaleString()}</p>
    </div>
  );
}

function ClientRequestTile({ label, tone = 'slate', value }: { label: string; tone?: 'amber' | 'primary' | 'slate'; value: number }) {
  const toneClass = {
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    primary: 'border-teal-200 bg-teal-50 text-teal-900',
    slate: 'border-slate-200 bg-slate-50 text-slate-900',
  }[tone];

  return (
    <div className={`min-w-0 rounded-md border px-3 py-3 sm:px-4 sm:py-4 ${toneClass}`}>
      <p className="truncate text-xs font-semibold opacity-75">{label}</p>
      <p className="mt-2 font-mono text-2xl font-bold">{value.toLocaleString()}</p>
    </div>
  );
}

function DueDateVolumeChart({
  loading,
  onOpenOrders,
  onSelectDueDate,
  rows,
  selectedDueDate,
}: {
  loading: boolean;
  onOpenOrders: () => void;
  onSelectDueDate: (dueDate: string) => void;
  rows: DueDateSummaryRow[];
  selectedDueDate: string;
}) {
  const chartRows = rows.filter((row) => isIsoDate(row.dueDate)).slice(0, 7);
  const maxOrders = Math.max(...chartRows.map((row) => row.orderNoCount), 1);

  if (loading) {
    return <DashboardEmpty message="주문량을 불러오는 중입니다." />;
  }

  if (chartRows.length === 0) {
    return <DashboardEmpty message="표시할 주문량이 없습니다." />;
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-slate-200 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-950">날짜별 주문량</p>
          <p className="mt-1 text-xs text-slate-500">가까운 날짜의 주문량과 확인 필요 상태를 비교합니다.</p>
        </div>
        <Badge tone="neutral">날짜 {chartRows.length}개</Badge>
      </div>

      <div className="mt-5 space-y-3">
        {chartRows.map((row) => {
          const selected = row.dueDate === selectedDueDate;
          const width = Math.max((row.orderNoCount / maxOrders) * 100, 10);
          const issueTone = row.errorCount > 0 ? 'red' : row.warningCount > 0 ? 'amber' : 'teal';
          const issueText = row.errorCount > 0 ? `Error ${row.errorCount}` : row.warningCount > 0 ? `Warning ${row.warningCount}` : '정상';
          const destination = dueDateVolumeLink(row);

          return (
            <Link
              aria-current={selected ? 'true' : undefined}
              className={`grid min-h-20 w-full min-w-0 grid-cols-[64px_minmax(0,1fr)] gap-3 rounded-lg border p-3 text-left transition sm:grid-cols-[88px_minmax(0,1fr)_104px] sm:items-center ${
                selected ? 'border-teal-500 bg-teal-50 ring-2 ring-inset ring-teal-500' : 'border-slate-200 bg-white hover:border-teal-200 hover:bg-teal-50/50'
              }`}
              key={row.dueDate}
              onClick={(event) => {
                if (!selected) {
                  event.preventDefault();
                  onSelectDueDate(row.dueDate);
                  return;
                }
                if (!row.errorBatchId) {
                  onOpenOrders();
                }
              }}
              to={destination}
            >
              <div>
                <p className="font-mono text-base font-bold text-slate-950">{formatCompactDate(row.dueDate)}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{formatWeekday(row.dueDate)}</p>
              </div>

              <div className="min-w-0">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">주문 {row.orderNoCount.toLocaleString()}건</p>
                  <p className="shrink-0 text-xs text-slate-500">납품처 {row.storeCount.toLocaleString()}곳</p>
                </div>
                <div className="mt-2 h-4 overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200">
                  <div
                    className={`h-full rounded-full ${
                      issueTone === 'red' ? 'bg-red-500' : issueTone === 'amber' ? 'bg-amber-400' : 'bg-teal-600'
                    }`}
                    style={{ width: `${width}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">주문 항목 {row.orderLineCount.toLocaleString()}건 · 품목 {row.productCount.toLocaleString()}개</p>
              </div>

              <div className="col-span-2 flex min-w-0 items-center justify-between gap-2 sm:col-span-1 sm:justify-end">
                <Badge tone={issueTone}>{issueText}</Badge>
                <span className="text-xs font-semibold text-teal-700">주문 보기</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function DueDateCalendar({
  month,
  onMonthChange,
  onSelectDate,
  rows,
  selectedDueDate,
}: {
  month: string;
  onMonthChange: (month: string) => void;
  onSelectDate: (date: string) => void;
  rows: DueDateSummaryRow[];
  selectedDueDate: string;
}) {
  const rowMap = useMemo(() => new Map(rows.map((row) => [row.dueDate, row])), [rows]);
  const cells = useMemo(() => createMonthCalendarCells(month), [month]);

  return (
    <div className="rounded-lg border border-slate-200">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <button
          aria-label="이전 달"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
          onClick={() => onMonthChange(shiftMonth(month, -1))}
          type="button"
        >
          <ChevronLeft aria-hidden="true" size={16} />
        </button>
        <p className="font-semibold text-slate-950">{formatMonthLabel(month)}</p>
        <button
          aria-label="다음 달"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
          onClick={() => onMonthChange(shiftMonth(month, 1))}
          type="button"
        >
          <ChevronRight aria-hidden="true" size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-500">
        {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
          <div className="py-2" key={day}>{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((cell) => {
          const row = cell.date ? rowMap.get(cell.date) : null;
          const selected = cell.date === selectedDueDate;
          const hasIssue = Boolean(row && (row.errorCount > 0 || row.warningCount > 0));

          return (
            <button
              className={`min-h-24 border-b border-r border-slate-100 p-2 text-left transition last:border-r-0 ${
                selected ? 'bg-teal-50 ring-2 ring-inset ring-teal-500' : row ? 'bg-white hover:bg-teal-50/50' : 'bg-slate-50/70 text-slate-400'
              }`}
              disabled={!row}
              key={cell.key}
              onClick={() => row && onSelectDate(row.dueDate)}
              type="button"
            >
              <span className="text-xs font-semibold">{cell.dayLabel}</span>
              {row ? (
                <span className="mt-2 block">
                  <span className="block font-mono text-lg font-bold text-slate-950">{row.orderNoCount}</span>
                  <span className="block text-xs text-slate-500">주문</span>
                  <span className={`mt-1 inline-flex h-1.5 w-1.5 rounded-full ${row.errorCount > 0 ? 'bg-red-500' : hasIssue ? 'bg-amber-400' : 'bg-teal-500'}`} />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DueDateDetailPanel({ loading, onOpenOrders, row }: { loading: boolean; onOpenOrders: () => void; row: DueDateSummaryRow | null }) {
  if (loading) {
    return <DashboardEmpty message="납기일 정보를 불러오는 중입니다." />;
  }

  if (!row) {
    return <DashboardEmpty message="선택할 납기일 데이터가 없습니다." />;
  }

  const statusTone = row.errorCount > 0 ? 'red' : row.warningCount > 0 ? 'amber' : row.confirmedLineCount === row.orderLineCount ? 'teal' : 'neutral';
  const statusText = row.errorCount > 0 ? `Error ${row.errorCount}` : row.warningCount > 0 ? `Warning ${row.warningCount}` : row.confirmedLineCount === row.orderLineCount ? '확정 완료' : '확정 전';

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-500">선택 납기일</p>
          <p className="mt-1 font-mono text-xl font-bold text-slate-950">{row.dueDate}</p>
        </div>
        <Badge tone={statusTone}>{statusText}</Badge>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <ClientSmallStat label="주문 건수" value={row.orderNoCount} />
        <ClientSmallStat label="주문 항목" value={row.orderLineCount} />
        <ClientSmallStat label="납품처" value={row.storeCount} />
        <ClientSmallStat label="품목" value={row.productCount} />
      </div>

      <div className="mt-4 rounded-md bg-slate-50 px-3 py-3">
        <p className="text-xs font-semibold text-slate-500">총 수량</p>
        <p className="mt-1 font-mono text-2xl font-bold text-slate-950">{row.totalQty.toLocaleString()}</p>
      </div>

      <Link
        className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-md border border-teal-700 bg-teal-700 px-3 text-sm font-semibold text-white transition hover:bg-teal-800"
        onClick={onOpenOrders}
        to={isIsoDate(row.dueDate) ? `/orders?dueDateFrom=${row.dueDate}&dueDateTo=${row.dueDate}` : '/orders'}
      >
        해당 납기일 주문 보기
      </Link>
    </div>
  );
}

function LegendDot({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span>{label}</span>
      <span className="ml-auto font-mono font-semibold text-slate-900">{value.toLocaleString()}</span>
    </div>
  );
}

function DashboardError({ message, onRetry }: { message: string; onRetry: () => void }) {
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

function DashboardEmpty({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-500">
      {message}
    </div>
  );
}

async function loadDashboardOrdersForBatches(tenantId: number, clientId: number, batches: BackendBatchSummary[]) {
  if (batches.length === 0) {
    return [];
  }

  const batchOrders = await Promise.all(
    batches.map((batch) => loadDashboardOrdersForBatch(tenantId, clientId, batch.id)),
  );
  return batchOrders.flat();
}

async function loadDashboardOrdersForBatch(tenantId: number, clientId: number, batchId: number) {
  const firstPage = await omsApi.orders.list({
    tenantId,
    clientId,
    batchId,
    confirmedOnly: false,
    page: 0,
    size: dashboardOrderPageSize,
  });

  if (firstPage.totalPages <= 1) {
    return firstPage.items;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
      omsApi.orders.list({
        tenantId,
        clientId,
        batchId,
        confirmedOnly: false,
        page: index + 1,
        size: dashboardOrderPageSize,
      }),
    ),
  );

  return [firstPage, ...remainingPages].flatMap((page) => page.items);
}

function createClientOrderSummary(orders: BackendOrderLine[]) {
  return {
    orderLineCount: orders.length,
    orderNoCount: uniqueDefinedValues(orders.map((order) => order.orderNo)).length,
    productCount: uniqueDefinedValues(orders.map((order) => order.productCode)).length,
    storeCount: uniqueDefinedValues(orders.map((order) => order.storeCode)).length,
    totalQty: orders.reduce((sum, order) => sum + toNumber(order.orderQty), 0),
    unconfirmedLineCount: orders.filter((order) => !order.confirmed).length,
  };
}

function createClientRequestSummary(batches: BackendBatchSummary[]) {
  return {
    confirmed: batches.filter((batch) => batch.status === 'CONFIRMED').length,
    inReview: batches.filter((batch) => batch.status === 'CONFIRMATION_REQUESTED' || batch.status === 'NEEDS_MORE_INFO').length,
    needsValidation: batches.filter((batch) => batch.status === 'UPLOADED' || batch.status === 'VALIDATION_FAILED' || batch.errorCount > 0).length,
    readyToRequest: batches.filter((batch) => batch.status === 'READY_TO_CONFIRM' && batch.errorCount === 0).length,
  };
}

function createValidationImpactSummary(issues: ValidationErrorItem[], batches: BackendBatchSummary[]) {
  const errorCount = batches.reduce((sum, batch) => sum + batch.errorCount, 0);
  const warningCount = batches.reduce((sum, batch) => sum + batch.warningCount, 0);
  const topReasons = createIssueSummary(issues, batches).slice(0, 4);

  return {
    affectedOrderNoCount: uniqueDefinedValues(issues.map((issue) => issue.orderNo)).length || (errorCount + warningCount > 0 ? Math.min(errorCount + warningCount, batches.length) : 0),
    affectedProductCount: uniqueDefinedValues(issues.map((issue) => issue.productCode)).length,
    affectedStoreCount: uniqueDefinedValues(issues.map((issue) => issue.storeCode)).length,
    errorCount,
    topReasons,
    warningCount,
  };
}

function groupOrdersByDueDate(orders: BackendOrderLine[], issues: ValidationErrorItem[], batches: BackendBatchSummary[]): DueDateSummaryRow[] {
  const issueImpactByDate = createIssueImpactByDate(orders, issues);
  const batchStatusById = new Map(batches.map((batch) => [batch.id, batch]));
  const grouped = new Map<string, BackendOrderLine[]>();

  orders.forEach((order) => {
    const dueDate = order.dueDate || '납기일 없음';
    grouped.set(dueDate, [...(grouped.get(dueDate) ?? []), order]);
  });

  return [...grouped.entries()]
    .map(([dueDate, items]) => {
      const impact = issueImpactByDate.get(dueDate);
      const itemBatches = uniqueDefinedValues(items.map((item) => item.batchId))
        .map((batchId) => batchStatusById.get(Number(batchId)))
        .filter((batch): batch is BackendBatchSummary => Boolean(batch));
      const errorBatchId = impact?.errorBatchId ?? itemBatches.find((batch) => batch.errorCount > 0)?.id;
      const batchErrorCount = itemBatches
        .reduce((sum, batch) => sum + (batch?.errorCount ?? 0), 0);
      const batchWarningCount = itemBatches
        .reduce((sum, batch) => sum + (batch?.warningCount ?? 0), 0);

      return {
        confirmedLineCount: items.filter((item) => item.confirmed).length,
        dueDate,
        errorBatchId,
        errorCount: impact?.errorCount ?? batchErrorCount,
        orderLineCount: items.length,
        orderNoCount: uniqueDefinedValues(items.map((item) => item.orderNo)).length,
        productCount: uniqueDefinedValues(items.map((item) => item.productCode)).length,
        storeCount: uniqueDefinedValues(items.map((item) => item.storeCode)).length,
        totalQty: items.reduce((sum, item) => sum + toNumber(item.orderQty), 0),
        warningCount: impact?.warningCount ?? batchWarningCount,
      };
    })
    .sort((left, right) => {
      if (isIsoDate(left.dueDate) && isIsoDate(right.dueDate)) return left.dueDate.localeCompare(right.dueDate);
      if (isIsoDate(left.dueDate)) return -1;
      if (isIsoDate(right.dueDate)) return 1;
      return left.dueDate.localeCompare(right.dueDate);
    });
}

function createIssueImpactByDate(orders: BackendOrderLine[], issues: ValidationErrorItem[]) {
  const dueDateByOrderNo = new Map(orders.map((order) => [order.orderNo, order.dueDate || '납기일 없음']));
  const result = new Map<string, { errorBatchId?: number; errorCount: number; warningCount: number }>();

  issues.forEach((issue) => {
    const dueDate = dueDateByOrderNo.get(issue.orderNo) ?? '납기일 없음';
    const current = result.get(dueDate) ?? { errorCount: 0, warningCount: 0 };
    if (issue.severity === 'ERROR') {
      current.errorBatchId = current.errorBatchId ?? issue.batchId;
      current.errorCount += 1;
    }
    if (issue.severity === 'WARNING') current.warningCount += 1;
    result.set(dueDate, current);
  });

  return result;
}

function createDashboardSummary(batches: BackendBatchSummary[]) {
  const readyBatches = batches.filter((batch) => batch.status === 'READY_TO_CONFIRM');
  const confirmedBatches = batches.filter((batch) => batch.status === 'CONFIRMED');
  const blockedBatches = batches.filter((batch) => batch.errorCount > 0);
  const warningOnlyBatches = batches.filter((batch) => batch.warningCount > 0 && batch.errorCount === 0);
  const externalExcludedBatches = batches.filter((batch) => batch.status !== 'CONFIRMED');
  const severityTotals: Record<ValidationSeverity, number> = {
    ERROR: batches.reduce((sum, batch) => sum + batch.errorCount, 0),
    WARNING: batches.reduce((sum, batch) => sum + batch.warningCount, 0),
    INFO: batches.reduce((sum, batch) => sum + batch.infoCount, 0),
  };

  return {
    blockedBatches,
    confirmedBatches,
    externalExcludedBatches,
    readyBatches,
    severityTotals,
    warningOnlyBatches,
  };
}

function priorityBatches(batches: BackendBatchSummary[]) {
  const blocked = batches.filter((batch) => batch.errorCount > 0);
  const ready = batches.filter((batch) => batch.status === 'READY_TO_CONFIRM' && batch.errorCount === 0);
  const warnings = batches.filter((batch) => batch.warningCount > 0 && batch.errorCount === 0 && batch.status !== 'READY_TO_CONFIRM');

  return [...blocked, ...ready, ...warnings]
    .sort((left, right) => {
      const severityDelta = right.errorCount - left.errorCount || right.warningCount - left.warningCount;
      return severityDelta !== 0 ? severityDelta : right.uploadedAt.localeCompare(left.uploadedAt);
    })
    .slice(0, 4);
}

function createIssueSummary(issues: ValidationErrorItem[], batches: BackendBatchSummary[]): IssueSummary[] {
  const issueRows =
    issues.length > 0
      ? issues
      : batches.flatMap((batch) => fallbackIssuesFromBatch(batch));

  return Object.values(
    issueRows.reduce<Record<string, IssueSummary>>((acc, issue) => {
      const label = issue.message || issue.userTitle || issue.errorCode || issue.severity;
      const key = `${issue.severity}:${label}`;
      acc[key] = {
        batchId: acc[key]?.batchId ?? issue.batchId,
        label,
        count: (acc[key]?.count ?? 0) + 1,
        errorCode: acc[key]?.errorCode ?? issue.errorCode,
        severity: issue.severity,
      };
      return acc;
    }, {}),
  ).sort((left, right) => right.count - left.count);
}

function fallbackIssuesFromBatch(batch: BackendBatchSummary): Array<Pick<ValidationErrorItem, 'batchId' | 'errorCode' | 'message' | 'severity' | 'userTitle'>> {
  return [
    ...Array.from({ length: batch.errorCount }, () => ({ batchId: batch.id, errorCode: 'ERROR', message: 'Error 검증 항목', severity: 'ERROR' as const, userTitle: 'Error' })),
    ...Array.from({ length: batch.warningCount }, () => ({ batchId: batch.id, errorCode: 'WARNING', message: 'Warning 검증 항목', severity: 'WARNING' as const, userTitle: 'Warning' })),
    ...Array.from({ length: batch.infoCount }, () => ({ batchId: batch.id, errorCode: 'INFO', message: 'Info 검증 항목', severity: 'INFO' as const, userTitle: 'Info' })),
  ];
}

function getLatestOperatingDate(batches: BackendBatchSummary[]) {
  const uploadedDates = batches
    .map((batch) => batch.uploadedAt.slice(0, 10))
    .filter(Boolean)
    .sort();

  return uploadedDates[uploadedDates.length - 1] ?? '';
}

function filterBatchesByPeriod(batches: BackendBatchSummary[], period: PeriodFilter, latestOperatingDate: string) {
  if (period === 'ALL' || !latestOperatingDate) {
    return batches;
  }

  if (period === 'TODAY') {
    return batches.filter((batch) => batch.uploadedAt.startsWith(latestOperatingDate));
  }

  const latestTime = new Date(`${latestOperatingDate}T00:00:00`).getTime();
  const fromTime = latestTime - 6 * 24 * 60 * 60 * 1000;
  return batches.filter((batch) => {
    const uploadedTime = new Date(`${batch.uploadedAt.slice(0, 10)}T00:00:00`).getTime();
    return uploadedTime >= fromTime && uploadedTime <= latestTime;
  });
}

function dashboardScopeText(period: PeriodFilter, latestOperatingDate: string) {
  const label = period === 'TODAY' ? '최근 업로드일' : period === '7DAYS' ? '최근 7일' : '전체';
  return `${label}${latestOperatingDate ? ` 기준 ${latestOperatingDate}` : ''} 배치와 확정 가능 배치를 먼저 확인합니다.`;
}

function firstErrorLink(issueBatches: BackendBatchSummary[]) {
  const batch = issueBatches[0];
  if (!batch) {
    return '/batches';
  }

  const severity = batch.errorCount > 0 ? 'ERROR' : batch.warningCount > 0 ? 'WARNING' : 'INFO';
  return `/batches/${batch.id}/validation?severity=${severity}`;
}

function dueDateVolumeLink(row: DueDateSummaryRow) {
  if (row.errorBatchId) {
    return `/batches/${row.errorBatchId}/validation?severity=ERROR`;
  }
  return `/orders?dueDateFrom=${row.dueDate}&dueDateTo=${row.dueDate}`;
}

function validationIssueLink(issue: IssueSummary) {
  if (!issue.batchId) {
    return '/batches';
  }

  const searchParams = new URLSearchParams({ severity: issue.severity });
  if (issue.errorCode && !['ERROR', 'WARNING', 'INFO'].includes(issue.errorCode)) {
    searchParams.set('errorCode', issue.errorCode);
  }
  return `/batches/${issue.batchId}/validation?${searchParams.toString()}`;
}

function formatApiError(error: unknown) {
  if (error instanceof OmsApiError) {
    const code = error.response.error?.code;
    return code ? `${code}: ${error.message}` : error.message;
  }

  return error instanceof Error ? error.message : '대시보드 데이터를 불러오지 못했습니다.';
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
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function dedupeClientsByName(clients: ClientSummary[]) {
  const seen = new Set<string>();
  return clients.filter((client) => {
    const key = client.name.replace(/\s+/g, '').toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function uniqueDefinedValues(values: Array<number | string | null | undefined>) {
  return [...new Set(values.filter((value): value is number | string => value !== null && value !== undefined && String(value).trim() !== ''))];
}

function toNumber(value?: number | string | null) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function isIsoDate(value?: string | null) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function formatCompactDate(value: string) {
  if (!isIsoDate(value)) return value;
  return value.slice(5).replace('-', '/');
}

function formatWeekday(value: string) {
  if (!isIsoDate(value)) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(date);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

function monthKeyFromDateString(date: string) {
  return date.slice(0, 7);
}

function shiftMonth(month: string, delta: number) {
  const [year, monthIndex] = parseMonthKey(month);
  return monthKey(new Date(year, monthIndex - 1 + delta, 1));
}

function formatMonthLabel(month: string) {
  const [year, monthIndex] = parseMonthKey(month);
  return `${year}년 ${monthIndex}월`;
}

function createMonthCalendarCells(month: string) {
  const [year, monthIndex] = parseMonthKey(month);
  const firstDate = new Date(year, monthIndex - 1, 1);
  const lastDate = new Date(year, monthIndex, 0);
  const cells: Array<{ date: string | null; dayLabel: string; key: string }> = [];

  for (let i = 0; i < firstDate.getDay(); i += 1) {
    cells.push({ date: null, dayLabel: '', key: `blank-start-${i}` });
  }

  for (let day = 1; day <= lastDate.getDate(); day += 1) {
    const date = `${year}-${pad2(monthIndex)}-${pad2(day)}`;
    cells.push({ date, dayLabel: String(day), key: date });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ date: null, dayLabel: '', key: `blank-end-${cells.length}` });
  }

  return cells;
}

function parseMonthKey(month: string): [number, number] {
  const [year, monthIndex] = month.split('-').map(Number);
  const fallback = new Date();
  return [
    Number.isFinite(year) ? year : fallback.getFullYear(),
    Number.isFinite(monthIndex) && monthIndex >= 1 && monthIndex <= 12 ? monthIndex : fallback.getMonth() + 1,
  ];
}

function pad2(value: number) {
  return String(value).padStart(2, '0');
}
