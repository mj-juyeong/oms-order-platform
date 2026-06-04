# OMS 작업 규칙

이 파일은 Codex가 매 작업마다 지켜야 하는 최소 공통 기준이다. Backend/Frontend 세부 규칙은 각 폴더의 `AGENTS.md`를 따른다.

## 1. 문서 읽기 제한

- `docs/` 전체를 훑지 않는다.
- 일반 구현 작업은 기본적으로 `docs/mid_presentation_feedback_status_20260602/FUTURE_FEATURES.md`의 관련 항목만 확인한다.
- 완료 여부가 애매한 항목만 `docs/mid_presentation_feedback_status_20260602/COMPLETED_FEATURES.md`의 관련 항목에서 근거를 확인한다.
- 최종 요구사항 충돌 판단이 필요할 때만 `docs/OMS_개발팀_전달용_최종요구사항_Codex_대화반영_최종.md` 또는 유사한 최종 요구사항 문서의 관련 섹션만 확인한다.
- API, ERD, DB 결정 문서는 신규 API/테이블 설계, migration 작성, 충돌 판단이 필요할 때만 관련 섹션만 확인한다.
- `frontend/FRONTEND_IMPLEMENTATION_PLAN.md`, `backend/BACKEND_IMPLEMENTATION_PLAN.md`, `docs/IMPLEMENTATION_PLAN.md`는 전체 구현 순서나 아키텍처를 다시 검토할 때만 읽는다.
- 화면/디자인 작업이 명시된 경우에만 `docs/DESIGN_HANDOFF_PAGE_MAPPING.md`와 필요한 화면의 디자인 산출물을 확인한다.
- 긴 문서를 열어야 하면 먼저 `rg`로 heading/keyword를 찾고 해당 주변만 읽는다.
- 요구사항에 없는 업무 정책은 임의 확정하지 말고 `확인 필요`로 남긴다.

## 2. OMS 핵심 정의

- OMS는 OIS가 생성한 목적별 엑셀을 업로드 받아 DB 저장, 검증, 조회, API 제공, 엑셀 다운로드를 수행하는 물류 운영 시스템이다.
- OMS는 원본 주문 생성 시스템이 아니다.
- 입력 엑셀에는 원본 주문 시트가 별도로 존재하지 않는다.
- 주요 입력 시트는 `Scan_upload_*`, `PL_EA`, `PL_Box`, `Label_EA`, `Label_Box`이다.
- `Scan_upload_*`는 누락 데이터가 아니라 정식 입력 시트다.
- `Scan_upload_군량리`처럼 헤더만 있고 데이터가 0건인 시트는 정상 케이스다.
- 주문 조회용 데이터는 원본 주문이 아니라 PL 데이터를 기준으로 재구성한 OMS 조회용 요약 데이터다.

## 3. 공통 설계 원칙

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

## 4. Excel / 데이터 보존 규칙

- XLSM 매크로는 실행하지 않는다.
- Apache POI로 시트와 셀 값만 읽는다.
- `Scan_upload_*` prefix를 가진 모든 시트를 Scan 계열로 인식한다.
- `Scan_upload` 자동 생성은 1차 필수 요구사항이 아니다.
- 수식 셀은 저장된 계산값 또는 표시 문자열을 사용한다.
- 코드성 값은 숫자로 변환하지 않는다.
- 주문번호, 거래처코드, 품목코드, 바코드, QR코드는 문자열로 보존한다.
- 원본 row number, sheet name, 원본 표시값, 정규화 값을 최대한 함께 저장한다.
- `Scan_upload_*` suffix 값은 `scan_center` 또는 `scan_route` 컬럼으로 저장한다.

## 5. 테스트와 보고

- 업로드, 파싱, 검증, 배치 확정, 외부 API는 P0 테스트 대상으로 본다.
- `Scan_upload_*` prefix 인식, 데이터 0건 Scan 시트 정상 처리, 코드성 값 문자열 보존을 테스트한다.
- Error 검증 오류가 있는 배치가 확정되지 않는지 테스트한다.
- 외부 API가 CONFIRMED 배치만 응답하는지 테스트한다.
- 터미널 출력은 `rg`, `Select-Object -First`, `git diff --stat` 등으로 필요한 범위만 확인한다.
- 답변은 기본적으로 짧게 유지하고, 변경 사항과 검증 결과 중심으로 보고한다.
