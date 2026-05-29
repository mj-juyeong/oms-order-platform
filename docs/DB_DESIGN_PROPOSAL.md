# DB 설계 제안서

이 문서는 OMS Phase 1의 리뷰용 데이터 모델 설계안이다. 실제 DB 연결, JPA Entity, Repository, Service, Controller 구현은 포함하지 않는다.

## 1. 설계 범위

### Phase 1에서 확정할 테이블

- 기준정보: `tenants`, `clients`, `users`, `roles`, `user_roles`, `api_keys`
- 업로드 배치: `upload_batches`, `uploaded_files`, `excel_sheet_results`
- 운영 데이터: `scan_lines`, `pl_lines`, `label_lines`, `order_lines`
- 마스터: `master_upload_batches`, `product_master_items`, `store_route_master_items`
- 검증/로그: `validation_errors`, `batch_audit_logs`, `api_call_logs`, `download_logs`

### Phase 2 Backend 기반 구조와의 연결점

- 공통 응답의 `requestId`는 DB 로그성 테이블의 `request_id`와 연결한다.
- 공통 인증/인가 정책은 `users`, `roles`, `user_roles`, `api_keys`를 기준으로 구현한다.
- 파일 저장 인터페이스는 `uploaded_files.stored_path`, `file_hash`, `file_size`를 기록한다.
- 배치 상태 전환 서비스는 `upload_batches.status`와 `batch_audit_logs`를 함께 갱신한다.

### Phase 4 이후 업로드/파싱/검증과의 연결점

- 엑셀 업로드 시 `upload_batches`와 `uploaded_files`를 생성한다.
- 시트 인식 결과는 `excel_sheet_results`에 저장한다.
- `Scan_upload_*`, `PL_EA`, `PL_Box`, `Label_EA`, `Label_Box` 행은 각각 line table에 저장한다.
- 검증 결과는 `validation_errors`에 저장한다.
- Error가 존재하면 `CONFIRMED` 전환을 금지한다.

### 1차 MVP에서 제외할 테이블 또는 기능

- 고객사별 상품 코드 매핑: `client_product_code_mappings`
- 고객사별 배송지 코드 매핑: `client_store_code_mappings`
- 고객사 사용자의 다중 고객사 접근 스코프: `user_client_scopes`
- 고객사별 엑셀 템플릿 관리
- 차수별 전용 조회/다운로드 테이블 또는 materialized view
- API 재처리 큐, 리포트 전용 집계 테이블
- 업로드마다 전체 마스터 스냅샷을 생성하는 무거운 이력 관리
- row 단위 마스터 변경 이력 테이블: `master_change_logs`

제외 기능이라도 원천 값은 보존한다. 예를 들어 `vehicle_name`, `delivery_round`, `area`는 line/order table에 저장하되 차수별 API/화면은 추후 구현으로 둔다.

## 2. 공통 컬럼 정책

| 컬럼 | 적용 대상 | 정책 |
|---|---|---|
| `id` | 대부분의 단일 엔티티 테이블 | `BIGINT` PK. MySQL은 `AUTO_INCREMENT`, PostgreSQL은 identity 또는 bigserial 후보 |
| `tenant_id` | tenant 스코프 테이블 | 운영 데이터 격리 기준. `tenants.id` FK |
| `client_id` | 업로드/운영 데이터와 고객사 범위 로그 | `clients.id` FK. 마스터는 1차 MVP에서 기본 nullable |
| `created_at`, `created_by` | 사용자 작업으로 생성되는 테이블 | 생성 시각/생성자 추적. 시스템 작업이면 `created_by` nullable |
| `updated_at`, `updated_by` | 상태 변경 또는 수정 가능한 테이블 | 배치/마스터/사용자/API Key 등에 적용 |
| `deleted_at` | 논리 삭제가 필요한 계정/API Key 후보 | 1차 기본은 상태값으로 관리. 실제 삭제 정책은 확인 필요 |
| `active_yn` | 마스터 행 | 현재 운영 여부. Boolean 또는 `CHAR(1)` 후보 |
| `row_no` | 엑셀 행 기반 테이블 | 원본 엑셀 row number 보존 |
| `sheet_name` | 엑셀 시트 기반 테이블 | 원본 sheet name 보존 |
| `original_value` | 검증 오류/원본값 추적 | 검증 오류가 발생한 원본 표시값 |
| `normalized_value` | 검증 오류/정규화 추적 | 날짜/수량/코드 등 변환 결과 |
| `request_id` | API/감사/다운로드 로그 | 공통 응답 meta의 requestId와 연결 |

모든 테이블에 모든 공통 컬럼을 넣지 않는다. 예를 들어 `scan_lines`는 `row_no`, `sheet_name`, `raw_row_json`이 중요하고, `api_call_logs`는 `request_id`, `path`, `response_status`가 중요하다.

## 3. 공통 타입 기준

