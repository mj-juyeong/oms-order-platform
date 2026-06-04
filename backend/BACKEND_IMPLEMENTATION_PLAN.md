# OMS Backend Implementation Plan

> 주의: 이 문서는 전체 Backend 구현 계획 참고용이다. 일반 Codex 작업 시작 시 자동으로 전체를 읽지 않는다. 루트 `AGENTS.md`, `backend/AGENTS.md`, `FUTURE_FEATURES.md`의 관련 항목만으로 판단이 부족할 때 필요한 섹션만 확인한다.

이 문서는 Backend 구현자가 전체 구현 흐름이나 아키텍처를 재검토할 때 참고하는 실행 계획서다.
기존 설계 문서를 Backend 구현 관점으로 재구성했으며, 실제 코드를 구현하지 않는다.

## 1. 기준 문서 사용 원칙

일반 Backend 구현 전에는 아래 문서를 모두 읽지 않는다. 작업 유형에 따라 필요한 범위만 확인한다.

| 문서/자료 | 확인하는 경우 |
|---|---|
| `AGENTS.md` | 모든 작업의 공통 규칙 확인 |
| `backend/AGENTS.md` | Backend 작업 규칙 확인 |
| `docs/mid_presentation_feedback_status_20260602/FUTURE_FEATURES.md` | 다음 구현 항목이나 남은 보완 범위 확인 |
| `docs/OMS_개발팀_전달용_최종요구사항_Codex_대화반영_최종.md` | 요구사항 충돌 또는 업무 정책 판단이 필요할 때 관련 섹션만 확인 |
| `docs/API_DESIGN_DRAFT.md` | 신규 API 설계 또는 응답 필드 확인이 필요할 때 관련 endpoint만 확인 |
| `docs/ERD_DESIGN.md` | 테이블 관계나 데이터 모델 확인이 필요할 때 관련 테이블만 확인 |
| `docs/DB_DECISION.md` | DB 정책, MySQL/PostgreSQL 판단이 필요할 때 확인 |
| `docs/DB_DESIGN_PROPOSAL.md` | 상세 컬럼, 인덱스, 제약 조건 확인이 필요할 때 관련 테이블만 확인 |
| `docs/IMPLEMENTATION_PLAN.md` | 전체 Phase 흐름을 다시 검토할 때만 확인 |
| `README.md` | 실행법이나 저장소 구조 확인이 필요할 때 확인 |
| migration SQL | 변경 대상 테이블의 현재 migration만 확인 |

문서 간 충돌이 있으면 `AGENTS.md`와 최종 요구사항 문서를 우선하되, 요구사항에 없는 업무 정책은 `확인 필요`로 남긴다.

## 2. 현재 Backend 상태 요약

### Phase 0 완료

- Spring Boot + Kotlin Backend 프로젝트가 생성되어 있다.
- Gradle Kotlin DSL을 사용한다.
- 기본 패키지는 `com.company.oms`다.
- 기본 profile은 DB 없이 실행 가능해야 한다.
- health check 또는 시스템 확인용 endpoint가 존재한다.
- 기본 context load 테스트가 존재한다.

### Phase 2 공통 기반 완료

- 공통 API 응답 구조가 준비되어 있다.
- 공통 예외 구조와 `GlobalExceptionHandler`가 준비되어 있다.
- 모든 요청에 `X-Request-Id`를 부여하고 응답 header와 body meta에 포함하는 구조가 준비되어 있다.
- `/api/v1/system/ping`, `/api/v1/system/error-sample`은 공통 응답과 공통 예외 확인용 샘플 API다.
- 인증/인가 skeleton이 존재하지만 실제 로그인, JWT, Session, API Key 검증은 구현하지 않았다.
- 파일 저장 interface skeleton이 존재하지만 업로드 API와 OIS 엑셀 저장 로직은 구현하지 않았다.
- audit logging skeleton이 존재하지만 DB 저장은 구현하지 않았다.
- JPA, MySQL, Flyway 사용 준비가 되어 있으나 기본 profile 실행은 DB에 의존하지 않아야 한다.

### Migration 상태

- 리뷰용 migration 초안은 `docs/db/migrations/draft/V1__initial_schema_mysql.sql`에 있다.
- 실제 Flyway migration 파일은 `backend/src/main/resources/db/migration/V1__initial_schema_mysql.sql`에 있다.
- local profile에서 MySQL/Flyway를 사용할 수 있도록 준비되어 있다.
- Docker 기반 MySQL에서 migration smoke test를 통과한 상태다.

