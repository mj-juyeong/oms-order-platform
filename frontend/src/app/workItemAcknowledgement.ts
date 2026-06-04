import type { WorkItemSummary } from '../types/notification';

export type WorkItemBadgeKey = keyof Pick<
  WorkItemSummary,
  'incompleteBatches' | 'pendingConfirmationRequests' | 'needsMoreInfoBatches' | 'rejectedConfirmationRequests' | 'validationErrorBatches'
>;

const WORK_ITEM_ACK_CHANGED_EVENT = 'oms:work-item-acknowledgement-changed';
const STORAGE_PREFIX = 'oms.workItemAcknowledged';

export function readAcknowledgedWorkItemCount(userKey: string, badgeKey: WorkItemBadgeKey) {
  const value = Number(localStorage.getItem(storageKey(userKey, badgeKey)));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function acknowledgeWorkItemCount(userKey: string, badgeKey: WorkItemBadgeKey, count: number) {
  const normalizedCount = Math.max(0, Math.floor(count));
  const key = storageKey(userKey, badgeKey);
  const current = readAcknowledgedWorkItemCount(userKey, badgeKey);
  if (current === normalizedCount) {
    return;
  }
  if (normalizedCount === 0) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, String(normalizedCount));
  }
  window.dispatchEvent(new CustomEvent(WORK_ITEM_ACK_CHANGED_EVENT));
}

export function subscribeWorkItemAcknowledgementChanged(handler: () => void) {
  window.addEventListener(WORK_ITEM_ACK_CHANGED_EVENT, handler);
  return () => window.removeEventListener(WORK_ITEM_ACK_CHANGED_EVENT, handler);
}

function storageKey(userKey: string, badgeKey: WorkItemBadgeKey) {
  return `${STORAGE_PREFIX}.${userKey}.${badgeKey}`;
}
