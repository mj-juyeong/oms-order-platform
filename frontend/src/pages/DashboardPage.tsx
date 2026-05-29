import { Link } from 'react-router-dom';
import { Badge, Card, Select } from '../components/common';
import { FilterBar } from '../components/data';
import { BatchStatusBadge } from '../components/domain';
import { mockBatches, mockValidationErrors } from '../api/mock';
import type { UploadBatch } from '../types/batch';
import type { ValidationSeverity } from '../types/validation';

const uploadedDates = mockBatches
  .map((batch) => batch.uploadedAt.slice(0, 10))
  .sort();
const latestOperatingDate = uploadedDates[uploadedDates.length - 1] ?? '';

const todayBatches = mockBatches.filter((batch) => batch.uploadedAt.startsWith(latestOperatingDate));
const totalBatches = Math.max(todayBatches.length, 1);
const readyBatches = todayBatches.filter((batch) => batch.status === 'READY_TO_CONFIRM');
const confirmedBatches = todayBatches.filter((batch) => batch.status === 'CONFIRMED');
const blockedBatches = todayBatches.filter((batch) => batch.errorCount > 0);
const warningOnlyBatches = todayBatches.filter((batch) => batch.warningCount > 0 && batch.errorCount === 0);
const externalExcludedBatches = todayBatches.filter((batch) => batch.status !== 'CONFIRMED');

const severityTotals: Record<ValidationSeverity, number> = {
  ERROR: todayBatches.reduce((sum, batch) => sum + batch.errorCount, 0),
  WARNING: todayBatches.reduce((sum, batch) => sum + batch.warningCount, 0),
  INFO: todayBatches.reduce((sum, batch) => sum + batch.infoCount, 0),
};

const validationIssueSummary = Object.values(
  mockValidationErrors.reduce<Record<string, { label: string; count: number; severity: ValidationSeverity }>>((acc, issue) => {
    const label = issue.message.replace(/입니다\.?$/, '');
    acc[label] = {
      label,
      count: (acc[label]?.count ?? 0) + 1,
      severity: issue.severity,
    };
    return acc;
  }, {}),
).sort((left, right) => right.count - left.count);

