# OMS 작업 규칙

이 문서는 Codex와 개발자가 OMS 프로젝트를 구현할 때 따라야 하는 기준 규칙이다. 기능 구현, 설계 변경, 리팩터링, 테스트 작성 전에 반드시 이 문서를 먼저 확인한다.

## 1. 최상위 기준 문서

- 최종 요구사항 문서를 최상위 기준 문서로 삼는다.
- 저장소 루트에는 `AGENTS.md`, `README.md`만 둔다.
- 최종 요구사항, 구현 계획, API/DB/ERD 설계 등 나머지 Markdown 기준 문서는 `docs/` 디렉터리에서 확인한다.
- 기준 문서 후보:
  - `docs/OMS_개발팀_전달용_최종요구사항_Codex.md`
  - `docs/OMS_개발팀_전달용_최종요구사항_Codex(1).md`
  - `docs/OMS_개발팀_전달용_최종요구사항_Codex(1) (1).md`
  - `docs/OMS_개발팀_전달용_최종요구사항_Codex_대화반영_최종.md`
  - 또는 유사한 이름의 최종 요구사항 문서
- 요구사항 문서와 코드/설계가 충돌하면 요구사항 문서를 우선한다.
- 요구사항 문서에 없는 판단은 `확인 필요`로 남기고 임의 확정하지 않는다.

## 2. 프로젝트 목적 요약

OMS는 OIS가 생성한 목적별 엑셀 데이터를 업로드 받아 DB에 저장하고, 검증하고, 조회하고, API로 제공하고, 엑셀 다운로드를 제공하는 물류 운영 시스템이다.

- OMS는 원본 주문 생성 시스템이 아니다.
- 입력 엑셀에는 원본 주문 시트가 별도로 존재하지 않는다.
- 주요 입력 시트는 `Scan_upload_*`, `PL_EA`, `PL_Box`, `Label_EA`, `Label_Box`이다.
- `Scan_upload_*`는 누락 데이터가 아니라 정식 입력 시트다.
- `Scan_upload_군량리`처럼 헤더만 있고 데이터가 0건인 시트는 정상 케이스로 처리한다.
- 주문 조회용 데이터는 원본 주문이 아니라 PL 데이터를 기준으로 재구성한 OMS 조회용 요약 데이터다.

## 3. 개발 스택

### Backend

- Spring Boot
- Kotlin
- Gradle Kotlin DSL
- REST JSON API
- MultipartFile 기반 파일 업로드
- Excel parsing은 Apache POI 사용
- Persistence는 Spring Data JPA 우선 검토
- DB는 아직 확정하지 않는다.

### Frontend

- React
- TypeScript
- Tailwind CSS
- Vite 권장
- React Router 권장
- TanStack Query 권장
- React Hook Form + Zod 권장

## 4. DB 선택 원칙

- DB를 PostgreSQL로 단정하지 않는다.
- 회사가 현재 MySQL을 사용 중이라는 점을 1차 의사결정의 중요한 전제로 둔다.
- 1차 MVP는 MySQL을 기본 후보로 검토한다.
- PostgreSQL은 JSONB, GIN index, partial index, materialized view 등 확장성 장점이 있으므로 비교안으로 함께 검토한다.
- DB 설계는 MySQL과 PostgreSQL 양쪽에서 무리 없이 구현 가능한 표준 RDB 구조를 우선한다.
- 특정 DB 전용 기능은 반드시 `선택 기능` 또는 `DB별 대안`으로 분리한다.
- JSON 컬럼은 보조 저장용으로만 사용하고, 자주 검색하는 값은 일반 컬럼으로 분리한다.
- 주문번호, 거래처코드, 품목코드, 바코드, QR코드는 문자열 타입으로 저장한다.

## 4-1. Tenant / Client 설계 원칙

- `tenant`는 OMS를 사용하는 물류사를 의미한다.
- `client`는 물류사의 고객사 또는 화주사를 의미한다.
- 주문/업로드 데이터는 `tenant_id + client_id` 기준으로 관리한다.
- 마스터 데이터는 1차 MVP에서 물류사 `tenant_id` 기준으로 관리한다.
- 고객사별 전용 마스터는 1차 필수 구현이 아니며, 추후 `client_id` 또는 고객사별 코드 매핑 테이블로 확장한다.
- 1차 MVP의 마스터는 업로드마다 전체 버전을 만들지 않고, tenant별 현재 데이터를 upsert한다.
- 상품 마스터 upsert 기준은 `tenant_id + ezadmin_code`, 배송지/차량 마스터 upsert 기준은 `tenant_id + baljugo_code`로 둔다.
- 마스터 업로드 이력은 파일 단위 처리 요약을 남기고, row 단위 변경 이력은 1차 MVP에서 제외한다.

## 4-2. 사용자 스코프 설계 원칙

