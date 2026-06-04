export const NOTIFICATIONS_CHANGED_EVENT = 'oms:notifications-changed';

export function dispatchNotificationsChanged() {
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT));
}

export function subscribeNotificationsChanged(handler: () => void) {
  window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, handler);
  return () => window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, handler);
}