| 용도 | MySQL | PostgreSQL | 비고 |
|---|---|---|---|
| PK/FK | `BIGINT` | `BIGINT` | FK는 동일 타입 |
| 코드/번호 | `VARCHAR(64)` | `VARCHAR(64)` | 주문번호/거래처코드/품목코드/바코드/QR코드 |
| 이름 | `VARCHAR(255)` | `VARCHAR(255)` | 파일명/상품명/거래처명 |
| 상태/Enum | `VARCHAR(32)` | `VARCHAR(32)` | 애플리케이션 enum + DB check 후보 |
| 수량 | `DECIMAL(18,3)` | `NUMERIC(18,3)` | 정수도 decimal 후보 |
| CBM | `DECIMAL(18,6)` | `NUMERIC(18,6)` | 정밀도 확인 필요 |
| 날짜 | `DATE` | `DATE` | 업무 날짜 |
| 시각 | `DATETIME(6)` | `TIMESTAMPTZ` | `Asia/Seoul` 정책 확인 필요 |
| JSON 보조 | `JSON` | `JSONB` | 검색 의존 금지 |

## 4. 핵심 테이블 설계

아래 컬럼 표기의 `NN`은 NOT NULL, `NULL`은 nullable을 의미한다.

### 4-1. `tenants`

| 컬럼 | 타입 | Null | 설명 |
|---|---|---:|---|
| `id` | BIGINT | NN | 물류사 ID |
| `code` | VARCHAR(64) | NN | 물류사 코드 |
| `name` | VARCHAR(255) | NN | 물류사명 |
| `status` | VARCHAR(32) | NN | `ACTIVE`, `INACTIVE` 등 |
| `created_at`, `updated_at` | DATETIME | NN/NULL | 생성/수정 시각 |

- PK: `id`
- UK: `uk_tenants_code(code)`
- Index: `idx_tenants_status(status)`

### 4-2. `clients`

| 컬럼 | 타입 | Null | 설명 |
|---|---|---:|---|
| `id` | BIGINT | NN | 고객사/화주사 ID |
| `tenant_id` | BIGINT | NN | 소속 물류사 |
| `code` | VARCHAR(64) | NN | tenant 내 고객사 코드 |
| `name` | VARCHAR(255) | NN | 고객사명 |
| `status` | VARCHAR(32) | NN | 상태 |
| `created_at`, `updated_at` | DATETIME | NN/NULL | 생성/수정 시각 |

- FK: `tenant_id -> tenants.id`
- UK: `uk_clients_tenant_code(tenant_id, code)`
- Index: `idx_clients_tenant_status(tenant_id, status)`

### 4-3. `users`

| 컬럼 | 타입 | Null | 설명 |
|---|---|---:|---|
| `id` | BIGINT | NN | 사용자 ID |
| `user_scope_type` | VARCHAR(16) | NN | `SYSTEM`, `TENANT`, `CLIENT` |
| `tenant_id` | BIGINT | NULL | 사용자 소속 물류사. `SYSTEM`은 NULL 허용 |
| `client_id` | BIGINT | NULL | 고객사 사용자 소속. `CLIENT`만 사용 |
| `login_id` | VARCHAR(100) | NN | 로그인 ID |
| `name` | VARCHAR(100) | NN | 사용자명 |
| `email` | VARCHAR(255) | NULL | 이메일 |
| `password_hash` | VARCHAR(255) | NN | 비밀번호 해시 |
| `status` | VARCHAR(32) | NN | 상태 |
| `last_login_at` | DATETIME | NULL | 마지막 로그인 |
| `created_at`, `updated_at` | DATETIME | NN/NULL | 생성/수정 시각 |

- FK: `tenant_id -> tenants.id`, `client_id -> clients.id`
- UK: `uk_users_login_id(login_id)`. 1차 MVP는 로그인 ID를 전역 unique로 둔다.
- Index: `idx_users_scope_status(user_scope_type, status)`, `idx_users_tenant_status(tenant_id, status)`, `idx_users_client_status(client_id, status)`

사용자 스코프 정책:

- `SYSTEM`: 시스템 전체 관리자. `tenant_id`, `client_id`는 NULL이다.
- `TENANT`: 물류사 사용자. `tenant_id`는 필수, `client_id`는 NULL이다.
- `CLIENT`: 고객사/화주사 사용자. `tenant_id`, `client_id`는 필수다.
- 스코프별 필수값은 애플리케이션 validation으로 보장한다. MySQL/PostgreSQL 공통성을 위해 복잡한 CHECK 제약은 선택 기능으로 둔다.
- 고객사 사용자가 여러 `client`를 조회해야 하는 요구가 확인되면 `user_client_scopes(user_id, tenant_id, client_id)`를 추가한다.

### 4-4. `roles`, `user_roles`

`roles`는 권한 코드 기준 테이블이다. 요청 테이블 목록에는 없지만 `user_roles` FK 대상이므로 설계에 포함한다.

| 테이블 | 주요 컬럼 | 제약 |
|---|---|---|
| `roles` | `id`, `code`, `name`, `description`, `created_at` | UK `code` |
| `user_roles` | `user_id`, `role_id`, `created_at` | PK `(user_id, role_id)`, FK `users`, `roles` |

- 권장 role code: `VIEWER`, `OPERATOR`, `ADMIN`, `SYSTEM_ADMIN`, `API_USER`, `SUPPORT`
- Index: `idx_user_roles_role_id(role_id)`

### 4-5. `upload_batches`

