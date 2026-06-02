# 중간발표 피드백 기준 추후 추가 및 보완 기능 정리

- 작성일: 2026-06-02
- 기준 문서: `docs/MID_PRESENTATION_FEEDBACK_PRIORITY_IMPLEMENTATION_PLAN_20260601.md`
- 정리 기준: 현재 워킹트리에서 완료되지 않았거나, 부분 구현 상태라 추가 보완이 필요한 항목
- 관리 규칙: 앞으로 구현할 기능은 이 문서를 기준으로 고른다. 구현이 끝난 항목은 `COMPLETED_FEATURES.md`에 완료 근거와 함께 정리하고, 이 문서에서는 삭제하거나 남은 보완 범위만 남긴다.

## 우선순위 산정 기준

| 기준 | 설명 |
|---|---|
| P0 | 다음 구현 순서에서 먼저 잡아야 하는 기능. 조회 신뢰도, 권한별 업무 흐름, 운영 핵심 요청 처리에 직접 영향이 있다. |
| P1 | MVP 운영 품질을 높이는 기능. 당장 막히지는 않지만 실제 사용자 경험, 보안/권한, 성능, 업무 추적에 중요하다. |
| P2 | 정책 확인 또는 실제 사례 확인 후 구현하는 기능. 고도화 성격이 강하거나 운영 환경 선택이 필요하다. |
| P3 | 문서화, 산출물, 자동화처럼 장기 유지보수 품질을 높이는 기능. 구현 기능과 병행 관리한다. |

## 우선순위 요약

| 우선순위 | 기능 | 상태 |
|---|---|---|
| P0 | 조회페이지 스코프별 기본 흐름 정리 | 부분 구현 |
| P0 | 주문 조회 DB 기반 검색/정렬/페이징 전환 | 부분 구현 |
| P0 | 주문 목록 모달/테이블 UX 개선 | 신규 추가 필요 |
| P0 | 마스터 상세 정보 및 관련 주문/배치 연결 | 신규 추가 필요 |
| P0 | 마스터 데이터 추가 요청 기능 | 미구현 |
| P1 | 고객사 API Key 신청/발급 정책 및 화면 | 신규 추가 필요 |
| P1 | 물류사 전체 API / tenant-wide API Key | 미구현 |
| P1 | 물류사 대시보드 재점검 및 보완 | 신규 추가 필요 |
| P1 | 고객사 대시보드 전용 백엔드 집계 API | 부분 구현 |
| P1 | 검증 결과 검색/총건수 DB 기반 전환 | 부분 구현 |
| P1 | 마스터 조회 검색/총건수 DB 기반 전환 | 부분 구현 |
| P1 | 감사 로그 검색/총건수 DB 기반 전환 | 부분 구현 |
| P1 | 확정 요청 댓글/보완 대화 구조 고도화 | 부분 구현 |
| P1 | 모바일 UX 개선 | 부분 구현 |
| P1 | 디자인 색상 체계 추가 정리 | 부분 구현 |
| P2 | API 호출 제한 | 미구현, 정책 확인 필요 |
| P2 | 브랜드/프랜차이즈별 상품코드 매핑 | 미구현, 사례 확인 필요 |
| P2 | 실시간 처리 진행률 고도화 | 부분 구현 |
| P3 | 모바일 캡처 산출물 보강 | 문서만 있음 |
| P3 | 자동화 테스트 보강 | 일부 테스트 있음 |
| P3 | 문서와 코드 상태 동기화 | 관리 중 |

---

# P0. 우선 구현 후보

## P0-1. 조회페이지 스코프별 기본 흐름 정리

세부 구현계획: `docs/mid_presentation_feedback_status_20260602/P0_1_QUERY_PAGE_SCOPE_FLOW_IMPLEMENTATION_PLAN.md`

### 현재 상태

- CLIENT/TENANT/SYSTEM 사용자 스코프와 기본 권한 구조는 구현되어 있다.
- 조회페이지별로 사용자 스코프에 따른 기본 진입 흐름이 1차 구현되었다.
- TENANT 사용자는 고객사 선택 리스트를 먼저 보고, 고객사 선택 후 배치 선택으로 진입한다.
- CLIENT 사용자는 자기 고객사의 배치 목록을 먼저 보고, 배치 선택 후 주문/Scan/PL/Label을 조회한다.
- 주문/Scan/PL은 오늘 이후 날짜 범위를 기본값으로 둔다.
- SYSTEM tenant 선택 정책과 Label 날짜 기준은 아직 확인 필요로 남아 있다.

### 추가 필요

