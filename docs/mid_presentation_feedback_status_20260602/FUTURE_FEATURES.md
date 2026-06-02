# 중간발표 피드백 기준 추후 추가 및 보완 기능 정리

- 작성일: 2026-06-02
- 기준 문서: `docs/MID_PRESENTATION_FEEDBACK_PRIORITY_IMPLEMENTATION_PLAN_20260601.md`
- 정리 기준: 현재 워킹트리에서 완료되지 않았거나, 부분 구현 상태라 추가 보완이 필요한 항목
- 주의: 요구사항 문서에 명확히 확정되지 않은 업무 정책은 `확인 필요`로 둔다.
- 관리 규칙: 앞으로 구현할 기능은 이 문서를 기준으로 고른다. 구현이 끝난 항목은 `COMPLETED_FEATURES.md`에 완료 근거와 함께 정리하고, 이 문서에서는 삭제하거나 남은 보완 범위만 남긴다.

## 1. 주문 조회 검색/총건수 DB 기반 전환

### 현재 상태

- 프론트에는 검색 버튼 방식과 `totalElements` 표시가 반영되어 있다.
- 백엔드 `OrderQueryService`는 아직 `findAll()` 후 메모리 필터링, 정렬, 페이징을 수행한다.

### 추가 필요

- 주문 조회도 Scan/PL/Label처럼 JPA Specification 또는 명시적 query 기반으로 전환한다.
- `storeName`, `brandName`, `productName`, `vehicleName`, `dueDateFrom`, `dueDateTo`, `confirmedOnly` 조건을 DB 단계에서 처리한다.
- 정렬과 페이징도 DB query에서 처리한다.

### 관련 위치

- `backend/src/main/kotlin/com/company/oms/order/OrderQueryService.kt`
- `backend/src/main/kotlin/com/company/oms/order/OrderLineRepository.kt`
- `frontend/src/pages/OrdersPage.tsx`

## 2. 검증 결과 검색/총건수 DB 기반 전환

### 현재 상태

- 검증 결과 조회는 `batchId` 기준 목록을 가져온 뒤 severity, sheetName, errorCode를 메모리에서 필터링한다.
- `totalElements`는 필터 후 계산되지만 대용량 검증 오류에서는 성능 리스크가 있다.

### 추가 필요

- `ValidationErrorRepository`에 Specification 또는 조건별 query를 추가한다.
- severity, sheetName, errorCode, keyword, rowNo 범위 같은 조건을 DB에서 처리한다.
- 원본값/정규화값 검색이 필요하면 검색 대상 컬럼과 인덱스 정책을 정리한다.

### 관련 위치

- `backend/src/main/kotlin/com/company/oms/validation/BatchValidationService.kt`
- `backend/src/main/kotlin/com/company/oms/validation/ValidationErrorRepository.kt`
- `frontend/src/pages/ValidationResultsPage.tsx`

## 3. 마스터 조회 검색/총건수 DB 기반 전환

### 현재 상태

- 상품 마스터와 배송지/차량 마스터 조회는 tenant 기준 목록을 가져온 뒤 메모리 필터링을 수행한다.
- 화면상 검색 버튼 방식과 총건수 표시는 반영되어 있다.

### 추가 필요

- 상품 마스터 조회 조건을 DB query로 전환한다.
- 배송지/차량 마스터 조회 조건도 DB query로 전환한다.
- `ezadmin_code`, `product_name`, `baljugo_code`, `brand_name`, `store_name`, `area`, `vehicle_name`, `active_yn` 검색 인덱스를 검토한다.

### 관련 위치

- `backend/src/main/kotlin/com/company/oms/master/MasterUpsertService.kt`
- `backend/src/main/kotlin/com/company/oms/master/ProductMasterItemRepository.kt`
- `backend/src/main/kotlin/com/company/oms/master/StoreRouteMasterItemRepository.kt`
- `frontend/src/pages/ProductMasterPage.tsx`
- `frontend/src/pages/StoreRouteMasterPage.tsx`

## 4. 감사 로그 검색/총건수 DB 기반 전환

### 현재 상태

- 감사 로그, API 호출 로그, 다운로드 로그 조회가 `findAll()` 후 메모리 필터링을 수행한다.
- 운영 로그가 많아질수록 성능 문제가 생길 수 있다.

