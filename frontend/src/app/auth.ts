import type { CurrentUser, LoginResponse, UserRole, UserScopeType } from '../types/auth';

const AUTH_TOKEN_KEY = 'oms.auth.accessToken';
const AUTH_USER_KEY = 'oms.auth.currentUser';
const AUTH_EXPIRES_AT_KEY = 'oms.auth.expiresAt';
const LEGACY_CLIENT_CONTEXT_KEY = 'oms.clientContext';
const CLIENT_CONTEXT_KEY_PREFIX = 'oms.clientContext';
const CLIENT_CONTEXT_CHANGED_EVENT = 'oms:client-context-changed';

const emptyCurrentUser: CurrentUser = {
  id: null,
  loginId: null,
  name: null,
  userScopeType: null,
  tenantId: null,
  clientId: null,
  roles: [],
};

export const fakeCurrentUser: CurrentUser = {
  ...emptyCurrentUser,
  ...readStoredUser(),
};

export function saveAuthSession(response: LoginResponse) {
  const expiresAt = Date.now() + response.expiresInSeconds * 1000;
  const previousUserKey = authUserContextKey(fakeCurrentUser);
  const nextUserKey = authUserContextKey(response.user);
  localStorage.setItem(AUTH_TOKEN_KEY, response.accessToken);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.user));
  localStorage.setItem(AUTH_EXPIRES_AT_KEY, String(expiresAt));
  setCurrentUser(response.user);
  localStorage.removeItem(LEGACY_CLIENT_CONTEXT_KEY);
  if (previousUserKey !== nextUserKey) {
    localStorage.removeItem(clientContextStorageKey(response.user));
    dispatchClientContextChanged();
  }
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_EXPIRES_AT_KEY);
  setCurrentUser(emptyCurrentUser);
  localStorage.removeItem(LEGACY_CLIENT_CONTEXT_KEY);
  dispatchClientContextChanged();
}

export function getAuthToken() {
  if (!hasAuthenticatedSession()) {
    return null;
  }
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function hasAuthenticatedSession() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const expiresAt = Number(localStorage.getItem(AUTH_EXPIRES_AT_KEY));

  if (!token || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    clearAuthSession();
    return false;
  }

  return true;
}

export function hasAnyRole(userRoles: UserRole[], requiredRoles: UserRole[]) {
  return requiredRoles.some((role) => userRoles.includes(role));
}

export function hasAnyScope(userScopeType: UserScopeType | null | undefined, requiredScopes: UserScopeType[]) {
  return requiredScopes.length === 0 || (userScopeType !== null && userScopeType !== undefined && requiredScopes.includes(userScopeType));
}

export function canOperateBatches(user: CurrentUser = fakeCurrentUser) {
  return user.userScopeType === 'TENANT' && hasAnyRole(user.roles, ['ADMIN', 'OPERATOR']);
}

export function canAdministerBatches(user: CurrentUser = fakeCurrentUser) {
  return user.userScopeType === 'TENANT' && hasAnyRole(user.roles, ['ADMIN']);
}

export function canManageMasters(user: CurrentUser = fakeCurrentUser) {
  return user.userScopeType === 'TENANT' && hasAnyRole(user.roles, ['ADMIN']);
}

export function canManageApiKeys(user: CurrentUser = fakeCurrentUser) {
  return user.userScopeType === 'TENANT' && hasAnyRole(user.roles, ['ADMIN']);
}

export function canManageUsers(user: CurrentUser = fakeCurrentUser) {
  return (
    (user.userScopeType === 'SYSTEM' && hasAnyRole(user.roles, ['SYSTEM_ADMIN'])) ||
    (user.userScopeType === 'TENANT' && hasAnyRole(user.roles, ['ADMIN']))
  );
}

function readStoredUser(): CurrentUser | null {
  try {
    const text = localStorage.getItem(AUTH_USER_KEY);
    return text ? (JSON.parse(text) as CurrentUser) : null;
  } catch {
    return null;
  }
}

function setCurrentUser(user: CurrentUser) {
  Object.assign(fakeCurrentUser, emptyCurrentUser, user);
}

function authUserContextKey(user: CurrentUser) {
  return `${user.userScopeType ?? 'ANONYMOUS'}:${user.tenantId ?? 'none'}:${user.clientId ?? 'all'}:${user.id ?? 'anonymous'}`;
}

function clientContextStorageKey(user: CurrentUser) {
  const scope = user.userScopeType ?? 'ANONYMOUS';
  const tenant = user.tenantId ?? 'none';
  const client = user.clientId ?? 'all';
  const userId = user.id ?? 'anonymous';
  return `${CLIENT_CONTEXT_KEY_PREFIX}.${scope}.${tenant}.${client}.${userId}`;
}

function dispatchClientContextChanged() {
  window.dispatchEvent(new CustomEvent(CLIENT_CONTEXT_CHANGED_EVENT));
}
