import { Bell, Check, ExternalLink } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OmsApiError } from '../../api/client';
import { omsApi } from '../../api/oms';
import { fakeCurrentUser } from '../../app/auth';
import { Badge, Button } from '../common';
import type { NotificationItem, NotificationSeverity, WorkItemSummary } from '../../types/notification';

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [workItemSummary, setWorkItemSummary] = useState<WorkItemSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const params = useMemo(() => notificationParams(), []);

  useEffect(() => {
    if (!params) {
      return;
    }

    const requestParams = params;
    let ignore = false;
    async function load() {
      try {
        const [countResult, listResult, summaryResult] = await Promise.all([
          omsApi.notifications.unreadCount(requestParams),
          omsApi.notifications.list({ ...requestParams, readStatus: 'UNREAD', page: 0, size: 10 }),
          omsApi.workItems.summary(requestParams),
        ]);
        if (!ignore) {
          setUnreadCount(countResult.unreadCount);
          setItems(listResult.items);
          setWorkItemSummary(summaryResult);
          setErrorMessage(null);
        }
      } catch (error) {
        if (!ignore) setErrorMessage(formatError(error));
      }
    }

    load();
    const intervalId = window.setInterval(load, 20_000);
    return () => {
      ignore = true;
      window.clearInterval(intervalId);
    };
  }, [params]);

  async function reload() {
    if (!params) return;
    setLoading(true);
    try {
      const [countResult, listResult, summaryResult] = await Promise.all([
        omsApi.notifications.unreadCount(params),
        omsApi.notifications.list({ ...params, readStatus: 'UNREAD', page: 0, size: 10 }),
        omsApi.workItems.summary(params),
      ]);
      setUnreadCount(countResult.unreadCount);
      setItems(listResult.items);
      setWorkItemSummary(summaryResult);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(formatError(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleNotificationClick(item: NotificationItem) {
    if (!params) return;
    try {
      await omsApi.notifications.markRead(item.id, params);
      await reload();
    } catch {
      // Navigation is still useful even if read state update fails.
    }
    setOpen(false);
    if (item.linkPath) {
      navigate(item.linkPath);
    }
  }

  async function markAllRead() {
    if (!params || unreadCount === 0) return;
    setLoading(true);
    try {
      const result = await omsApi.notifications.markAllRead(params);
      setUnreadCount(result.unreadCount);
      setItems([]);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(formatError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <button
        aria-label="알림"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold leading-none text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed left-3 right-3 top-[64px] z-50 max-h-[calc(100dvh-5rem)] overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-11 sm:w-[min(360px,calc(100vw-2rem))]">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-slate-950">알림</p>
              <p className="mt-0.5 text-xs text-slate-500">읽지 않은 알림 {unreadCount.toLocaleString()}건</p>
            </div>
            <Button disabled={loading || unreadCount === 0} onClick={markAllRead} size="sm" variant="ghost">
              <Check className="h-3.5 w-3.5" />
              모두 읽음
            </Button>
          </div>

          <div className="max-h-[calc(100dvh-13rem)] overflow-y-auto sm:max-h-[420px]">
            {workItemSummary && workItemSummary.incompleteBatches > 0 ? (
              <button
                className="block w-full border-b border-amber-100 bg-amber-50 px-4 py-3 text-left transition hover:bg-amber-100"
                onClick={() => {
                  setOpen(false);
                  navigate('/batches');
                }}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-slate-950">미완료 배치</span>
                  <Badge tone="amber">{workItemSummary.incompleteBatches.toLocaleString()}</Badge>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-600">검증 또는 확정 처리가 남은 배치가 있습니다.</p>
              </button>
            ) : null}
            {errorMessage ? <p className="px-4 py-4 text-sm font-semibold text-red-600">{errorMessage}</p> : null}
            {!errorMessage && items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">읽지 않은 알림이 없습니다.</p>
            ) : null}
            {items.map((item) => (
              <button
                className="block w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50"
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <SeverityBadge severity={item.severity} />
                  <span className="shrink-0 text-xs text-slate-400">{formatRelativeTime(item.occurredAt)}</span>
                </div>
                <p className="mt-2 text-sm font-bold text-slate-950">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{item.message}</p>
              </button>
            ))}
          </div>

          <button
            className="flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-teal-700 transition hover:bg-teal-50"
            onClick={() => {
              setOpen(false);
              navigate('/notifications');
            }}
            type="button"
          >
            전체 알림 보기
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: NotificationSeverity }) {
  if (severity === 'ERROR') return <Badge tone="red">Error</Badge>;
  if (severity === 'WARNING') return <Badge tone="amber">Warning</Badge>;
  return <Badge tone="teal">Info</Badge>;
}

function notificationParams() {
  const tenantId = fakeCurrentUser.tenantId ?? undefined;
  if (!tenantId) return null;
  return {
    tenantId,
    clientId: fakeCurrentUser.userScopeType === 'CLIENT' ? fakeCurrentUser.clientId ?? undefined : undefined,
  };
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60_000));
  if (diffMinutes < 1) return '방금';
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  if (diffMinutes < 24 * 60) return `${Math.floor(diffMinutes / 60)}시간 전`;
  return new Intl.DateTimeFormat('ko-KR', { month: '2-digit', day: '2-digit' }).format(date);
}

function formatError(error: unknown) {
  if (error instanceof OmsApiError) return error.message;
  if (error instanceof Error) return error.message;
  return '알림을 불러오지 못했습니다.';
}
