# DB 설계 제안서

이 문서는 DBMS를 단정하지 않고 MySQL/PostgreSQL 공통 구현이 가능한 표준 RDB 구조를 우선한 OMS DB 설계 초안이다.

## 0. 현재 확정된 스코프 보정

초기 설계 이후 다음 원칙을 확정한다. 아래 원칙은 이 문서의 모든 테이블 설계에 우선 적용한다.

- `tenant`는 OMS를 사용하는 물류사다.
- `client`는 물류사의 고객사 또는 화주사다.
- 주문/업로드 데이터는 `tenant_id + client_id` 기준으로 관리한다.
- 마스터 데이터는 1차 MVP에서 물류사 `tenant_id` 기준으로 관리한다.
- 고객사별 전용 마스터는 1차 필수 구현이 아니며, 추후 `scope_type = CLIENT`로 확장한다.
- 요구사항 기준 1차 MVP는 고객사 코드 매핑 없이 직접 매칭한다.
- 운영 데이터의 `product_code`는 상품 마스터의 `ezadmin_code`와 직접 매칭한다.
- 운영 데이터의 `store_code` 또는 `order_business_site_code`는 배송지/차량 마스터의 `baljugo_code`와 직접 매칭한다.
- 고객사별 코드 체계가 다르면 추후 `client_product_code_mappings`, `client_store_code_mappings`를 추가한다.
- 마스터 버전의 scope unique는 MySQL nullable unique 이슈를 피하기 위해 `scope_key` 사용을 우선한다.

### 0-1. 추가 필수 테이블

| 테이블 | 목적 | 주요 컬럼 | 주요 제약 |
|---|---|---|---|
| `tenants` | OMS를 사용하는 물류사 | `id`, `code`, `name`, `status`, `created_at`, `updated_at` | PK `id`, UK `code` |
| `tenant_clients` | 물류사의 고객사/화주사 | `id`, `tenant_id`, `code`, `name`, `status`, `created_at`, `updated_at` | PK `id`, FK `tenant_id`, UK `tenant_id, code` |

### 0-2. 기존 테이블 공통 변경

| 대상 | 변경 |
|---|---|
| `users` | `tenant_id` 추가, unique는 `tenant_id, login_id` 기준 |
| `api_keys` | `tenant_id` 추가, 필요 시 `client_id`로 특정 고객사 범위 제한 |
| `upload_batches` | `tenant_id`, `client_id` 추가 |
| `uploaded_files` | `tenant_id`, `client_id` 추가 |
| `product_master_versions` | `tenant_id`, `scope_type`, `scope_key`, nullable `client_id` 추가 |
| `product_masters` | `tenant_id` 추가 |
| `store_route_master_versions` | `tenant_id`, `scope_type`, `scope_key`, nullable `client_id` 추가 |
| `store_route_masters` | `tenant_id` 추가 |
| `excel_sheet_results` | `tenant_id`, `client_id` 추가 |
| `scan_lines`, `pl_lines`, `label_lines`, `order_lines` | `tenant_id`, `client_id` 추가 |
| `validation_errors`, `batch_audit_logs`, `api_call_logs`, `download_logs` | `tenant_id`, `client_id` 추가 |

### 0-3. 확정 Unique 기준

| 테이블 | Unique 제약 |
|---|---|
| `tenants` | `code` |
| `tenant_clients` | `tenant_id`, `code` |
| `users` | `tenant_id`, `login_id` |
| `api_keys` | `tenant_id`, `key_hash` |
| `upload_batches` | `tenant_id`, `client_id`, `batch_no` |
| `product_master_versions` | `tenant_id`, `scope_type`, `scope_key`, `version_name` |
| `product_masters` | `tenant_id`, `version_id`, `ezadmin_code` |
| `store_route_master_versions` | `tenant_id`, `scope_type`, `scope_key`, `version_name` |
| `store_route_masters` | `tenant_id`, `version_id`, `baljugo_code` |

## 1. 설계 원칙

