import { Bell, Check, ExternalLink, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OmsApiError } from '../../api/client';
import { omsApi } from '../../api/oms';
import { fakeCurrentUser } from '../../app/auth';
import { dispatchNotificationsChanged, subscribeNotificationsChanged } from '../../app/notificationEvents';
import {
  acknowledgeWorkItemCount,
  readAcknowledgedWorkItemCount,
  subscribeWorkItemAcknowledgementChanged,
} from '../../app/workItemAcknowledgement';
import { Badge, Button } from '../common';
import type { NotificationItem, NotificationSeverity, WorkItemSummary } from '../../types/notification';

const NOTIFICATION_TOAST_LIMIT = 3;
const NOTIFICATION_TOAST_DISMISS_MS = 5_000;

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [toastItems, setToastItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [workItemSummary, setWorkItemSummary] = useState<WorkItemSummary | null>(null);
  const [, setAcknowledgementVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const initializedToastIdsRef = useRef(false);
  const seenNotificationIdsRef = useRef<Set<number>>(new Set());
  const toastTimeoutIdsRef = useRef<Map<number, number>>(new Map());
  const params = useMemo(() => notificationParams(), []);
  const userKey = useMemo(() => userAcknowledgementKey(), []);

  const dismissToast = useCallback((notificationId: number) => {
    const timeoutId = toastTimeoutIdsRef.current.get(notificationId);
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      toastTimeoutIdsRef.current.delete(notificationId);
    }
    setToastItems((current) => current.filter((item) => item.id !== notificationId));
  }, []);

  const clearToasts = useCallback(() => {
    toastTimeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    toastTimeoutIdsRef.current.clear();
    setToastItems([]);
  }, []);

  const scheduleToastDismiss = useCallback((notificationId: number) => {
    const existingTimeoutId = toastTimeoutIdsRef.current.get(notificationId);
    if (existingTimeoutId) {
      window.clearTimeout(existingTimeoutId);
    }
    const timeoutId = window.setTimeout(() => dismissToast(notificationId), NOTIFICATION_TOAST_DISMISS_MS);
    toastTimeoutIdsRef.current.set(notificationId, timeoutId);
  }, [dismissToast]);

  const showNotificationToasts = useCallback((notifications: NotificationItem[]) => {
    if (notifications.length === 0) {
      return;
    }

    notifications.forEach((item) => scheduleToastDismiss(item.id));
    setToastItems((current) => {
      const incomingIds = new Set(notifications.map((item) => item.id));
      return [...notifications, ...current.filter((item) => !incomingIds.has(item.id))].slice(0, NOTIFICATION_TOAST_LIMIT);
    });
  }, [scheduleToastDismiss]);

  const reload = useCallback(async () => {
    if (!params) {
      return;
    }

    const [countResult, listResult, summaryResult] = await Promise.all([
      omsApi.notifications.unreadCount(params),
      omsApi.notifications.list({ ...params, readStatus: 'UNREAD', page: 0, size: 10 }),
      omsApi.workItems.summary(params),
    ]);
    setUnreadCount(countResult.unreadCount);
    setItems(listResult.items);
    setWorkItemSummary(summaryResult);
    setErrorMessage(null);

    const seenNotificationIds = seenNotificationIdsRef.current;
    if (!initializedToastIdsRef.current) {
      listResult.items.forEach((item) => seenNotificationIds.add(item.id));
      initializedToastIdsRef.current = true;
      return;
    }

    const newUnreadItems = listResult.items.filter((item) => !seenNotificationIds.has(item.id));
    listResult.items.forEach((item) => seenNotificationIds.add(item.id));
    showNotificationToasts(newUnreadItems);
  }, [params, showNotificationToasts]);

  useEffect(() => () => clearToasts(), [clearToasts]);

  useEffect(() => {
    if (!params) {
      return;
    }

    let ignore = false;
    async function load() {
      try {
        await reload();
      } catch (error) {
        if (!ignore) setErrorMessage(formatError(error));
      }
    }
    load();
    const intervalId = window.setInterval(load, 10_000);
    return () => {
      ignore = true;
      window.clearInterval(intervalId);
    };
  }, [params, reload]);

  useEffect(() => {
    if (!params) return undefined;
    return subscribeNotificationsChanged(() => {
      reload().catch((error) => setErrorMessage(formatError(error)));
    });
  }, [params, reload]);

  useEffect(() => subscribeWorkItemAcknowledgementChanged(() => setAcknowledgementVersion((current) => current + 1)), []);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && !containerRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  async function reloadWithLoading() {
    if (!params) return;
    setLoading(true);
    try {
      await reload();
    } catch (error) {
      setErrorMessage(formatError(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleNotificationClick(item: NotificationItem) {
    if (!params) return;
    if (!item.readAt) {
      setUnreadCount((current) => Math.max(0, current - 1));
      setItems((current) => current.filter((notification) => notification.id !== item.id));
    }
    dismissToast(item.id);
    try {
      await omsApi.notifications.markRead(item.id, params);
      dispatchNotificationsChanged();
    } catch {
      await reloadWithLoading();
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
      clearToasts();
      setErrorMessage(null);
      dispatchNotificationsChanged();
    } catch (error) {
      setErrorMessage(formatError(error));
    } finally {
      setLoading(false);
    }
  }

  const incompleteBatchCount = workItemSummary
    ? Math.max(0, workItemSummary.incompleteBatches - readAcknowledgedWorkItemCount(userKey, 'incompleteBatches'))
    : 0;

  return (
    <>
      <div className="relative" ref={containerRef}>
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
            {workItemSummary && incompleteBatchCount > 0 ? (
              <button
                className="block w-full border-b border-amber-100 bg-amber-50 px-4 py-3 text-left transition hover:bg-amber-100"
                onClick={() => {
                  acknowledgeWorkItemCount(userKey, 'incompleteBatches', workItemSummary.incompleteBatches);
                  setOpen(false);
                  navigate('/batches');
                }}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-slate-950">미완료 배치</span>
                  <Badge tone="amber">{incompleteBatchCount.toLocaleString()}</Badge>
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
      <NotificationToastViewport items={toastItems} onDismiss={dismissToast} onOpen={handleNotificationClick} />
    </>
  );
}

function SeverityBadge({ severity }: { severity: NotificationSeverity }) {
  if (severity === 'ERROR') return <Badge tone="red">Error</Badge>;
  if (severity === 'WARNING') return <Badge tone="amber">Warning</Badge>;
  return <Badge tone="teal">Info</Badge>;
}

function NotificationToastViewport({
  items,
  onDismiss,
  onOpen,
}: {
  items: NotificationItem[];
  onDismiss: (notificationId: number) => void;
  onOpen: (item: NotificationItem) => void;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div aria-live="polite" className="fixed bottom-4 right-4 z-[60] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2 sm:bottom-5 sm:right-5">
      {items.map((item) => (
        <div className={`rounded-md border border-l-4 bg-white shadow-lg ${toastToneClass(item.severity)}`} key={item.id} role="status">
          <div className="flex items-start gap-3 p-3">
            <button className="min-w-0 flex-1 text-left" onClick={() => onOpen(item)} type="button">
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity={item.severity} />
                <span className="text-xs font-semibold text-slate-500">새 알림</span>
              </div>
              <p className="mt-2 line-clamp-1 text-sm font-bold text-slate-950">{item.title}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{item.message}</p>
            </button>
            <button
              aria-label="알림 토스트 닫기"
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              onClick={() => onDismiss(item.id)}
              type="button"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function toastToneClass(severity: NotificationSeverity) {
  if (severity === 'ERROR') return 'border-red-200 border-l-red-600';
  if (severity === 'WARNING') return 'border-amber-200 border-l-amber-500';
  return 'border-teal-200 border-l-teal-500';
}

function notificationParams() {
  const tenantId = fakeCurrentUser.tenantId ?? undefined;
  if (!tenantId) return null;
  return {
    tenantId,
    clientId: fakeCurrentUser.userScopeType === 'CLIENT' ? fakeCurrentUser.clientId ?? undefined : undefined,
  };
}

function userAcknowledgementKey() {
  return [
    fakeCurrentUser.userScopeType ?? 'ANONYMOUS',
    fakeCurrentUser.tenantId ?? 'none',
    fakeCurrentUser.clientId ?? 'all',
    fakeCurrentUser.id ?? 'anonymous',
  ].join(':');
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