| 컬럼 | 타입 | Null | 설명 |
|---|---|---:|---|
| `id` | BIGINT | NN | 배치 ID |
| `tenant_id` | BIGINT | NN | 물류사 |
| `client_id` | BIGINT | NN | 고객사/화주사 |
| `batch_no` | VARCHAR(64) | NN | 배치 번호 |
| `status` | VARCHAR(32) | NN | `batch_status` |
| `delivery_date` | DATE | NULL | 대표 배송일. 기준은 확인 필요 |
| `product_master_checked_at` | DATETIME | NULL | 상품 마스터 기준 검증 시각 |
| `store_route_master_checked_at` | DATETIME | NULL | 배송지/차량 마스터 기준 검증 시각 |
| `uploaded_by` | BIGINT | NULL | 업로드 사용자 |
| `uploaded_at` | DATETIME | NN | 업로드 시각 |
| `validated_at`, `confirmed_at`, `cancelled_at`, `rolled_back_at` | DATETIME | NULL | 상태별 처리 시각 |
| `confirmed_by` | BIGINT | NULL | 확정 사용자 |
| `error_count`, `warning_count`, `info_count` | INT | NN | 검증 집계 |
| `memo` | VARCHAR(1000) | NULL | 비고 |

- FK: `tenant_id`, `client_id`, `uploaded_by`, `confirmed_by`
- UK: `uk_upload_batches_batch_no(tenant_id, client_id, batch_no)`
- Index: `idx_upload_batches_list(tenant_id, client_id, delivery_date, status, uploaded_at)`, `idx_upload_batches_file_search`는 파일명 검색 필요 시 `uploaded_files`와 함께 검토

### 4-6. `uploaded_files`

| 컬럼 | 타입 | Null | 설명 |
|---|---|---:|---|
| `id` | BIGINT | NN | 파일 메타 ID |
| `tenant_id`, `client_id`, `batch_id` | BIGINT | NN | 소속 범위 |
| `file_type` | VARCHAR(32) | NN | `ORDER_EXCEL`, `PRODUCT_MASTER`, `STORE_ROUTE_MASTER` 등 |
| `original_file_name` | VARCHAR(255) | NN | 원본 파일명 |
| `stored_path` | VARCHAR(1000) | NN | 저장 경로 |
| `file_hash` | VARCHAR(128) | NN | 해시 |
| `file_size` | BIGINT | NN | 바이트 크기 |
| `content_type` | VARCHAR(255) | NULL | MIME |
| `created_by`, `created_at` | BIGINT/DATETIME | NULL/NN | 생성자/시각 |

- FK: `batch_id -> upload_batches.id`
- Index: `idx_uploaded_files_batch(batch_id)`, `idx_uploaded_files_hash(file_hash)`, `idx_uploaded_files_name(tenant_id, client_id, original_file_name)`

### 4-7. `excel_sheet_results`

| 컬럼 | 타입 | Null | 설명 |
|---|---|---:|---|
| `id` | BIGINT | NN | 시트 결과 ID |
| `tenant_id`, `client_id`, `batch_id` | BIGINT | NN | 소속 범위 |
| `sheet_name` | VARCHAR(255) | NN | 원본 시트명 |
| `sheet_type` | VARCHAR(32) | NN | `sheet_type` enum |
| `suffix_value` | VARCHAR(100) | NULL | `Scan_upload_*` suffix |
| `header_row_no` | INT | NULL | 헤더 행 번호 |
| `data_row_count` | INT | NN | 데이터 행 수. 0 허용 |
| `status` | VARCHAR(32) | NN | `PARSED`, `IGNORED`, `ERROR` 등 |
| `message` | VARCHAR(1000) | NULL | 파싱 메시지 |
| `created_at` | DATETIME | NN | 생성 시각 |

- UK: `uk_excel_sheet_results_batch_sheet(batch_id, sheet_name)`
- Index: `idx_excel_sheet_results_type(tenant_id, client_id, batch_id, sheet_type)`

### 4-8. `scan_lines`

| 컬럼 | 타입 | Null | 설명 |
|---|---|---:|---|
| `id` | BIGINT | NN | Scan 행 ID |
| `tenant_id`, `client_id`, `batch_id` | BIGINT | NN | 소속 범위 |
| `sheet_name` | VARCHAR(255) | NN | 원본 시트명 |
| `scan_center` | VARCHAR(100) | NULL | `Scan_upload_*` suffix 또는 동등 값 |
| `delivery_date` | DATE | NULL | 배송일자 정규화 |
| `bus` | VARCHAR(100) | NULL | 원본 버스 값 |
| `barcode` | VARCHAR(128) | NULL | 바코드 문자열 |
| `order_business_site_code` | VARCHAR(64) | NULL | 주문사업장코드 문자열 |
| `store_name` | VARCHAR(255) | NULL | 주문사업장명 |
| `product_code` | VARCHAR(64) | NULL | 품목코드 문자열 |
| `product_name` | VARCHAR(255) | NULL | 품목명 |
| `label_qty` | DECIMAL(18,3) | NULL | 라벨수량 |
| `unit` | VARCHAR(32) | NULL | 상품기본단위 |
| `box_sequence` | VARCHAR(64) | NULL | 박스순번 문자열 |
| `temperature_type` | VARCHAR(64) | NULL | 온도유형 |
| `row_no` | INT | NN | 원본 row number |
| `raw_row_json` | JSON | NULL | 원본 row 보조 저장 |
| `created_at` | DATETIME | NN | 생성 시각 |

- UK 후보: `uk_scan_lines_batch_barcode(batch_id, barcode)` 단, NULL/중복 정책 확인 필요
- Index: `idx_scan_lines_batch`, `idx_scan_lines_delivery_center`, `idx_scan_lines_store`, `idx_scan_lines_product`, `idx_scan_lines_barcode`

