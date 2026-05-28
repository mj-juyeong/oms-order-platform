# OMS REST API 설계 초안

이 문서는 1차 MVP 구현을 위한 REST API 초안이다. 내부 운영 API는 `/api/v1`, 외부 연동 API는 `/external/v1` prefix를 사용한다.

## 0. 문서 적용 기준

- 마스터 API는 이 문서의 version 분리 구조를 기준으로 한다.
- 마스터 API를 제외한 업로드, 배치, 검증, 주문, Scan, PL, Label, 다운로드, 차수별 추후 API는 `OMS_개발팀_전달용_최종요구사항_Codex_대화반영_최종.md`의 API 경로를 기준으로 한다.
- 차수별 주문 조회와 차수별 다운로드는 1차 MVP 필수 구현에서 제외하고 추후 구현으로 둔다.

## 1. 공통 규칙

### Tenant / Client Context

- 내부 운영 API는 로그인 사용자의 `tenant_id`를 기준으로 동작한다.
- 주문/업로드 관련 API는 `clientId`를 받아 특정 고객사/화주사 범위를 명확히 한다.
- 외부 API Key는 `tenant_id`에 소속되며, 필요 시 `client_id`로 접근 범위를 제한한다.
- 1차 MVP의 마스터 매칭은 고객사 코드 매핑 없이 `product_code -> ezadmin_code`, `store_code/orderBusinessSiteCode -> baljugo_code` 직접 매칭을 사용한다.
- 고객사별 코드 매핑 API는 1차 MVP 필수 API가 아니며 추후 확장으로 둔다.

### 공통 응답

```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {
    "requestId": "req-20260528-000001",
    "timestamp": "2026-05-28T10:30:00+09:00"
  }
}
```

