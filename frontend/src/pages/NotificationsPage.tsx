import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OmsApiError } from '../api/client';
import { omsApi } from '../api/oms';
import { fakeCurrentUser } from '../app/auth';
import { dispatchNotificationsChanged } from '../app/notificationEvents';
import { Badge, Button, Card, Select } from '../components/common';
import { Pagination } from '../components/data';
import type { PageResponse } from '../types/api';
import type { NotificationItem, NotificationReadStatus, NotificationSeverity, WorkItemSummary } from '../types/notification';

const readStatusOptions: Array<{ label: string; value: NotificationReadStatus }> = [
  { label: '읽지 않음', value: 'UNREAD' },
  { label: '전체', value: 'ALL' },
  { label: '읽음', value: 'READ' },
];

const severityOptions: Array<{ label: string; value: 'ALL' | NotificationSeverity }> = [
  { label: '전체 등급', value: 'ALL' },
  { label: 'Error', value: 'ERROR' },
  { label: 'Warning', value: 'WARNING' },
  { label: 'Info', value: 'INFO' },
];

export function NotificationsPage() {
  const navigate = useNavigate();
  const [readStatus, setReadStatus] = useState<NotificationReadStatus>('UNREAD');
  const [severity, setSeverity] = useState<'ALL' | NotificationSeverity>('ALL');
  const [page, setPage] = useState(1);
  const [response, setResponse] = useState<PageResponse<NotificationItem> | null>(null);
  const [workItemSummary, setWorkItemSummary] = useState<WorkItemSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const params = useMemo(() => notificationParams(), []);

  useEffect(() => {
    if (!params) {
      setLoading(false);
      setErrorMessage('알림을 조회할 tenant 정보가 없습니다.');
      return;
    }

    const currentParams = params;
    let ignore = false;
    async function load() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const [result, summary] = await Promise.all([
          omsApi.notifications.list({
            ...currentParams,
            readStatus,
            severity: severity === 'ALL' ? undefined : severity,
            page: page - 1,
            size: 20,
          }),
          omsApi.workItems.summary(currentParams),
        ]);
        if (!ignore) {
          setResponse(result);
          setWorkItemSummary(summary);
        }
      } catch (error) {
        if (!ignore) setErrorMessage(formatError(error));
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [page, params, readStatus, severity]);

  async function openNotification(item: NotificationItem) {
    if (!params) return;
    if (!item.readAt) {
      try {
        await omsApi.notifications.markRead(item.id, params);
        const readAt = new Date().toISOString();
        setResponse((current) => {
          if (!current) return current;
          const items = current.items
            .map((notification) => (notification.id === item.id ? { ...notification, readAt } : notification))
            .filter((notification) => readStatus !== 'UNREAD' || notification.id !== item.id);
          return {
            ...current,
            items,
            totalElements: readStatus === 'UNREAD' ? Math.max(0, current.totalElements - 1) : current.totalElements,
          };
        });
        dispatchNotificationsChanged();
      } catch {
        // The target screen is still the most useful next step.
      }
    }
    if (item.linkPath) {
      navigate(item.linkPath);
    }
  }

  async function markAllRead() {
    if (!params) return;
    try {
      await omsApi.notifications.markAllRead(params, {
        severity: severity === 'ALL' ? undefined : severity,
      });
      setPage(1);
      const result = await omsApi.notifications.list({
        ...params,
        readStatus,
        severity: severity === 'ALL' ? undefined : severity,
        page: 0,
        size: 20,
      });
      setResponse(result);
      dispatchNotificationsChanged();
    } catch (error) {
      setErrorMessage(formatError(error));
    }
  }

  const items = response?.items ?? [];

  return (
    <div className="space-y-5">
      {workItemSummary ? <WorkItemSummaryCards onNavigate={navigate} summary={workItemSummary} /> : null}

      <Card className="p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="읽음 상태"
              onChange={(event) => {
                setPage(1);
                setReadStatus(event.target.value as NotificationReadStatus);
              }}
              options={readStatusOptions}
              value={readStatus}
            />
            <Select
              label="등급"
              onChange={(event) => {
                setPage(1);
                setSeverity(event.target.value as 'ALL' | NotificationSeverity);
              }}
              options={severityOptions}
              value={severity}
            />
          </div>
          <Button disabled={loading || items.length === 0} onClick={markAllRead} variant="secondary">
            현재 조건 모두 읽음
          </Button>
        </div>
      </Card>

      {errorMessage ? (
        <Card className="border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-semibold text-red-700">{errorMessage}</p>
        </Card>
      ) : null}

      <Card className="p-0">
        {loading ? <p className="px-5 py-12 text-center text-sm text-slate-500">알림을 불러오는 중입니다.</p> : null}
        {!loading && items.length === 0 ? <p className="px-5 py-12 text-center text-sm text-slate-500">조건에 맞는 알림이 없습니다.</p> : null}
        {!loading && items.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <button className="block w-full px-5 py-4 text-left transition hover:bg-slate-50" key={item.id} onClick={() => openNotification(item)} type="button">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={item.severity} />
                      {!item.readAt ? <Badge tone="teal">미확인</Badge> : <Badge>읽음</Badge>}
                      <span className="text-xs text-slate-500">{eventTypeLabel(item.eventType)}</span>
                    </div>
                    <p className="mt-2 text-sm font-bold text-slate-950">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{item.message}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-500">{formatDateTime(item.occurredAt)}</span>
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </Card>

      <Pagination
        onPageChange={setPage}
        page={(response?.page ?? page - 1) + 1}
        total={response?.totalElements ?? items.length}
        totalPages={Math.max(1, response?.totalPages ?? 1)}
      />
    </div>
  );
}

function SeverityBadge({ severity }: { severity: NotificationSeverity }) {
  if (severity === 'ERROR') return <Badge tone="red">Error</Badge>;
  if (severity === 'WARNING') return <Badge tone="amber">Warning</Badge>;
  return <Badge tone="teal">Info</Badge>;
}

function WorkItemSummaryCards({ onNavigate, summary }: { onNavigate: (path: string) => void; summary: WorkItemSummary }) {
  const items = [
    {
      label: '미완료 배치',
      value: summary.incompleteBatches,
      tone: 'amber' as const,
      path: '/batches',
      description: '검증, 확정, 보완 등 처리가 남은 배치',
    },
    {
      label: '확정 요청 대기',
      value: summary.pendingConfirmationRequests,
      tone: 'teal' as const,
      path: '/batch-confirmation-requests',
      description: '물류사 검토가 필요한 확정 요청',
    },
    {
      label: 'API Key 요청',
      value: summary.pendingApiKeyRequests,
      tone: 'teal' as const,
      path: '/external-api/api-keys?tab=requests',
      description: '관리자 승인과 발급 처리가 필요한 API Key 요청',
    },
    {
      label: '보완 요청',
      value: summary.needsMoreInfoBatches,
      tone: 'amber' as const,
      path: '/batches',
      description: '고객사 보완본 업로드가 필요한 배치',
    },
    {
      label: '검증 실패',
      value: summary.validationErrorBatches,
      tone: 'red' as const,
      path: '/batches',
      description: 'Error 확인이나 재검증이 필요한 배치',
    },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {items.map((item) => (
        <button
          className="rounded-md border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-teal-300 hover:bg-teal-50/40"
          key={item.label}
          onClick={() => onNavigate(item.path)}
          type="button"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-bold text-slate-950">{item.label}</span>
            <Badge tone={item.tone}>{item.value.toLocaleString()}</Badge>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">{item.description}</p>
        </button>
      ))}
    </div>
  );
}

function notificationParams() {
  const tenantId = fakeCurrentUser.tenantId ?? undefined;
  if (!tenantId) return null;
  return {
    tenantId,
    clientId: fakeCurrentUser.userScopeType === 'CLIENT' ? fakeCurrentUser.clientId ?? undefined : undefined,
  };
}

function eventTypeLabel(value: string) {
  const labels: Record<string, string> = {
    BATCH_CONFIRMATION_REQUESTED: '확정 요청',
    BATCH_CONFIRMATION_APPROVED: '승인',
    BATCH_CONFIRMATION_NEEDS_MORE_INFO: '보완 요청',
    BATCH_CONFIRMATION_REJECTED: '반려',
    API_KEY_REQUESTED: 'API Key 요청',
    API_KEY_ISSUED: 'API Key 발급',
    API_KEY_REJECTED: 'API Key 반려',
  };
  return labels[value] ?? value;
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

function formatError(error: unknown) {
  if (error instanceof OmsApiError) return error.message;
  if (error instanceof Error) return error.message;
  return '알림을 불러오지 못했습니다.';
}
