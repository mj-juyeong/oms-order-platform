import type { UserRole, UserScopeType } from '../types/auth';

export type NavigationIconName =
  | 'dashboard'
  | 'upload'
  | 'batch'
  | 'orders'
  | 'scan'
  | 'pl'
  | 'label'
  | 'download'
  | 'externalApi'
  | 'productMaster'
  | 'storeRouteMaster'
  | 'users'
  | 'audit';

export interface NavigationItem {
  label: string;
  path: string;
  group: 'dashboard' | 'upload' | 'data' | 'external' | 'master' | 'admin' | 'audit';
  icon: NavigationIconName;
  description: string;
  badgeKey?: 'incompleteBatches' | 'pendingConfirmationRequests' | 'needsMoreInfoBatches' | 'rejectedConfirmationRequests' | 'validationErrorBatches';
  matchPaths?: string[];
  roles?: UserRole[];
  scopes?: UserScopeType[];
}

export const navigationItems: NavigationItem[] = [
  { label: '대시보드', path: '/dashboard', group: 'dashboard', icon: 'dashboard', description: '운영 현황' },
  {
    label: 'OIS 업로드',
    path: '/uploads',
    group: 'upload',
    icon: 'upload',
    description: '파일 업로드',
    roles: ['OPERATOR', 'ADMIN'],
    scopes: ['TENANT', 'CLIENT'],
  },
  {
    label: '배치 목록',
    path: '/batches',
    group: 'upload',
    icon: 'batch',
    description: '상태 및 검증 결과',
    badgeKey: 'incompleteBatches',
    matchPaths: ['/batches/'],
    roles: ['VIEWER', 'OPERATOR', 'ADMIN'],
    scopes: ['TENANT', 'CLIENT'],
  },
  {
    label: '배치 확정 요청',
    path: '/batch-confirmation-requests',
    badgeKey: 'pendingConfirmationRequests',
    group: 'upload',
    icon: 'batch',
    description: '물류사 검토 대기',
    roles: ['OPERATOR', 'ADMIN'],
    scopes: ['TENANT'],
  },
  {
    label: '주문 조회',
    path: '/orders',
    group: 'data',
    icon: 'orders',
    description: 'PL 기준 주문 요약',
    roles: ['VIEWER', 'OPERATOR', 'ADMIN'],
    scopes: ['TENANT', 'CLIENT'],
  },
  {
    label: 'Scan 조회',
    path: '/scan-lines',
    group: 'data',
    icon: 'scan',
    description: 'Scan 업로드 데이터',
    roles: ['VIEWER', 'OPERATOR', 'ADMIN'],
    scopes: ['TENANT', 'CLIENT'],
  },
  {
    label: 'PL 조회',
    path: '/pl-lines',
    group: 'data',
    icon: 'pl',
    description: '피킹 리스트',
    roles: ['VIEWER', 'OPERATOR', 'ADMIN'],
    scopes: ['TENANT', 'CLIENT'],
  },
  {
    label: 'Label 조회/다운로드',
    path: '/label-lines',
    group: 'data',
    icon: 'label',
    description: '라벨 데이터',
    matchPaths: ['/downloads/labels'],
    roles: ['VIEWER', 'OPERATOR', 'ADMIN'],
    scopes: ['TENANT', 'CLIENT'],
  },
  {
    label: 'API 사용 안내',
    path: '/external-api/guide',
    group: 'external',
    icon: 'externalApi',
    description: '엔드포인트와 호출 예시',
    roles: ['VIEWER', 'OPERATOR', 'ADMIN'],
    scopes: ['TENANT'],
  },
  {
    label: 'API Key 요청',
    path: '/external-api/api-keys',
    group: 'external',
    icon: 'externalApi',
    description: 'tenant-wide Key 요청 현황',
    roles: ['OPERATOR'],
    scopes: ['TENANT'],
  },
  {
    label: 'API Key 관리',
    path: '/external-api/api-keys',
    group: 'external',
    icon: 'externalApi',
    description: 'Key 승인과 만료 관리',
    roles: ['ADMIN'],
    scopes: ['TENANT'],
  },
  {
    label: 'API 제공 현황',
    path: '/external-api/status',
    group: 'external',
    icon: 'externalApi',
    description: 'WOS/PL 제공 상태',
    roles: ['ADMIN'],
    scopes: ['TENANT'],
  },
  {
    label: '상품 마스터',
    path: '/masters/products',
    group: 'master',
    icon: 'productMaster',
    description: 'CSV 업로드',
    roles: ['VIEWER', 'OPERATOR', 'ADMIN'],
    scopes: ['TENANT'],
  },
  {
    label: '배송지/차량 마스터',
    path: '/masters/store-routes',
    group: 'master',
    icon: 'storeRouteMaster',
    description: 'XLSX 업로드',
    roles: ['VIEWER', 'OPERATOR', 'ADMIN'],
    scopes: ['TENANT'],
  },
  {
    label: '고객사 공개 마스터',
    path: '/client-masters',
    group: 'master',
    icon: 'productMaster',
    description: '공개 범위 조회',
    roles: ['VIEWER', 'OPERATOR', 'ADMIN'],
    scopes: ['TENANT', 'CLIENT'],
  },
  {
    label: '고객사별 마스터 공개 설정',
    path: '/masters/client-visibility',
    group: 'master',
    icon: 'storeRouteMaster',
    description: '고객사별 공개 범위',
    roles: ['ADMIN'],
    scopes: ['TENANT'],
  },
  {
    label: '물류사 관리',
    path: '/tenants',
    group: 'admin',
    icon: 'users',
    description: '물류사 생성과 상태',
    roles: ['SYSTEM_ADMIN'],
    scopes: ['SYSTEM'],
  },
  {
    label: '고객사 관리',
    path: '/clients',
    group: 'admin',
    icon: 'users',
    description: '고객사 생성과 상태',
    roles: ['ADMIN', 'SYSTEM_ADMIN'],
    scopes: ['SYSTEM', 'TENANT'],
  },
  {
    label: '사용자 관리',
    path: '/users',
    group: 'admin',
    icon: 'users',
    description: '계정과 권한 관리',
    roles: ['ADMIN', 'SYSTEM_ADMIN'],
    scopes: ['SYSTEM', 'TENANT'],
  },
  {
    label: '이력/로그',
    path: '/audit',
    group: 'audit',
    icon: 'audit',
    description: '감사와 API 이력',
    roles: ['ADMIN'],
    scopes: ['TENANT'],
  },
];

export const navigationGroups: Record<NavigationItem['group'], string> = {
  dashboard: '현황',
  upload: '업로드/배치',
  data: '데이터 조회/다운로드',
  external: '외부 연동',
  master: '마스터 데이터',
  admin: '관리',
  audit: '이력/로그',
};
