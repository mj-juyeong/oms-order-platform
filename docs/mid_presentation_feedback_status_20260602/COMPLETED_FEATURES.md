# 중간발표 피드백 기준 완료 기능 정리

- 작성일: 2026-06-02
- 기준 문서: `docs/MID_PRESENTATION_FEEDBACK_PRIORITY_IMPLEMENTATION_PLAN_20260601.md`
- 정리 기준: 현재 워킹트리의 코드와 문서 변경사항 기준
- 주의: 테스트를 새로 실행한 결과가 아니라, 구현 파일 존재 여부와 코드 흐름 대조 기준의 완료 판정이다.
- 관리 규칙: 새 구현이 완료되면 이 문서에 완료 내용, 관련 파일, 확인 방법을 추가한다. 앞으로 구현할 항목은 `FUTURE_FEATURES.md`에서 관리한다.

## 1. 모바일 현재 상태 점검

### 완료 내용

- 주요 화면 모바일 1차 점검 결과가 기준 문서에 반영되었다.
- 점검 viewport는 `390 x 844`, `430 x 932`, `768 x 1024`, `1024 x 768`로 정리되었다.
- 로그인, 대시보드, 업로드, 배치 목록, 배치 상세, 검증 결과, 주문/Scan/PL/Label 조회, 상품 마스터, 배송지/차량 마스터에 대한 1차 결과가 문서화되었다.
- P0 판단으로 치명적인 전역 가로 overflow나 모달 좌우 잘림은 없다고 정리되었다.

### 관련 위치

- `docs/MID_PRESENTATION_FEEDBACK_PRIORITY_IMPLEMENTATION_PLAN_20260601.md`

## 2. 배치 목록 검색 결과 총 건수 정확화

### 완료 내용

- 배치 목록 API가 `keyword`, `deliveryDateFrom`, `deliveryDateTo`, `errorOnly`, `status` 조건을 백엔드 query parameter로 받도록 확장되었다.
- 백엔드에서 JPA Specification 기반으로 조건을 적용하고, `PageResponse.totalElements`, `totalPages`를 반환한다.
- 프론트엔드는 백엔드의 `totalElements`를 기준으로 총 조회 건수를 표시한다.

### 관련 위치

- `backend/src/main/kotlin/com/company/oms/upload/OisUploadController.kt`
- `backend/src/main/kotlin/com/company/oms/upload/OisUploadService.kt`
- `frontend/src/pages/BatchesPage.tsx`
- `frontend/src/api/batches.ts`

## 3. Scan / PL / Label 조회 검색 결과 총 건수 정확화

### 완료 내용

- Scan, PL, Label 조회 API가 주요 검색 조건을 백엔드 query parameter로 받도록 확장되었다.
- Scan, PL, Label 조회 서비스는 JPA Specification과 `PageRequest`를 사용한다.
- 검색 조건 적용 후의 전체 건수를 `totalElements`로 반환한다.
- 프론트엔드는 현재 페이지에서 다시 필터링한 건수가 아니라 백엔드 검색 결과 전체 건수를 표시한다.

### 관련 위치

- `backend/src/main/kotlin/com/company/oms/scan/ScanQueryController.kt`
- `backend/src/main/kotlin/com/company/oms/scan/ScanQueryService.kt`
- `backend/src/main/kotlin/com/company/oms/pl/PlQueryController.kt`
- `backend/src/main/kotlin/com/company/oms/pl/PlQueryService.kt`
- `backend/src/main/kotlin/com/company/oms/label/LabelQueryController.kt`
- `backend/src/main/kotlin/com/company/oms/label/LabelQueryService.kt`
- `frontend/src/pages/ScanLinesPage.tsx`
- `frontend/src/pages/PlLinesPage.tsx`
- `frontend/src/pages/LabelLinesPage.tsx`

## 4. 필터 검색 버튼 방식 전환

### 완료 내용

- 주요 목록 화면에 입력 중 필터와 실제 적용 필터를 분리하는 패턴이 적용되었다.
- 사용자가 필터를 입력하는 것만으로 API를 즉시 호출하지 않고, `검색` 버튼을 눌렀을 때 적용되도록 변경되었다.
- 적용되지 않은 필터가 있을 때 `검색 필요` 상태를 표시한다.
- 검색 조건 적용 시 페이지를 첫 페이지로 초기화하는 흐름이 들어갔다.

