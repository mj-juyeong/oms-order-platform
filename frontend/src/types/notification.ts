export type NotificationSeverity = 'ERROR' | 'WARNING' | 'INFO';
export type NotificationTargetScope = 'TENANT' | 'CLIENT' | 'USER';
export type NotificationReadStatus = 'UNREAD' | 'READ' | 'ALL';

export type NotificationEventType =
  | 'BATCH_CONFIRMATION_REQUESTED'
  | 'BATCH_CONFIRMATION_APPROVED'
  | 'BATCH_CONFIRMATION_NEEDS_MORE_INFO'
  | 'BATCH_CONFIRMATION_REJECTED';

export interface NotificationItem {
  id: number;
  tenantId: number;
  clientId?: number | null;
  userId?: number | null;
  targetScope: NotificationTargetScope;
  eventType: NotificationEventType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  relatedResourceType?: string | null;
  relatedResourceId?: string | null;
  linkPath?: string | null;
  readAt?: string | null;
  occurredAt: string;
  createdAt?: string | null;
}

export interface NotificationUnreadCount {
  unreadCount: number;
}

export interface WorkItemSummary {
  unreadNotifications: number;
  incompleteBatches: number;
  pendingConfirmationRequests: number;
  needsMoreInfoBatches: number;
  rejectedConfirmationRequests: number;
  validationErrorBatches: number;
}