### 추가 필요

- 로그별 repository query 또는 Specification을 추가한다.
- tenantId, clientId, batchId, action/path, actor, responseStatus, from/to 조건을 DB에서 처리한다.
- 로그 보관 기간과 인덱스 정책을 함께 정리한다.

### 관련 위치

- `backend/src/main/kotlin/com/company/oms/audit/AuditQueryService.kt`
- `backend/src/main/kotlin/com/company/oms/audit/BatchAuditLogRepository.kt`
- `backend/src/main/kotlin/com/company/oms/externalapi/ApiCallLogRepository.kt`
- `backend/src/main/kotlin/com/company/oms/download/DownloadLogRepository.kt`
- `frontend/src/pages/AuditPage.tsx`

## 5. 마스터 데이터 추가 요청 기능

### 현재 상태

- 배치 확정 요청 기능은 구현되었다.
- 하지만 계획 문서의 `MASTER_DATA_ADD` 요청 유형, 요청 등록/첨부/댓글/처리 이력/마스터 반영 연결 구조는 아직 구현되지 않았다.

### 추가 필요

- 고객사가 상품/배송지/차량/코드 매핑 추가 요청을 등록할 수 있는 기능을 구현한다.
- 물류사가 요청을 접수, 반려, 보완 요청, 완료 처리할 수 있게 한다.
- 요청과 마스터 업로드 이력 또는 마스터 반영 결과를 연결한다.
- 첨부파일 방식인지, 화면 입력 방식인지 운영 정책을 확정한다.
- 요청 처리 상태 이력과 댓글/보완 응답을 남긴다.

### 확인 필요

- 마스터 추가 요청은 파일 첨부형인지 화면 입력형인지 확인 필요.
- 고객사가 직접 작성할 수 있는 마스터 필드 범위 확인 필요.
- 요청 승인 후 물류사가 파일 업로드로 반영할지, 화면에서 직접 추가할지 확인 필요.

### 예상 위치

- `backend/src/main/kotlin/com/company/oms/master/`
- `backend/src/main/kotlin/com/company/oms/notification/`
- `frontend/src/pages/`
- `frontend/src/api/`
- `frontend/src/types/`

## 6. 확정 요청 댓글/보완 대화 구조 고도화

### 현재 상태

- 확정 요청에 review comment와 상태 전환은 존재한다.
- 별도 댓글 스레드나 첨부파일 기반 보완 대화 구조는 아직 제한적이다.

### 추가 필요

- `batch_confirmation_request_comments` 또는 공통 요청 댓글 테이블을 추가한다.
- 고객사와 물류사가 보완 요청/응답을 여러 번 주고받을 수 있게 한다.
- 첨부파일이 필요한 경우 원본 파일 저장소와 연결한다.
- 알림과 댓글 상태를 연결한다.

### 확인 필요

- 보완 요청은 단일 comment로 충분한지, 다회성 대화가 필요한지 확인 필요.
- 보완 자료 첨부가 필요한지 확인 필요.

## 7. 고객사 대시보드 전용 백엔드 집계 API

### 현재 상태

- 프론트에서 CLIENT 스코프용 대시보드 요약을 구성하는 흐름은 있다.
- 일부 집계는 프론트에서 여러 목록 API 결과를 조합해 계산한다.

### 추가 필요

- 고객사 대시보드 전용 집계 API를 만든다.
- 내 확정 요청 현황, 보완 필요 요청, 최근 완료 요청, 오늘/내일 출고 예정, 오류/보류 알림을 서버에서 계산한다.
- 고객사별 공개 범위와 권한 정책을 집계 API에 적용한다.

### 확인 필요

- 고객사 대시보드에서 가장 중요한 KPI가 무엇인지 운영 확인 필요.
- 고객사에게 검증 오류 상세를 어디까지 노출할지 확인 필요.

## 8. 물류사 전체 API / tenant-wide API Key

### 현재 상태

- API Key 테이블은 `client_id` nullable 구조를 가질 수 있다.
- 하지만 현재 구현은 외부 API Key 생성 시 `clientId`가 없으면 거부한다.
- 외부 API 인증도 `apiKey.clientId == null`이면 거부한다.
- 즉, 현재 외부 API는 고객사 단위 Key만 허용한다.