- 로그인 사용자는 `SYSTEM`, `TENANT`, `CLIENT` 스코프로 구분한다.
- `SYSTEM` 사용자는 시스템 전체 관리자이며 `tenant_id`, `client_id` 없이 존재할 수 있다.
- `TENANT` 사용자는 특정 물류사 소속이며 `tenant_id`를 가진다.
- `CLIENT` 사용자는 특정 고객사/화주사 소속이며 `tenant_id`, `client_id`를 가진다.
- 1차 MVP의 기본 운영 사용자는 `TENANT` 스코프다.
- 고객사 사용자 로그인과 다중 고객사 접근은 1차 필수 구현이 아니며, 추후 `user_client_scopes` 같은 별도 스코프 테이블로 확장한다.
- DB는 `user_scope_type`, nullable `tenant_id`, nullable `client_id`를 준비하되, 스코프별 필수값 검증은 애플리케이션 정책으로 보완한다.

## 4-3. 마스터 매칭 확정 원칙

- 요구사항 기준 1차 MVP는 고객사 코드 매핑 없이 직접 매칭한다.
- 운영 데이터의 `product_code`는 상품 마스터의 `ezadmin_code`와 직접 매칭한다.
- 운영 데이터의 `store_code` 또는 `order_business_site_code`는 배송지/차량 마스터의 `baljugo_code`와 직접 매칭한다.
- 고객사별 코드 체계가 다르다는 사실이 확인되면 `client_product_code_mappings`, `client_store_code_mappings`를 P1/P2 확장으로 추가한다.

## 5. Backend 작업 규칙

- Backend 구현 작업 전에는 `backend/BACKEND_IMPLEMENTATION_PLAN.md`가 존재하는 경우 함께 확인한다.
- 패키지는 도메인 중심으로 분리한다: `auth`, `upload`, `excel`, `batch`, `master`, `order`, `dispatch`, `scan`, `pl`, `label`, `validation`, `download`, `externalapi`, `audit`.
- API 응답은 공통 응답 포맷을 사용한다.
- 업로드 파일 원본은 파일 저장소에 보관하고 DB에는 파일명, 저장 경로, 해시, 크기, 업로드자, 업로드 시각을 저장한다.
- 배치 상태 전환은 명시적인 서비스 메서드로만 수행한다.
- 차수별 주문 조회와 차수별 다운로드는 현재 개념이 명확하지 않으므로 1차 MVP 필수 구현에서 제외하고 추후 구현으로 둔다.
- 확정되지 않은 배치는 외부 API 응답 대상에서 제외한다.
- Error 등급 검증 오류가 있으면 배치를 확정할 수 없다.
- 배치 확정, 취소, 롤백, 다운로드, 외부 API 호출은 감사 로그를 남긴다.
- Kotlin JPA Entity는 `kotlin-jpa` plugin 또는 `open class` 정책을 명확히 적용한다.

## 6. Frontend 작업 규칙

- API 응답 타입은 TypeScript 타입으로 정의한다.
- API 호출은 `src/api`, 화면은 `src/pages`, 공통 UI는 `src/components`, 도메인 타입은 `src/types`에 둔다.
- 운영자가 대량 표 데이터를 다루므로 테이블 가독성, 필터, 정렬, 페이징, 고정 헤더, 가로 스크롤을 우선 고려한다.
- 배치 상태, 검증 등급, 다운로드 상태는 공통 Badge 컴포넌트로 일관되게 표시한다.
- Error, Warning, Info는 색상과 텍스트를 함께 사용해 구분한다.
- 파일 업로드는 진행 상태, 실패 사유, 검증 결과 이동 동선을 제공한다.

## 7. 디렉토리 구조 규칙

```text
oms/
  backend/
    build.gradle.kts
    src/main/kotlin/com/company/oms/
      OmsApplication.kt
      common/
      auth/
      upload/
      excel/
      batch/
      master/
      order/
      dispatch/
      scan/
      pl/
      label/
      validation/
      download/
      externalapi/
      audit/
    src/test/kotlin/com/company/oms/

  frontend/
    package.json
    vite.config.ts
    tailwind.config.ts
    src/
      app/
      api/
      components/
      pages/
      routes/
      types/
      hooks/
      utils/
      styles/
```

## 8. 코드 스타일 규칙

- 도메인 용어는 요구사항 문서의 용어를 우선한다.
- DB 컬럼과 API 필드는 영문 snake_case 또는 camelCase 중 계층별 규칙을 일관되게 적용한다.
- Backend DB 컬럼은 snake_case, Kotlin/JSON DTO는 camelCase를 기본으로 한다.
- 의미가 불명확한 약어를 새로 만들지 않는다.
- 날짜/시각은 timezone 정책을 명확히 한다. 운영 기준은 `Asia/Seoul`을 우선 검토한다.
- 금액, 수량, CBM 등 숫자 필드는 정밀도와 반올림 정책을 명시한다.

## 9. 테스트 작성 규칙

