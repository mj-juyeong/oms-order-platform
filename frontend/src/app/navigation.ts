export interface NavigationItem {
  label: string;
  path: string;
  group: 'dashboard' | 'upload' | 'data' | 'download' | 'master' | 'audit';
}

export const navigationItems: NavigationItem[] = [
  { label: '대시보드', path: '/dashboard', group: 'dashboard' },
  { label: 'OIS 엑셀 업로드', path: '/uploads', group: 'upload' },
  { label: '업로드 배치', path: '/batches', group: 'upload' },
  { label: '검증 결과', path: '/batches/BATCH-20260528-001/validation', group: 'upload' },
  { label: '주문 조회', path: '/orders', group: 'data' },
  { label: 'Scan 조회', path: '/scan-lines', group: 'data' },
  { label: 'PL 조회', path: '/pl-lines', group: 'data' },
  { label: 'Label 조회', path: '/label-lines', group: 'data' },
  { label: '라벨 다운로드', path: '/downloads/labels', group: 'download' },
  { label: '상품 마스터', path: '/masters/products', group: 'master' },
  { label: '배송지/차량 마스터', path: '/masters/store-routes', group: 'master' },
  { label: '이력/로그', path: '/audit', group: 'audit' },
];

export const navigationGroups: Record<NavigationItem['group'], string> = {
  dashboard: '현황',
  upload: '업로드/배치',
  data: '조회',
  download: '다운로드',
  master: '마스터',
  audit: '운영',
};