### 4-9. `pl_lines`

| 컬럼 | 타입 | Null | 설명 |
|---|---|---:|---|
| `id` | BIGINT | NN | PL 행 ID |
| `tenant_id`, `client_id`, `batch_id` | BIGINT | NN | 소속 범위 |
| `sheet_name` | VARCHAR(255) | NN | `PL_EA` 또는 `PL_Box` |
| `pl_type` | VARCHAR(16) | NN | `EA`, `BOX` |
| `order_no` | VARCHAR(64) | NULL | 주문번호 문자열 |
| `store_code` | VARCHAR(64) | NULL | 거래처코드 문자열 |
| `store_name`, `brand_name` | VARCHAR(255) | NULL | 거래처/브랜드 |
| `product_code` | VARCHAR(64) | NULL | 품목코드 문자열 |
| `product_name` | VARCHAR(255) | NULL | 품명 |
| `unit`, `storage_temperature` | VARCHAR(64) | NULL | 단위/보관온도 |
| `due_date` | DATE | NULL | 납기요청일 |
| `order_qty` | DECIMAL(18,3) | NULL | 주문량 |
| `vehicle_name` | VARCHAR(255) | NULL | 차량명 원천값 |
| `cbm` | DECIMAL(18,6) | NULL | CBM |
| `qr_code` | VARCHAR(255) | NULL | QR코드 문자열 |
| `box_qty` | DECIMAL(18,3) | NULL | 박스입수량 |
| `row_no`, `raw_row_json`, `created_at` | INT/JSON/DATETIME | NN/NULL/NN | 추적 정보 |

- UK 후보: `uk_pl_lines_batch_qr(batch_id, qr_code)` 단, NULL 정책 확인 필요
- Index: `idx_pl_lines_due_type`, `idx_pl_lines_vehicle`, `idx_pl_lines_store`, `idx_pl_lines_product`, `idx_pl_lines_order_no`, `idx_pl_lines_qr`

### 4-10. `label_lines`

| 컬럼 | 타입 | Null | 설명 |
|---|---|---:|---|
| `id` | BIGINT | NN | Label 행 ID |
| `tenant_id`, `client_id`, `batch_id` | BIGINT | NN | 소속 범위 |
| `sheet_name` | VARCHAR(255) | NN | `Label_EA` 또는 `Label_Box` |
| `label_type` | VARCHAR(16) | NN | `EA`, `BOX` |
| `order_no` | VARCHAR(64) | NULL | 주문번호 문자열 |
| `store_code` | VARCHAR(64) | NULL | 거래처코드 문자열 |
| `store_name` | VARCHAR(255) | NULL | 거래처 |
| `product_code` | VARCHAR(64) | NULL | 품목코드. Label_EA 예외 확인 필요 |
| `product_name` | VARCHAR(255) | NULL | 품명 |
| `order_qty` | DECIMAL(18,3) | NULL | 주문량 |
| `sequence_no` | VARCHAR(64) | NULL | 순번 문자열 |
| `matching_code` | VARCHAR(128) | NULL | 매칭코드 |
| `qr_code` | VARCHAR(255) | NULL | QR코드 문자열 |
| `box_sequence` | VARCHAR(64) | NULL | 박스순번 |
| `total_box_qty` | DECIMAL(18,3) | NULL | 총박스수량 |
| `row_no`, `raw_row_json`, `created_at` | INT/JSON/DATETIME | NN/NULL/NN | 추적 정보 |

- UK 후보: `uk_label_lines_batch_qr(batch_id, qr_code)` 단, Label_EA/NULL 정책 확인 필요
- Index: `idx_label_lines_type`, `idx_label_lines_store`, `idx_label_lines_product`, `idx_label_lines_matching`, `idx_label_lines_qr`

### 4-11. `order_lines`

`order_lines`는 원본 주문이 아니다. `PL_EA`/`PL_Box` 기반으로 재구성한 OMS 조회용 주문 요약 데이터다.

| 컬럼 | 타입 | Null | 설명 |
|---|---|---:|---|
| `id` | BIGINT | NN | 주문 조회용 행 ID |
| `tenant_id`, `client_id`, `batch_id` | BIGINT | NN | 소속 범위 |
| `source_pl_line_id` | BIGINT | NN | 원천 PL 행 |
| `order_no`, `store_code`, `product_code` | VARCHAR(64) | NULL | 문자열 코드 |
| `store_name`, `brand_name`, `product_name` | VARCHAR(255) | NULL | 표시명 |
| `unit` | VARCHAR(64) | NULL | 단위 |
| `order_qty` | DECIMAL(18,3) | NULL | 주문량 |
| `due_date` | DATE | NULL | 납기요청일 |
| `vehicle_name` | VARCHAR(255) | NULL | 차량명 원천값 |
| `delivery_round` | VARCHAR(64) | NULL | 차수 원천/매칭값 |
| `area` | VARCHAR(100) | NULL | 권역 |
| `created_at` | DATETIME | NN | 생성 시각 |

- FK: `source_pl_line_id -> pl_lines.id`
- UK 후보: `uk_order_lines_source_pl(source_pl_line_id)`
- Index: `idx_order_lines_due`, `idx_order_lines_store`, `idx_order_lines_product`, `idx_order_lines_vehicle`
- 차수별 조회 전용 복합 인덱스는 추후 업무 정의 후 추가한다.