- CLIENT 사용자가 로그인한 경우:
  - 자기 `tenantId + clientId` 범위만 조회한다.
  - 조회페이지에서 고객사 선택은 노출하지 않는다.
  - 첫 진입 시에는 해당 고객사의 배치 목록을 먼저 보여주고, 사용자가 배치를 선택하게 한다.
  - 주문 조회는 기본적으로 선택한 배치 기준으로 보여준다.
  - 배치 선택 후 필요하면 납기일/상태 필터를 추가로 조정해 주문/Scan/PL/Label을 조회한다.
  - 기본 조회 대상은 납기일이 아직 미래인 주문 또는 오늘 이후 예정 데이터로 둔다.

- TENANT 사용자가 로그인한 경우:
  - 먼저 고객사를 선택하게 한다.
  - 고객사를 선택하지 않은 상태에서는 배치 목록/조회 결과를 바로 보여주기보다 고객사 선택 리스트를 표시한다.
  - 고객사 선택 후 해당 고객사의 배치 목록을 보여주고, 배치 선택 후 주문/Scan/PL/Label을 조회한다.
  - 기본 조회 대상은 선택 고객사의 미래 납기 주문으로 둔다.

- SYSTEM 사용자가 로그인한 경우:
  - tenant 선택 정책이 아직 명확하지 않으므로 `확인 필요`로 둔다.
  - 임시 구현이 필요하면 tenant 선택 후 TENANT 사용자와 같은 흐름을 적용한다.

### 확인 필요

- “미래인 주문” 기준이 `납기요청일 >= 오늘`인지, `배송일 >= 오늘`인지 확인 필요.
- 과거 주문은 기본 숨김으로 둘지, 필터로 열 수 있게 할지 확인 필요.
- TENANT 사용자가 고객사를 선택하지 않아도 전체 고객사 통합 조회가 필요한지 확인 필요.

### 예상 위치

- `frontend/src/pages/OrdersPage.tsx`
- `frontend/src/pages/ScanLinesPage.tsx`
- `frontend/src/pages/PlLinesPage.tsx`
- `frontend/src/pages/LabelLinesPage.tsx`
- `frontend/src/app/clientContext.ts`
- `frontend/src/app/auth.ts`
- `backend/src/main/kotlin/com/company/oms/order/OrderQueryController.kt`
- `backend/src/main/kotlin/com/company/oms/scan/ScanQueryController.kt`
- `backend/src/main/kotlin/com/company/oms/pl/PlQueryController.kt`
- `backend/src/main/kotlin/com/company/oms/label/LabelQueryController.kt`

## P0-2. 주문 조회 DB 기반 검색/정렬/페이징 전환

### 현재 상태

- 프론트에는 검색 버튼 방식과 `totalElements` 표시가 반영되어 있다.
- 백엔드 `OrderQueryService`는 아직 `findAll()` 후 메모리 필터링, 정렬, 페이징을 수행한다.
- 주문 목록의 정렬 요구가 추가되었으므로 DB 기반 정렬 전환이 더 중요해졌다.

### 추가 필요

- 주문 조회를 Scan/PL/Label처럼 JPA Specification 또는 명시적 query 기반으로 전환한다.
- `storeName`, `brandName`, `productName`, `vehicleName`, `dueDateFrom`, `dueDateTo`, `confirmedOnly` 조건을 DB 단계에서 처리한다.
- `sortBy`, `sortDirection`을 백엔드 query parameter로 받고 DB query에서 정렬한다.
- 프론트 주문 테이블의 컬럼 헤더에서 오름차순/내림차순을 전환할 수 있게 한다.
- 정렬 가능한 컬럼은 주문번호, 고객사, 배치번호, 거래처코드, 거래처명, 브랜드, 품목코드, 품목명, 납기일, 수량, 배치 상태 정도로 시작한다.

### 관련 위치

- `backend/src/main/kotlin/com/company/oms/order/OrderQueryService.kt`
- `backend/src/main/kotlin/com/company/oms/order/OrderLineRepository.kt`
- `frontend/src/pages/OrdersPage.tsx`
- `frontend/src/components/data/DataTable.tsx`

## P0-3. 주문 목록 모달/테이블 UX 개선

### 현재 상태

- 주문 목록 화면에는 필터와 테이블이 있다.
- 주문 상세 또는 선택 모달에서 더 빠르게 주문을 찾는 전용 검색/드롭다운 UI는 아직 부족하다.

### 추가 필요

- 주문 목록 또는 주문 선택 모달에 검색 input을 추가한다.
- 단순 텍스트 검색 외에 드롭다운 필터를 제공한다.
- 드롭다운 후보:
  - 고객사
  - 배치
  - 배치 상태
  - 납기일 범위
  - 브랜드
  - 거래처/배송지
  - 품목
