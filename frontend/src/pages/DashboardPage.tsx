import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { OmsApiError } from '../api/client';
import { omsApi, type BackendBatchSummary, type ClientSummary, type ValidationErrorItem } from '../api/oms';
import { fakeCurrentUser } from '../app/auth';
import { clientSelectionFromValue, clientSelectionValue, saveClientContextSelection, useClientScope } from '../app/clientContext';
import { Badge, Button, Card, Select } from '../components/common';
import { FilterBar } from '../components/data';
import { BatchStatusBadge } from '../components/domain';
import type { ValidationSeverity } from '../types/validation';

type PeriodFilter = 'TODAY' | '7DAYS' | 'ALL';

interface IssueSummary {
  label: string;
  count: number;
  severity: ValidationSeverity;
}

const dashboardBatchPageSize = 100;
const issueBatchLimit = 8;

export function DashboardPage() {
  if (fakeCurrentUser.userScopeType === 'SYSTEM') {
    return <PlatformAdminDashboard />;
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
    <div className="space-y-6">
      {errorMessage ? <DashboardError message={errorMessage} onRetry={() => setReloadSeq((current) => current + 1)} /> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PlatformMetric loading={loading} label="전체 물류사" value={tenants.length} />
        <PlatformMetric loading={loading} label="활성 물류사" tone="green" value={activeTenants.length} />
        <PlatformMetric loading={loading} label="고객사" tone="blue" value={clientCount} />
        <PlatformMetric loading={loading} label="사용자" tone="slate" value={userCount} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <Card className="p-5">
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

        <Card className="p-5">
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
              .then((page) => page.items)
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
    <div className="space-y-6">
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

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.2fr)_minmax(420px,1fr)]">
        <Card className="p-5">
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
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-600 sm:grid-cols-4">
              <LegendDot color="bg-blue-900" label="확정 대기" value={summary.readyBatches.length} />
              <LegendDot color="bg-emerald-500" label="확정 완료" value={summary.confirmedBatches.length} />
              <LegendDot color="bg-red-500" label="Error" value={summary.blockedBatches.length} />
              <LegendDot color="bg-amber-400" label="Warning" value={summary.warningOnlyBatches.length} />
            </div>
          </div>
        </Card>

        <Card className="p-5">
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
            <SeverityBar label="Info" severityTotals={summary.severityTotals} tone="blue" value={summary.severityTotals.INFO} />
          </div>

          <div className="mt-7 rounded-md border border-red-100 bg-red-50 px-4 py-4">
            <p className="text-sm font-semibold text-red-800">확정 차단 기준</p>
            <p className="mt-1 text-xs leading-5 text-red-700">Error가 1건 이상 있으면 배치를 확정할 수 없습니다. Warning은 운영 확인 후 확정 가능합니다.</p>
          </div>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,1fr)]">
        <Card className="p-5">
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

        <Card className="p-5">
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
                  <IssueBar count={issue.count} key={`${issue.severity}-${issue.label}`} label={issue.label} max={maxIssueCount} severity={issue.severity} />
                ))
            ) : (
              <DashboardEmpty message="표시할 검증 이슈가 없습니다." />
            )}
          </div>
        </Card>
      </section>

      <Card className="p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950">외부 제공 준비 상태</h2>
            <p className="mt-1 text-xs text-slate-500">확정 완료 배치만 외부 API 응답과 라벨 다운로드 대상입니다.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 lg:w-[560px]">
            <ExternalStatusTile label="API 제공 가능" tone="green" value={summary.confirmedBatches.length} />
            <ExternalStatusTile label="라벨 가능" tone="green" value={summary.confirmedBatches.length} />
            <ExternalStatusTile label="제외" tone="amber" value={summary.externalExcludedBatches.length} />
          </div>
        </div>
      </Card>
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
    green: 'border-emerald-100 bg-emerald-50 text-emerald-900',
    blue: 'border-blue-100 bg-blue-50 text-blue-900',
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
    default: 'bg-blue-50 text-blue-800',
    navy: 'bg-blue-900 text-white',
    green: 'bg-emerald-50 text-emerald-800',
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
    { label: '확정 대기', value: summary.readyBatches.length, className: 'bg-blue-900 text-white' },
    { label: '확정 완료', value: summary.confirmedBatches.length, className: 'bg-emerald-500 text-white' },
    { label: 'Error', value: summary.blockedBatches.length, className: 'bg-red-500 text-white' },
    { label: 'Warning', value: summary.warningOnlyBatches.length, className: 'bg-amber-400 text-amber-950' },
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
  tone: 'red' | 'amber' | 'blue';
  value: number;
}) {
  const total = Math.max(severityTotals.ERROR + severityTotals.WARNING + severityTotals.INFO, 1);
  const colors = {
    red: 'bg-red-600 text-red-700 border-red-100',
    amber: 'bg-amber-500 text-amber-800 border-amber-100',
    blue: 'bg-blue-500 text-blue-700 border-blue-100',
  };
  const [barColor, textColor, borderColor] = colors[tone].split(' ');
  const width = Math.max((value / total) * 100, value > 0 ? 10 : 0);

  return (
    <div className={`rounded-lg border ${borderColor} bg-white px-3 py-3 shadow-sm`}>
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

function IssueBar({ count, label, max, severity }: { count: number; label: string; max: number; severity: ValidationSeverity }) {
  const color = severity === 'ERROR' ? 'bg-red-600 text-red-700 border-red-100' : severity === 'WARNING' ? 'bg-amber-500 text-amber-800 border-amber-100' : 'bg-blue-500 text-blue-700 border-blue-100';
  const [barColor, textColor, borderColor] = color.split(' ');

  return (
    <div className={`rounded-lg border ${borderColor} bg-white px-3 py-3 shadow-sm`}>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="truncate font-semibold text-slate-800">{label}</span>
        <span className={`shrink-0 whitespace-nowrap font-mono text-sm font-bold ${textColor}`}>{count.toLocaleString()}건</span>
      </div>
      <div className="relative h-5 overflow-hidden rounded-md bg-slate-100 ring-1 ring-inset ring-slate-200">
        <div
          className={`${barColor} dashboard-chart-enter h-full origin-left rounded-md shadow-sm`}
          style={{ width: `${Math.max((count / max) * 100, 14)}%` }}
        />
      </div>
    </div>
  );
}

function PriorityBatchCard({ batch }: { batch: BackendBatchSummary }) {
  const hasError = batch.errorCount > 0;

  return (
    <div className={`rounded-lg border bg-white px-4 py-4 shadow-sm ${hasError ? 'border-red-200 border-l-4 border-l-red-500' : 'border-blue-100 border-l-4 border-l-blue-800'}`}>
      <div className="flex items-center justify-between gap-3">
        <Link className="font-mono text-sm font-bold text-slate-950 hover:text-teal-700" to={`/batches/${batch.id}`}>
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
          className="ml-auto text-xs font-semibold text-teal-700 hover:underline"
          to={hasError ? `/batches/${batch.id}/validation?severity=ERROR` : `/batches/${batch.id}`}
        >
          {hasError ? '오류 확인' : '확정 검토'}
        </Link>
      </div>
    </div>
  );
}

function ExternalStatusTile({ label, tone, value }: { label: string; tone: 'green' | 'amber'; value: number }) {
  const toneClasses = tone === 'green' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900';

  return (
    <div className={`rounded-lg border px-4 py-3 ${toneClasses}`}>
      <p className="text-xs font-semibold opacity-80">{label}</p>
      <p className="mt-2 font-mono text-2xl font-bold">{value.toLocaleString()}</p>
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
        label,
        count: (acc[key]?.count ?? 0) + 1,
        severity: issue.severity,
      };
      return acc;
    }, {}),
  ).sort((left, right) => right.count - left.count);
}

function fallbackIssuesFromBatch(batch: BackendBatchSummary): Array<Pick<ValidationErrorItem, 'errorCode' | 'message' | 'severity' | 'userTitle'>> {
  return [
    ...Array.from({ length: batch.errorCount }, () => ({ errorCode: 'ERROR', message: 'Error 검증 항목', severity: 'ERROR' as const, userTitle: 'Error' })),
    ...Array.from({ length: batch.warningCount }, () => ({ errorCode: 'WARNING', message: 'Warning 검증 항목', severity: 'WARNING' as const, userTitle: 'Warning' })),
    ...Array.from({ length: batch.infoCount }, () => ({ errorCode: 'INFO', message: 'Info 검증 항목', severity: 'INFO' as const, userTitle: 'Info' })),
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

function firstErrorLink(blockedBatches: BackendBatchSummary[]) {
  return blockedBatches[0] ? `/batches/${blockedBatches[0].id}/validation?severity=ERROR` : '/batches';
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
