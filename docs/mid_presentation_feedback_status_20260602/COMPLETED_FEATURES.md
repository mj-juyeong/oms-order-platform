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

### 관련 위치

- `backend/src/main/kotlin/com/company/oms/notification/`
- `backend/src/main/resources/db/migration/V11__notifications.sql`
- `frontend/src/components/domain/NotificationBell.tsx`
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