### 관련 위치

- `frontend/src/components/data/FilterBar.tsx`
- `frontend/src/pages/BatchesPage.tsx`
- `frontend/src/pages/ScanLinesPage.tsx`
- `frontend/src/pages/PlLinesPage.tsx`
- `frontend/src/pages/LabelLinesPage.tsx`
- `frontend/src/pages/ProductMasterPage.tsx`
- `frontend/src/pages/StoreRouteMasterPage.tsx`
- `frontend/src/pages/OrdersPage.tsx`
- `frontend/src/pages/AuditPage.tsx`
- `frontend/src/utils/filterState.ts`

## 5. 고객사 배치 확정 요청 흐름

### 완료 내용

- 고객사가 Error 0건 배치에 대해 물류사에 확정 요청을 보낼 수 있는 흐름이 구현되었다.
- 배치 상태에 `CONFIRMATION_REQUESTED`, `NEEDS_MORE_INFO`, `REJECTED`가 추가되었다.
- 확정 요청 테이블과 엔티티, repository, service, controller가 추가되었다.
- 물류사는 확정 요청 목록에서 승인, 반려, 보완 요청을 처리할 수 있다.
- 승인 시 배치가 최종 `CONFIRMED` 상태로 전환된다.
- CLIENT 사용자는 확정 요청은 가능하지만 직접 최종 확정은 할 수 없도록 권한이 분리되었다.
- 확정 요청, 승인, 반려, 보완 요청은 감사 로그와 알림 흐름에 연결되었다.

### 관련 위치

- `backend/src/main/kotlin/com/company/oms/common/persistence/OmsEnums.kt`
- `backend/src/main/kotlin/com/company/oms/batch/BatchConfirmationRequestEntity.kt`
- `backend/src/main/kotlin/com/company/oms/batch/BatchConfirmationRequestRepository.kt`
- `backend/src/main/kotlin/com/company/oms/batch/BatchConfirmationRequestService.kt`
- `backend/src/main/kotlin/com/company/oms/batch/BatchConfirmationRequestController.kt`
- `backend/src/main/resources/db/migration/V9__batch_confirmation_requests.sql`
- `frontend/src/pages/BatchConfirmationRequestsPage.tsx`
- `frontend/src/pages/BatchDetailPage.tsx`
- `frontend/src/pages/UploadsPage.tsx`
- `frontend/src/api/batches.ts`
- `frontend/src/types/batch.ts`

## 6. 고객사 보완 요청 후 재업로드 흐름

### 완료 내용

- 물류사가 `NEEDS_MORE_INFO`로 보완 요청한 배치에 대해 보완본 업로드 흐름이 추가되었다.
- 보완 업로드는 원 배치와 `parentBatchId`, `revisionNo`, `reuploadReason` 개념으로 연결된다.
- 보완본 업로드 후 기존 요청과 배치 상세에서 보완 상태를 추적할 수 있는 구조가 들어갔다.

### 관련 위치

- `backend/src/main/kotlin/com/company/oms/upload/OisUploadService.kt`
- `backend/src/main/kotlin/com/company/oms/upload/OisUploadDtos.kt`
- `backend/src/main/kotlin/com/company/oms/batch/UploadBatchEntity.kt`
- `backend/src/main/resources/db/migration/V12__batch_supplement_uploads.sql`
- `frontend/src/pages/BatchDetailPage.tsx`

## 7. 고객사별 마스터 공개 설정

### 완료 내용

- 고객사별 상품 마스터 공개 모드와 배송지/발주고 공개 모드를 설정하는 구조가 추가되었다.
- 기본 모드는 `SCOPED_ONLY`이고, 물류사가 `ALL_PRODUCTS`, `ALL_STORE_ROUTES`로 확장 공개할 수 있다.
- 가격, 공급처, 내부 경로 같은 민감 필드는 별도 노출 옵션으로 분리되었다.
- 고객사별 사용 범위 테이블이 추가되었다.
- 고객사 공개용 상품/발주고 마스터 조회 API와 화면이 추가되었다.