### 아직 구현하지 않은 업무 기능

- JPA Entity와 Repository
- 실제 인증/인가
- 마스터 업로드와 upsert
- OIS 엑셀 업로드 API
- Excel parser
- Scan/PL/Label 저장
- 주문 조회용 `order_lines` 재구성
- 검증 엔진
- 배치 확정, 취소, 롤백
- WOS/PL 외부 API
- 라벨 다운로드
- 차수별 조회와 차수별 다운로드

## 3. 핵심 설계 원칙

- OMS는 원본 주문 생성 시스템이 아니다.
- 입력 엑셀에는 원본 주문 시트가 별도로 없다.
- 정식 입력 시트는 `Scan_upload_*`, `PL_EA`, `PL_Box`, `Label_EA`, `Label_Box`다.
- `Scan_upload_*`는 누락 데이터가 아니라 Scan 계열 정식 입력이다.
- `Scan_upload_장지`, `Scan_upload_군량리`처럼 suffix가 붙는 시트를 지원한다.
- `Scan_upload_군량리`처럼 헤더만 있고 데이터가 0건인 시트는 정상 케이스다.
- `order_lines`는 원본 주문이 아니라 PL 기반 OMS 조회용 재구성 데이터다.
- 상품 마스터와 배송지/차량 마스터는 서로 직접 조인하지 않는다.
- 운영 데이터의 `product_code`는 상품 마스터의 `ezadmin_code`와 직접 매칭한다.
- 운영 데이터의 `store_code` 또는 `order_business_site_code`는 배송지/차량 마스터의 `baljugo_code`와 직접 매칭한다.
- 주문번호, 거래처코드, 품목코드, 바코드, QR코드는 문자열로 보존한다.
- 차수, 차량명, 권역 등 원천 값은 저장하되 차수별 조회와 다운로드는 추후 구현으로 둔다.
- Error 등급 검증 오류가 있으면 배치를 확정할 수 없다.
- 확정되지 않은 배치는 외부 API 응답과 운영 다운로드 대상에서 제외한다.

## 4. Tenant / Client / User Scope 정책

- `tenant`는 OMS를 사용하는 물류사다.
- `client`는 물류사의 고객사 또는 화주사다.
- 업로드/운영 데이터는 `tenant_id + client_id` 기준으로 관리한다.
- `upload_batches`, `uploaded_files`, `excel_sheet_results`, `scan_lines`, `pl_lines`, `label_lines`, `order_lines`, `validation_errors`, 로그성 테이블은 `tenant_id`, `client_id`를 가진다.
- 마스터 데이터는 1차 MVP에서 `tenant_id` 기준으로 관리한다.
- 고객사별 전용 마스터는 1차 MVP 필수가 아니며 추후 `scope_type = CLIENT` 또는 별도 매핑 테이블로 확장한다.
- 사용자 스코프는 `SYSTEM`, `TENANT`, `CLIENT`를 기준으로 설계한다.
- 1차 MVP 기본 로그인 사용자는 `TENANT` 스코프다.
- `SYSTEM` 사용자는 전체 시스템 운영자를 위한 구조로 스키마에는 반영하되, tenant 선택 정책은 구현 전 확정이 필요하다.
- `CLIENT` 사용자 직접 로그인과 다중 고객사 접근은 추후 구현으로 둔다.

## 5. DB / Migration 정책

- 1차 MVP 기본 후보 DB는 MySQL이다.
- PostgreSQL은 JSONB, GIN index, partial index, materialized view 등 확장성 비교안으로 유지한다.
- 기본 profile은 DB 없이 실행 가능해야 한다.
- local profile은 MySQL과 Flyway를 사용한다.
- Flyway migration 파일은 `backend/src/main/resources/db/migration` 아래에 둔다.
- 리뷰용 SQL은 `docs/db/migrations/draft` 아래에 둔다.
- MySQL/PostgreSQL 양쪽에서 구현 가능한 표준 RDB 구조를 우선한다.
- PostgreSQL 전용 기능은 필수 구현이 아니라 선택 기능 또는 DB별 대안으로 분리한다.
- enum은 DB enum 타입보다 `varchar` 저장을 기본으로 하고, Kotlin에서는 `EnumType.STRING` 매핑을 우선한다.
- 자주 검색하는 값은 JSON에만 넣지 말고 일반 컬럼으로 분리한다.
- 금액, 수량, CBM 등 정밀도가 필요한 숫자는 `decimal` 계열을 사용한다.
- 날짜는 업무 날짜와 생성 시각을 분리한다.