### 추가 필요

- 물류사 전체 API가 실제 운영에 필수인지 먼저 확정한다.
- 허용한다면 API Key scope를 `TENANT` / `CLIENT`로 명확히 구분한다.
- tenant-wide API 응답에는 `clientId`, `clientCode`, `clientName` 등 고객사 식별 필드를 포함한다.
- API 호출 로그의 `client_id` nullable 정책과 조회/감사 기준을 수정한다.
- 프론트 API Key 관리 화면에서 고객사 Key와 물류사 전체 Key를 구분한다.

### 확인 필요

- 물류사 전체 API가 반드시 필요한지 확인 필요.
- 전체 API 응답에서 고객사별 데이터가 섞여 나와도 되는지 확인 필요.
- 외부 연동 시스템이 고객사별 API를 각각 호출할 수 없는지 확인 필요.

### 관련 위치

- `backend/src/main/kotlin/com/company/oms/auth/ApiKeyService.kt`
- `backend/src/main/kotlin/com/company/oms/externalapi/ExternalApiKeyAuthService.kt`
- `backend/src/main/kotlin/com/company/oms/externalapi/ExternalApiController.kt`
- `backend/src/main/kotlin/com/company/oms/externalapi/ExternalApiQueryService.kt`
- `frontend/src/pages/ApiKeysPage.tsx`

## 9. API 호출 제한

### 현재 상태

- 명시적인 rate limit 구현은 없다.
- 429 응답, `X-RateLimit-*` header, Redis/token bucket/sliding window 구조가 아직 없다.
- 계획 문서에서도 `3건` 기준이 초당/분당/동시인지 확인 필요로 남아 있다.

### 추가 필요

- 제한 기준을 확정한다.
- API Key별 제한인지, tenant/client별 제한인지, endpoint별 제한인지 결정한다.
- MVP에서는 메모리 기반 제한으로 시작할지, 운영 기준 Redis 기반으로 갈지 결정한다.
- 제한 초과 시 HTTP `429 Too Many Requests` 응답 포맷을 정의한다.
- 응답 header로 `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` 제공 여부를 정한다.
- API 호출 로그에 제한 초과 이벤트를 남긴다.

### 확인 필요

- `3건` 제한은 초당, 분당, 동시 처리, 일일 호출 중 무엇인지 확인 필요.
- 제한 초과 시 재시도 안내 정책 확인 필요.

## 10. 브랜드/프랜차이즈별 상품코드 매핑

### 현재 상태

- 고객사 코드 매핑 테이블과 검증 활용 흐름은 일부 존재한다.
- 하지만 계획 문서의 브랜드/프랜차이즈별 상품코드 매핑 구조는 아직 구현되지 않았다.
- 최종 요구사항 기준 1차 MVP는 직접 매칭이 기본이므로, 무리하게 확정하면 요구사항과 충돌할 수 있다.

### 추가 필요

- 실제 입력 데이터에서 브랜드/프랜차이즈별 상품코드 충돌 사례가 있는지 확인한다.
- 충돌이 확인되면 `tenant_id + client_id + brand_name + client_product_code -> ezadmin_code` 구조를 검토한다.
- 검증 엔진에서 직접 매칭, 고객사 매핑, 브랜드 매핑의 적용 우선순위를 정한다.
- 물류사가 매핑을 조회/업로드/수정할 수 있는 화면이 필요한지 검토한다.

### 확인 필요

- 프랜차이즈가 브랜드와 같은 개념인지 확인 필요.
- 브랜드명이 입력 엑셀에서 안정적으로 들어오는지 확인 필요.
- 매핑 관리 주체가 고객사인지 물류사인지 확인 필요.

## 11. 모바일 UX P1 개선

### 현재 상태

- P0 치명 깨짐은 없다고 정리되었다.
- 현재는 대량 테이블을 내부 가로 스크롤로 표시하는 방식이 많다.

### 추가 필요

- 모바일 헤더를 압축한다.
- 조회 화면 KPI 카드를 접힘 또는 축약 형태로 개선한다.
- 대량 테이블에 모바일 요약 행 또는 카드 뷰를 제공할지 검토한다.
- 내부 가로 스크롤 힌트를 추가한다.
- 배치 상세/검증 결과에서 모바일 전용 하단 주요 액션 영역을 검토한다.