### 4-12. `master_upload_batches`

마스터 엑셀 업로드 이력이다. 1차 MVP에서는 row 단위 변경 이력을 별도 테이블로 남기지 않고, 업로드 파일과 처리 건수 요약만 보존한다.

| 컬럼 | 타입 | Null | 설명 |
|---|---|---:|---|
| `id` | BIGINT | NN | 마스터 업로드 ID |
| `tenant_id` | BIGINT | NN | 물류사 |
| `master_type` | VARCHAR(32) | NN | `PRODUCT`, `STORE_ROUTE` |
| `status` | VARCHAR(32) | NN | `UPLOADED`, `PROCESSING`, `APPLIED`, `PARTIAL_FAILED`, `FAILED` |
| `original_file_name` | VARCHAR(255) | NN | 원본 파일명 |
| `stored_path` | VARCHAR(1000) | NULL | 저장 경로 |
| `file_hash` | VARCHAR(128) | NULL | 파일 해시 |
| `file_size` | BIGINT | NULL | 바이트 크기 |
| `content_type` | VARCHAR(255) | NULL | MIME |
| `row_count` | INT | NN | 처리 대상 행 수 |
| `inserted_count` | INT | NN | 신규 추가 건수 |
| `updated_count` | INT | NN | 기존 수정 건수 |
| `unchanged_count` | INT | NN | 변경 없음 건수 |
| `failed_count` | INT | NN | 실패 건수 |
| `uploaded_by` | BIGINT | NULL | 업로드 사용자 |
| `uploaded_at` | DATETIME | NN | 업로드 시각 |
| `applied_at` | DATETIME | NULL | upsert 반영 완료 시각 |
| `request_id` | VARCHAR(64) | NULL | 요청 추적 ID |
| `message` | VARCHAR(1000) | NULL | 처리 메시지 |

- FK: `tenant_id -> tenants.id`, `uploaded_by -> users.id`
- Index: `idx_master_upload_batches_list(tenant_id, master_type, uploaded_at)`, `idx_master_upload_batches_status(tenant_id, master_type, status)`

### 4-13. `product_master_items`

| 컬럼 | 타입 | Null | 설명 |
|---|---|---:|---|
| `id` | BIGINT | NN | 상품 마스터 행 ID |
| `tenant_id` | BIGINT | NN | 물류사 |
| `ezadmin_code` | VARCHAR(64) | NN | 운영 데이터 `product_code` 매칭 키 |
| `product_name` | VARCHAR(255) | NULL | 상품명 |
| `customer_product_code` | VARCHAR(64) | NULL | 거래처 상품코드 |
| `box_qty` | DECIMAL(18,3) | NULL | 박스입수량 |
| `outbound_unit` | VARCHAR(64) | NULL | 출고단위 |
| `temperature_type` | VARCHAR(64) | NULL | 보관온도 |
| `cbm` | DECIMAL(18,6) | NULL | CBM |
| `active_yn` | BOOLEAN/CHAR(1) | NN | 운영 여부 |
| `last_master_upload_batch_id` | BIGINT | NULL | 마지막 반영 업로드 이력 |
| `row_no` | INT | NULL | 마지막 업로드 파일의 row number |
| `raw_row_json` | JSON | NULL | 마지막 반영 row 보조 저장 |
| `created_at`, `updated_at` | DATETIME | NN/NULL | 생성/수정 시각 |

- UK: `uk_product_master_items_code(tenant_id, ezadmin_code)`
- FK: `tenant_id -> tenants.id`, `last_master_upload_batch_id -> master_upload_batches.id`
- Index: `idx_product_master_items_name(tenant_id, product_name)`, `idx_product_master_items_active(tenant_id, active_yn)`

### 4-14. `store_route_master_items`

| 컬럼 | 타입 | Null | 설명 |
|---|---|---:|---|
| `id` | BIGINT | NN | 배송지/차량 마스터 행 ID |
| `tenant_id` | BIGINT | NN | 물류사 |
| `baljugo_code` | VARCHAR(64) | NN | 운영 데이터 `store_code`/`order_business_site_code` 매칭 키 |
| `customer_code` | VARCHAR(64) | NULL | 거래처코드 |
| `brand_name`, `store_name` | VARCHAR(255) | NULL | 브랜드/지점명 |
| `area` | VARCHAR(100) | NULL | 권역 |
| `delivery_day` | VARCHAR(32) | NULL | 배송요일/일자 원천값 |
| `delivery_round` | VARCHAR(64) | NULL | 차수 |
| `vehicle_name` | VARCHAR(255) | NULL | 차량명 |
| `driver_name` | VARCHAR(255) | NULL | 담당기사 |
| `address` | VARCHAR(500) | NULL | 주소 |
| `active_yn` | BOOLEAN/CHAR(1) | NN | 운영 여부 |
| `last_master_upload_batch_id` | BIGINT | NULL | 마지막 반영 업로드 이력 |
| `row_no` | INT | NULL | 마지막 업로드 파일의 row number |
| `raw_row_json` | JSON | NULL | 마지막 반영 row 보조 저장 |
| `created_at`, `updated_at` | DATETIME | NN/NULL | 생성/수정 시각 |