- 검색 input은 주문번호, 거래처코드, 거래처명, 품목코드, 품목명을 대상으로 한다.
- 모달 안에서도 검색 버튼 방식과 `검색 필요` 상태를 유지한다.
- 테이블 컬럼 오름차순/내림차순 정렬 UI를 추가한다.

### 확인 필요

- 주문 모달은 “상세 보기 모달”인지 “다른 화면에서 주문을 선택하는 모달”인지 화면 목적을 확정해야 한다.
- 모달에서 전체 주문을 검색할지, 현재 선택된 고객사/배치 안에서만 검색할지 확인 필요.

### 예상 위치

- `frontend/src/pages/OrdersPage.tsx`
- `frontend/src/components/data/DataTable.tsx`
- `frontend/src/components/common/Select.tsx`
- `frontend/src/components/common/Input.tsx`

## P0-4. 마스터 상세 정보 및 관련 주문/배치 연결

### 현재 상태

- 상품 마스터, 배송지/차량 마스터 조회 화면은 존재한다.
- 현재는 마스터 row의 기본 필드 중심으로 표시된다.
- 특정 마스터가 실제 어떤 주문/배치/검증 오류에 사용되었는지 한 화면에서 보기 어렵다.

### 추가 필요

- 상품 마스터 상세 화면 또는 상세 모달을 추가한다.
- 배송지/차량 마스터 상세 화면 또는 상세 모달을 추가한다.
- 마스터 상세에서 관련 운영 데이터를 연결해 보여준다.

상품 마스터 상세 후보:

- 상품 기본정보
- 최근 사용 배치
- 해당 상품코드가 포함된 주문 목록
- 해당 상품코드가 포함된 Scan/PL/Label row 요약
- 해당 상품코드 관련 검증 오류 이력
- 고객사별 공개 여부
- 고객사 코드 매핑 또는 브랜드별 매핑 후보

배송지/차량 마스터 상세 후보:

- 발주고/배송지 기본정보
- 차량명, 차수, 권역, 담당기사 등 배송 정보
- 해당 발주고가 포함된 주문 목록
- 해당 발주고가 포함된 최근 배치
- 해당 발주고 관련 검증 오류 이력
- 고객사별 공개 여부

### 확인 필요

- 마스터 상세에서 주문 목록은 전체 기간을 보여줄지, 기본으로 미래 납기 주문만 보여줄지 확인 필요.
- 주소, 차량, 기사 정보는 고객사에게 어디까지 보여줄지 확인 필요.

### 예상 위치

- `frontend/src/pages/ProductMasterPage.tsx`
- `frontend/src/pages/StoreRouteMasterPage.tsx`
- `backend/src/main/kotlin/com/company/oms/master/`
- `backend/src/main/kotlin/com/company/oms/order/`
- `backend/src/main/kotlin/com/company/oms/validation/`

## P0-5. 마스터 데이터 추가 요청 기능

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

---

# P1. MVP 운영 품질 보완

## P1-1. 고객사 API Key 신청/발급 정책 및 화면

### 현재 상태

- 물류사 관리자가 고객사 단위 API Key를 발급하는 화면과 API는 존재한다.
- 고객사가 직접 API Key를 신청하고 즉시 받는지, 물류사 승인 후 받는지에 대한 정책은 아직 정리되지 않았다.

### 추가 필요

- 고객사 API Key 신청 화면을 검토한다.
- 신청 항목 후보:
  - 사용 목적
  - 필요한 scope: WOS Scan, PL Picking List
  - 사용 시스템명
  - 담당자 연락처
  - 만료 희망일
- 발급 정책을 둘 중 하나로 확정한다.
  - 즉시 발급: CLIENT 권한 사용자가 신청하면 바로 API Key를 발급한다.
  - 승인 후 발급: CLIENT가 신청하면 TENANT 물류사가 승인해야 API Key가 발급된다.
- 발급, 반려, 회수, 만료, 재발급 이력을 남긴다.
- API Key는 생성 시 1회만 원문을 보여주는 현재 정책을 유지한다.

### 확인 필요

- 고객사에게 API Key 즉시 발급을 허용해도 되는지 확인 필요.
- 물류사 승인 절차가 필수인지 확인 필요.
- 고객사 API Key의 기본 만료 기간을 정해야 한다.

### 예상 위치

- `backend/src/main/kotlin/com/company/oms/auth/ApiKeyService.kt`
- `backend/src/main/kotlin/com/company/oms/auth/ApiKeyController.kt`
- `frontend/src/pages/ApiKeysPage.tsx`
- `frontend/src/pages/ClientPublicMasterPage.tsx`
- `frontend/src/types/apiKey.ts`

