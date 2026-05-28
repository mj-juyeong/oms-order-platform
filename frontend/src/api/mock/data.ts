import type { AuditLog } from '../../types/audit';
import type { UploadBatch } from '../../types/batch';
import type { LabelDownloadRow, LabelLine } from '../../types/label';
import type { MasterVersion, ProductMasterItem, StoreRouteMasterItem } from '../../types/master';
import type { OrderLine } from '../../types/order';
import type { PlLine } from '../../types/pl';
import type { ScanLine } from '../../types/scan';
import type { ValidationError } from '../../types/validation';

export const mockProductVersions: MasterVersion[] = [
  { id: 'pmv-20260528', versionName: '상품 마스터 2026-05-28', uploadedAt: '2026-05-28 09:10', rowCount: 1240, active: true },
  { id: 'pmv-20260521', versionName: '상품 마스터 2026-05-21', uploadedAt: '2026-05-21 09:00', rowCount: 1232, active: false },
];

export const mockStoreRouteVersions: MasterVersion[] = [
  { id: 'srv-20260528', versionName: '배송지/차량 2026-05-28', uploadedAt: '2026-05-28 09:20', rowCount: 320, active: true },
  { id: 'srv-20260515', versionName: '배송지/차량 2026-05-15', uploadedAt: '2026-05-15 09:20', rowCount: 318, active: false },
];

export const mockBatches: UploadBatch[] = [
  {
    id: 'BATCH-20260528-001',
    clientName: '웰스토리',
    fileName: '웰스토리_발주정리매크로_수도권_251215(5).xlsm',
    deliveryDate: '2025-12-15',
    status: 'READY_TO_CONFIRM',
    errorCount: 2,
    warningCount: 5,
    infoCount: 1,
    totalRowCount: 1159,
    uploadedBy: '운영자01',
    uploadedAt: '2026-05-28 10:12',
    productMasterVersion: '상품 마스터 2026-05-28',
    storeRouteMasterVersion: '배송지/차량 2026-05-28',
    sheetResults: [
      { sheetName: 'Scan_upload_장지', sheetType: 'SCAN', suffix: '장지', rowCount: 436, status: 'WARNING', message: 'Scan_upload_* 정식 입력 시트로 인식됨', errorCount: 1, warningCount: 2 },
      { sheetName: 'Scan_upload_군량리', sheetType: 'SCAN', suffix: '군량리', rowCount: 0, status: 'NORMAL', message: '0건 시트 정상 처리 대상', errorCount: 0, warningCount: 0 },
      { sheetName: 'PL_EA', sheetType: 'PL_EA', rowCount: 174, status: 'ERROR', message: '상품 마스터 미매칭 1건', errorCount: 1, warningCount: 1 },
      { sheetName: 'PL_Box', sheetType: 'PL_BOX', rowCount: 202, status: 'NORMAL', message: '파싱 완료', errorCount: 0, warningCount: 1 },
      { sheetName: 'Label_EA', sheetType: 'LABEL_EA', rowCount: 85, status: 'WARNING', message: '품목코드 공란 정책 확인 필요 1건', errorCount: 0, warningCount: 1 },
      { sheetName: 'Label_Box', sheetType: 'LABEL_BOX', rowCount: 262, status: 'NORMAL', message: '파싱 완료', errorCount: 0, warningCount: 0 },
    ],
  },
  {
    id: 'BATCH-20260528-002',
    clientName: '웰스토리',
    fileName: '웰스토리_발주정리매크로_수도권_251216.xlsm',
    deliveryDate: '2025-12-16',
    status: 'CONFIRMED',
    errorCount: 0,
    warningCount: 2,
    infoCount: 0,
    totalRowCount: 1086,
    uploadedBy: '운영자02',
    uploadedAt: '2026-05-28 11:40',
    confirmedAt: '2026-05-28 12:15',
    productMasterVersion: '상품 마스터 2026-05-28',
    storeRouteMasterVersion: '배송지/차량 2026-05-28',
    sheetResults: [],
  },
  {
    id: 'BATCH-20260527-004',
    clientName: '웰스토리',
    fileName: '웰스토리_발주정리매크로_수도권_251214.xlsm',
    deliveryDate: '2025-12-14',
    status: 'VALIDATION_FAILED',
    errorCount: 8,
    warningCount: 3,
    infoCount: 2,
    totalRowCount: 1124,
    uploadedBy: '운영자01',
    uploadedAt: '2026-05-27 16:20',
    productMasterVersion: '상품 마스터 2026-05-21',
    storeRouteMasterVersion: '배송지/차량 2026-05-15',
    sheetResults: [],
  },
];

