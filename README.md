# OMS Platform

OIS가 생성한 목적별 엑셀 데이터를 업로드 받아 저장, 검증, 조회, 외부 API 제공, 엑셀 다운로드를 수행하기 위한 물류 운영 OMS 저장소이다.

현재 작업 범위는 Phase 0 중 저장소 구조와 문서 정리까지만 포함한다. 아직 Spring Boot 또는 Vite 프로젝트는 생성하지 않았다.

## 기준 문서

작업 전 아래 문서를 우선 확인한다.

| 문서 | 용도 |
|---|---|
| `AGENTS.md` | Codex와 개발자가 따라야 할 작업 규칙 |
| `docs/OMS_개발팀_전달용_최종요구사항_Codex_대화반영_최종.md` | 최상위 요구사항 기준 |
| `docs/IMPLEMENTATION_PLAN.md` | Phase별 구현 순서 |
| `docs/DB_DECISION.md` | DB 후보 비교 및 판단 기준 |
| `docs/DB_DESIGN_PROPOSAL.md` | RDB 설계 제안 |
| `docs/ERD_DESIGN.md` | ERD 설계 초안 |
| `docs/API_DESIGN_DRAFT.md` | API 설계 초안 |

요구사항 문서와 다른 문서 또는 구현 내용이 충돌하면 최종 요구사항 문서를 우선한다. 요구사항에 없는 업무 정책은 `확인 필요`로 남긴다.

## 프로젝트 전제

- OMS는 원본 주문 생성 시스템이 아니다.
- 입력 엑셀에는 원본 주문 시트가 별도로 존재하지 않는다.
- 주요 입력 시트는 `Scan_upload_*`, `PL_EA`, `PL_Box`, `Label_EA`, `Label_Box`이다.
- `Scan_upload_*`는 정식 입력 시트이며, `Scan_upload_군량리`처럼 데이터가 0건인 시트도 정상 케이스로 처리한다.
- 주문 조회용 데이터는 원본 주문이 아니라 PL 데이터를 기준으로 재구성한 OMS 조회용 요약 데이터다.
- 상품 마스터와 배송지/차량 마스터는 서로 직접 조인하지 않는다.
- DB는 아직 확정하지 않는다. MySQL을 1차 MVP 기본 후보로 검토하고 PostgreSQL은 비교안으로 유지한다.
- 차수별 주문 조회와 차수별 다운로드는 1차 MVP 필수 구현에서 제외하고 추후 구현으로 둔다.

## 기술 스택

### Backend

- Spring Boot
- Kotlin
- Gradle Kotlin DSL
- REST JSON API
- MultipartFile 기반 파일 업로드
- Apache POI 기반 Excel parsing
- Spring Data JPA 우선 검토

### Frontend

- React
- TypeScript
- Tailwind CSS
- Vite 권장
- React Router 권장
- TanStack Query 권장
- React Hook Form + Zod 권장

## 현재 저장소 구조

```text
oms-platform/
  backend/
  frontend/
  docs/
    API_DESIGN_DRAFT.md
    DB_DECISION.md
    DB_DESIGN_PROPOSAL.md
    ERD_DESIGN.md
    IMPLEMENTATION_PLAN.md
    OMS_개발팀_전달용_최종요구사항_Codex_대화반영_최종.md
  AGENTS.md
  README.md
  .env.example
  .gitignore
```

`backend/`, `frontend/`, `docs/`는 현재 기본 디렉터리만 준비되어 있다. 실제 프로젝트 생성은 다음 단계에서 진행한다.

## 다음 단계에서 생성할 프로젝트

Backend 프로젝트 생성 후 권장 구조:

```text
backend/
  build.gradle.kts
  src/main/kotlin/com/company/oms/
  src/test/kotlin/com/company/oms/
```

Frontend 프로젝트 생성 후 권장 구조:

```text
frontend/
  package.json
  vite.config.ts
  tailwind.config.ts
  src/
```

## 로컬 실행 상태

현재는 실행 가능한 Backend/Frontend 애플리케이션이 없다. 따라서 `bootRun`, `npm run dev`, health check 호출은 다음 단계에서 프로젝트를 생성한 뒤 확인한다.

## 확인 필요

- Backend 패키지명과 회사 표준 코드 스타일
- Gradle wrapper 사용 정책
- 로컬 개발 DB 방식
- DB 최종 선택 및 버전
- 외부 API 인증 방식
- 업로드 파일 보관 위치와 보관 기간