- `upload_batches`가 운영 데이터의 중심이다.
- `upload_batches`는 `tenant_id`, `client_id`를 반드시 가진다.
- `scan_lines`, `pl_lines`, `label_lines`, `order_lines`는 모두 `batch_id`를 가진다.
- `scan_lines`, `pl_lines`, `label_lines`, `order_lines`는 `tenant_id`, `client_id`도 함께 가진다.
- `order_lines`는 원본 주문이 아니라 PL 데이터를 기준으로 재구성한 OMS 조회용 주문 요약 데이터다.
- 상품 마스터와 배송지/차량 마스터는 서로 직접 조인하지 않는다.
- 운영 데이터의 `product_code`는 상품 마스터의 `ezadmin_code`와 직접 매칭한다.
- 운영 데이터의 `store_code` 또는 `order_business_site_code`는 배송지/차량 마스터의 `baljugo_code`와 직접 매칭한다.
- 배치마다 검증에 사용한 상품 마스터 버전과 배송지/차량 마스터 버전을 기록한다.
- 원본 엑셀 값과 정규화 값을 최대한 함께 보존한다.
- `Scan_upload_*` suffix 값은 `scan_center` 또는 `scan_route` 컬럼으로 저장한다.
- 주문번호, 거래처코드, 품목코드, 바코드, QR코드는 문자열 타입으로 설계한다.
- JSON은 보조 저장용으로만 사용하고, 자주 검색하는 값은 일반 컬럼으로 둔다.

## 2. 공통 타입 기준

| 용도 | MySQL | PostgreSQL | 비고 |
|---|---|---|---|
| PK | BIGINT AUTO_INCREMENT | BIGSERIAL 또는 BIGINT IDENTITY | JPA 전략 확정 필요 |
| 문자열 코드 | VARCHAR(64) | VARCHAR(64) | 주문번호/코드/바코드/QR |
| 이름/라벨 | VARCHAR(255) | VARCHAR(255) | 상품명, 거래처명 등 |
| 상태/구분 | VARCHAR(32) | VARCHAR(32) | enum은 애플리케이션에서 우선 관리 |
| 수량 | DECIMAL(18,3) | NUMERIC(18,3) | 정수만 필요해도 확장성 고려 |
| CBM | DECIMAL(18,6) | NUMERIC(18,6) | 정밀도 확인 필요 |
| 날짜 | DATE | DATE | 배송일/납기일 |
| 일시 | DATETIME(6) | TIMESTAMP(6) WITH TIME ZONE | 운영 timezone 정책 필요 |
| JSON 보조 | JSON | JSONB | 검색 의존 금지 |

## 3. 테이블 설계

### 3-1. `users`

| 항목 | 내용 |
|---|---|
| 목적 | OMS 사용자 계정 관리 |
| 주요 컬럼 | `id`, `tenant_id`, `login_id`, `name`, `email`, `password_hash`, `status`, `last_login_at`, `created_at`, `updated_at` |
| 컬럼 타입 제안 | `id`, `tenant_id` BIGINT, `login_id/email/name/status` VARCHAR, `password_hash` VARCHAR(255), 일시 컬럼 DATETIME/TIMESTAMP |
| nullable 여부 | `tenant_id`, `login_id`, `name`, `password_hash`, `status`, `created_at` NOT NULL. `email`, `last_login_at`, `updated_at` NULL 허용 |
| primary key | `id` |
| foreign key | `tenant_id` -> `tenants.id` |
| unique 제약 | `tenant_id`, `login_id`. `email` unique 여부는 운영 정책 확인 |
| index 제안 | `idx_users_tenant_status` |
| MySQL 구현 시 타입 | `BIGINT AUTO_INCREMENT`, `VARCHAR`, `DATETIME(6)` |
| PostgreSQL 구현 시 타입 | `BIGSERIAL`, `VARCHAR`, `TIMESTAMPTZ` |
| 비고 | 내부 사용자 인증 방식은 JWT/Session 중 추후 확정 |

### 3-2. `roles`

| 항목 | 내용 |
|---|---|
| 목적 | 권한 역할 관리 |
| 주요 컬럼 | `id`, `code`, `name`, `description`, `created_at` |
| 컬럼 타입 제안 | `id` BIGINT, `code` VARCHAR(64), `name` VARCHAR(100), `description` VARCHAR(500), `created_at` 일시 |
| nullable 여부 | `code`, `name`, `created_at` NOT NULL. `description` NULL 허용 |
| primary key | `id` |
| foreign key | 없음 |
| unique 제약 | `code` |
| index 제안 | `idx_roles_code` |
| MySQL 구현 시 타입 | `BIGINT AUTO_INCREMENT`, `VARCHAR`, `DATETIME(6)` |
| PostgreSQL 구현 시 타입 | `BIGSERIAL`, `VARCHAR`, `TIMESTAMPTZ` |
| 비고 | 예: `ADMIN`, `OPERATOR`, `VIEWER`, `API_MANAGER` |