export const mockValidationErrors: ValidationError[] = [
  { id: 'val-1', batchId: 'BATCH-20260528-001', severity: 'ERROR', errorCode: 'VAL-010', sheetName: 'PL_EA', rowNo: 12, columnName: '품목코드', rawValue: '100000000123', normalizedValue: '100000000123', message: '상품 마스터에 존재하지 않는 품목코드입니다.', relatedCode: '100000000123', resolved: false },
  { id: 'val-2', batchId: 'BATCH-20260528-001', severity: 'ERROR', errorCode: 'VAL-011', sheetName: 'Scan_upload_장지', rowNo: 45, columnName: '주문사업장코드', rawValue: 'S-00991', normalizedValue: 'S-00991', message: '배송지/차량 마스터에 존재하지 않는 발주고코드입니다.', relatedCode: 'S-00991', resolved: false },
  { id: 'val-3', batchId: 'BATCH-20260528-001', severity: 'WARNING', errorCode: 'VAL-014', sheetName: 'PL_Box', rowNo: 88, columnName: '보관온도', rawValue: '냉장', normalizedValue: 'CHILLED', message: '상품 마스터의 보관온도와 입력값이 다릅니다.', relatedCode: 'P-00018', resolved: false },
  { id: 'val-4', batchId: 'BATCH-20260528-001', severity: 'INFO', errorCode: 'VAL-000', sheetName: 'Scan_upload_군량리', rowNo: 1, columnName: 'sheet', rawValue: '0 rows', normalizedValue: '0 rows', message: '헤더만 있는 Scan_upload_* 시트는 정상 케이스입니다.', relatedCode: '군량리', resolved: true },
];

export const mockOrderLines: OrderLine[] = [
  { id: 'ord-1', batchId: 'BATCH-20260528-001', orderNo: '202512150000000001', dueDate: '2025-12-15', storeCode: 'S001', storeName: '강남점', brandName: 'Brand A', productCode: 'P000001', productName: '냉장 소스', unit: 'EA', orderQty: 12, vehicleName: '11가1234', deliveryRound: '1', area: '수도권남부' },
  { id: 'ord-2', batchId: 'BATCH-20260528-001', orderNo: '202512150000000002', dueDate: '2025-12-15', storeCode: 'S002', storeName: '분당점', brandName: 'Brand A', productCode: 'P000002', productName: '냉동 패티', unit: 'BOX', orderQty: 4, vehicleName: '22나5678', deliveryRound: '2', area: '수도권동부' },
];

export const mockScanLines: ScanLine[] = [
  { id: 'scan-1', batchId: 'BATCH-20260528-001', sheetName: 'Scan_upload_장지', scanCenter: '장지', deliveryDate: '2025-12-15', bus: '장지', barcode: '880123456789012345', orderBusinessSiteCode: 'S001', storeName: '강남점', productCode: 'P000001', productName: '냉장 소스', labelQty: 2, unit: 'EA', temperatureType: '냉장', rowNo: 2 },
  { id: 'scan-2', batchId: 'BATCH-20260528-001', sheetName: 'Scan_upload_장지', scanCenter: '장지', deliveryDate: '2025-12-15', bus: '장지', barcode: '880123456789012346', orderBusinessSiteCode: 'S002', storeName: '분당점', productCode: 'P000002', productName: '냉동 패티', labelQty: 1, unit: 'BOX', temperatureType: '냉동', rowNo: 3 },
];

