interface RouteMeta {
  title: string;
  description: string;
  breadcrumbs: Array<{ label: string; path?: string }>;
  notice?: string;
}

export const routeMetaByPath: Record<string, RouteMeta> = {
  '/dashboard': {
    title: '대시보드',
    description: '업로드 배치와 검증 상태를 mock 데이터로 요약합니다.',
    breadcrumbs: [{ label: '대시보드' }],
  },
  '/uploads': {
    title: 'OIS 엑셀 업로드',
    description: '파일 업로드 흐름을 붙이기 위한 화면 skeleton입니다.',
    breadcrumbs: [{ label: '업로드/배치' }, { label: 'OIS 엑셀 업로드' }],
  },
  '/batches': {
    title: '업로드 배치',
    description: 'OIS 엑셀 업로드 배치 목록을 mock table로 표시합니다.',
    breadcrumbs: [{ label: '업로드/배치' }, { label: '업로드 배치' }],
  },
  '/batches/:batchId': {
    title: '배치 상세',
    description: '배치 메타 정보와 시트별 파싱 결과 skeleton입니다.',
    breadcrumbs: [{ label: '업로드 배치', path: '/batches' }, { label: '배치 상세' }],
  },
  '/batches/:batchId/validation': {
    title: '검증 결과',
    description: 'Error, Warning, Info 검증 결과를 mock 데이터로 표시합니다.',
    breadcrumbs: [{ label: '업로드 배치', path: '/batches' }, { label: '검증 결과' }],
  },
  '/orders': {
    title: '주문 조회',
    description: '원본 주문이 아니라 PL 기반 OMS 조회용 요약 데이터입니다.',
    breadcrumbs: [{ label: '조회' }, { label: '주문 조회' }],
    notice: '차수/차량/권역 값은 원천값 표시 수준이며 차수별 조회 화면은 구현하지 않습니다.',
  },
  '/scan-lines': {
    title: 'Scan 조회',
    description: 'Scan_upload_* 시트 데이터를 조회하는 화면 skeleton입니다.',
    breadcrumbs: [{ label: '조회' }, { label: 'Scan 조회' }],
  },
  '/pl-lines': {
    title: 'PL 조회',
    description: 'PL_EA, PL_Box 데이터를 조회하는 화면 skeleton입니다.',
    breadcrumbs: [{ label: '조회' }, { label: 'PL 조회' }],
  },
  '/label-lines': {
    title: 'Label 조회',
    description: 'Label_EA, Label_Box 데이터를 조회하는 화면 skeleton입니다.',
    breadcrumbs: [{ label: '조회' }, { label: 'Label 조회' }],
  },
  '/downloads/labels': {
    title: '라벨 다운로드',
    description: '확정 배치만 다운로드 가능하다는 정책을 표시하는 skeleton입니다.',
    breadcrumbs: [{ label: '다운로드' }, { label: '라벨 다운로드' }],
  },
  '/masters/products': {
    title: '상품 마스터',
    description: '상품 마스터 버전 선택과 조회 화면 skeleton입니다.',
    breadcrumbs: [{ label: '마스터' }, { label: '상품 마스터' }],
  },
  '/masters/store-routes': {
    title: '배송지/차량 마스터',
    description: '배송지/차량 마스터를 상품 마스터와 분리해서 표시합니다.',
    breadcrumbs: [{ label: '마스터' }, { label: '배송지/차량 마스터' }],
  },
  '/audit': {
    title: '이력/로그',
    description: '배치, 다운로드, API 호출 이력 mock table입니다.',
    breadcrumbs: [{ label: '운영' }, { label: '이력/로그' }],
  },
};