### 공통 오류

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "검증 오류가 존재합니다.",
    "details": []
  },
  "meta": {
    "requestId": "req-20260528-000002",
    "timestamp": "2026-05-28T10:31:00+09:00"
  }
}
```

### 권한 코드

| 권한 | 설명 |
|---|---|
| `PUBLIC` | 인증 전 |
| `VIEWER` | 조회 가능 |
| `OPERATOR` | 업로드, 검증, 다운로드 가능 |
| `ADMIN` | 사용자, 권한, 롤백, 마스터 활성화 가능 |
| `API_KEY` | 외부 API Key 인증 |

## 2. Auth / User

| Method | Path | 설명 | 권한 | Request Body 또는 Query Parameter | Response Body 예시 | Error Case |
|---|---|---|---|---|---|---|
| POST | `/api/v1/auth/login` | 로그인 | PUBLIC | Body: `{ "loginId": "admin", "password": "secret" }` | `{ "accessToken": "...", "user": { "id": 1, "name": "관리자", "roles": ["ADMIN"] } }` | `INVALID_CREDENTIALS`, `USER_DISABLED` |
| POST | `/api/v1/auth/logout` | 로그아웃 | VIEWER | 없음 | `{ "loggedOut": true }` | `UNAUTHORIZED` |
| GET | `/api/v1/auth/me` | 현재 사용자 조회 | VIEWER | 없음 | `{ "id": 1, "loginId": "admin", "roles": ["ADMIN"] }` | `UNAUTHORIZED` |
| GET | `/api/v1/users` | 사용자 목록 | ADMIN | Query: `status`, `keyword`, `page`, `size` | `{ "items": [{ "id": 1, "loginId": "admin", "status": "ACTIVE" }], "page": 0, "total": 1 }` | `FORBIDDEN` |
| POST | `/api/v1/users` | 사용자 생성 | ADMIN | Body: `{ "loginId": "ops01", "name": "운영자", "password": "secret", "roleCodes": ["OPERATOR"] }` | `{ "id": 2 }` | `DUPLICATE_LOGIN_ID`, `INVALID_ROLE` |
| PATCH | `/api/v1/users/{userId}` | 사용자 수정 | ADMIN | Body: `{ "name": "운영자", "status": "ACTIVE", "roleCodes": ["OPERATOR"] }` | `{ "id": 2, "updated": true }` | `USER_NOT_FOUND`, `INVALID_ROLE` |

## 3. Upload

| Method | Path | 설명 | 권한 | Request Body 또는 Query Parameter | Response Body 예시 | Error Case |
|---|---|---|---|---|---|---|
| POST | `/api/v1/order-excel-batches` | OIS 입력 엑셀 업로드 및 배치 생성 | OPERATOR | Multipart: `file`, `clientId`, optional `productMasterVersionId`, `storeRouteMasterVersionId`, `memo` | `{ "batchId": 1001, "clientId": 10, "status": "UPLOADED", "fileName": "input.xlsm" }` | `INVALID_FILE_EXTENSION`, `FILE_TOO_LARGE`, `CLIENT_NOT_FOUND`, `MASTER_VERSION_NOT_FOUND` |

## 4. Batch

| Method | Path | 설명 | 권한 | Request Body 또는 Query Parameter | Response Body 예시 | Error Case |
|---|---|---|---|---|---|---|
| GET | `/api/v1/order-excel-batches` | 배치 목록 조회 | VIEWER | Query: `clientId`, `status`, `deliveryDate`, `from`, `to`, `page`, `size` | `{ "items": [{ "id": 1001, "clientId": 10, "status": "CONFIRMED", "deliveryDate": "2025-12-15" }], "total": 1 }` | `INVALID_QUERY` |
| GET | `/api/v1/order-excel-batches/{batchId}` | 배치 상세 조회 | VIEWER | Path: `batchId` | `{ "id": 1001, "status": "VALIDATED", "errorCount": 0, "warningCount": 3 }` | `BATCH_NOT_FOUND` |
| POST | `/api/v1/order-excel-batches/{batchId}/confirm` | 배치 확정 | OPERATOR | Path: `batchId` | `{ "id": 1001, "status": "CONFIRMED", "confirmedAt": "2026-05-28T10:30:00+09:00" }` | `BATCH_NOT_FOUND`, `VALIDATION_ERROR_EXISTS`, `INVALID_BATCH_STATUS` |
| POST | `/api/v1/order-excel-batches/{batchId}/cancel` | 배치 취소 | OPERATOR | Body: `{ "reason": "잘못된 파일 업로드" }` | `{ "id": 1001, "status": "CANCELLED" }` | `INVALID_BATCH_STATUS` |
| POST | `/api/v1/order-excel-batches/{batchId}/rollback` | 확정 배치 롤백 | ADMIN | Body: `{ "reason": "운영 요청" }` | `{ "id": 1001, "status": "ROLLED_BACK" }` | `FORBIDDEN`, `INVALID_BATCH_STATUS` |

## 5. Validation

| Method | Path | 설명 | 권한 | Request Body 또는 Query Parameter | Response Body 예시 | Error Case |
|---|---|---|---|---|---|---|
| POST | `/api/v1/order-excel-batches/{batchId}/validate` | 배치 검증 또는 재검증 실행 | OPERATOR | Body: optional `{ "productMasterVersionId": 3, "storeRouteMasterVersionId": 5 }` | `{ "batchId": 1001, "errorCount": 0, "warningCount": 3, "infoCount": 1 }` | `BATCH_NOT_FOUND`, `MASTER_VERSION_NOT_FOUND`, `INVALID_BATCH_STATUS` |
| GET | `/api/v1/order-excel-batches/{batchId}/validation-errors` | 검증 오류 목록 조회 | VIEWER | Query: `severity`, `sheetName`, `errorCode`, `page`, `size` | `{ "items": [{ "severity": "ERROR", "sheetName": "PL_EA", "rowNo": 12, "message": "상품 마스터에 존재하지 않는 품목코드입니다." }] }` | `BATCH_NOT_FOUND` |

## 6. Product Master

| Method | Path | 설명 | 권한 | Request Body 또는 Query Parameter | Response Body 예시 | Error Case |
|---|---|---|---|---|---|---|
| POST | `/api/v1/masters/products/versions` | 상품 마스터 CSV 업로드 | ADMIN | Multipart: `file`, `versionName`, optional `scopeType`, `clientId` | `{ "versionId": 3, "scopeType": "TENANT", "rowCount": 1200, "status": "UPLOADED" }` | `INVALID_FILE_EXTENSION`, `DUPLICATE_MASTER_KEY`, `INVALID_COLUMNS` |
| GET | `/api/v1/masters/products/versions` | 상품 마스터 버전 목록 | VIEWER | Query: `activeYn`, `page`, `size` | `{ "items": [{ "id": 3, "versionName": "2026-05-28", "activeYn": true }] }` | `INVALID_QUERY` |
| POST | `/api/v1/masters/products/versions/{versionId}/activate` | 상품 마스터 활성화 | ADMIN | Path: `versionId` | `{ "versionId": 3, "activeYn": true }` | `MASTER_VERSION_NOT_FOUND` |
| GET | `/api/v1/masters/products` | 상품 마스터 조회 | VIEWER | Query: `versionId`, `ezadminCode`, `productName`, `operationStatus`, `page`, `size` | `{ "items": [{ "ezadminCode": "P001", "productName": "상품A", "boxQty": 10 }] }` | `MASTER_VERSION_NOT_FOUND` |

## 7. Store Route Master

| Method | Path | 설명 | 권한 | Request Body 또는 Query Parameter | Response Body 예시 | Error Case |
|---|---|---|---|---|---|---|
| POST | `/api/v1/masters/store-routes/versions` | 배송지/차량 마스터 XLSX 업로드 | ADMIN | Multipart: `file`, `versionName`, optional `scopeType`, `clientId` | `{ "versionId": 5, "scopeType": "TENANT", "rowCount": 300, "status": "UPLOADED" }` | `INVALID_FILE_EXTENSION`, `SHEET_NOT_FOUND`, `DUPLICATE_MASTER_KEY` |
| GET | `/api/v1/masters/store-routes/versions` | 배송지/차량 마스터 버전 목록 | VIEWER | Query: `activeYn`, `page`, `size` | `{ "items": [{ "id": 5, "versionName": "2026-05-28", "activeYn": true }] }` | `INVALID_QUERY` |
| POST | `/api/v1/masters/store-routes/versions/{versionId}/activate` | 배송지/차량 마스터 활성화 | ADMIN | Path: `versionId` | `{ "versionId": 5, "activeYn": true }` | `MASTER_VERSION_NOT_FOUND` |
| GET | `/api/v1/masters/store-routes` | 배송지/차량 마스터 조회 | VIEWER | Query: `versionId`, `baljugoCode`, `brandName`, `storeName`, `area`, `deliveryRound`, `vehicleName`, `page`, `size` | `{ "items": [{ "baljugoCode": "S001", "storeName": "지점A", "deliveryRound": "1", "vehicleName": "차량1" }] }` | `MASTER_VERSION_NOT_FOUND` |

## 8. Order

| Method | Path | 설명 | 권한 | Request Body 또는 Query Parameter | Response Body 예시 | Error Case |
|---|---|---|---|---|---|---|
| GET | `/api/v1/orders` | PL 기반 주문 조회용 데이터 조회 | VIEWER | Query: `batchId`, `deliveryDate`, `storeCode`, `productCode`, `orderNo`, `page`, `size` | `{ "items": [{ "orderNo": "O001", "storeCode": "S001", "productCode": "P001", "orderQty": 5 }] }` | `BATCH_NOT_FOUND`, `INVALID_QUERY` |
| GET | `/api/v1/orders/{orderLineId}` | 주문 조회용 행 상세 | VIEWER | Path: `orderLineId` | `{ "id": 1, "sourcePlLineId": 50, "orderNo": "O001", "rawSource": "PL_EA" }` | `ORDER_LINE_NOT_FOUND` |

## 9. Dispatch / 차수별 조회

차수별 주문 조회와 차수별 다운로드는 현재 업무 개념과 기준 데이터가 명확하지 않으므로 1차 MVP 필수 구현에서 제외한다. 아래 API는 추후 구현 후보 초안이며, 차수 정의, 기준 날짜, 차량/권역 매칭 기준, 다운로드 포맷이 확정된 뒤 구현한다.

| Method | Path | 설명 | 권한 | Request Body 또는 Query Parameter | Response Body 예시 | Error Case |
|---|---|---|---|---|---|---|
| GET | `/api/v1/orders/by-round` | 추후 구현: 차수별 주문 조회 | VIEWER | Query: `batchId`, `deliveryDate`, `deliveryRound`, `vehicleName`, `area`, `storeCode`, `page`, `size` | `{ "items": [{ "deliveryRound": "1", "vehicleName": "차량1", "storeCode": "S001", "orderQty": 5 }] }` | `NOT_IMPLEMENTED`, `INVALID_QUERY` |

## 10. Scan / WOS API

| Method | Path | 설명 | 권한 | Request Body 또는 Query Parameter | Response Body 예시 | Error Case |
|---|---|---|---|---|---|---|
| GET | `/api/v1/scan-lines` | 내부 Scan 데이터 조회 | VIEWER | Query: `batchId`, `deliveryDate`, `scanCenter`, `storeCode`, `productCode`, `barcode`, `page`, `size` | `{ "items": [{ "barcode": "B001", "scanCenter": "장지", "productCode": "P001" }] }` | `INVALID_QUERY` |
| GET | `/external/v1/wos/scan-upload` | WOS 제공용 확정 Scan 데이터 | API_KEY | Query: `batchId`, `deliveryDate`, `scanCenter`, `storeCode`, `productCode`, `page`, `size` | `{ "items": [{ "deliveryDate": "2025-12-15", "barcode": "B001", "orderBusinessSiteCode": "S001", "productCode": "P001" }] }` | `INVALID_API_KEY`, `NO_CONFIRMED_BATCH`, `INVALID_QUERY` |

## 11. PL API

| Method | Path | 설명 | 권한 | Request Body 또는 Query Parameter | Response Body 예시 | Error Case |
|---|---|---|---|---|---|---|
| GET | `/api/v1/pl-lines` | 내부 PL 데이터 조회 | VIEWER | Query: `batchId`, `plType`, `dueDate`, `vehicleName`, `storeCode`, `productCode`, `orderNo`, `page`, `size` | `{ "items": [{ "plType": "EA", "orderNo": "O001", "productCode": "P001", "orderQty": 5 }] }` | `INVALID_QUERY` |
| GET | `/external/v1/pl/picking-list` | PL 시스템 제공용 확정 Picking List 데이터 | API_KEY | Query: `batchId`, `deliveryDate`, `plType`, `vehicleName`, `deliveryRound`, `storeCode`, `page`, `size` | `{ "items": [{ "plType": "BOX", "orderNo": "O002", "storeCode": "S001", "vehicleName": "차량1" }] }` | `INVALID_API_KEY`, `NO_CONFIRMED_BATCH`, `INVALID_QUERY` |

## 12. Label

| Method | Path | 설명 | 권한 | Request Body 또는 Query Parameter | Response Body 예시 | Error Case |
|---|---|---|---|---|---|---|
| GET | `/api/v1/label-lines` | Label 데이터 조회 | VIEWER | Query: `batchId`, `labelType`, `storeCode`, `productCode`, `orderNo`, `matchingCode`, `page`, `size` | `{ "items": [{ "labelType": "EA", "orderNo": "O001", "matchingCode": "M001" }] }` | `INVALID_QUERY` |
| GET | `/api/v1/label-lines/{labelLineId}` | Label 행 상세 조회 | VIEWER | Path: `labelLineId` | `{ "id": 1, "labelType": "BOX", "qrCode": "Q001", "rawRow": {} }` | `LABEL_LINE_NOT_FOUND` |

## 13. Download

| Method | Path | 설명 | 권한 | Request Body 또는 Query Parameter | Response Body 예시 | Error Case |
|---|---|---|---|---|---|---|
| GET | `/api/v1/downloads/labels` | 라벨 엑셀 다운로드 | OPERATOR | Query: `batchId`, `labelType`, `storeCode`, `deliveryRound`, `vehicleName` | Binary XLSX. Header: `Content-Disposition` | `BATCH_NOT_CONFIRMED`, `NO_DATA`, `INVALID_QUERY` |
| GET | `/api/v1/downloads/orders/by-round` | 추후 구현: 차수별 주문 엑셀 다운로드 | OPERATOR | Query: `batchId`, `deliveryDate`, `deliveryRound`, `vehicleName`, `area` | Binary XLSX. Header: `Content-Disposition` | `NOT_IMPLEMENTED`, `BATCH_NOT_CONFIRMED`, `NO_DATA`, `INVALID_QUERY` |
| GET | `/api/v1/downloads/{downloadLogId}` | 다운로드 로그 상세 조회 | VIEWER | Path: `downloadLogId` | `{ "id": 30, "downloadType": "LABEL", "fileName": "labels.xlsx", "rowCount": 100 }` | `DOWNLOAD_LOG_NOT_FOUND` |

## 14. Audit Log

| Method | Path | 설명 | 권한 | Request Body 또는 Query Parameter | Response Body 예시 | Error Case |
|---|---|---|---|---|---|---|
| GET | `/api/v1/audit/batches` | 배치 감사 로그 조회 | ADMIN | Query: `batchId`, `action`, `from`, `to`, `page`, `size` | `{ "items": [{ "batchId": 1001, "action": "CONFIRM", "actorName": "관리자" }] }` | `FORBIDDEN`, `INVALID_QUERY` |
| GET | `/api/v1/audit/api-calls` | 외부 API 호출 로그 조회 | ADMIN | Query: `apiKeyId`, `path`, `responseStatus`, `from`, `to`, `page`, `size` | `{ "items": [{ "path": "/external/v1/wos/scan-upload", "responseStatus": 200, "responseTimeMs": 120 }] }` | `FORBIDDEN`, `INVALID_QUERY` |
| GET | `/api/v1/audit/downloads` | 다운로드 로그 조회 | ADMIN | Query: `batchId`, `downloadType`, `downloadedBy`, `from`, `to`, `page`, `size` | `{ "items": [{ "downloadType": "LABEL", "fileName": "labels.xlsx", "rowCount": 100 }] }` | `FORBIDDEN`, `INVALID_QUERY` |

## 15. API Key

| Method | Path | 설명 | 권한 | Request Body 또는 Query Parameter | Response Body 예시 | Error Case |
|---|---|---|---|---|---|---|
| GET | `/api/v1/api-keys` | API Key 목록 조회 | ADMIN | Query: `status`, `page`, `size` | `{ "items": [{ "id": 1, "name": "WOS", "status": "ACTIVE", "lastUsedAt": "2026-05-28T10:30:00+09:00" }] }` | `FORBIDDEN` |
| POST | `/api/v1/api-keys` | API Key 생성 | ADMIN | Body: `{ "name": "WOS", "allowedScope": ["WOS_SCAN_READ"], "expiresAt": "2027-01-01T00:00:00+09:00" }` | `{ "id": 1, "apiKey": "plain-key-returned-once" }` | `INVALID_SCOPE`, `INVALID_EXPIRES_AT` |
| PATCH | `/api/v1/api-keys/{apiKeyId}` | API Key 상태/범위 수정 | ADMIN | Body: `{ "status": "ACTIVE", "allowedScope": ["PL_READ"] }` | `{ "id": 1, "updated": true }` | `API_KEY_NOT_FOUND`, `INVALID_SCOPE` |
| POST | `/api/v1/api-keys/{apiKeyId}/revoke` | API Key 폐기 | ADMIN | Body: `{ "reason": "교체" }` | `{ "id": 1, "status": "REVOKED" }` | `API_KEY_NOT_FOUND` |

## 16. 주요 정책

- 외부 API는 CONFIRMED 배치만 응답한다.
- `batchId`가 없으면 조건에 맞는 최신 CONFIRMED 배치를 선택하는 정책을 검토한다.
- Error 검증 오류가 있으면 배치를 확정할 수 없다.
- 다운로드는 CONFIRMED 배치 기준을 기본으로 한다.
- 차수별 주문 조회와 차수별 다운로드는 1차 MVP 필수 API가 아니며 추후 구현으로 둔다.
- API Key 원문은 생성 응답에서 한 번만 반환하고 DB에는 hash만 저장한다.