### 3-3. `user_roles`

| 항목 | 내용 |
|---|---|
| 목적 | 사용자와 역할의 N:M 매핑 |
| 주요 컬럼 | `user_id`, `role_id`, `created_at` |
| 컬럼 타입 제안 | BIGINT FK, 일시 |
| nullable 여부 | 전체 NOT NULL |
| primary key | 복합 PK `user_id`, `role_id` |
| foreign key | `user_id` -> `users.id`, `role_id` -> `roles.id` |
| unique 제약 | PK로 대체 |
| index 제안 | `idx_user_roles_role_id` |
| MySQL 구현 시 타입 | `BIGINT`, `DATETIME(6)` |
| PostgreSQL 구현 시 타입 | `BIGINT`, `TIMESTAMPTZ` |
| 비고 | 역할 삭제 정책은 운영 전 확정 필요 |

### 3-4. `api_keys`

| 항목 | 내용 |
|---|---|
| 목적 | 외부 WOS/PL API 호출자 인증 |
| 주요 컬럼 | `id`, `tenant_id`, `client_id`, `name`, `key_hash`, `status`, `allowed_scope`, `expires_at`, `last_used_at`, `created_by`, `created_at` |
| 컬럼 타입 제안 | BIGINT, VARCHAR, TEXT/JSON 보조, 일시 |
| nullable 여부 | `tenant_id`, `name`, `key_hash`, `status`, `created_at` NOT NULL. `client_id`, `expires_at`, `last_used_at`, `created_by` NULL 허용 |
| primary key | `id` |
| foreign key | `tenant_id` -> `tenants.id`, `client_id` -> `tenant_clients.id`, `created_by` -> `users.id` |
| unique 제약 | `tenant_id`, `key_hash` |
| index 제안 | `idx_api_keys_tenant_status`, `idx_api_keys_client`, `idx_api_keys_expires_at` |
| MySQL 구현 시 타입 | `BIGINT AUTO_INCREMENT`, `VARCHAR`, `JSON`, `DATETIME(6)` |
| PostgreSQL 구현 시 타입 | `BIGSERIAL`, `VARCHAR`, `JSONB`, `TIMESTAMPTZ` |
| 비고 | 원문 API Key는 저장하지 않고 hash만 저장 |

### 3-5. `upload_batches`

| 항목 | 내용 |
|---|---|
| 목적 | OIS 엑셀 업로드 배치의 중심 테이블 |
| 주요 컬럼 | `id`, `tenant_id`, `client_id`, `batch_no`, `status`, `delivery_date`, `product_master_version_id`, `store_route_master_version_id`, `uploaded_by`, `uploaded_at`, `validated_at`, `confirmed_at`, `confirmed_by`, `error_count`, `warning_count`, `memo` |
| 컬럼 타입 제안 | BIGINT, VARCHAR, DATE, INTEGER, 일시 |
| nullable 여부 | `tenant_id`, `client_id`, `batch_no`, `status`, `uploaded_at` NOT NULL. master version, delivery/validate/confirm 관련 컬럼은 단계별 NULL 허용 |
| primary key | `id` |
| foreign key | `tenant_id` -> `tenants.id`, `client_id` -> `tenant_clients.id`, master version FK, `uploaded_by/confirmed_by` -> `users.id` |
| unique 제약 | `tenant_id`, `client_id`, `batch_no` |
| index 제안 | `idx_upload_batches_tenant_client_status`, `idx_upload_batches_tenant_client_delivery_date`, `idx_upload_batches_confirmed_at` |
| MySQL 구현 시 타입 | `BIGINT AUTO_INCREMENT`, `VARCHAR`, `DATE`, `DATETIME(6)` |
| PostgreSQL 구현 시 타입 | `BIGSERIAL`, `VARCHAR`, `DATE`, `TIMESTAMPTZ` |
| 비고 | 외부 API는 `status='CONFIRMED'` 배치만 응답 |

### 3-6. `uploaded_files`

