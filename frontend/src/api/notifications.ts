import { apiData, buildQuery } from './client';
import { endpoints } from './endpoints';
import type { PageResponse } from '../types/api';
import type { NotificationEventType, NotificationItem, NotificationReadStatus, NotificationSeverity, NotificationUnreadCount, WorkItemSummary } from '../types/notification';

export const notificationsApi = {
  list: (params: {
    tenantId?: number;
    clientId?: number;
    severity?: NotificationSeverity;
    eventType?: NotificationEventType;
    readStatus?: NotificationReadStatus;
    page?: number;
    size?: number;
  }) => apiData<PageResponse<NotificationItem>>(`${endpoints.notifications.list}${buildQuery(params)}`),
  unreadCount: (params: { tenantId?: number; clientId?: number }) =>
    apiData<NotificationUnreadCount>(`${endpoints.notifications.unreadCount}${buildQuery(params)}`),
  markRead: (notificationId: number, params: { tenantId?: number; clientId?: number }) =>
    apiData<NotificationItem>(`${endpoints.notifications.markRead(notificationId)}${buildQuery(params)}`, { method: 'POST' }),
  markAllRead: (params: { tenantId?: number; clientId?: number }, body?: { severity?: NotificationSeverity; eventType?: NotificationEventType }) =>
    apiData<NotificationUnreadCount>(`${endpoints.notifications.markAllRead}${buildQuery(params)}`, { method: 'POST', body }),
};

export const workItemsApi = {
  summary: (params: { tenantId?: number; clientId?: number }) =>
    apiData<WorkItemSummary>(`${endpoints.workItems.summary}${buildQuery(params)}`),
};
