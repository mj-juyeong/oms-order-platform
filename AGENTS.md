# OMS 작업 규칙

이 파일은 Codex가 매 작업마다 지켜야 하는 최소 기준이다. 상세 요구사항과 설계는 필요한 경우에만 `docs/`에서 관련 문서의 필요한 부분만 확인한다.

## 1. 문서 확인 우선순위

- 구현 계획은 기본적으로 `docs/mid_presentation_feedback_status_20260602/FUTURE_FEATURES.md`만 확인한다.
- 완료 여부가 애매한 항목만 `docs/mid_presentation_feedback_status_20260602/COMPLETED_FEATURES.md`에서 근거를 확인한다.
- 최종 요구사항 충돌 판단이 필요할 때만 `docs/OMS_개발팀_전달용_최종요구사항_Codex_대화반영_최종.md` 또는 유사한 최종 요구사항 문서를 확인한다.
- 다른 구현 계획 문서(`docs/IMPLEMENTATION_PLAN.md`, `backend/BACKEND_IMPLEMENTATION_PLAN.md`, `frontend/FRONTEND_IMPLEMENTATION_PLAN.md` 등)는 사용자가 명시적으로 요청하거나 `FUTURE_FEATURES.md`만으로 판단이 불가능한 경우에만 필요한 부분만 확인한다.
- 화면/디자인 작업은 필요할 때 `docs/DESIGN_HANDOFF_PAGE_MAPPING.md`를 확인한다.
- 마스터 API 작업은 필요할 때 `docs/API_DESIGN_DRAFT.md`의 current master upsert 구조를 확인한다.
- 요구사항에 없는 업무 정책은 임의 확정하지 말고 `확인 필요`로 남긴다.

## 2. OMS 핵심 정의

- OMS는 OIS가 생성한 목적별 엑셀을 업로드 받아 DB 저장, 검증, 조회, API 제공, 엑셀 다운로드를 수행하는 물류 운영 시스템이다.
- OMS는 원본 주문 생성 시스템이 아니다.
- 입력 엑셀에는 원본 주문 시트가 별도로 존재하지 않는다.
- 주요 입력 시트는 `Scan_upload_*`, `PL_EA`, `PL_Box`, `Label_EA`, `Label_Box`이다.
- `Scan_upload_*`는 누락 데이터가 아니라 정식 입력 시트다.
- `Scan_upload_군량리`처럼 헤더만 있고 데이터가 0건인 시트는 정상 케이스다.
- 주문 조회용 데이터는 원본 주문이 아니라 PL 데이터를 기준으로 재구성한 OMS 조회용 요약 데이터다.

## 3. 필수 설계 원칙

- DB를 PostgreSQL로 단정하지 않는다. 1차 MVP는 회사의 MySQL 사용 현황을 중요한 전제로 두고, MySQL과 PostgreSQL 양쪽에서 가능한 표준 RDB 구조를 우선한다.
- PostgreSQL 전용 기능은 기본 설계로 박지 말고 선택 기능 또는 DB별 대안으로 분리한다.
- 운영 데이터는 `tenant_id + client_id` 기준으로 관리한다.
- 1차 MVP의 기본 운영 사용자는 `TENANT` 스코프다. `SYSTEM`, `TENANT`, `CLIENT` 스코프 구조는 준비하되 세부 확장은 추후 항목으로 둔다.
- 마스터 데이터는 1차 MVP에서 tenant별 현재 데이터를 upsert한다.
- 상품 마스터 upsert 기준은 `tenant_id + ezadmin_code`, 배송지/차량 마스터 upsert 기준은 `tenant_id + baljugo_code`다.
- 운영 데이터의 `product_code`는 상품 마스터의 `ezadmin_code`와 직접 매칭한다.
- 운영 데이터의 `store_code` 또는 `order_business_site_code`는 배송지/차량 마스터의 `baljugo_code`와 직접 매칭한다.
- 상품 마스터와 배송지/차량 마스터를 직접 조인해 통합 마스터로 만들지 않는다.
- `upload_batches`가 운영 데이터의 중심이며, `scan_lines`, `pl_lines`, `label_lines`, `order_lines`는 `batch_id`, `tenant_id`, `client_id`를 가진다.
- 차수별 주문 조회와 차수별 다운로드는 1차 MVP 필수 구현에서 제외하고 추후 구현으로 둔다.

