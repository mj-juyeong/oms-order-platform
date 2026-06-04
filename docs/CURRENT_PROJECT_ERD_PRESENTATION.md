# OMS 현재 프로젝트 ERD

작성 기준: `backend/src/main/resources/db/migration`의 실제 migration `V1~V17`

이 문서는 발표 화면에서 잘 보이도록 전체 ERD를 한 번에 크게 펼치기보다, 업무 흐름별로 나눈 ERD를 제공한다. 컬럼은 모든 컬럼을 나열하지 않고, 관계 파악에 필요한 PK/FK와 핵심 업무 컬럼만 표시한다.

## 1. 발표용 한 장 요약

OMS의 현재 DB 구조는 `tenant -> client -> upload_batch`를 중심으로 운영 데이터가 쌓이고, 마스터 데이터는 tenant 기준으로 관리한 뒤 client별 공개 범위를 별도로 제어하는 구조다.

```mermaid
erDiagram
  tenants ||--o{ clients : "tenant clients"
  tenants ||--o{ users : "tenant users"
  clients ||--o{ users : "client users"

  tenants ||--o{ master_upload_batches : "master upload"
  master_upload_batches ||--o{ product_master_items : "product upsert"
  master_upload_batches ||--o{ store_route_master_items : "store/route upsert"

  tenants ||--o{ upload_batches : "operation upload"
  clients ||--o{ upload_batches : "client batch"
  upload_batches ||--o{ uploaded_files : "source files"
  upload_batches ||--o{ excel_sheet_results : "sheet parse result"
  upload_batches ||--o{ scan_lines : "Scan_upload_*"
  upload_batches ||--o{ pl_lines : "PL_EA / PL_Box"
  upload_batches ||--o{ label_lines : "Label_EA / Label_Box"
  upload_batches ||--o{ order_lines : "OMS query summary"
  pl_lines ||--o| order_lines : "source PL"

  upload_batches ||--o{ validation_errors : "validation"
  upload_batches ||--o{ batch_confirmation_requests : "confirm request"
  upload_batches ||--o{ batch_audit_logs : "audit"
  upload_batches ||--o{ download_logs : "download"

  clients ||--o{ client_product_master_scopes : "product visibility"
  product_master_items ||--o{ client_product_master_scopes : "visible item"
  clients ||--o{ client_store_route_master_scopes : "store/route visibility"
  store_route_master_items ||--o{ client_store_route_master_scopes : "visible item"
```

## 2. 운영 업로드 중심 ERD

운영 데이터의 중심은 `upload_batches`다. 엑셀 업로드 후 파일, 시트 파싱 결과, Scan/PL/Label 원천 라인, PL 기반 주문 조회용 요약 라인, 검증 오류, 확정 요청, 감사/다운로드 로그가 batch 기준으로 연결된다.