## 6. 다음 구현 순서

아래 순서는 Backend 구현 편의와 검증 의존성을 기준으로 한 추천 순서다.
제품 phase 이름은 유지하되, 마스터 검증 의존성 때문에 Persistence 이후에는 Master upsert를 OIS 업로드보다 먼저 구현하는 것을 권장한다.

1. Phase 2.5 Persistence 기반
2. Phase 5 Master upsert
3. Phase 4 OIS upload/parser/batch
4. Phase 6 validation/confirm
5. Phase 7 query/external/download
6. Phase 8 auth/log hardening

## 7. Phase 2.5 Persistence 기반 상세 작업

### 목표

DB schema와 Kotlin JPA model을 연결하는 기반만 만든다.
업무 Service/Controller 구현은 하지 않는다.

### 구현 대상

- JPA Entity
- Repository
- 공통 `BaseEntity`와 auditing 정책
- enum 매핑
- DB 통합 테스트
- seed data 필요성 검토

### Entity 정책

- 패키지는 AGENTS.md의 도메인 구조를 따른다.
- Kotlin JPA는 `kotlin-jpa` plugin 또는 명시적 `open class` 정책을 유지한다.
- Entity는 `data class`로 만들지 않는다.
- DB 컬럼은 snake_case, Kotlin property와 JSON DTO는 camelCase를 기본으로 한다.
- 문자열 코드는 `String`으로 매핑한다.
- `LocalDate`는 업무 날짜에 사용한다.
- `Instant`, `OffsetDateTime`, `LocalDateTime` 중 시각 타입은 프로젝트 정책으로 통일한다. 운영 기준 timezone은 `Asia/Seoul` 우선 검토다.
- `BigDecimal`은 수량, 금액, CBM 등 정밀도가 필요한 값에 사용한다.

### BaseEntity / Auditing 정책

- 모든 테이블에 모든 공통 컬럼을 무조건 넣지 않는다.
- 업무 데이터와 마스터 현재 데이터는 `createdAt`, `updatedAt`을 우선 적용한다.
- 생성자/수정자 추적이 필요한 테이블은 `createdBy`, `updatedBy`를 선택 적용한다.
- 업로드 원천 row 테이블은 `sheetName`, `rowNo`, `rawRowJson` 추적을 우선한다.
- 로그 테이블은 변경 불변성을 우선하고 update auditing을 최소화한다.

### enum 매핑

DB 저장값은 varchar다.
Kotlin enum은 문자열 이름 변경이 migration 이슈가 되므로 이름을 신중히 확정한다.

- `BatchStatus`: `UPLOADED`, `VALIDATING`, `VALIDATION_FAILED`, `READY_TO_CONFIRM`, `CONFIRMED`, `CANCELLED`, `ROLLED_BACK`
- `PlType`: `EA`, `BOX`
- `LabelType`: `EA`, `BOX`
- `ValidationSeverity`: `ERROR`, `WARNING`, `INFO`
- `UploadDomain`: `SCAN`, `PL`, `LABEL`, `ORDER`, `MASTER`
- `SheetType`: `SCAN_UPLOAD`, `PL_EA`, `PL_BOX`, `LABEL_EA`, `LABEL_BOX`, `IGNORED`, `UNKNOWN`
- `MasterType`: `PRODUCT`, `STORE_ROUTE`
- `MasterUploadStatus`: `UPLOADED`, `PROCESSING`, `APPLIED`, `PARTIAL_FAILED`, `FAILED`
- `UserScopeType`: `SYSTEM`, `TENANT`, `CLIENT`

### Repository 정책

- Repository는 Entity mapping 확인과 기본 조회를 위한 수준으로만 만든다.
- 업무 상태 전환, 업로드 처리, 검증, 확정 같은 로직은 Phase 2.5에서 구현하지 않는다.
- `tenant_id + client_id` 조건이 필요한 Repository method는 누락되지 않게 한다.
- 마스터 조회는 1차 MVP 기준 `tenant_id`와 코드 기준이다.

### 테스트