## 4. Backend 규칙

- Backend는 Spring Boot, Kotlin, Gradle Kotlin DSL, REST JSON API, MultipartFile 업로드, Apache POI 기반 Excel parsing, Spring Data JPA 우선 검토를 기준으로 한다.
- 패키지는 도메인 중심으로 분리한다: `auth`, `upload`, `excel`, `batch`, `master`, `order`, `dispatch`, `scan`, `pl`, `label`, `validation`, `download`, `externalapi`, `audit`.
- API 응답은 공통 응답 포맷을 사용하고, 모든 응답에 추적 가능한 `requestId`, `timestamp`를 포함한다.
- 내부 운영 API는 `/api/v1`, 외부 연동 API는 `/external/v1` prefix를 사용한다.
- 확정되지 않은 배치는 외부 API 응답과 운영 다운로드 대상에서 제외한다.
- Error 등급 검증 오류가 있으면 배치를 확정할 수 없다.
- 배치 확정, 취소, 롤백, 다운로드, 외부 API 호출은 감사 로그를 남긴다.
- Kotlin JPA Entity는 `kotlin-jpa` plugin 또는 `open class` 정책을 명확히 적용한다.

## 5. Frontend 규칙

- Frontend는 React, TypeScript, Tailwind CSS, Vite, React Router, TanStack Query, React Hook Form + Zod를 우선 기준으로 한다.
- API 호출은 `src/api`, 화면은 `src/pages`, 공통 UI는 `src/components`, 도메인 타입은 `src/types`에 둔다.
- 운영자가 대량 표 데이터를 다루므로 테이블 가독성, 필터, 정렬, 페이징, 고정 헤더, 가로 스크롤을 우선 고려한다.
- 배치 상태, 검증 등급, 다운로드 상태는 공통 Badge 컴포넌트로 일관되게 표시한다.
- Error, Warning, Info는 색상과 텍스트를 함께 사용해 구분한다.
- 파일 업로드 화면은 진행 상태, 실패 사유, 검증 결과 이동 동선을 제공한다.

## 6. Excel / 데이터 보존 규칙

- XLSM 매크로는 실행하지 않는다.
- Apache POI로 시트와 셀 값만 읽는다.
- `Scan_upload_*` prefix를 가진 모든 시트를 Scan 계열로 인식한다.
- `Scan_upload` 자동 생성은 1차 필수 요구사항이 아니다.
- 수식 셀은 저장된 계산값 또는 표시 문자열을 사용한다.
- 코드성 값은 숫자로 변환하지 않는다.
- 주문번호, 거래처코드, 품목코드, 바코드, QR코드는 문자열로 보존한다.
- 원본 row number, sheet name, 원본 표시값, 정규화 값을 최대한 함께 저장한다.
- `Scan_upload_*` suffix 값은 `scan_center` 또는 `scan_route` 컬럼으로 저장한다.

## 7. 테스트 우선순위

- 업로드, 파싱, 검증, 배치 확정, 외부 API는 P0 테스트 대상으로 본다.
- `Scan_upload_*` prefix 인식, 데이터 0건 Scan 시트 정상 처리, 코드성 값 문자열 보존을 테스트한다.
- Error 검증 오류가 있는 배치가 확정되지 않는지 테스트한다.
- 외부 API가 CONFIRMED 배치만 응답하는지 테스트한다.

## 8. 토큰 절약 운영 원칙

- 문서는 전체를 반복해서 읽지 말고 필요한 섹션만 확인한다.
- 터미널 출력은 `rg`, `Select-Object -First`, `git diff --stat` 등으로 필요한 범위만 확인한다.
- 답변은 기본적으로 짧게 유지하고, 변경 사항과 검증 결과 중심으로 보고한다.