### 확인 필요

- 모바일에서 실제로 많이 수행할 업무가 단순 조회인지, 확정/반려/보완 요청 같은 운영 액션까지 포함하는지 확인 필요.
- 모바일 주요 사용자가 물류사 운영자인지 고객사 사용자인지 확인 필요.

## 12. 디자인 색상 체계 추가 정리

### 현재 상태

- 일부 공통 Badge와 MetricCard 톤 정리가 진행되었다.
- 하지만 화면 전반에 teal, blue, green, amber, red 등 여러 색상이 여전히 사용된다.

### 추가 필요

- Primary, Neutral, Risk 중심으로 색상 역할을 다시 정리한다.
- Error/Warning/Info는 색상과 텍스트/아이콘을 함께 사용하되, 전체 화면이 과하게 다색으로 보이지 않게 조정한다.
- Badge, MetricCard, Button, Alert의 tone 사용 규칙을 문서화한다.

### 관련 위치

- `frontend/src/components/common/Badge.tsx`
- `frontend/src/components/domain/MetricCard.tsx`
- `frontend/src/components/domain/SeverityBadge.tsx`
- `frontend/src/components/domain/BatchStatusBadge.tsx`
- `frontend/src/styles/index.css`

## 13. 실시간 처리 진행률 고도화

### 현재 상태

- 업로드/검증 화면에 단계별 UI와 처리 상태 문구가 들어갔다.
- 실제 row 단위 진행률, polling, SSE, WebSocket은 아직 없다.

### 추가 필요

- 배치 처리 상태 polling API를 검토한다.
- 검증 실행 중 상태 갱신이 필요하면 batch status와 진행 단계 저장 컬럼을 추가한다.
- row 단위 진행률이 필요하면 처리 job 구조와 progress endpoint를 설계한다.
- 운영 필요성이 확인되면 SSE 또는 WebSocket을 검토한다.

### 확인 필요

- 업로드/검증이 실제 운영에서 얼마나 오래 걸리는지 확인 필요.
- 사용자가 row 단위 진행률까지 필요로 하는지 확인 필요.

## 14. 모바일 캡처 산출물 보강

### 현재 상태

- 기준 문서에는 모바일 점검 결과가 정리되어 있다.
- 별도 스크린샷 산출물 파일은 현재 확인되지 않았다.

### 추가 필요

- 주요 화면별 모바일 스크린샷을 산출물로 저장한다.
- viewport별 최소 390px, 430px, 768px, 1024px 점검 이미지를 남긴다.
- P0/P1 개선 항목과 스크린샷을 연결해 추적 가능하게 만든다.

### 예상 위치

- `docs/mid_presentation_feedback_status_20260602/mobile-screenshots/`

## 15. 자동화 테스트 보강

### 현재 상태

- 백엔드에는 확정 요청, 권한, 외부 API, 검증/확정 관련 테스트가 일부 존재한다.
- 신규 고객사 마스터 공개 설정, 알림, 필터 검색 정확도에 대한 테스트는 더 보강할 여지가 있다.

### 추가 필요

- 배치 목록 검색 조건과 `totalElements` 정확도 테스트를 추가한다.
- Scan/PL/Label 조회 검색 조건별 `totalElements` 테스트를 추가한다.
- 고객사 마스터 공개 설정의 `SCOPED_ONLY`, `ALL_PRODUCTS`, `ALL_STORE_ROUTES` 테스트를 추가한다.
- 알림 생성/읽음 처리 테스트를 추가한다.
- 프론트 주요 화면은 Playwright 기반 모바일 smoke test를 검토한다.

## 16. 문서와 코드 상태 동기화

### 현재 상태

- 기준 계획 문서에는 구현 계획과 일부 점검 결과가 섞여 있다.
- 실제 구현 완료/부분 완료/미해결 상태는 별도 문서로 분리해 추적하는 편이 좋다.

### 추가 필요

- 완료 기능 문서와 추후 기능 문서를 주기적으로 갱신한다.
- 완료 판정은 코드 구현, API 연결, 화면 반영, 테스트 여부를 나누어 기록한다.
- 확인 필요 항목은 회의 질문 목록으로 별도 관리한다.