- 기본 profile context load는 DB 없이 통과해야 한다.
- local 또는 test DB profile에서 Flyway migration이 통과해야 한다.
- Entity/Repository smoke test는 Testcontainers 기반을 우선 검토한다.
- 테스트가 DB를 요구할 경우 기본 `test`와 분리해서 실행 가능하게 유지한다.

### Phase 2.5에서 하지 않을 것

- OIS 엑셀 업로드 API 구현
- Excel parsing 구현
- 마스터 업로드 API 구현
- 검증 엔진 구현
- 배치 확정 구현
- 외부 API 구현
- 다운로드 구현

## 8. Phase 5 Master upsert 상세 작업

### 목표

마스터 데이터를 version snapshot 방식이 아니라 tenant 기준 현재 row upsert 방식으로 관리한다.
파일 단위 업로드 이력과 요약 건수는 남기되, row 단위 변경 이력은 1차 MVP에서 제외한다.

### 구현 대상

- 상품 마스터 CSV 업로드와 upsert
- 배송지/차량 마스터 XLSX 업로드와 upsert
- `master_upload_batches`
- `product_master_items`
- `store_route_master_items`
- 업로드 요약 건수
  - `row_count`
  - `inserted_count`
  - `updated_count`
  - `unchanged_count`
  - `failed_count`

### 상품 마스터 정책

- tenant 기준으로 관리한다.
- `ezadmin_code`가 업무 매칭 key다.
- unique 기준은 `(tenant_id, ezadmin_code)`다.
- 운영 데이터의 `product_code`는 `ezadmin_code`와 직접 매칭한다.
- 품목코드, 상품코드는 문자열로 보존한다.

### 배송지/차량 마스터 정책

- tenant 기준으로 관리한다.
- `baljugo_code`가 업무 매칭 key다.
- unique 기준은 `(tenant_id, baljugo_code)`다.
- 운영 데이터의 `store_code` 또는 `order_business_site_code`는 `baljugo_code`와 직접 매칭한다.
- 차량명, 권역, 차수 원천 값은 보존하되 차수별 전용 기능은 추후 구현한다.

### upsert 정책

- 신규 key면 insert한다.
- 기존 key면 현재 row를 update한다.
- 변경 없는 row는 unchanged로 집계한다.
- 실패 row는 failed로 집계하고, 실패 상세 저장 범위는 구현 전 확정한다.
- 파일명, 저장 경로, hash, 크기, 업로드자, 업로드 시각, 적용 시각은 보존한다.

### Phase 5에서 제외

- row 단위 변경 이력 테이블
- 마스터 version snapshot
- 고객사별 전용 마스터
- 운영 데이터 검증 엔진 전체 구현

## 9. Phase 4 OIS Upload / Parser / Batch 상세 작업

### 목표

OIS가 생성한 엑셀 파일을 업로드 받아 원본 파일, 시트 처리 결과, Scan/PL/Label 원천 row를 저장한다.

### 구현 대상

- Multipart upload API
- file storage 연동
- `upload_batches`
- `uploaded_files`
- `excel_sheet_results`
- Scan parser
- PL parser
- Label parser
- 원천 row 저장
- PL 기반 `order_lines` 재구성 준비

### 시트 인식 정책

- `Scan_upload_*` prefix를 가진 모든 시트를 Scan 계열로 인식한다.
- `Scan_upload_` 뒤 suffix는 `scan_center` 또는 동등한 컬럼으로 저장한다.
- `Scan_upload_군량리`처럼 데이터가 0건인 시트는 오류가 아니다.
- `PL_EA`, `PL_Box`는 PL 계열 정식 입력이다.
- `Label_EA`, `Label_Box`는 Label 계열 정식 입력이다.
- 알 수 없는 시트는 정책에 따라 `UNKNOWN` 또는 `IGNORED`로 기록한다.

### 원천 값 보존 정책

- 주문번호, 거래처코드, 품목코드, 바코드, QR코드는 문자열로 보존한다.
- 엑셀 원본 row number와 sheet name을 보존한다.
- 원본 표시값과 정규화 값을 추적할 수 있게 설계한다.
- 수식 셀은 매크로를 실행하지 않고 저장된 계산값 또는 표시 문자열을 사용한다.
- XLSM 매크로는 실행하지 않는다.

### order_lines 정책

- `order_lines`는 원본 주문이 아니다.
- PL 데이터를 기준으로 OMS 조회용 요약 데이터를 재구성한다.
- `source_pl_line_id`로 원천 PL row를 추적한다.
- 차수, 차량명, 권역 등은 저장하되 차수별 조회와 다운로드는 추후 구현한다.