- UK: `uk_store_route_master_items_code(tenant_id, baljugo_code)`
- FK: `tenant_id -> tenants.id`, `last_master_upload_batch_id -> master_upload_batches.id`
- Index: `idx_store_route_master_items_vehicle(tenant_id, vehicle_name)`, `idx_store_route_master_items_area(tenant_id, area)`, `idx_store_route_master_items_active(tenant_id, active_yn)`

### 4-15. `validation_errors`

| 컬럼 | 타입 | Null | 설명 |
|---|---|---:|---|
| `id` | BIGINT | NN | 검증 메시지 ID |
| `tenant_id`, `client_id`, `batch_id` | BIGINT | NN | 소속 범위 |
| `severity` | VARCHAR(16) | NN | `ERROR`, `WARNING`, `INFO` |
| `error_code` | VARCHAR(64) | NN | 오류 코드 |
| `domain` | VARCHAR(32) | NN | `upload_domain` |
| `sheet_name` | VARCHAR(255) | NULL | 시트명 |
| `row_no` | INT | NULL | row number |
| `column_name` | VARCHAR(255) | NULL | 컬럼명 |
| `line_table`, `line_id` | VARCHAR/BIGINT | NULL | 관련 line table/id |
| `message` | TEXT | NN | 메시지 |
| `original_value`, `normalized_value` | TEXT | NULL | 원본/정규화값 |
| `resolved_yn` | BOOLEAN/CHAR(1) | NN | 해결 여부 |
| `created_at` | DATETIME | NN | 생성 시각 |

- Index: `idx_validation_errors_batch`, `idx_validation_errors_severity`, `idx_validation_errors_domain`, `idx_validation_errors_sheet_row`, `idx_validation_errors_code`

### 4-16. 로그 테이블

| 테이블 | 핵심 컬럼 | 주요 제약/인덱스 |
|---|---|---|
| `batch_audit_logs` | `tenant_id`, `client_id`, `batch_id`, `action`, `before_status`, `after_status`, `actor_id`, `request_id`, `message`, `metadata_json`, `created_at` | Index `batch_id`, `action`, `created_at`, `request_id` |
| `api_call_logs` | `tenant_id`, `client_id`, `api_key_id`, `request_id`, `path`, `method`, `query_string`, `response_status`, `response_time_ms`, `client_ip`, `created_at` | UK 후보 `request_id`, Index `api_key_id`, `path`, `created_at`, `response_status` |
| `download_logs` | `tenant_id`, `client_id`, `batch_id`, `download_type`, `file_name`, `filter_json`, `row_count`, `downloaded_by`, `request_id`, `downloaded_at` | Index `batch_id`, `download_type`, `downloaded_by`, `downloaded_at` |

### 4-17. `api_keys`

| 컬럼 | 타입 | Null | 설명 |
|---|---|---:|---|
| `id` | BIGINT | NN | API Key ID |
| `tenant_id` | BIGINT | NN | 소속 물류사 |
| `client_id` | BIGINT | NULL | 1차 MVP 외부 API Key는 고객사별 발급이므로 운영상 필수. 추후 tenant-level key 확장을 위해 DB는 NULL 허용 |
| `name` | VARCHAR(100) | NN | 키 이름 |
| `key_hash` | VARCHAR(255) | NN | API Key 해시 |
| `status` | VARCHAR(32) | NN | `ACTIVE`, `REVOKED` 등 |
| `allowed_scope` | JSON/TEXT | NULL | 허용 범위 |
| `expires_at`, `last_used_at` | DATETIME | NULL | 만료/마지막 사용 |
| `created_by`, `created_at`, `updated_at` | BIGINT/DATETIME | NULL/NN/NULL | 관리 정보 |

- UK: `uk_api_keys_tenant_hash(tenant_id, key_hash)`
- Index: `idx_api_keys_tenant_status`, `idx_api_keys_client`, `idx_api_keys_expires_at`
- 1차 MVP의 외부 API Key는 `tenant_id + client_id` 단위로 발급한다.
- 외부 API 요청자는 `tenantId`, `clientId`를 보내지 않으며, 서버는 API Key에 연결된 고객사 범위로만 조회한다.
- API Key 원문은 생성 응답에서 한 번만 반환하고 DB에는 hash만 저장한다.
- 추후 다고객사 외부 연동이 필요하면 `api_keys.client_id = NULL`인 tenant-level key와 `api_key_client_scopes(api_key_id, client_id)` 테이블을 추가한다.

## 5. Tenant / Client 스코프 정책

- `tenant`는 OMS를 사용하는 물류사다.
- `client`는 물류사의 고객사 또는 화주사다.
- `SYSTEM` 사용자는 시스템 전체 설정과 tenant 관리를 위한 예외 스코프다.
- `TENANT` 사용자는 특정 물류사의 운영 사용자이며 1차 MVP의 기본 로그인 사용자다.
- `CLIENT` 사용자는 고객사/화주사 사용자이며 1차 필수 구현은 아니지만 스키마에서 확장 가능하게 둔다.
- 업로드/운영 데이터는 `tenant_id + client_id` 기준으로 관리한다.
- `upload_batches`, `scan_lines`, `pl_lines`, `label_lines`, `order_lines`, `validation_errors`, 로그성 테이블은 `tenant_id`, `client_id`를 가진다.
- 상품 마스터와 배송지/차량 마스터는 1차 MVP에서 `tenant_id` 기준으로 관리한다.
- 고객사별 전용 마스터는 1차 필수 구현이 아니며 추후 `client_id` 또는 별도 매핑 테이블로 확장한다.

