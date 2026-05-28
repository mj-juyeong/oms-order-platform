interface RouteMeta {
  title: string;
  description: string;
  breadcrumbs: Array<{ label: string; path?: string }>;
  notice?: string;
  primaryAction?: { label: string; to: string };
  secondaryActions?: Array<{ label: string; to: string }>;
}

export const routeMetaByPath: Record<string, RouteMeta> = {
  '/dashboard': {
    title: '대시보드',
    description: '오늘의 업로드, 검증 오류, 확정 가능 배치를 한눈에 확인합니다.',
    breadcrumbs: [{ label: '대시보드' }],
    primaryAction: { label: 'OIS 업로드', to: '/uploads' },
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
    primaryAction: { label: 'OIS 업로드', to: '/uploads' },
  },
  '/batches/:batchId': {
    title: '배치 상세',
    description: '배치의 업로드, 파싱, 검증, 확정 상태와 시트별 결과를 확인합니다.',
    breadcrumbs: [{ label: '배치 목록', path: '/batches' }, { label: '배치 상세' }],
    secondaryActions: [{ label: '검증 결과', to: '/batches/BATCH-20260528-001/validation' }],
  },
  '/batches/:batchId/validation': {
    title: '검증 결과',
    description: 'Error, Warning, Info를 행 단위로 확인하고 원본값과 정규화값을 비교합니다.',
    breadcrumbs: [{ label: '배치 목록', path: '/batches' }, { label: '검증 결과' }],
    notice: 'Error가 1건 이상 있으면 배치 확정은 불가합니다.',
    secondaryActions: [{ label: '배치 상세', to: '/batches/BATCH-20260528-001' }],
  },
  '/orders': {
    title: '주문 조회',
    description: '원본 주문이 아니라 PL 기반 OMS 조회용 요약 데이터입니다.',
    breadcrumbs: [{ label: '조회' }, { label: '주문 조회' }],
    notice: '차수/차량/권역 값은 원천값 표시 수준이며 차수별 조회 화면은 구현하지 않습니다.',
  },
  '/scan-lines': {
    title: 'Scan 조회',
    description: '정식 입력 시트인 Scan_upload_* 데이터를 조회합니다.',
    breadcrumbs: [{ label: '조회' }, { label: 'Scan 조회' }],
    notice: '데이터 0건인 Scan_upload_* 시트는 실패가 아니라 정상 케이스입니다.',
  },
  '/pl-lines': {
    title: 'PL 조회',
    description: 'PL_EA, PL_Box 데이터를 조회합니다.',
    breadcrumbs: [{ label: '조회' }, { label: 'PL 조회' }],
  },
  '/label-lines': {
    title: 'Label 조회',
    description: 'Label_EA, Label_Box 데이터를 조회합니다.',
    breadcrumbs: [{ label: '조회' }, { label: 'Label 조회' }],
    primaryAction: { label: '라벨 다운로드', to: '/downloads/labels' },
  },
  '/downloads/labels': {
    title: '라벨 다운로드',
    description: '확정 완료된 배치의 Label 데이터를 엑셀로 다운로드합니다.',
    breadcrumbs: [{ label: '다운로드' }, { label: '라벨 다운로드' }],
    notice: '확정되지 않은 배치는 라벨 다운로드 대상이 아닙니다.',
  },
  '/masters/products': {
    title: '상품 마스터',
    description: '현재 상품 마스터를 조회하고 CSV 파일로 upsert합니다.',
    breadcrumbs: [{ label: '마스터' }, { label: '상품 마스터' }],
    notice: '마스터 버전 활성화가 아니라 tenant별 현재 마스터 upsert 방식입니다.',
  },
  '/masters/store-routes': {
    title: '배송지/차량 마스터',
    description: '현재 배송지/차량 마스터를 조회하고 XLSX 파일로 upsert합니다.',
    breadcrumbs: [{ label: '마스터' }, { label: '배송지/차량 마스터' }],
    notice: '상품 마스터와 배송지/차량 마스터는 별도 화면과 별도 upsert 기준을 사용합니다.',
  },
  '/audit': {
    title: '이력/로그',
    description: '배치 상태 변경, 다운로드, 외부 API 호출 이력을 추적합니다.',
    breadcrumbs: [{ label: '이력/로그' }],
  },
};