const maxIssueCount = Math.max(...validationIssueSummary.map((issue) => issue.count), 1);

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <FilterBar>
        <Select
          label="고객사"
          options={[
            { label: '웰스토리', value: 'wellstory' },
            { label: '전체 고객사', value: 'all' },
          ]}
        />
        <Select
          label="기간"
          options={[
            { label: `오늘 (${latestOperatingDate})`, value: 'today' },
            { label: '최근 7일', value: '7days' },
          ]}
        />
      </FilterBar>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.2fr)_minmax(420px,1fr)]">
        <Card className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-950">오늘 처리 현황</h2>
              <p className="mt-1 text-sm text-slate-600">막힌 배치와 확정 가능 배치를 먼저 확인합니다.</p>
            </div>
            <Badge tone={blockedBatches.length > 0 ? 'red' : 'green'}>
              {blockedBatches.length > 0 ? `Error 배치 ${blockedBatches.length}건` : '확정 차단 없음'}
            </Badge>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <SummaryNumber label="업로드" value={todayBatches.length} />
            <SummaryNumber label="확정 대기" tone="navy" value={readyBatches.length} />
            <SummaryNumber label="확정 완료" tone="green" value={confirmedBatches.length} />
            <SummaryNumber label="외부 제외" tone="slate" value={externalExcludedBatches.length} />
          </div>

          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-700">
              <span>배치 상태 분포</span>
              <span className="font-mono text-slate-900">{todayBatches.length}개 배치</span>
            </div>
            <StackedStatusBar />
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-600 sm:grid-cols-4">
              <LegendDot color="bg-blue-900" label="확정 대기" value={readyBatches.length} />
              <LegendDot color="bg-emerald-500" label="확정 완료" value={confirmedBatches.length} />
              <LegendDot color="bg-red-500" label="Error" value={blockedBatches.length} />
              <LegendDot color="bg-amber-400" label="Warning" value={warningOnlyBatches.length} />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-950">검증 이슈 요약</h2>
              <p className="mt-1 text-sm text-slate-600">Error, Warning, Info 건수를 한눈에 비교합니다.</p>
            </div>
            <Link className="text-sm font-semibold text-teal-700 hover:underline" to="/batches/BATCH-20260528-001/validation?severity=ERROR">
              Error 보기
            </Link>
          </div>

          <div className="mt-7 space-y-6">
            <SeverityBar label="Error" tone="red" value={severityTotals.ERROR} />
            <SeverityBar label="Warning" tone="amber" value={severityTotals.WARNING} />
            <SeverityBar label="Info" tone="blue" value={severityTotals.INFO} />
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
          <div className="grid gap-4 md:grid-cols-2">
            {priorityBatches().map((batch) => (
              <PriorityBatchCard key={batch.id} batch={batch} />
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-bold text-slate-950">오류 유형 TOP 3</h2>
          <div className="mt-6 space-y-6">
            {validationIssueSummary.slice(0, 3).map((issue) => (
              <IssueBar count={issue.count} key={issue.label} label={issue.label} max={maxIssueCount} severity={issue.severity} />
            ))}
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
            <ExternalStatusTile label="API 제공 가능" tone="green" value={confirmedBatches.length} />
            <ExternalStatusTile label="라벨 가능" tone="green" value={confirmedBatches.length} />
            <ExternalStatusTile label="제외" tone="amber" value={externalExcludedBatches.length} />
          </div>
        </div>
      </Card>
    </div>
  );
}

function priorityBatches() {
  return [...blockedBatches, ...readyBatches.filter((batch) => batch.errorCount === 0)].slice(0, 4);
}

function SummaryNumber({ label, tone = 'default', value }: { label: string; tone?: 'default' | 'navy' | 'green' | 'slate'; value: number }) {
  const toneClasses = {
    default: 'bg-blue-50 text-blue-800',
    navy: 'bg-blue-900 text-white',
    green: 'bg-emerald-50 text-emerald-800',
    slate: 'bg-slate-100 text-slate-800',
  };

  return (
    <div className={`rounded-lg border border-white/70 px-5 py-4 shadow-sm ${toneClasses[tone]}`}>
      <p className="text-xs font-semibold opacity-80">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-normal">{value}</p>
    </div>
  );
}

function StackedStatusBar() {
  const segments = [
    { label: '확정 대기', value: readyBatches.length, className: 'bg-blue-900 text-white' },
    { label: '확정 완료', value: confirmedBatches.length, className: 'bg-emerald-500 text-white' },
    { label: 'Error', value: blockedBatches.length, className: 'bg-red-500 text-white' },
    { label: 'Warning', value: warningOnlyBatches.length, className: 'bg-amber-400 text-amber-950' },
  ].filter((segment) => segment.value > 0);

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

function SeverityBar({ label, tone, value }: { label: string; tone: 'red' | 'amber' | 'blue'; value: number }) {
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
        <span className={`font-mono text-sm font-bold ${textColor}`}>{value}건</span>
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
        <span className={`shrink-0 whitespace-nowrap font-mono text-sm font-bold ${textColor}`}>{count}건</span>
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

function PriorityBatchCard({ batch }: { batch: UploadBatch }) {
  const hasError = batch.errorCount > 0;

  return (
    <div className={`rounded-lg border bg-white px-4 py-4 shadow-sm ${hasError ? 'border-red-200 border-l-4 border-l-red-500' : 'border-blue-100 border-l-4 border-l-blue-800'}`}>
      <div className="flex items-center justify-between gap-3">
        <Link className="font-mono text-sm font-bold text-slate-950 hover:text-teal-700" to={`/batches/${batch.id}`}>
          {batch.id}
        </Link>
        <BatchStatusBadge status={batch.status} />
      </div>
      <p className="mt-2 truncate text-sm text-slate-700">{batch.fileName}</p>
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
      <p className="mt-2 font-mono text-2xl font-bold">{value}</p>
    </div>
  );
}

function LegendDot({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span>{label}</span>
      <span className="ml-auto font-mono font-semibold text-slate-900">{value}</span>
    </div>
  );
}