```mermaid
erDiagram
  tenants {
    BIGINT id PK
    VARCHAR code UK
    VARCHAR name
    VARCHAR status
  }

  clients {
    BIGINT id PK
    BIGINT tenant_id FK
    VARCHAR code
    VARCHAR external_code
    VARCHAR name
    VARCHAR status
  }

  users {
    BIGINT id PK
    VARCHAR user_scope_type
    BIGINT tenant_id FK
    BIGINT client_id FK
    VARCHAR login_id UK
    VARCHAR status
  }

  upload_batches {
    BIGINT id PK
    BIGINT tenant_id FK
    BIGINT client_id FK
    BIGINT parent_batch_id FK
    VARCHAR batch_no
    INT revision_no
    VARCHAR status
    DATE delivery_date
    BIGINT uploaded_by FK
    BIGINT confirmed_by FK
    INT error_count
    INT warning_count
  }

  uploaded_files {
    BIGINT id PK
    BIGINT tenant_id FK
    BIGINT client_id FK
    BIGINT batch_id FK
    VARCHAR file_type
    VARCHAR original_file_name
    VARCHAR stored_path
    VARCHAR file_hash
  }

  excel_sheet_results {
    BIGINT id PK
    BIGINT tenant_id FK
    BIGINT client_id FK
    BIGINT batch_id FK
    VARCHAR sheet_name
    VARCHAR sheet_type
    VARCHAR suffix_value
    INT data_row_count
    VARCHAR status
  }

  scan_lines {
    BIGINT id PK
    BIGINT tenant_id FK
    BIGINT client_id FK
    BIGINT batch_id FK
    VARCHAR sheet_name
    VARCHAR scan_center
    VARCHAR barcode
    VARCHAR order_business_site_code
    VARCHAR product_code
    DECIMAL label_qty
    INT row_no
  }

  pl_lines {
    BIGINT id PK
    BIGINT tenant_id FK
    BIGINT client_id FK
    BIGINT batch_id FK
    VARCHAR sheet_name
    VARCHAR pl_type
    VARCHAR order_no
    VARCHAR store_code
    VARCHAR product_code
    DECIMAL order_qty
    VARCHAR qr_code
    INT row_no
  }

  label_lines {
    BIGINT id PK
    BIGINT tenant_id FK
    BIGINT client_id FK
    BIGINT batch_id FK
    VARCHAR sheet_name
    VARCHAR label_type
    VARCHAR order_no
    VARCHAR store_code
    VARCHAR brand_name
    VARCHAR product_code
    VARCHAR matching_code
    VARCHAR qr_code
    INT row_no
  }

  order_lines {
    BIGINT id PK
    BIGINT tenant_id FK
    BIGINT client_id FK
    BIGINT batch_id FK
    BIGINT source_pl_line_id FK
    VARCHAR order_no
    VARCHAR store_code
    VARCHAR product_code
    DECIMAL order_qty
    DATE due_date
  }

  validation_errors {
    BIGINT id PK
    BIGINT tenant_id FK
    BIGINT client_id FK
    BIGINT batch_id FK
    VARCHAR severity
    VARCHAR error_code
    VARCHAR domain
    VARCHAR line_table
    BIGINT line_id
    BOOLEAN resolved_yn
  }

  batch_confirmation_requests {
    BIGINT id PK
    BIGINT tenant_id FK
    BIGINT client_id FK
    BIGINT batch_id FK
    VARCHAR status
    BIGINT requested_by FK
    BIGINT reviewed_by FK
    VARCHAR supplement_type
  }

  batch_audit_logs {
    BIGINT id PK
    BIGINT tenant_id FK
    BIGINT client_id FK
    BIGINT batch_id FK
    VARCHAR action
    BIGINT actor_id FK
    VARCHAR request_id
  }

  download_logs {
    BIGINT id PK
    BIGINT tenant_id FK
    BIGINT client_id FK
    BIGINT batch_id FK
    VARCHAR download_type
    BIGINT downloaded_by FK
  }

  tenants ||--o{ clients : has
  tenants ||--o{ users : has
  clients ||--o{ users : has

  tenants ||--o{ upload_batches : owns
  clients ||--o{ upload_batches : owns
  users |o--o{ upload_batches : uploaded_by
  users |o--o{ upload_batches : confirmed_by
  upload_batches |o--o{ upload_batches : parent_batch

  upload_batches ||--o{ uploaded_files : has
  upload_batches ||--o{ excel_sheet_results : has
  upload_batches ||--o{ scan_lines : has
  upload_batches ||--o{ pl_lines : has
  upload_batches ||--o{ label_lines : has
  upload_batches ||--o{ order_lines : has
  pl_lines ||--o| order_lines : source
  upload_batches ||--o{ validation_errors : has
  upload_batches ||--o{ batch_confirmation_requests : has
  users |o--o{ batch_confirmation_requests : requested_reviewed
  upload_batches ||--o{ batch_audit_logs : has
  users |o--o{ batch_audit_logs : actor
  upload_batches |o--o{ download_logs : downloaded
  users |o--o{ download_logs : downloaded_by
```

## 3. 마스터 데이터와 client 공개 범위 ERD

상품 마스터와 배송지/차량 마스터는 tenant 기준 현재 데이터를 upsert한다. client별로 어떤 마스터를 볼 수 있는지는 scope 테이블에서 관리한다.