| 항목 | 내용 |
|---|---|
| 목적 | 업로드 원본 파일 메타정보 저장 |
| 주요 컬럼 | `id`, `batch_id`, `file_type`, `original_file_name`, `stored_path`, `file_hash`, `file_size`, `content_type`, `created_at` |
| 컬럼 타입 제안 | BIGINT, VARCHAR, BIGINT file size, 일시 |
| nullable 여부 | `batch_id`, `original_file_name`, `stored_path`, `file_hash`, `file_size`, `created_at` NOT NULL |
| primary key | `id` |
| foreign key | `batch_id` -> `upload_batches.id` |
| unique 제약 | 필요 시 `file_hash` |
| index 제안 | `idx_uploaded_files_batch_id`, `idx_uploaded_files_file_hash` |
| MySQL 구현 시 타입 | `BIGINT AUTO_INCREMENT`, `VARCHAR`, `DATETIME(6)` |
| PostgreSQL 구현 시 타입 | `BIGSERIAL`, `VARCHAR`, `TIMESTAMPTZ` |
| 비고 | XLSM 매크로는 실행하지 않고 파일만 보관 |

### 3-7. `product_master_versions`

| 항목 | 내용 |
|---|---|
| 목적 | 상품 마스터 업로드 버전 관리 |
| 주요 컬럼 | `id`, `tenant_id`, `scope_type`, `scope_key`, `client_id`, `version_name`, `status`, `active_yn`, `original_file_name`, `file_hash`, `uploaded_by`, `uploaded_at`, `row_count` |
| 컬럼 타입 제안 | BIGINT, VARCHAR, BOOLEAN/CHAR, INTEGER, 일시 |
| nullable 여부 | `tenant_id`, `scope_type`, `scope_key`, `version_name`, `status`, `active_yn`, `uploaded_at` NOT NULL. `client_id`는 `scope_type = CLIENT`일 때만 사용 |
| primary key | `id` |
| foreign key | `tenant_id` -> `tenants.id`, `client_id` -> `tenant_clients.id`, `uploaded_by` -> `users.id` |
| unique 제약 | `tenant_id`, `scope_type`, `scope_key`, `version_name` |
| index 제안 | `idx_product_master_versions_tenant_active`, `idx_product_master_versions_scope`, `idx_product_master_versions_uploaded_at` |
| MySQL 구현 시 타입 | `BIGINT AUTO_INCREMENT`, `VARCHAR`, `BOOLEAN` 또는 `CHAR(1)`, `DATETIME(6)` |
| PostgreSQL 구현 시 타입 | `BIGSERIAL`, `VARCHAR`, `BOOLEAN`, `TIMESTAMPTZ` |
| 비고 | 1차 MVP 기본값은 `scope_type = TENANT`, `scope_key = TENANT`. 활성 버전은 scope별로 애플리케이션 트랜잭션으로 단일화 |

### 3-8. `product_masters`

| 항목 | 내용 |
|---|---|
| 목적 | 상품 마스터 상세 행 저장 |
| 주요 컬럼 | `id`, `tenant_id`, `version_id`, `ezadmin_code`, `product_name`, `customer_product_code`, `box_qty`, `shipping_unit`, `storage_temperature`, `cbm`, `operation_status`, `raw_row_json`, `row_no`, `created_at` |
| 컬럼 타입 제안 | BIGINT, VARCHAR, DECIMAL, JSON 보조, INTEGER |
| nullable 여부 | `tenant_id`, `version_id`, `ezadmin_code`, `product_name`, `row_no` NOT NULL. 나머지는 원본 상태에 따라 NULL 허용 |
| primary key | `id` |
| foreign key | `tenant_id` -> `tenants.id`, `version_id` -> `product_master_versions.id` |
| unique 제약 | `tenant_id`, `version_id`, `ezadmin_code` |
| index 제안 | `idx_product_masters_tenant_code`, `idx_product_masters_tenant_name`, `idx_product_masters_status` |
| MySQL 구현 시 타입 | `BIGINT AUTO_INCREMENT`, `VARCHAR`, `DECIMAL`, `JSON`, `DATETIME(6)` |
| PostgreSQL 구현 시 타입 | `BIGSERIAL`, `VARCHAR`, `NUMERIC`, `JSONB`, `TIMESTAMPTZ` |
| 비고 | 운영 데이터의 `product_code`와 `ezadmin_code`를 매칭 |

### 3-9. `store_route_master_versions`

