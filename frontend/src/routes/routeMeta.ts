import type { UserRole, UserScopeType } from '../types/auth';

export interface RouteAction {
  label: string;
  to: string;
  roles?: UserRole[];
  scopes?: UserScopeType[];
}

interface RouteMeta {
  title: string;
  description: string;
  breadcrumbs: Array<{ label: string; path?: string }>;
  notice?: string;
  primaryAction?: RouteAction;
  secondaryActions?: RouteAction[];
}

export const routeMetaByPath: Record<string, RouteMeta> = {
  '/dashboard': {
    title: '대시보드',
    description: '오늘의 업로드, 검증 오류, 확정 가능 배치를 한눈에 확인합니다.',
    breadcrumbs: [{ label: '대시보드' }],
    primaryAction: { label: 'OIS 업로드', roles: ['OPERATOR', 'ADMIN'], scopes: ['TENANT', 'CLIENT'], to: '/uploads' },
  },
  '/notifications': {
    title: '알림',
    description: '확정 요청, 보완 요청, 반려처럼 처리 흐름에서 발생한 알림을 확인합니다.',
    breadcrumbs: [{ label: '알림' }],
  },
  '/uploads': {
    title: 'OIS 엑셀 업로드',
    description: 'OIS 엑셀 파일을 업로드하고 시트 인식 후 현재 마스터 기준 검증을 실행합니다.',
    breadcrumbs: [{ label: '업로드/배치' }, { label: 'OIS 엑셀 업로드' }],
    secondaryActions: [{ label: '배치 목록', to: '/batches' }],
  },
  '/batches': {
    title: '배치 목록',
    description: 'OIS 엑셀 업로드 배치의 검증 상태, 확정 여부, 후속 처리 가능 여부를 조회합니다.',
    breadcrumbs: [{ label: '업로드/배치' }, { label: '배치 목록' }],
    primaryAction: { label: 'OIS 업로드', roles: ['OPERATOR', 'ADMIN'], scopes: ['TENANT', 'CLIENT'], to: '/uploads' },
  },
  '/batch-confirmation-requests': {
    title: '배치 확정 요청',
    description: '고객사가 요청한 배치를 검토하고 최종 확정 여부를 처리합니다.',
    breadcrumbs: [{ label: '업로드/배치' }, { label: '배치 확정 요청' }],
    notice: 'Error가 없는 배치만 승인할 수 있습니다.',
  },
  '/batches/:batchId': {
    title: '배치 상세',
    description: '배치의 업로드, 파싱, 검증, 확정 상태와 시트별 결과를 확인합니다.',
    breadcrumbs: [{ label: '배치 목록', path: '/batches' }, { label: '배치 상세' }],
    secondaryActions: [{ label: '검증 결과', to: '/batches/BATCH-20260528-001/validation' }],
  },
  '/batches/:batchId/validation': {
    title: '검증 결과',
    description: 'Error, Warning, Info를 행 단위로 확인하고 OIS 원본값과 OMS 반영값을 비교합니다.',
    breadcrumbs: [{ label: '배치 목록', path: '/batches' }, { label: '검증 결과' }],
    notice: '현재 배치 상태와 검증 항목을 함께 확인합니다.',
    secondaryActions: [{ label: '배치 상세', to: '/batches/BATCH-20260528-001' }],
  },
  '/orders': {
    title: '주문 조회',
    description: 'PL 기준 주문 요약을 조회합니다.',
    breadcrumbs: [{ label: '조회' }, { label: '주문 조회' }],
  },
  '/scan-lines': {
    title: 'Scan 조회',
    description: '스캔 데이터를 조회합니다.',
    breadcrumbs: [{ label: '조회' }, { label: 'Scan 조회' }],
  },
  '/pl-lines': {
    title: 'PL 조회',
    description: '피킹 리스트 데이터를 조회합니다.',
    breadcrumbs: [{ label: '조회' }, { label: 'PL 조회' }],
  },
  '/label-lines': {
    title: 'Label 조회/다운로드',
    description: 'Label 데이터를 조회하고 확정 배치의 라벨 파일을 다운로드합니다.',
    breadcrumbs: [{ label: '데이터 조회/다운로드' }, { label: 'Label 조회/다운로드' }],
  },
  '/downloads/labels': {
    title: 'Label 조회/다운로드',
    description: 'Label 데이터를 조회하고 확정 배치의 라벨 파일을 다운로드합니다.',
    breadcrumbs: [{ label: '데이터 조회/다운로드' }, { label: 'Label 조회/다운로드' }],
    notice: '확정되지 않은 배치는 라벨 다운로드 대상이 아닙니다.',
  },
  '/external-api/status': {
    title: 'API 제공 현황',
    description: 'WOS/PL 외부 API 제공 가능 배치와 최근 호출 상태를 확인합니다.',
    breadcrumbs: [{ label: '외부 연동' }, { label: 'API 제공 현황' }],
    notice: '확정 완료된 배치만 WOS/PL API 제공 대상입니다. 라벨은 라벨 다운로드 화면에서 제공합니다.',
  },
  '/external-api/guide': {
    title: 'API 사용 안내',
    description: '외부 연동 담당자에게 전달할 endpoint, 인증 헤더, 조회 조건, 호출 예시를 확인합니다.',
    breadcrumbs: [{ label: '외부 연동' }, { label: 'API 사용 안내' }],
    notice: '외부 API는 로그인 없이 X-Api-Key 헤더로 호출합니다. 고객사는 API Key를 신청하고 물류사 승인 후 사용할 수 있습니다.',
  },
  '/external-api/api-keys': {
    title: 'API Key 관리/신청',
    description: '외부 시스템 호출에 사용하는 API Key 신청, 승인 상태, 권한과 만료를 확인합니다.',
    breadcrumbs: [{ label: '외부 연동' }, { label: 'API Key 관리/신청' }],
    notice: 'API Key 원문은 발급 직후 1회만 표시하고, 이후에는 다시 조회하지 않습니다.',
  },
  '/masters/products': {
    title: '상품 마스터',
    description: '상품 마스터를 조회하고 CSV 파일을 업로드합니다.',
    breadcrumbs: [{ label: '마스터' }, { label: '상품 마스터' }],
  },
  '/masters/store-routes': {
    title: '배송지/차량 마스터',
    description: '배송지/차량 마스터를 조회하고 XLSX 파일을 업로드합니다.',
    breadcrumbs: [{ label: '마스터' }, { label: '배송지/차량 마스터' }],
  },
  '/client-masters': {
    title: '고객사 공개 마스터',
    description: '고객사에 공개된 상품 코드와 발주고/배송지 코드를 조회합니다.',
    breadcrumbs: [{ label: '마스터' }, { label: '고객사 공개 마스터' }],
  },
  '/masters/client-visibility': {
    title: '고객사별 마스터 공개 설정',
    description: '고객사별 상품과 발주고/배송지 마스터 공개 범위를 관리합니다.',
    breadcrumbs: [{ label: '마스터' }, { label: '고객사별 마스터 공개 설정' }],
  },
  '/masters/requests': {
    title: '마스터 요청 처리',
    description: '고객사가 등록한 마스터 추가 요청을 검토하고 처리 상태를 관리합니다.',
    breadcrumbs: [{ label: '마스터' }, { label: '마스터 요청 처리' }],
  },
  '/users': {
    title: '사용자 관리',
    description: '관리자가 OMS 사용자 계정, 역할, 접근 스코프, 활성 상태를 관리합니다.',
    breadcrumbs: [{ label: '관리' }, { label: '사용자 관리' }],
  },
  '/audit': {
    title: '이력/로그',
    description: '배치 상태 변경, 다운로드, 외부 API 호출 이력을 추적합니다.',
    breadcrumbs: [{ label: '이력/로그' }],
  },
};
