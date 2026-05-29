import type { UserRole } from '../types/auth';

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
  | 'audit';

export interface NavigationItem {
  label: string;
  path: string;
  group: 'dashboard' | 'upload' | 'data' | 'download' | 'external' | 'master' | 'audit';
  icon: NavigationIconName;
  description: string;
  matchPaths?: string[];
  roles?: UserRole[];
}

export const navigationItems: NavigationItem[] = [
  { label: '대시보드', path: '/dashboard', group: 'dashboard', icon: 'dashboard', description: '운영 현황' },
  {
    label: 'OIS 엑셀 업로드',
    path: '/uploads',
    group: 'upload',
    icon: 'upload',
    description: '업로드/시트 인식',
    roles: ['OPERATOR', 'ADMIN'],
  },
  {
    label: '배치 목록',
    path: '/batches',
    group: 'upload',
    icon: 'batch',
    description: '상태/검증 결과',
    matchPaths: ['/batches/'],
  },
  { label: '주문 조회', path: '/orders', group: 'data', icon: 'orders', description: '주문 데이터' },
  { label: 'Scan 조회', path: '/scan-lines', group: 'data', icon: 'scan', description: '스캔 데이터' },
  { label: 'PL 조회', path: '/pl-lines', group: 'data', icon: 'pl', description: '피킹 리스트' },
  { label: 'Label 조회', path: '/label-lines', group: 'data', icon: 'label', description: '라벨 데이터' },
  {
    label: '라벨 다운로드',
    path: '/downloads/labels',
    group: 'download',
    icon: 'download',
    description: '확정 배치 대상',
    roles: ['OPERATOR', 'ADMIN'],
  },
  {
    label: 'API 사용 안내',
    path: '/external-api/guide',
    group: 'external',
    icon: 'externalApi',
    description: 'Endpoint/호출 예시',
    roles: ['VIEWER', 'OPERATOR', 'ADMIN'],
  },
  {
    label: 'API 제공 현황',
    path: '/external-api/status',
    group: 'external',
    icon: 'externalApi',
    description: 'WOS/PL 제공 상태',
    roles: ['VIEWER', 'OPERATOR', 'ADMIN'],
  },
  {
    label: 'API Key 관리',
    path: '/external-api/api-keys',
    group: 'external',
    icon: 'externalApi',
    description: 'Key/권한/만료',
    roles: ['ADMIN'],
  },
  {
    label: '상품 마스터',
    path: '/masters/products',
    group: 'master',
    icon: 'productMaster',
    description: 'CSV 업로드',
  },
  {
    label: '배송지/차량 마스터',
    path: '/masters/store-routes',
    group: 'master',
    icon: 'storeRouteMaster',
    description: 'XLSX 업로드',
  },
  { label: '이력/로그', path: '/audit', group: 'audit', icon: 'audit', description: '감사/다운로드/API', roles: ['ADMIN'] },
];

export const navigationGroups: Record<NavigationItem['group'], string> = {
  dashboard: '현황',
  upload: '업로드/배치',
  data: '조회',
  download: '다운로드',
  external: '외부 연동',
  master: '마스터 데이터',
  audit: '이력/로그',
};
