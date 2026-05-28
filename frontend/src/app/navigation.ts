import type { UserRole } from '../types/auth';

export interface NavigationItem {
  label: string;
  path: string;
  group: 'dashboard' | 'upload' | 'data' | 'download' | 'master' | 'audit';
  description: string;
  matchPaths?: string[];
  roles?: UserRole[];
}

export const navigationItems: NavigationItem[] = [
  { label: '대시보드', path: '/dashboard', group: 'dashboard', description: '운영 현황' },
  {
    label: 'OIS 엑셀 업로드',
    path: '/uploads',
    group: 'upload',
    description: '업로드/시트 인식',
    roles: ['OPERATOR', 'ADMIN'],
  },
  {
    label: '배치 목록',
    path: '/batches',
    group: 'upload',
    description: '상태/검증 결과',
    matchPaths: ['/batches/'],
  },
  { label: '주문 조회', path: '/orders', group: 'data', description: 'PL 기반 요약' },
  { label: 'Scan 조회', path: '/scan-lines', group: 'data', description: 'Scan_upload_*' },
  { label: 'PL 조회', path: '/pl-lines', group: 'data', description: 'PL_EA/PL_Box' },
  { label: 'Label 조회', path: '/label-lines', group: 'data', description: 'Label_EA/Label_Box' },
  {
    label: '라벨 다운로드',
    path: '/downloads/labels',
    group: 'download',
    description: '확정 배치 대상',
    roles: ['OPERATOR', 'ADMIN'],
  },
  {
    label: '상품 마스터',
    path: '/masters/products',
    group: 'master',
    description: 'CSV upsert',
  },
  {
    label: '배송지/차량 마스터',
    path: '/masters/store-routes',
    group: 'master',
    description: 'XLSX upsert',
  },
  { label: '이력/로그', path: '/audit', group: 'audit', description: '감사/다운로드/API', roles: ['ADMIN'] },
];

export const navigationGroups: Record<NavigationItem['group'], string> = {
  dashboard: '현황',
  upload: '업로드/배치',
  data: '조회',
  download: '다운로드',
  master: '마스터 데이터',
  audit: '이력/로그',
};