## P1-2. 물류사 전체 API / tenant-wide API Key

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

## P1-3. 물류사 대시보드 재점검 및 보완

### 현재 상태

- 대시보드에는 운영 지표와 고객사 스코프용 요약이 일부 반영되어 있다.
- 고객사 대시보드 필요성은 문서화되어 있으나, 물류사 대시보드가 실제 운영자에게 충분한지는 별도 재점검이 필요하다.

### 추가 필요

- TENANT 물류사 대시보드의 핵심 질문을 정리한다.
  - 오늘 처리해야 할 배치는 무엇인가?
  - Error가 있는 배치는 어디인가?
  - 고객사 확정 요청은 몇 건인가?
  - 보완 요청 후 다시 올라온 배치는 무엇인가?
  - 외부 API 제공 가능한 배치는 무엇인가?
  - 라벨 다운로드 가능한 배치는 무엇인가?
- 물류사 대시보드 카드와 테이블을 실제 운영 동선 기준으로 재배치한다.
- 고객사별 요약, 납기일별 요약, 오류 유형 TOP, 확정 요청함 바로가기, API 제공 상태 바로가기를 검토한다.

### 확인 필요

- 물류사가 첫 화면에서 가장 먼저 보고 싶은 지표가 무엇인지 확인 필요.
- 시연용 대시보드와 실제 운영용 대시보드를 같은 화면으로 둘지 확인 필요.

### 예상 위치

- `frontend/src/pages/DashboardPage.tsx`
- `backend/src/main/kotlin/com/company/oms/notification/WorkItemSummaryService.kt`
- `backend/src/main/kotlin/com/company/oms/upload/OisUploadService.kt`

## P1-4. 고객사 대시보드 전용 백엔드 집계 API

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

## P1-5. 검증 결과 검색/총건수 DB 기반 전환

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

## P1-6. 마스터 조회 검색/총건수 DB 기반 전환

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

## P1-7. 감사 로그 검색/총건수 DB 기반 전환

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

## P1-8. 확정 요청 댓글/보완 대화 구조 고도화

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

## P1-9. 모바일 UX 개선

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

## P1-10. 디자인 색상 체계 추가 정리

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

---

# P2. 정책 확인 후 구현

## P2-1. API 호출 제한

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

## P2-2. 브랜드/프랜차이즈별 상품코드 매핑

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

## P2-3. 실시간 처리 진행률 고도화

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

---

# P3. 산출물 및 유지보수 보강

## P3-1. 모바일 캡처 산출물 보강

### 현재 상태

- 기준 문서에는 모바일 점검 결과가 정리되어 있다.
- 별도 스크린샷 산출물 파일은 현재 확인되지 않았다.

### 추가 필요

- 주요 화면별 모바일 스크린샷을 산출물로 저장한다.
- viewport별 최소 390px, 430px, 768px, 1024px 점검 이미지를 남긴다.
- P0/P1 개선 항목과 스크린샷을 연결해 추적 가능하게 만든다.

### 예상 위치

- `docs/mid_presentation_feedback_status_20260602/mobile-screenshots/`

## P3-2. 자동화 테스트 보강

### 현재 상태

- 백엔드에는 확정 요청, 권한, 외부 API, 검증/확정 관련 테스트가 일부 존재한다.
- 신규 고객사 마스터 공개 설정, 알림, 필터 검색 정확도에 대한 테스트는 더 보강할 여지가 있다.

### 추가 필요

- 배치 목록 검색 조건과 `totalElements` 정확도 테스트를 추가한다.
- Scan/PL/Label 조회 검색 조건별 `totalElements` 테스트를 추가한다.
- 고객사 마스터 공개 설정의 `SCOPED_ONLY`, `ALL_PRODUCTS`, `ALL_STORE_ROUTES` 테스트를 추가한다.
- 알림 생성/읽음 처리 테스트를 추가한다.
- 프론트 주요 화면은 Playwright 기반 모바일 smoke test를 검토한다.

## P3-3. 문서와 코드 상태 동기화

### 현재 상태

- 기준 계획 문서에는 구현 계획과 일부 점검 결과가 섞여 있다.
- 실제 구현 완료/부분 완료/미해결 상태는 별도 문서로 분리해 추적한다.

### 추가 필요

- 완료 기능 문서와 추후 기능 문서를 주기적으로 갱신한다.
- 완료 판정은 코드 구현, API 연결, 화면 반영, 테스트 여부를 나누어 기록한다.
- 확인 필요 항목은 회의 질문 목록으로 별도 관리한다.
