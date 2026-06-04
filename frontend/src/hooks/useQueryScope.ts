import { fakeCurrentUser } from '../app/auth';
import { useClientScope } from '../app/clientContext';
import type { UserScopeType } from '../types/auth';

export interface QueryScopeState {
  tenantId: number | null;
  clientId?: number;
  clientName?: string;
  userScopeType: UserScopeType | null;
  canQuery: boolean;
  needsClientSelection: boolean;
  isClientLocked: boolean;
  blockedReason?: string;
}

export function useQueryScope(): QueryScopeState {
  const clientScope = useClientScope();
  const userScopeType = fakeCurrentUser.userScopeType;
  const tenantId = fakeCurrentUser.tenantId ?? null;

  if (userScopeType === 'SYSTEM') {
    return {
      tenantId,
      userScopeType,
      canQuery: false,
      needsClientSelection: false,
      isClientLocked: false,
      blockedReason: 'SYSTEM 사용자의 tenant 선택 정책은 확인 필요입니다.',
    };
  }

  if (userScopeType === 'CLIENT') {
    const clientId = fakeCurrentUser.clientId ?? clientScope.clientId;
    return {
      tenantId,
      clientId,
      clientName: fakeCurrentUser.clientName ?? clientScope.clientName,
      userScopeType,
      canQuery: Boolean(tenantId && clientId),
      needsClientSelection: false,
      isClientLocked: true,
      blockedReason: tenantId && clientId ? undefined : '고객사 계정의 소속 정보를 확인할 수 없습니다.',
    };
  }

  if (userScopeType === 'TENANT') {
    return {
      tenantId,
      clientId: clientScope.clientId,
      clientName: clientScope.clientName,
      userScopeType,
      canQuery: Boolean(tenantId && !clientScope.isClientUnselected),
      needsClientSelection: Boolean(tenantId && clientScope.isClientUnselected),
      isClientLocked: false,
      blockedReason: tenantId ? undefined : '물류사 계정 정보를 확인할 수 없습니다.',
    };
  }

  return {
    tenantId,
    userScopeType,
    canQuery: false,
    needsClientSelection: false,
    isClientLocked: false,
    blockedReason: '로그인 사용자 정보를 확인할 수 없습니다.',
  };
}