```mermaid
erDiagram
  tenants {
    BIGINT id PK
    VARCHAR code UK
    VARCHAR name
  }

  clients {
    BIGINT id PK
    BIGINT tenant_id FK
    VARCHAR code
    VARCHAR name
  }

  users {
    BIGINT id PK
    BIGINT tenant_id FK
    BIGINT client_id FK
    VARCHAR login_id UK
  }

  master_upload_batches {
    BIGINT id PK
    BIGINT tenant_id FK
    VARCHAR master_type
    VARCHAR status
    VARCHAR original_file_name
    INT row_count
    INT inserted_count
    INT updated_count
    INT failed_count
    BIGINT uploaded_by FK
  }

  product_master_items {
    BIGINT id PK
    BIGINT tenant_id FK
    VARCHAR ezadmin_code UK
    VARCHAR product_name
    VARCHAR customer_product_code
    DECIMAL box_qty
    BOOLEAN active_yn
    BIGINT last_master_upload_batch_id FK
  }

  store_route_master_items {
    BIGINT id PK
    BIGINT tenant_id FK
    VARCHAR baljugo_code UK
    VARCHAR customer_code
    VARCHAR brand_name
    VARCHAR store_name
    VARCHAR delivery_day
    VARCHAR vehicle_name
    BOOLEAN active_yn
    BIGINT last_master_upload_batch_id FK
  }

  master_upload_row_errors {
    BIGINT id PK
    BIGINT tenant_id FK
    BIGINT master_upload_batch_id FK
    VARCHAR master_type
    INT row_no
    VARCHAR column_name
    VARCHAR error_code
  }

  client_master_visibility_settings {
    BIGINT id PK
    BIGINT tenant_id FK
    BIGINT client_id FK
    VARCHAR product_visibility_mode
    VARCHAR store_route_visibility_mode
    BIGINT updated_by FK
  }

  client_product_master_scopes {
    BIGINT id PK
    BIGINT tenant_id FK
    BIGINT client_id FK
    BIGINT product_master_item_id FK
    VARCHAR status
    VARCHAR source
    BIGINT created_by FK
  }

  client_store_route_master_scopes {
    BIGINT id PK
    BIGINT tenant_id FK
    BIGINT client_id FK
    BIGINT store_route_master_item_id FK
    VARCHAR status
    VARCHAR source
    BIGINT created_by FK
  }

  client_product_code_mappings {
    BIGINT id PK
    BIGINT tenant_id FK
    BIGINT client_id FK
    VARCHAR client_product_code
    VARCHAR ezadmin_code
    BOOLEAN active_yn
  }

  client_store_code_mappings {
    BIGINT id PK
    BIGINT tenant_id FK
    BIGINT client_id FK
    VARCHAR client_store_code
    VARCHAR baljugo_code
    BOOLEAN active_yn
  }

  client_aliases {
    BIGINT id PK
    BIGINT tenant_id FK
    BIGINT client_id FK
    VARCHAR alias_name
    VARCHAR normalized_alias UK
    BOOLEAN active_yn
  }

  master_data_add_requests {
    BIGINT id PK
    BIGINT tenant_id FK
    BIGINT client_id FK
    VARCHAR request_type
    VARCHAR status
    JSON request_payload_json
    BIGINT requested_by FK
    BIGINT reviewed_by FK
  }

  tenants ||--o{ clients : has
  tenants ||--o{ master_upload_batches : has
  users |o--o{ master_upload_batches : uploaded_by
  master_upload_batches ||--o{ product_master_items : last_upload
  master_upload_batches ||--o{ store_route_master_items : last_upload
  master_upload_batches ||--o{ master_upload_row_errors : row_errors

  tenants ||--o{ product_master_items : owns
  tenants ||--o{ store_route_master_items : owns
  clients ||--o{ client_master_visibility_settings : settings
  users |o--o{ client_master_visibility_settings : updated_by

  clients ||--o{ client_product_master_scopes : product_scope
  product_master_items ||--o{ client_product_master_scopes : scoped_item
  users |o--o{ client_product_master_scopes : created_by

  clients ||--o{ client_store_route_master_scopes : store_route_scope
  store_route_master_items ||--o{ client_store_route_master_scopes : scoped_item
  users |o--o{ client_store_route_master_scopes : created_by

  clients ||--o{ client_product_code_mappings : product_code_mapping
  clients ||--o{ client_store_code_mappings : store_code_mapping
  clients ||--o{ client_aliases : aliases
  clients ||--o{ master_data_add_requests : add_request
  users |o--o{ master_data_add_requests : requested_reviewed
```

## 4. 인증, API Key, 알림 ERD

내부 사용자는 `users`, `roles`, `user_roles`로 관리한다. 외부 연동은 `api_keys`와 API 호출 로그, API Key 발급 요청/이벤트로 구성된다.