## 6. 마스터 업로드/upsert 정책

- 1차 MVP는 업로드마다 전체 마스터 스냅샷을 생성하지 않는다.
- 상품 마스터는 `tenant_id + ezadmin_code` 기준으로 현재 마스터 행을 upsert한다.
- 배송지/차량 마스터는 `tenant_id + baljugo_code` 기준으로 현재 마스터 행을 upsert한다.
- 엑셀에 신규 코드가 있으면 INSERT, 기존 코드가 있으면 UPDATE, 값이 동일하면 UNCHANGED로 집계한다.
- 엑셀에 없어진 기존 코드는 기본적으로 삭제하지 않는다. 비활성화가 필요하면 별도 정책 확인 후 `active_yn = false` 처리한다.
- 업로드 파일 단위 이력과 처리 건수는 `master_upload_batches`에 저장한다.
- row 단위 before/after 변경 이력 테이블은 1차 MVP에서 제외한다.
- 운영 배치 검증은 검증 시점의 현재 마스터 기준으로 수행하고, 검증 시각은 `upload_batches.product_master_checked_at`, `upload_batches.store_route_master_checked_at`에 기록한다.
- 검증 결과 자체는 `validation_errors`에 남긴다.

## 7. 운영 데이터 저장 정책

### `scan_lines`

- `Scan_upload_*` prefix를 가진 모든 시트를 Scan 계열로 인식한다.
- suffix는 `scan_center`에 저장한다. 화면 용어는 확인 필요다.
- `Scan_upload_군량리`처럼 데이터 0건 시트는 line row를 생성하지 않고 `excel_sheet_results`에 정상 기록한다.
- `barcode`, `order_business_site_code`, `product_code`는 문자열로 보존한다.
- `order_business_site_code`는 배송지/차량 마스터의 `baljugo_code`와 직접 매칭한다.

### `pl_lines`

- `PL_EA`, `PL_Box`를 구분하여 `pl_type = EA|BOX`로 저장한다.
- `order_no`, `store_code`, `product_code`, `qr_code`는 문자열로 보존한다.
- `order_lines` 재구성의 원천이다.
- `store_code`는 배송지/차량 마스터의 `baljugo_code`와 직접 매칭한다.

### `label_lines`

- `Label_EA`, `Label_Box`를 구분하여 `label_type = EA|BOX`로 저장한다.
- `matching_code`, `qr_code`, `box_sequence`는 문자열로 보존한다.
- 라벨 다운로드 원천이다.
- `Label_EA.product_code` 예외 정책은 Phase 2 전 확인 필요다.

### `order_lines`

- 원본 주문이 아니라 PL 기반 OMS 조회용 요약 데이터다.
- `source_pl_line_id`로 원천 PL 행을 추적한다.
- `vehicle_name`, `delivery_round`, `area`는 보존한다.
- 차수별 조회/다운로드 기능은 1차 MVP 필수 구현에서 제외하고 추후 구현으로 둔다.

## 8. Enum 설계

DB 저장은 `VARCHAR(32)`를 기본으로 한다. MySQL 8.0.16+ 또는 PostgreSQL에서는 CHECK 제약을 선택적으로 적용할 수 있다.

| Enum | 값 |
|---|---|
| `batch_status` | `UPLOADED`, `VALIDATING`, `VALIDATION_FAILED`, `READY_TO_CONFIRM`, `CONFIRMED`, `CANCELLED`, `ROLLED_BACK` |
| `pl_type` | `EA`, `BOX` |
| `label_type` | `EA`, `BOX` |
| `validation_severity` | `ERROR`, `WARNING`, `INFO` |
| `upload_domain` | `SCAN`, `PL`, `LABEL`, `ORDER`, `MASTER` |
| `sheet_type` | `SCAN_UPLOAD`, `PL_EA`, `PL_BOX`, `LABEL_EA`, `LABEL_BOX`, `IGNORED`, `UNKNOWN` |
| `user_scope_type` | `SYSTEM`, `TENANT`, `CLIENT` |

`VALIDATED`는 사용하지 않는다. Error가 없으면 `READY_TO_CONFIRM`으로 전환한다.

## 9. 인덱스 초안

| 조회 패턴 | 인덱스 초안 |
|---|---|
| 배치 목록 | `upload_batches(tenant_id, client_id, delivery_date, status, uploaded_at)`, `uploaded_files(tenant_id, client_id, original_file_name)` |
| 검증 오류 조회 | `validation_errors(batch_id, severity)`, `(batch_id, domain)`, `(batch_id, sheet_name, row_no)`, `(batch_id, error_code)` |
| 주문 조회 | `order_lines(tenant_id, client_id, batch_id)`, `(tenant_id, client_id, due_date)`, `(tenant_id, client_id, store_code)`, `(tenant_id, client_id, product_code)`, `(tenant_id, client_id, vehicle_name)` |
| Scan 조회/WOS API | `upload_batches(status, delivery_date)`, `scan_lines(tenant_id, client_id, delivery_date, scan_center)`, `(store_code/order_business_site_code)`, `(product_code)`, `(barcode)` |
| PL 조회/PL API | `pl_lines(tenant_id, client_id, due_date, pl_type)`, `(vehicle_name)`, `(store_code)`, `(batch_id)` |
| Label 조회/다운로드 | `label_lines(tenant_id, client_id, batch_id, label_type)`, `(store_code)`, `(product_code)`, `(qr_code)` |
| 마스터 조회 | `product_master_items(tenant_id, ezadmin_code)`, `store_route_master_items(tenant_id, baljugo_code)`, `master_upload_batches(tenant_id, master_type, uploaded_at)`, master item `active_yn` index |