export const mockPlLines: PlLine[] = [
  { id: 'pl-1', batchId: 'BATCH-20260528-001', plType: 'EA', orderNo: '202512150000000001', storeCode: 'S001', storeName: '강남점', brandName: 'Brand A', productCode: 'P000001', productName: '냉장 소스', unit: 'EA', storageTemperature: '냉장', dueDate: '2025-12-15', orderQty: 12, vehicleName: '11가1234', cbm: 0.12, qrCode: 'QR-0000000001', rowNo: 2 },
  { id: 'pl-2', batchId: 'BATCH-20260528-001', plType: 'BOX', orderNo: '202512150000000002', storeCode: 'S002', storeName: '분당점', brandName: 'Brand A', productCode: 'P000002', productName: '냉동 패티', unit: 'BOX', storageTemperature: '냉동', dueDate: '2025-12-15', orderQty: 4, vehicleName: '22나5678', cbm: 0.48, qrCode: 'QR-0000000002', rowNo: 2 },
];

export const mockLabelLines: LabelLine[] = [
  { id: 'label-1', batchId: 'BATCH-20260528-001', labelType: 'EA', orderNo: '202512150000000001', storeCode: 'S001', storeName: '강남점', productCode: 'P000001', productName: '냉장 소스', orderQty: 12, sequence: '001', matchingCode: 'M-0001', qrCode: '', rowNo: 2 },
  { id: 'label-2', batchId: 'BATCH-20260528-001', labelType: 'BOX', orderNo: '202512150000000002', storeCode: 'S002', storeName: '분당점', productCode: 'P000002', productName: '냉동 패티', orderQty: 4, sequence: '002', matchingCode: 'M-0002', qrCode: 'QR-LABEL-0002', boxSequence: '1/2', totalBoxQty: 2, rowNo: 2 },
];

export const mockProductMasterItems: ProductMasterItem[] = [
  { id: 'prod-1', ezadminCode: 'P000001', productName: '냉장 소스', clientProductCode: 'C-P001', boxQty: 12, outboundUnit: 'EA', storageTemperature: '냉장', cbm: 0.01, operationStatus: 'ACTIVE', rowNo: 2 },
  { id: 'prod-2', ezadminCode: 'P000002', productName: '냉동 패티', clientProductCode: 'C-P002', boxQty: 8, outboundUnit: 'BOX', storageTemperature: '냉동', cbm: 0.12, operationStatus: 'ACTIVE', rowNo: 3 },
];

export const mockStoreRouteMasterItems: StoreRouteMasterItem[] = [
  { id: 'store-1', baljugoCode: 'S001', storeCode: 'C001', brandName: 'Brand A', storeName: '강남점', area: '수도권남부', deliveryRound: '1', vehicleName: '11가1234', driverName: '김기사', operationStatus: 'ACTIVE', rowNo: 2 },
  { id: 'store-2', baljugoCode: 'S002', storeCode: 'C002', brandName: 'Brand A', storeName: '분당점', area: '수도권동부', deliveryRound: '2', vehicleName: '22나5678', driverName: '박기사', operationStatus: 'ACTIVE', rowNo: 3 },
];

export const mockLabelDownloadRows: LabelDownloadRow[] = [
  { id: 'dl-1', batchId: 'BATCH-20260528-002', clientName: '웰스토리', deliveryDate: '2025-12-16', status: 'CONFIRMED', labelEaCount: 82, labelBoxCount: 255, downloadable: true, lastDownloadedAt: '2026-05-28 12:30', downloadedBy: '운영자02' },
  { id: 'dl-2', batchId: 'BATCH-20260528-001', clientName: '웰스토리', deliveryDate: '2025-12-15', status: 'READY_TO_CONFIRM', labelEaCount: 85, labelBoxCount: 262, downloadable: false },
];

export const mockAuditLogs: AuditLog[] = [
  { id: 'audit-1', logType: 'BATCH', batchId: 'BATCH-20260528-002', actionOrPath: 'CONFIRM', status: 'SUCCESS', actorName: '운영자02', occurredAt: '2026-05-28 12:15', message: '배치 확정 처리' },
  { id: 'audit-2', logType: 'DOWNLOAD', batchId: 'BATCH-20260528-002', actionOrPath: 'LABEL_DOWNLOAD', status: 'SUCCESS', actorName: '운영자02', occurredAt: '2026-05-28 12:30', message: '라벨 엑셀 다운로드 skeleton 로그' },
  { id: 'audit-3', logType: 'API', batchId: 'BATCH-20260528-002', actionOrPath: '/external/v1/wos/scan-upload', status: '200', actorName: 'WOS API Key', occurredAt: '2026-05-28 12:40', responseTimeMs: 120, message: '외부 API 호출 mock 로그' },
];
