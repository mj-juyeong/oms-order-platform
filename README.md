# OMS Platform

OIS가 생성한 목적별 엑셀 데이터를 업로드 받아 저장, 검증, 조회, 외부 API 제공, 엑셀 다운로드를 수행하기 위한 물류 운영 OMS 저장소이다.

현재 Backend는 Phase 2 기반 구조와 DB migration 기반 준비까지 되어 있다. Spring Boot Kotlin 애플리케이션은 DB 없이 기본 프로필로 실행 가능하며, 공통 응답, 공통 예외, requestId, 인증/인가 skeleton, 파일 저장 skeleton, audit logging skeleton, JPA/Flyway/MySQL 설정과 초기 schema migration이 포함되어 있다.

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

## Frontend 로컬 실행

Phase 3 Frontend 기반 구조는 실제 API 호출 없이 `frontend/src/api/mock`의 mock data만 사용한다.

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

빌드와 lint 확인:

```powershell
cd frontend
npm.cmd run build
npm.cmd run lint
```

주요 route 확인:

| Route | 설명 |
|---|---|
| `/` | `/dashboard` redirect |
| `/login` | 로그인 skeleton |
| `/dashboard` | mock 대시보드 |
| `/uploads` | OIS 엑셀 업로드 skeleton |
| `/batches` | 업로드 배치 목록 mock table |
| `/batches/BATCH-20260528-001` | 배치 상세 skeleton |
| `/batches/BATCH-20260528-001/validation` | 검증 결과 mock table |
| `/orders` | PL 기반 주문 조회 mock table |
| `/scan-lines` | Scan 조회 mock table |
| `/pl-lines` | PL 조회 mock table |
| `/label-lines` | Label 조회 mock table |
| `/downloads/labels` | 라벨 다운로드 skeleton |
| `/masters/products` | 상품 마스터 mock table |
| `/masters/store-routes` | 배송지/차량 마스터 mock table |
| `/audit` | 이력/로그 mock table |

주의:

- 실제 로그인/JWT/Session 연동은 구현하지 않았다.
- 실제 Backend API 호출은 하지 않는다.
- 실제 파일 업로드, 배치 검증, 배치 확정, 다운로드는 구현하지 않았다.
- 차수별 주문 조회(`/orders/by-round`)와 차수별 다운로드는 MVP 필수 route로 만들지 않았다.

## 현재 저장소 구조

```text
oms-platform/
  backend/
    build.gradle.kts
    src/main/kotlin/com/company/oms/
      OmsApplication.kt
      common/
      auth/
      audit/
      upload/
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

`backend/`는 Spring Boot Kotlin 프로젝트로 생성되어 있으며, 기본 health check와 system ping API가 동작한다. 기본 프로필은 DB 없이 실행되고, `local` 프로필은 MySQL과 Flyway migration을 사용한다. `frontend/`는 Vite React TypeScript 기반 프로젝트로 준비되어 있다.

## Backend 로컬 실행

기본 프로필은 DB 없이 실행 가능하다.

```powershell
cd backend
.\gradlew.bat bootRun
```

확인 API:

```powershell
Invoke-RestMethod http://localhost:8080/api/v1/system/ping
```

응답 형식:

```json
{
  "success": true,
  "data": {
    "status": "OK"
  },
  "error": null,
  "meta": {
    "requestId": "req-...",
    "timestamp": "2026-05-28T10:30:00+09:00"
  }
}
```

공통 예외 응답 확인용 API:

```powershell
Invoke-RestMethod http://localhost:8080/api/v1/system/error-sample
```

요청에 `X-Request-Id` header가 있으면 해당 값을 응답 header와 body `meta.requestId`에 반영한다. 없으면 서버가 생성한다.

## Backend 테스트

```powershell
cd backend
.\gradlew.bat test
.\gradlew.bat build
```

DB migration smoke test는 Docker가 필요하므로 명시적으로 켤 때만 실행한다.

```powershell
cd backend
.\gradlew.bat test -Doms.test.db=true --tests com.company.oms.MigrationSmokeTest
```

## Local DB 준비

기본 프로필은 실제 DB 연결을 강제하지 않는다. MySQL 로컬 개발 환경이 필요할 때만 Docker Compose를 사용한다.

```powershell
docker compose up -d mysql
```

`local` profile은 MySQL/Flyway 설정을 사용한다. 로컬 DB와 함께 실행하면 `backend/src/main/resources/db/migration/V1__initial_schema_mysql.sql`이 적용된다.

```powershell
cd backend
.\gradlew.bat bootRun --args='--spring.profiles.active=local'
```

## 확인 필요

- MySQL 8.4 LTS 사용 가능 여부 또는 회사 운영 MySQL 버전
- JWT/API Key 상세 정책
- 업로드 파일 보관 위치와 보관 기간
- 업로드 파일 최대 크기 운영 기준
- JPA Entity/Repository 구현 범위와 순서
- SYSTEM 관리자 tenant 선택 정책
- CLIENT 사용자 로그인 제공 여부