## 10. Phase 6 Validation / Confirm 상세 방향

- 검증은 batch 기준으로 수행한다.
- 상품 검증은 운영 데이터 `product_code`와 상품 마스터 `ezadmin_code` 직접 매칭으로 수행한다.
- 배송지/차량 검증은 운영 데이터 `store_code` 또는 `order_business_site_code`와 배송지/차량 마스터 `baljugo_code` 직접 매칭으로 수행한다.
- 검증 오류는 `validation_errors`에 저장한다.
- `ERROR`가 남아 있으면 배치 확정을 막는다.
- Warning이 남아 있어도 확정을 허용할지는 확인 필요 사항이다.
- 배치 상태 전환은 명시적인 서비스 메서드로만 수행한다.
- 상태 변경은 audit log 대상이다.

## 11. Phase 7 Query / External / Download 상세 방향

- 내부 운영 API는 `/api/v1` prefix를 사용한다.
- 외부 연동 API는 `/external/v1` prefix를 사용한다.
- 외부 API는 CONFIRMED batch만 노출한다.
- 목록 API는 페이징을 지원한다.
- 다운로드 API는 다운로드 로그를 남긴다.
- Scan/WOS, PL, Label 조회와 다운로드는 확정 batch 기준으로 제한한다.
- 최신 확정 batch 선택 기준은 구현 전 확인이 필요하다.

## 12. Phase 8 Auth / Log Hardening 상세 방향

- 실제 JWT, Session, API Key 정책을 확정한 뒤 구현한다.
- 1차 MVP 기본 로그인 사용자는 `TENANT` 스코프다.
- `SYSTEM` 관리자는 어떤 tenant/client를 선택해 작업하는지 정책 확정이 필요하다.
- `CLIENT` 사용자의 직접 로그인과 다중 고객사 접근은 추후 구현으로 둔다.
- 배치 확정, 취소, 롤백, 다운로드, 외부 API 호출은 감사 로그를 남긴다.
- requestId는 API 응답, 로그, audit, API call log에 연결 가능한 값으로 유지한다.

## 13. 금지사항

- 원본 주문 생성 시스템으로 구현하지 않는다.
- `Scan_upload_*`를 누락 데이터로 취급하지 않는다.
- `Scan_upload` 자동 생성 기능을 1차 MVP 필수로 구현하지 않는다.
- 상품 마스터와 배송지/차량 마스터를 직접 조인하거나 통합 마스터로 합치지 않는다.
- 주문번호, 거래처코드, 품목코드, 바코드, QR코드를 숫자 타입으로 저장하지 않는다.
- 차수별 조회와 차수별 다운로드를 1차 MVP 필수 기능처럼 구현하지 않는다.
- 기본 profile이 DB 없이는 실행 불가능해지게 만들지 않는다.
- PostgreSQL 전용 기능을 기본 필수 설계로 고정하지 않는다.
- 기능 phase를 건너뛰어 과도하게 구현하지 않는다.
- Excel parser, upload API, validation, confirm, external API, download를 Persistence 단계에서 함께 구현하지 않는다.

## 14. 검증 명령어

기본 테스트:

```powershell
.\gradlew.bat test
```

빌드:

```powershell
.\gradlew.bat build
```

MySQL/Testcontainers migration smoke test:

```powershell
.\gradlew.bat "-Doms.test.db=true" test --tests com.company.oms.MigrationSmokeTest
```

DB 없이 기본 profile 실행:

```powershell
.\gradlew.bat bootRun
```

local profile 실행:

```powershell
.\gradlew.bat bootRun --args='--spring.profiles.active=local'
```

## 15. 남은 확인사항

- MySQL 운영 버전
- seed data 범위
- `SYSTEM` 관리자 tenant/client 선택 정책
- `CLIENT` 사용자 로그인 제공 여부
- 고객사별 마스터 또는 코드 매핑 필요 시점
- 파일 저장 위치
- 파일 보관 기간
- 업로드 최대 크기
- 마스터 컬럼 최종명
- Warning 상태 배치 확정 허용 여부
- `Label_EA` 품목코드 예외 정책
- 차량명 불일치 등급
- 대표 배송일 기준
- 외부 API 최신 배치 선택 정책
- 다운로드 파일 포맷과 컬럼 순서
- 운영 로그 보관 기간