| 항목 | 내용 |
|---|---|
| 목적 | 배송지/차량 마스터 업로드 버전 관리 |
| 주요 컬럼 | `id`, `tenant_id`, `scope_type`, `scope_key`, `client_id`, `version_name`, `status`, `active_yn`, `original_file_name`, `file_hash`, `uploaded_by`, `uploaded_at`, `row_count` |
| 컬럼 타입 제안 | BIGINT, VARCHAR, BOOLEAN/CHAR, INTEGER, 일시 |
| nullable 여부 | `tenant_id`, `scope_type`, `scope_key`, `version_name`, `status`, `active_yn`, `uploaded_at` NOT NULL. `client_id`는 `scope_type = CLIENT`일 때만 사용 |
| primary key | `id` |
| foreign key | `tenant_id` -> `tenants.id`, `client_id` -> `tenant_clients.id`, `uploaded_by` -> `users.id` |
| unique 제약 | `tenant_id`, `scope_type`, `scope_key`, `version_name` |
| index 제안 | `idx_store_route_master_versions_tenant_active`, `idx_store_route_master_versions_scope`, `idx_store_route_master_versions_uploaded_at` |
| MySQL 구현 시 타입 | `BIGINT AUTO_INCREMENT`, `VARCHAR`, `BOOLEAN` 또는 `CHAR(1)`, `DATETIME(6)` |
| PostgreSQL 구현 시 타입 | `BIGSERIAL`, `VARCHAR`, `BOOLEAN`, `TIMESTAMPTZ` |
| 비고 | 1차 MVP 기본값은 `scope_type = TENANT`, `scope_key = TENANT`. 기준 시트는 `●Store_Data`로 예상 |

### 3-10. `store_route_masters`

| 항목 | 내용 |
|---|---|
| 목적 | 배송지/차량/권역/차수 마스터 상세 행 저장 |
| 주요 컬럼 | `id`, `tenant_id`, `version_id`, `baljugo_code`, `customer_code`, `brand_name`, `store_name`, `area`, `delivery_round`, `vehicle_name`, `driver_name`, `address`, `operation_status`, `raw_row_json`, `row_no`, `created_at` |
| 컬럼 타입 제안 | BIGINT, VARCHAR, JSON 보조, INTEGER |
| nullable 여부 | `tenant_id`, `version_id`, `baljugo_code`, `row_no` NOT NULL. 나머지는 원본 상태에 따라 NULL 허용 |
| primary key | `id` |
| foreign key | `tenant_id` -> `tenants.id`, `version_id` -> `store_route_master_versions.id` |
| unique 제약 | `tenant_id`, `version_id`, `baljugo_code` |
| index 제안 | `idx_store_route_masters_tenant_baljugo`, `idx_store_route_masters_tenant_round`, `idx_store_route_masters_tenant_vehicle`, `idx_store_route_masters_tenant_area` |
| MySQL 구현 시 타입 | `BIGINT AUTO_INCREMENT`, `VARCHAR`, `JSON`, `DATETIME(6)` |
| PostgreSQL 구현 시 타입 | `BIGSERIAL`, `VARCHAR`, `JSONB`, `TIMESTAMPTZ` |
| 비고 | 운영 데이터의 `store_code` 또는 `order_business_site_code`와 `baljugo_code`를 매칭 |

### 3-11. `excel_sheet_results`

| 항목 | 내용 |
|---|---|
| 목적 | 업로드 엑셀의 시트별 파싱 결과와 건수 저장 |
| 주요 컬럼 | `id`, `batch_id`, `sheet_name`, `sheet_type`, `suffix_value`, `header_row_no`, `data_row_count`, `status`, `message`, `created_at` |
| 컬럼 타입 제안 | BIGINT, VARCHAR, INTEGER, 일시 |
| nullable 여부 | `batch_id`, `sheet_name`, `sheet_type`, `data_row_count`, `status` NOT NULL |
| primary key | `id` |
| foreign key | `batch_id` -> `upload_batches.id` |
| unique 제약 | `batch_id`, `sheet_name` |
| index 제안 | `idx_excel_sheet_results_batch`, `idx_excel_sheet_results_type` |
| MySQL 구현 시 타입 | `BIGINT AUTO_INCREMENT`, `VARCHAR`, `INT`, `DATETIME(6)` |
| PostgreSQL 구현 시 타입 | `BIGSERIAL`, `VARCHAR`, `INTEGER`, `TIMESTAMPTZ` |
| 비고 | `Scan_upload_군량리` 0건도 정상 result로 기록 |

### 3-12. `scan_lines`