외부 API는 반드시 `upload_batches.status = 'CONFIRMED'` 조건과 함께 조회한다.

## 10. 데이터 보존 정책

- 업로드 원본 파일의 `stored_path`, `file_hash`, `file_size`, `original_file_name`을 보존한다.
- 엑셀 원본 row number는 `row_no`로 보존한다.
- 주문번호, 거래처코드, 품목코드, 바코드, QR코드는 문자열 원본을 보존한다.
- 날짜/수량/CBM은 정규화 컬럼에 저장하고, 원본 row는 `raw_row_json`으로 보조 보존한다.
- 검증 오류는 `original_value`, `normalized_value`, `sheet_name`, `row_no`, `column_name`을 저장한다.
- 마스터 업로드 이력은 원본 파일 정보와 `inserted_count`, `updated_count`, `unchanged_count`, `failed_count`를 저장한다.
- 마스터 row 단위 변경 이력은 1차 MVP에서 제외한다.
- 배치 상태 변경은 `batch_audit_logs`에 저장한다.
- 외부 API 호출은 `api_call_logs`에 저장한다.
- 다운로드 이력은 `download_logs`에 저장한다.

## 11. API 설계와 DB 모델 정합성 점검

| 점검 항목 | 결과 |
|---|---|
| API endpoint와 테이블명 충돌 | API는 리소스 관점 `/order-excel-batches`, DB는 `upload_batches`로 유지 가능 |
| 배치 상태명 | `VALIDATED`는 DB enum에 없으므로 사용하지 않는다. API 초안은 `READY_TO_CONFIRM` 기준으로 보정했다. |
| 외부 API 노출 기준 | `CONFIRMED` 배치만 노출 원칙 반영 |
| 차수별 조회/다운로드 | API 문서에서 추후 구현으로 표시되어 있음. DB는 원천값만 보존 |
| ID 필드 | request/response에 `batchId`, `clientId`, `deliveryDate`는 명시되어 있으나 상세 응답의 `tenantId`, master checked at 포함 여부는 TODO |

## 12. Phase 2 전 TODO와 권장 기본값

아래 권장값은 Phase 2 구현을 시작하기 위한 리뷰안이다. 회사 표준 또는 운영 정책과 충돌하면 해당 표준을 우선한다.

| TODO | 권장 기본값 | 영향/이유 |
|---|---|---|
| 최종 DB 선택 | MySQL | 회사 표준이 MySQL이라는 전제를 우선. dependency, migration dialect, local DB 결정에 영향 |
| MySQL 버전 | MySQL 8.4 LTS | LTS 계열을 기본 후보로 둔다. 회사 운영 버전이 8.0이면 호환 기준 재검토 |
| Migration 도구 | Flyway | SQL 기반 migration 초안과 잘 맞고 단순하다. Liquibase는 복잡한 변경 이력 관리가 필요할 때 재검토 |
| 로컬 개발 DB 방식 | Docker Compose | 개발자가 동일한 MySQL 환경을 쉽게 기동 |
| 통합 테스트 DB 방식 | Testcontainers | 테스트 격리성과 CI 재현성 확보 |
| JPA 사용 확정 여부 | Spring Data JPA | Entity, Repository, transaction 정책의 기본값. 대량 insert/복잡 조회는 별도 최적화 |
| tenant/client 초기 seed 데이터 필요 여부 | 개발/테스트 seed 최소 1세트 제공 | 로그인, 업로드, 마스터 upsert 테스트 편의성 |
| 내부 인증 정책 | JWT | React SPA + REST API 구조에 적합. 만료/갱신/폐기 정책은 Phase 2에서 상세화 |
| 외부 API 인증 정책 | API Key | WOS/PL 외부 API 요구사항과 일치. hash 저장, 만료/회전 정책 필요 |
| 파일 저장 위치 | 로컬 파일스토리지 추상화 우선 | `stored_path` 기반으로 시작하고 S3/NAS는 추후 어댑터로 교체 가능 |
| 업로드 파일 최대 크기 | 100MB | API validation, 서버 multipart 설정에 영향. 실제 파일 크기 확인 후 조정 |
| Warning이 남아 있어도 배치 확정 허용 여부 | 허용 | Error만 확정 차단. 확정 시 warning count와 audit log를 반드시 남긴다 |
| `Label_EA` 품목코드 예외 정책 | Warning | 소분/가상 상품 가능성 때문에 우선 Warning. 운영 확인 후 Error 승격 가능 |
| 차량명 불일치 등급 | Warning | 차량명은 운영 변동 가능성이 있고 차수별 기능은 추후 구현. 영향이 크면 Error 승격 |
| 배송일 대표값 기준 | PL/Label `due_date` 우선 | `order_lines`가 PL 기반이므로 조회 대표일은 due_date 우선. Scan `delivery_date`는 원본 보존 |
| 화면 용어 | `scan_center` 내부명 유지, 화면명 확인 필요 | 센터/거점/노선/버스 중 표시 용어는 운영 확인 필요 |