- 업로드, 파싱, 검증, 배치 확정, 외부 API는 P0 테스트 대상으로 본다.
- Excel parsing 테스트는 실제 샘플 구조를 반영한다.
- `Scan_upload_*` prefix 인식 테스트를 작성한다.
- `Scan_upload_군량리`처럼 데이터 0건 시트가 정상 처리되는지 테스트한다.
- 주문번호, 거래처코드, 품목코드, 바코드, QR코드가 문자열로 보존되는지 테스트한다.
- Error 검증 오류가 있는 배치가 확정되지 않는지 테스트한다.
- 외부 API가 CONFIRMED 배치만 응답하는지 테스트한다.

## 10. Excel Parsing 주의사항

- XLSM 매크로는 실행하지 않는다.
- Apache POI로 시트와 셀 값만 읽는다.
- `Scan_upload_*` prefix를 가진 모든 시트를 Scan 계열로 인식한다.
- `Scan_upload` 자동 생성은 1차 필수 요구사항이 아니다.
- 수식 셀은 저장된 계산값 또는 표시 문자열을 사용한다.
- 코드성 값은 숫자로 변환하지 않는다.
- 주문번호, 거래처코드, 품목코드, 바코드, QR코드는 문자열로 보존한다.
- 원본 row number, sheet name, 원본 표시값, 정규화 값을 최대한 함께 저장한다.
- 숨김 시트는 기본 파싱 대상에서 제외하되, 요구사항에서 명시되면 별도 처리한다.

## 11. DB 설계 원칙

- `upload_batches`가 운영 데이터의 중심이다.
- `upload_batches`는 `tenant_id`, `client_id`를 반드시 가진다.
- `scan_lines`, `pl_lines`, `label_lines`, `order_lines`는 모두 `batch_id`를 가진다.
- `scan_lines`, `pl_lines`, `label_lines`, `order_lines`는 조회 성능과 데이터 격리를 위해 `tenant_id`, `client_id`도 함께 가진다.
- `order_lines`는 원본 주문이 아니라 PL 데이터를 기준으로 재구성한 OMS 조회용 주문 요약 데이터다.
- 차수별 조회/다운로드는 추후 구현 항목이다. 1차 MVP에서는 차수/차량 컬럼을 보존하되, 차수별 업무 개념과 조회 기준을 확정하기 전까지 필수 API/화면으로 구현하지 않는다.
- 상품 마스터와 배송지/차량 마스터는 서로 직접 조인하지 않는다.
- 운영 데이터의 `product_code`는 상품 마스터의 `ezadmin_code`와 매칭한다.
- 운영 데이터의 `store_code` 또는 `order_business_site_code`는 배송지/차량 마스터의 `baljugo_code`와 매칭한다.
- 배치 검증은 검증 시점의 tenant별 현재 마스터 기준으로 수행하고, 검증 기준 시각을 기록한다.
- 원본 엑셀 값과 정규화 값을 최대한 함께 보존한다.
- `Scan_upload_*` suffix 값은 `scan_center` 또는 `scan_route` 컬럼으로 저장한다.

## 12. API 설계 원칙

- 내부 운영 API는 `/api/v1` prefix를 사용한다.
- 외부 연동 API는 `/external/v1` prefix를 사용한다.
- 마스터 API는 `docs/API_DESIGN_DRAFT.md`의 current master upsert 구조를 따른다.
- 마스터 API를 제외한 업로드, 배치, 검증, 주문, Scan, PL, Label, 다운로드, 차수별 추후 API는 최종 요구사항 문서를 따른다.
- 외부 API는 API Key 인증을 기본 후보로 둔다.
- 모든 응답은 추적 가능한 `requestId`, `timestamp`를 포함한다.
- 목록 API는 페이징을 지원한다.
- 다운로드 API는 다운로드 로그를 남긴다.
- 확정되지 않은 배치는 외부 API 응답과 운영 다운로드 대상에서 제외한다.
- 차수별 주문 조회/다운로드 API는 추후 구현으로 분리한다.

## 13. 금지사항

- 최종 요구사항 문서를 읽지 않고 구현하지 않는다.
- OMS를 원본 주문 생성 시스템으로 구현하지 않는다.
- `Scan_upload_*`를 누락 데이터로 취급하지 않는다.
- `Scan_upload` 자동 생성 기능을 1차 필수 기능으로 구현하지 않는다.
- XLSM 매크로를 실행하지 않는다.
- 상품 마스터와 배송지/차량 마스터를 직접 조인해 통합 마스터로 만들지 않는다.
- 주문번호, 거래처코드, 품목코드, 바코드, QR코드를 숫자 타입으로 저장하지 않는다.
- DB를 PostgreSQL로 단정하지 않는다.
- PostgreSQL 전용 기능을 기본 설계로 박아 넣지 않는다.
- Error 검증 오류가 있는 배치를 확정하지 않는다.

## 14. 확인 필요 사항 처리 원칙

- 요구사항에 명시되지 않은 업무 정책은 `확인 필요`로 문서화한다.
- 임시 구현이 필요한 경우 코드와 문서에 임시 정책임을 남긴다.
- 확인 필요 사항은 우선순위와 영향 범위를 함께 기록한다.
- 운영 담당자 확인 전에는 외부 API 응답, 다운로드 포맷, 배치 확정 정책을 임의로 변경하지 않는다.