| 항목 | 내용 |
|---|---|
| 목적 | `Scan_upload_*` 행 저장 및 WOS API 원천 |
| 주요 컬럼 | `id`, `batch_id`, `sheet_name`, `scan_center`, `delivery_date`, `bus`, `barcode`, `order_business_site_code`, `store_name`, `product_code`, `product_name`, `label_qty`, `unit`, `box_sequence`, `temperature_type`, `row_no`, `raw_row_json`, `created_at` |
| 컬럼 타입 제안 | BIGINT, VARCHAR, DATE, DECIMAL, JSON 보조, INTEGER |
| nullable 여부 | `batch_id`, `sheet_name`, `row_no` NOT NULL. 필수 업무 컬럼은 파싱 후 검증 오류로 관리하되 저장은 허용 가능 |
| primary key | `id` |
| foreign key | `batch_id` -> `upload_batches.id` |
| unique 제약 | 권장: `batch_id`, `barcode` |
| index 제안 | `idx_scan_lines_batch`, `idx_scan_lines_delivery`, `idx_scan_lines_center`, `idx_scan_lines_store`, `idx_scan_lines_product`, `idx_scan_lines_barcode` |
| MySQL 구현 시 타입 | `BIGINT AUTO_INCREMENT`, `VARCHAR`, `DATE`, `DECIMAL`, `JSON`, `DATETIME(6)` |
| PostgreSQL 구현 시 타입 | `BIGSERIAL`, `VARCHAR`, `DATE`, `NUMERIC`, `JSONB`, `TIMESTAMPTZ` |
| 비고 | `Scan_upload_*` suffix는 `scan_center`에 저장 |

### 3-13. `pl_lines`

| 항목 | 내용 |
|---|---|
| 목적 | `PL_EA`, `PL_Box` 행 저장 및 PL API/주문 재구성 원천 |
| 주요 컬럼 | `id`, `batch_id`, `sheet_name`, `pl_type`, `order_no`, `store_code`, `store_name`, `brand_name`, `product_code`, `product_name`, `unit`, `storage_temperature`, `due_date`, `order_qty`, `vehicle_name`, `cbm`, `qr_code`, `box_qty`, `row_no`, `raw_row_json`, `created_at` |
| 컬럼 타입 제안 | BIGINT, VARCHAR, DATE, DECIMAL, JSON 보조, INTEGER |
| nullable 여부 | `batch_id`, `pl_type`, `sheet_name`, `row_no` NOT NULL. 업무 필수값 누락은 validation으로 관리 |
| primary key | `id` |
| foreign key | `batch_id` -> `upload_batches.id` |
| unique 제약 | 필요 시 `batch_id`, `qr_code`는 NULL 정책 확인 후 적용 |
| index 제안 | `idx_pl_lines_batch`, `idx_pl_lines_due_date`, `idx_pl_lines_store`, `idx_pl_lines_product`, `idx_pl_lines_vehicle`, `idx_pl_lines_order_no` |
| MySQL 구현 시 타입 | `BIGINT AUTO_INCREMENT`, `VARCHAR`, `DATE`, `DECIMAL`, `JSON`, `DATETIME(6)` |
| PostgreSQL 구현 시 타입 | `BIGSERIAL`, `VARCHAR`, `DATE`, `NUMERIC`, `JSONB`, `TIMESTAMPTZ` |
| 비고 | `order_lines` 생성 기준 데이터 |

### 3-14. `label_lines`

| 항목 | 내용 |
|---|---|
| 목적 | `Label_EA`, `Label_Box` 행 저장 및 라벨 다운로드 원천 |
| 주요 컬럼 | `id`, `batch_id`, `sheet_name`, `label_type`, `order_no`, `store_code`, `store_name`, `product_code`, `product_name`, `order_qty`, `sequence_no`, `matching_code`, `qr_code`, `box_sequence`, `total_box_qty`, `row_no`, `raw_row_json`, `created_at` |
| 컬럼 타입 제안 | BIGINT, VARCHAR, DECIMAL, JSON 보조, INTEGER |
| nullable 여부 | `batch_id`, `label_type`, `sheet_name`, `row_no` NOT NULL. `product_code`는 Label_EA 예외 가능성으로 NULL 허용 검토 |
| primary key | `id` |
| foreign key | `batch_id` -> `upload_batches.id` |
| unique 제약 | 필요 시 `batch_id`, `qr_code` |
| index 제안 | `idx_label_lines_batch`, `idx_label_lines_store`, `idx_label_lines_product`, `idx_label_lines_order_no`, `idx_label_lines_matching_code` |
| MySQL 구현 시 타입 | `BIGINT AUTO_INCREMENT`, `VARCHAR`, `DECIMAL`, `JSON`, `DATETIME(6)` |
| PostgreSQL 구현 시 타입 | `BIGSERIAL`, `VARCHAR`, `NUMERIC`, `JSONB`, `TIMESTAMPTZ` |
| 비고 | 라벨 다운로드 포맷은 운영 확인 필요 |

