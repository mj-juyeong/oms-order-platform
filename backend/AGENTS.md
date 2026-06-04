# Backend 작업 규칙

이 파일은 `backend/` 안에서 작업할 때 루트 `AGENTS.md`에 추가로 적용한다.

## 1. 문서 확인 제한

- 일반 백엔드 수정은 관련 Kotlin/SQL 파일과 루트 `AGENTS.md`를 우선 기준으로 한다.
- 다음 구현 항목은 `docs/mid_presentation_feedback_status_20260602/FUTURE_FEATURES.md`에서 관련 항목만 확인한다.
- `backend/BACKEND_IMPLEMENTATION_PLAN.md`는 전체 백엔드 구현 순서, persistence 전략, architecture를 재검토할 때만 필요한 섹션만 읽는다.
- API/ERD/DB 문서는 충돌 판단, 신규 API/테이블 설계, migration 작성 시에만 관련 섹션만 확인한다.
- migration SQL은 관련 테이블이나 변경 대상 파일만 확인한다.

## 2. 기술 기준

- Backend는 Spring Boot, Kotlin, Gradle Kotlin DSL, REST JSON API, MultipartFile 업로드, Apache POI 기반 Excel parsing, Spring Data JPA 우선 검토를 기준으로 한다.
- 패키지는 도메인 중심으로 분리한다: `auth`, `upload`, `excel`, `batch`, `master`, `order`, `dispatch`, `scan`, `pl`, `label`, `validation`, `download`, `externalapi`, `audit`.
- API 응답은 공통 응답 포맷을 사용하고, 모든 응답에 추적 가능한 `requestId`, `timestamp`를 포함한다.
- 내부 운영 API는 `/api/v1`, 외부 연동 API는 `/external/v1` prefix를 사용한다.

## 3. 구현 규칙

- 확정되지 않은 배치는 외부 API 응답과 운영 다운로드 대상에서 제외한다.
- Error 등급 검증 오류가 있으면 배치를 확정할 수 없다.
- 배치 확정, 취소, 롤백, 다운로드, 외부 API 호출은 감사 로그를 남긴다.
- Kotlin JPA Entity는 `kotlin-jpa` plugin 또는 `open class` 정책을 명확히 적용한다.
- DB를 PostgreSQL로 단정하지 않는다. MySQL/PostgreSQL 양쪽에서 가능한 표준 RDB 구조를 우선한다.
- enum은 DB enum 타입보다 `varchar` 저장과 Kotlin `EnumType.STRING` 매핑을 우선한다.
- 코드성 값은 숫자 변환 없이 문자열로 보존한다.

## 4. 검증

- 업로드, 파싱, 검증, 배치 확정, 외부 API는 P0 테스트 대상으로 본다.
- 변경 후 가능한 경우 `./gradlew test` 또는 관련 테스트만 실행한다.
- DB migration 변경은 가능한 경우 migration smoke test 또는 SQL 적용 가능성을 확인한다.
- 실제 실행이 어렵다면 변경 파일, 미실행 사유, 수동 확인 포인트를 짧게 보고한다.