### 관련 위치

- `backend/src/main/kotlin/com/company/oms/master/ClientMasterVisibilityController.kt`
- `backend/src/main/kotlin/com/company/oms/master/ClientMasterVisibilityService.kt`
- `backend/src/main/kotlin/com/company/oms/master/ClientMasterVisibilitySettingEntity.kt`
- `backend/src/main/kotlin/com/company/oms/master/ClientProductMasterScopeEntity.kt`
- `backend/src/main/kotlin/com/company/oms/master/ClientStoreRouteMasterScopeEntity.kt`
- `backend/src/main/resources/db/migration/V10__client_master_visibility.sql`
- `frontend/src/pages/ClientMasterVisibilitySettingsPage.tsx`
- `frontend/src/pages/ClientPublicMasterPage.tsx`
- `frontend/src/api/masters.ts`
- `frontend/src/types/master.ts`

## 8. 알림 및 작업 요약

### 완료 내용

- 확정 요청, 승인, 반려, 보완 요청에 대한 알림 구조가 추가되었다.
- 알림 목록, 읽음 처리, 전체 읽음 처리, 미읽음 카운트가 구현되었다.
- Header의 알림 벨과 알림 전용 화면이 추가되었다.
- 작업 요약 API가 확정 요청, 보완 필요 배치, 반려 요청, 검증 오류 배치 등을 집계한다.
- Header 알림 벨은 새 미읽음 알림이 들어오면 최대 3건까지 토스트로 즉시 보여주고, 자동 닫기와 수동 닫기를 모두 지원한다.
- 물류사가 확정 요청을 승인, 반려, 보완 요청 처리한 직후 알림 변경 이벤트를 발생시켜 헤더 미읽음 수와 알림 목록이 즉시 다시 동기화된다.
- 보완 업로드 배치 승인 후 고객사 사용자에게 승인 알림이 생성되고, 미읽음 카운트와 배치 상세 링크가 내려가는 흐름을 통합 테스트로 확인할 수 있다.

### 관련 위치

- `backend/src/main/kotlin/com/company/oms/notification/`
- `backend/src/main/resources/db/migration/V11__notifications.sql`
- `backend/src/test/kotlin/com/company/oms/ValidationConfirmApiTest.kt`
- `frontend/src/components/domain/NotificationBell.tsx`
- `frontend/src/pages/BatchConfirmationRequestsPage.tsx`
- `frontend/src/pages/NotificationsPage.tsx`
- `frontend/src/api/notifications.ts`
- `frontend/src/types/notification.ts`

## 9. 고객사 대시보드 1차 반영

### 완료 내용

- 사용자 스코프에 따라 대시보드 구성을 분기하는 프론트 구조가 추가되었다.
- CLIENT 스코프에서는 내 배치/요청 상태, 보완 필요, 확정 요청 가능 배치, 납품/출고 예정 성격의 요약을 보여주는 방향으로 구성되었다.

### 관련 위치

- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/app/auth.ts`

## 10. 업로드/검증 처리 단계 피드백

### 완료 내용

- 업로드 화면에 단계별 상태 표시와 처리 중 overlay/상태 문구가 강화되었다.
- 검증 결과에 따라 확정 요청 가능, 확정 불가, 확정 요청 완료 상태를 구분한다.
- 업로드 단계 애니메이션과 상태 전환 UI가 추가되었다.

### 관련 위치

- `frontend/src/pages/UploadsPage.tsx`
- `frontend/src/styles/index.css`
- `frontend/src/components/common/FullScreenLoadingOverlay.tsx`

## 11. 권한 흐름 보강

### 완료 내용

- 사용자 스코프 `SYSTEM`, `TENANT`, `CLIENT` 기반 접근 제어가 보강되었다.
- CLIENT 사용자는 자기 고객사 범위의 데이터만 접근하도록 설계되었다.
- TENANT 관리자는 자기 tenant 범위에서 사용자, 고객사, 배치, 확정 요청을 관리한다.
- CLIENT OPERATOR는 확정 요청을 보낼 수 있지만, 최종 확정 권한은 없다.

### 관련 위치

- `backend/src/main/kotlin/com/company/oms/auth/AccessScopeService.kt`
- `backend/src/main/kotlin/com/company/oms/auth/UserManagementService.kt`
- `backend/src/main/kotlin/com/company/oms/common/scope/ClientScopeService.kt`
- `frontend/src/app/auth.ts`

## 12. 주문 조회 DB 기반 검색/정렬/페이징 전환

### 완료 내용

- 주문 조회 백엔드가 `findAll()` 후 메모리 필터링/정렬/페이징을 수행하던 흐름에서 JPA Specification과 `PageRequest`, `Sort` 기반 조회로 전환되었다.
- 주문 조회 API가 검색 조건과 `sortBy`, `sortDirection`을 받아 DB 조회 단계에서 검색, 정렬, 페이징을 처리한다.
- 주문 조회 응답은 백엔드 `totalElements`, `totalPages` 기준으로 총건수와 페이지 정보를 표시한다.
- 주문번호, 고객사, 배치번호, 거래처코드, 거래처명, 브랜드, 품목코드, 품목명, 납기일, 주문량, 배치 상태 정렬을 지원한다.
- 배치 상태, 고객사명처럼 연관 엔티티 기반 정렬이 필요한 항목을 처리하기 위해 주문 라인 엔티티에 조회용 연관 매핑이 보강되었다.

### 관련 위치

- `backend/src/main/kotlin/com/company/oms/order/OrderLineEntity.kt`
- `backend/src/main/kotlin/com/company/oms/order/OrderLineRepository.kt`
- `backend/src/main/kotlin/com/company/oms/order/OrderQueryService.kt`
- `backend/src/test/kotlin/com/company/oms/Phase7ApiTest.kt`
- `frontend/src/pages/OrdersPage.tsx`

### 확인 방법

- `./gradlew.bat test --tests com.company.oms.Phase7ApiTest`
- `npm.cmd run build`

## 13. 주문 목록 모달/테이블 UX 개선

### 완료 내용

- 주문 목록 페이지의 브랜드별, 상품별, 거래처별, 차량별, 배치별 상세 모달에 검색 input과 검색 유형 드롭다운이 추가되었다.
- 모달 검색은 주문번호, 거래처코드, 거래처명, 품목코드, 품목명을 대상으로 동작한다.
- 모달 검색 input은 남는 영역을 채우도록 레이아웃이 조정되었다.
- 주문 목록 테이블의 정렬 UI는 별도 드롭다운 2개 대신 `정렬: ...` 단일 메뉴와 테이블 헤더 정렬을 함께 사용하는 방식으로 정리되었다.
- `전체 고객사 보기`, `전체 배치 보기` 버튼 크기와 노출 조건이 개선되었다.
- 물류사 계정에서도 배치 선택/조회 상태에서 `전체 고객사 보기`를 사용할 수 있게 되었다.

### 관련 위치

- `frontend/src/pages/OrdersPage.tsx`
- `frontend/src/components/domain/SelectedBatchScopeBar.tsx`
- `frontend/src/components/data/SortMenu.tsx`
- `frontend/src/components/common/Button.tsx`

### 확인 방법

- `npm.cmd run build`
- 브라우저에서 `/orders` 주문 조회 화면과 주문 그룹 상세 모달을 확인한다.

## 14. 조회 테이블 공통 정렬 UX 개선

### 완료 내용

- 주문, Scan, PL, Label 조회 테이블의 정렬 컨트롤이 공통 `SortMenu` 컴포넌트로 통일되었다.
- 화면 우측에 항상 노출되던 정렬 필드/방향 드롭다운 2개를 하나의 정렬 메뉴로 정리해 테이블 액션 영역의 밀도를 낮췄다.
- 데스크톱에서는 테이블 헤더 클릭 정렬을 유지하고, 모바일/좁은 화면에서는 상단 정렬 메뉴로 정렬 기준과 방향을 바꿀 수 있게 했다.
- Scan, PL, Label 조회 API 호출에도 `sortBy`, `sortDirection` 전달이 반영되었다.

### 관련 위치

- `frontend/src/components/data/SortMenu.tsx`
- `frontend/src/components/data/DataTable.tsx`
- `frontend/src/components/data/index.ts`
- `frontend/src/pages/OrdersPage.tsx`
- `frontend/src/pages/ScanLinesPage.tsx`
- `frontend/src/pages/PlLinesPage.tsx`
- `frontend/src/pages/LabelLinesPage.tsx`

### 확인 방법

- `npm.cmd run build`
- 브라우저에서 `/orders`, `/scan-lines`, `/pl-lines`, `/label-lines`의 정렬 메뉴 렌더링을 확인한다.

## 15. 공통 페이지 뒤로가기 UX 1차 반영

### 완료 내용

- 공통 레이아웃의 breadcrumb 왼쪽에 뒤로가기 아이콘 버튼이 추가되었다.
- 버튼은 현재 UI 톤에 맞게 배경/테두리/그림자를 제거한 고스트 아이콘 형태로 정리되었다.
- 일반 페이지에서는 히스토리가 있으면 `navigate(-1)`을 사용하고, 직접 진입처럼 히스토리가 없으면 안전한 fallback 경로로 이동한다.
- 배치 상세 계열은 fallback을 `/batches`로 둔다.
- 주문, Scan, PL, Label 조회에서 배치 선택 후 결과 화면으로 들어간 상태에서는 뒤로가기 버튼이 브라우저 뒤로가기가 아니라 배치 선택 단계로 돌아가도록 override된다.

### 관련 위치

- `frontend/src/components/layout/AppShell.tsx`
- `frontend/src/components/layout/PageBackContext.tsx`
- `frontend/src/components/layout/index.ts`
- `frontend/src/pages/OrdersPage.tsx`
- `frontend/src/pages/ScanLinesPage.tsx`
- `frontend/src/pages/PlLinesPage.tsx`
- `frontend/src/pages/LabelLinesPage.tsx`

### 확인 방법

- `npm.cmd run build`
- 브라우저에서 `/orders` 배치 조회 상태의 뒤로가기 버튼이 배치 선택 화면으로 돌아가는지 확인한다.
- 브라우저에서 `/client-masters` 같은 일반 페이지의 breadcrumb 왼쪽 뒤로가기 버튼 위치와 스타일을 확인한다.

## 16. 조회페이지 스코프별 기본 흐름 정리

### 완료 내용

- 주문, Scan, PL, Label 조회 화면이 `고객사 선택 -> 배치 선택 또는 전체 배치 보기 -> 결과 조회` 흐름으로 정리되었다.
- 배치 컨텍스트가 `단일 배치`와 `전체 배치` 모드를 함께 저장하도록 바뀌어, 화면 이동 후에도 조회 기준을 안정적으로 복원한다.
- 조회 결과 화면에서 고객사 다시 선택, 배치 다시 선택, 브라우저 뒤로가기 override가 공통 흐름으로 맞춰졌다.
- TENANT 사용자는 고객사 미선택 상태를 별도 차단 상태로 처리하고, CLIENT 사용자는 잠긴 고객사 스코프로 바로 진입한다.

### 관련 위치

- `frontend/src/app/batchContext.ts`
- `frontend/src/app/clientContext.ts`
- `frontend/src/hooks/useQueryScope.ts`
- `frontend/src/components/domain/BatchSelectionPanel.tsx`
- `frontend/src/components/domain/SelectedBatchScopeBar.tsx`
- `frontend/src/pages/OrdersPage.tsx`
- `frontend/src/pages/ScanLinesPage.tsx`
- `frontend/src/pages/PlLinesPage.tsx`
- `frontend/src/pages/LabelLinesPage.tsx`

### 확인 방법

- `npm.cmd run build`
- 브라우저에서 `/orders`, `/scan-lines`, `/pl-lines`, `/label-lines` 진입 시 고객사 선택, 배치 선택, 전체 배치 보기 흐름을 확인한다.

## 17. 마스터 상세 정보 및 관련 주문/배치 연결

### 완료 내용

- 상품/배송지-차량 마스터 목록 행 클릭 시 상세 모달이 열리고, 최근 반영 파일, 최근 확정 배치, 관련 주문, 검증 오류, 사용량 요약을 함께 보여준다.
- 고객사 공개 마스터 화면에서도 동일한 상세 조회 흐름을 제공한다.
- 마스터 목록 응답에 최근 확정 배치 정보가 포함되어 목록과 모바일 카드에서 최근 사용 시점을 바로 확인할 수 있다.
- 마스터 업서트는 동일 데이터 재반영 시에도 마지막 업로드 배치와 원본 row 정보를 갱신하도록 보강되었다.

### 관련 위치

- `backend/src/main/kotlin/com/company/oms/master/MasterController.kt`
- `backend/src/main/kotlin/com/company/oms/master/MasterDtos.kt`
- `backend/src/main/kotlin/com/company/oms/master/MasterDetailService.kt`
- `backend/src/main/kotlin/com/company/oms/master/MasterConfirmedUsageService.kt`
- `backend/src/main/kotlin/com/company/oms/master/MasterUpsertService.kt`
- `frontend/src/components/domain/MasterDetailModal.tsx`
- `frontend/src/pages/ProductMasterPage.tsx`
- `frontend/src/pages/StoreRouteMasterPage.tsx`
- `frontend/src/pages/ClientPublicMasterPage.tsx`
- `frontend/src/api/masters.ts`

### 확인 방법

- `./gradlew.bat test --tests com.company.oms.ValidationConfirmApiTest`
- `npm.cmd run build`

## 18. 마스터 데이터 추가 요청 기능

### 완료 내용

- 고객사가 상품, 배송지/차량, 상품 코드 매핑, 배송지 코드 매핑 추가 요청을 등록할 수 있는 요청 모델과 API가 추가되었다.
- 물류사는 마스터 요청 처리 화면에서 요청 목록을 조회하고, 승인, 반려, 보완 요청, 마스터 반영 완료 처리를 할 수 있다.
- 요청 처리 시 마스터 반영 대상과 코멘트를 함께 남길 수 있고, 상태 이력이 화면에 반영된다.
- 요청 기능이 라우팅, 네비게이션, 타입, API 클라이언트까지 연결되어 운영 화면에서 바로 사용할 수 있다.

### 관련 위치

- `backend/src/main/kotlin/com/company/oms/master/MasterDataAddRequestController.kt`
- `backend/src/main/kotlin/com/company/oms/master/MasterDataAddRequestService.kt`
- `backend/src/main/kotlin/com/company/oms/master/MasterDataAddRequestEntity.kt`
- `backend/src/main/kotlin/com/company/oms/master/MasterDataAddRequestRepository.kt`
- `backend/src/main/resources/db/migration/V13__master_data_add_requests.sql`
- `frontend/src/pages/MasterDataAddRequestsPage.tsx`
- `frontend/src/pages/ClientPublicMasterPage.tsx`
- `frontend/src/api/masters.ts`
- `frontend/src/types/master.ts`
- `frontend/src/routes/router.tsx`

### 확인 방법

- `npm.cmd run build`
- 브라우저에서 `/client-masters`, `/masters/requests`에서 요청 등록과 상태 변경 화면을 확인한다.

## 19. 고객사 API Key 신청/발급 정책 및 화면

### 완료 내용

- 고객사 요청 기반 API Key 발급 흐름이 추가되어, 요청 등록, 승인, 반려, 취소, 1회성 원문 열람까지 지원한다.
- API Key 요청 엔티티와 API가 추가되고, 발급 후에는 요청자만 원문을 1회 확인할 수 있도록 처리되었다.
- API Key 관리 화면이 `요청`과 `발급된 Key` 관리를 함께 다루는 구조로 확장되었다.
- 알림/작업 요약에 API Key 요청 대기 건수가 연결되어 운영자가 승인 대기 상태를 바로 확인할 수 있다.
- API Key 요청 화면의 기본 상태 필터가 `REQUESTED`에서 `ALL`로 조정되어, 진입 즉시 요청 전체 이력과 상태 분포를 함께 확인할 수 있다.

### 관련 위치

- `backend/src/main/kotlin/com/company/oms/auth/ApiKeyRequestController.kt`
- `backend/src/main/kotlin/com/company/oms/auth/ApiKeyRequestService.kt`
- `backend/src/main/kotlin/com/company/oms/auth/ApiKeyRequestEntity.kt`
- `backend/src/main/kotlin/com/company/oms/auth/ApiKeyRequestRepository.kt`
- `backend/src/main/resources/db/migration/V15__api_key_requests.sql`
- `backend/src/main/resources/db/migration/V16__api_key_request_scope_type.sql`
- `backend/src/main/resources/db/migration/V17__api_key_request_reveal_once.sql`
- `backend/src/main/kotlin/com/company/oms/notification/NotificationService.kt`
- `backend/src/main/kotlin/com/company/oms/notification/WorkItemSummaryService.kt`
- `frontend/src/pages/ApiKeysPage.tsx`
- `frontend/src/pages/NotificationsPage.tsx`
- `frontend/src/types/apiKey.ts`

### 확인 방법

- `./gradlew.bat test --tests com.company.oms.Phase8AuthLogApiTest`
- `npm.cmd run build`

## 20. 물류사 전체 API / tenant-wide API Key

### 완료 내용

- API Key에 `TENANT` / `CLIENT` scope 구분이 추가되어 tenant-wide API Key를 발급하고 관리할 수 있게 되었다.
- 외부 API 조회는 tenant-wide Key 사용 시 고객사 전체의 확정 배치를 조회하고, 응답에 `clientId`, `clientCode`, `clientName`을 포함한다.
- 외부 API 호출 로그가 `client_id nullable` 구조를 처리하도록 확장되었다.
- 프론트 API Key 화면과 외부 API 안내 문구가 tenant-wide 정책을 반영하도록 정리되었다.

### 관련 위치

- `backend/src/main/kotlin/com/company/oms/auth/ApiKeyEntity.kt`
- `backend/src/main/kotlin/com/company/oms/auth/ApiKeyDtos.kt`
- `backend/src/main/kotlin/com/company/oms/auth/ApiKeyService.kt`
- `backend/src/main/kotlin/com/company/oms/externalapi/ExternalApiController.kt`
- `backend/src/main/kotlin/com/company/oms/externalapi/ExternalApiKeyAuthService.kt`
- `backend/src/main/kotlin/com/company/oms/externalapi/ExternalApiQueryService.kt`
- `backend/src/main/kotlin/com/company/oms/externalapi/ApiCallLogEntity.kt`
- `backend/src/main/resources/db/migration/V14__tenant_wide_api_keys.sql`
- `frontend/src/pages/ApiKeysPage.tsx`
- `frontend/src/pages/ExternalApiGuidePage.tsx`
- `frontend/src/pages/ExternalApiStatusPage.tsx`

### 확인 방법

- `./gradlew.bat test --tests com.company.oms.Phase8AuthLogApiTest`
- `npm.cmd run build`

## 21. 물류사 대시보드 라우팅 및 라벨 진입 보강

### 완료 내용

- 물류사 대시보드의 검증 이슈 요약에서 Error, Warning, Info 막대 자체를 클릭하면 해당 severity로 필터된 검증 결과 화면으로 이동한다.
- 우선 처리 배치 카드는 Error뿐 아니라 Warning 배치도 검증 결과 화면으로 바로 연결하고, severity에 맞는 진입 링크를 사용한다.
- 외부 제공 준비 상태 카드의 `API 제공 가능`은 API 사용 안내 화면으로, `라벨 가능`은 라벨 조회/다운로드의 배치 선택 진입으로 연결된다.
- 라벨 조회 화면은 `selectBatch=1` 쿼리로 들어오면 기존 배치 컨텍스트를 비우고 배치 선택 단계부터 다시 시작한다.
- 납기 볼륨 차트는 Error 없는 일정만 대상으로 표시해 검증 이슈와 출고 볼륨 판단을 분리한다.

### 관련 위치

- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/pages/LabelLinesPage.tsx`

### 확인 방법

- `npm.cmd run build`
- 브라우저에서 `/dashboard`의 검증 이슈/외부 제공 상태 카드 링크를 눌러 `/batches/:batchId/validation`, `/external-api/guide`, `/label-lines?selectBatch=1`로 이동하는지 확인한다.