### 3-15. `order_lines`

| 항목 | 내용 |
|---|---|
| 목적 | PL 기반 OMS 주문 조회용 요약 데이터 |
| 주요 컬럼 | `id`, `batch_id`, `source_pl_line_id`, `order_no`, `store_code`, `store_name`, `brand_name`, `product_code`, `product_name`, `unit`, `order_qty`, `due_date`, `vehicle_name`, `delivery_round`, `area`, `created_at` |
| 컬럼 타입 제안 | BIGINT, VARCHAR, DATE, DECIMAL, 일시 |
| nullable 여부 | `batch_id`, `source_pl_line_id` NOT NULL. 업무 필수값은 검증과 함께 관리 |
| primary key | `id` |
| foreign key | `batch_id` -> `upload_batches.id`, `source_pl_line_id` -> `pl_lines.id` |
| unique 제약 | 권장: `source_pl_line_id` |
| index 제안 | `idx_order_lines_batch`, `idx_order_lines_due_date`, `idx_order_lines_store`, `idx_order_lines_product`. `idx_order_lines_round_vehicle`는 차수별 조회 개념 확정 후 선택 적용 |
| MySQL 구현 시 타입 | `BIGINT AUTO_INCREMENT`, `VARCHAR`, `DATE`, `DECIMAL`, `DATETIME(6)` |
| PostgreSQL 구현 시 타입 | `BIGSERIAL`, `VARCHAR`, `DATE`, `NUMERIC`, `TIMESTAMPTZ` |
| 비고 | 원본 주문 테이블이 아니라 조회용 재구성 데이터. `delivery_round`, `area`, `vehicle_name`은 추후 차수별 조회를 위해 보존하되 1차 MVP 필수 조회/다운로드 기준으로 사용하지 않는다. |

### 3-16. `validation_errors`

| 항목 | 내용 |
|---|---|
| 목적 | 배치/행/컬럼 단위 검증 오류 저장 |
| 주요 컬럼 | `id`, `batch_id`, `severity`, `error_code`, `domain_type`, `sheet_name`, `row_no`, `column_name`, `line_id`, `line_table`, `message`, `raw_value`, `normalized_value`, `resolved_yn`, `created_at` |
| 컬럼 타입 제안 | BIGINT, VARCHAR, INTEGER, TEXT, BOOLEAN/CHAR, 일시 |
| nullable 여부 | `batch_id`, `severity`, `error_code`, `message`, `created_at` NOT NULL |
| primary key | `id` |
| foreign key | `batch_id` -> `upload_batches.id` |
| unique 제약 | 없음. 중복 생성 방지는 검증 실행 단위에서 처리 |
| index 제안 | `idx_validation_errors_batch_severity`, `idx_validation_errors_code`, `idx_validation_errors_sheet_row`, `idx_validation_errors_resolved` |
| MySQL 구현 시 타입 | `BIGINT AUTO_INCREMENT`, `VARCHAR`, `TEXT`, `DATETIME(6)` |
| PostgreSQL 구현 시 타입 | `BIGSERIAL`, `VARCHAR`, `TEXT`, `TIMESTAMPTZ` |
| 비고 | Error가 존재하면 배치 확정 불가 |

### 3-17. `batch_audit_logs`

| 항목 | 내용 |
|---|---|
| 목적 | 배치 상태 전환과 주요 작업 이력 저장 |
| 주요 컬럼 | `id`, `batch_id`, `action`, `before_status`, `after_status`, `actor_id`, `message`, `metadata_json`, `created_at` |
| 컬럼 타입 제안 | BIGINT, VARCHAR, JSON 보조, 일시 |
| nullable 여부 | `action`, `created_at` NOT NULL. `batch_id`, `actor_id`는 시스템 작업이면 NULL 허용 |
| primary key | `id` |
| foreign key | `batch_id` -> `upload_batches.id`, `actor_id` -> `users.id` |
| unique 제약 | 없음 |
| index 제안 | `idx_batch_audit_logs_batch`, `idx_batch_audit_logs_action`, `idx_batch_audit_logs_created_at` |
| MySQL 구현 시 타입 | `BIGINT AUTO_INCREMENT`, `VARCHAR`, `JSON`, `DATETIME(6)` |
| PostgreSQL 구현 시 타입 | `BIGSERIAL`, `VARCHAR`, `JSONB`, `TIMESTAMPTZ` |
| 비고 | 확정/취소/롤백/재검증 이벤트 기록 |