```mermaid
erDiagram
  tenants {
    BIGINT id PK
    VARCHAR code UK
    VARCHAR name
  }

  clients {
    BIGINT id PK
    BIGINT tenant_id FK
    VARCHAR code
    VARCHAR external_code
    VARCHAR name
  }

  users {
    BIGINT id PK
    VARCHAR user_scope_type
    BIGINT tenant_id FK
    BIGINT client_id FK
    VARCHAR login_id UK
    VARCHAR status
  }

  roles {
    BIGINT id PK
    VARCHAR code UK
    VARCHAR name
  }

  user_roles {
    BIGINT user_id PK,FK
    BIGINT role_id PK,FK
  }

  api_keys {
    BIGINT id PK
    BIGINT tenant_id FK
    BIGINT client_id FK
    VARCHAR scope_type
    VARCHAR name
    VARCHAR key_hash
    VARCHAR status
    JSON allowed_scope
    BIGINT created_by FK
  }

  api_call_logs {
    BIGINT id PK
    BIGINT tenant_id FK
    BIGINT client_id FK
    BIGINT api_key_id FK
    VARCHAR request_id UK
    VARCHAR path
    VARCHAR method
    INT response_status
  }

  api_key_requests {
    BIGINT id PK
    BIGINT tenant_id FK
    BIGINT client_id FK
    VARCHAR scope_type
    VARCHAR name
    VARCHAR purpose
    VARCHAR status
    BIGINT requested_by FK
    BIGINT reviewed_by FK
    BIGINT issued_api_key_id FK
    DATETIME issued_api_key_revealed_at
  }

  api_key_request_events {
    BIGINT id PK
    BIGINT request_id FK
    BIGINT tenant_id FK
    BIGINT client_id FK
    VARCHAR event_type
    BIGINT actor_id FK
    BIGINT api_key_id FK
  }

  notifications {
    BIGINT id PK
    BIGINT tenant_id FK
    BIGINT client_id FK
    BIGINT user_id FK
    VARCHAR target_scope
    VARCHAR event_type
    VARCHAR severity
    DATETIME read_at
  }

  tenants ||--o{ clients : has
  tenants ||--o{ users : scoped_users
  clients |o--o{ users : client_users
  users ||--o{ user_roles : has
  roles ||--o{ user_roles : grants

  tenants ||--o{ api_keys : owns
  clients |o--o{ api_keys : optional_client_scope
  users |o--o{ api_keys : created_by
  api_keys |o--o{ api_call_logs : used_by
  tenants ||--o{ api_call_logs : owns
  clients |o--o{ api_call_logs : optional_scope

  tenants ||--o{ api_key_requests : owns
  clients |o--o{ api_key_requests : optional_scope
  users |o--o{ api_key_requests : requested_reviewed
  api_keys |o--o{ api_key_requests : issued_key
  api_key_requests ||--o{ api_key_request_events : events
  users |o--o{ api_key_request_events : actor
  api_keys |o--o{ api_key_request_events : related_key

  tenants ||--o{ notifications : owns
  clients |o--o{ notifications : optional_scope
  users |o--o{ notifications : recipient
```

## 5. 코드 기반 매칭 관계

아래 관계는 현재 DB foreign key가 아니다. 운영 데이터 검증/조회에서 문자열 코드로 매칭하는 업무 관계다.

```mermaid
flowchart LR
  subgraph "운영 입력 라인"
    scan["scan_lines<br/>product_code<br/>order_business_site_code"]
    pl["pl_lines<br/>product_code<br/>store_code"]
    label["label_lines<br/>product_code<br/>store_code"]
    order["order_lines<br/>product_code<br/>store_code"]
  end

  subgraph "Tenant 기준 현재 마스터"
    product["product_master_items<br/>ezadmin_code"]
    storeRoute["store_route_master_items<br/>baljugo_code"]
  end

  scan -. "product_code = ezadmin_code" .-> product
  pl -. "product_code = ezadmin_code" .-> product
  label -. "product_code = ezadmin_code" .-> product
  order -. "product_code = ezadmin_code" .-> product

  scan -. "order_business_site_code = baljugo_code" .-> storeRoute
  pl -. "store_code = baljugo_code" .-> storeRoute
  label -. "store_code = baljugo_code" .-> storeRoute
  order -. "store_code = baljugo_code" .-> storeRoute
```

## 6. 발표 시 강조 포인트

- `upload_batches`가 운영 데이터의 중심이다.
- `scan_lines`, `pl_lines`, `label_lines`, `order_lines`는 모두 `batch_id`, `tenant_id`, `client_id`를 가진다.
- `order_lines`는 원본 주문 테이블이 아니라 `pl_lines`를 기반으로 재구성한 OMS 조회용 요약 데이터다.
- `Scan_upload_*`는 정식 입력 시트이며, suffix는 `scan_center`로 저장된다.
- 상품/배송지 마스터는 tenant 기준 현재 데이터이고, client 공개 범위는 scope 테이블로 제어한다.
- 상품/배송지 매칭은 DB FK가 아니라 코드값 매칭이다.
- API Key는 client 범위와 tenant 범위를 모두 지원하도록 `scope_type`과 nullable `client_id` 구조를 가진다.