### 3-18. `api_call_logs`

| 항목 | 내용 |
|---|---|
| 목적 | 외부 API 호출 이력과 응답 상태 추적 |
| 주요 컬럼 | `id`, `api_key_id`, `path`, `method`, `query_string`, `request_id`, `response_status`, `response_time_ms`, `client_ip`, `created_at` |
| 컬럼 타입 제안 | BIGINT, VARCHAR, INTEGER, TEXT, 일시 |
| nullable 여부 | `path`, `method`, `response_status`, `created_at` NOT NULL. `api_key_id`는 인증 실패 시 NULL 허용 |
| primary key | `id` |
| foreign key | `api_key_id` -> `api_keys.id` |
| unique 제약 | `request_id`는 생성 정책에 따라 unique 권장 |
| index 제안 | `idx_api_call_logs_api_key`, `idx_api_call_logs_path`, `idx_api_call_logs_created_at`, `idx_api_call_logs_status` |
| MySQL 구현 시 타입 | `BIGINT AUTO_INCREMENT`, `VARCHAR`, `TEXT`, `DATETIME(6)` |
| PostgreSQL 구현 시 타입 | `BIGSERIAL`, `VARCHAR`, `TEXT`, `TIMESTAMPTZ` |
| 비고 | API 응답 본문 전체 저장은 개인정보/용량 정책 확인 필요 |

### 3-19. `download_logs`

| 항목 | 내용 |
|---|---|
| 목적 | 다운로드 이력 저장. 1차 MVP는 라벨 다운로드 중심이며, 차수별 다운로드 이력은 추후 구현 시 같은 테이블을 확장 사용 |
| 주요 컬럼 | `id`, `batch_id`, `download_type`, `file_name`, `filter_json`, `row_count`, `downloaded_by`, `downloaded_at` |
| 컬럼 타입 제안 | BIGINT, VARCHAR, JSON 보조, INTEGER, 일시 |
| nullable 여부 | `download_type`, `file_name`, `downloaded_at` NOT NULL. `batch_id`, `downloaded_by`는 상황에 따라 NULL 허용 |
| primary key | `id` |
| foreign key | `batch_id` -> `upload_batches.id`, `downloaded_by` -> `users.id` |
| unique 제약 | 없음 |
| index 제안 | `idx_download_logs_batch`, `idx_download_logs_type`, `idx_download_logs_user`, `idx_download_logs_downloaded_at` |
| MySQL 구현 시 타입 | `BIGINT AUTO_INCREMENT`, `VARCHAR`, `JSON`, `DATETIME(6)` |
| PostgreSQL 구현 시 타입 | `BIGSERIAL`, `VARCHAR`, `JSONB`, `TIMESTAMPTZ` |
| 비고 | 운영 감사와 재현성을 위해 조회 조건을 저장 |

## 4. 주요 매칭 관계

```text
scan_lines.product_code -> product_masters.ezadmin_code
pl_lines.product_code -> product_masters.ezadmin_code
label_lines.product_code -> product_masters.ezadmin_code
order_lines.product_code -> product_masters.ezadmin_code

scan_lines.order_business_site_code -> store_route_masters.baljugo_code
pl_lines.store_code -> store_route_masters.baljugo_code
label_lines.store_code -> store_route_masters.baljugo_code
order_lines.store_code -> store_route_masters.baljugo_code
```

마스터 간 직접 조인은 금지한다. 운영 데이터가 중심이며, 배치에 기록된 master version 기준으로 각각 매칭한다.

## 5. DB별 선택 기능

| 기능 | MySQL 기본안 | PostgreSQL 선택안 |
|---|---|---|
| 원본 row 저장 | JSON 컬럼 보조 저장 | JSONB + GIN index 선택 가능 |
| CONFIRMED 배치 최적화 | status + delivery_date 복합 index | partial index 선택 가능 |
| 리포트 조회 | 일반 테이블/뷰 | materialized view 선택 가능 |
| 오류 검색 | 일반 index + 조건 컬럼 | expression/partial index 선택 가능 |

1차 MVP에서는 DB별 전용 기능에 의존하지 않는다.
