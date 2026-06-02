# OMS Authorization Policy

이 문서는 OMS의 사용자 스코프, 역할, 페이지 접근, API 접근 정책을 정의한다.
구현 중 권한 정책과 코드가 충돌하면 이 문서를 우선 기준으로 확인한다.

## 1. 기본 원칙

- `scope`는 사용자가 접근할 수 있는 데이터 범위를 의미한다.
- `role`은 해당 데이터 범위 안에서 수행할 수 있는 행동 권한을 의미한다.
- 최종 권한은 `scope + role` 조합으로 판단한다.
- 프론트엔드의 메뉴/버튼 숨김은 사용자 경험 보조 수단이다.
- 실제 접근 제한은 반드시 백엔드에서 현재 로그인 사용자 기준으로 검증한다.
- 클라이언트가 보낸 `tenantId`, `clientId`는 신뢰하지 않고, 현재 사용자 스코프와 대조한다.

```text
final permission = userScopeType data boundary + role action permission
```

## 2. Scope 정의

| Scope | 의미 | tenant_id | client_id | 데이터 범위 |
|---|---|---:|---:|---|
| `SYSTEM` | OMS 플랫폼 전체 관리자 | NULL | NULL | tenant 생성/관리 등 전역 관리 범위 |
| `TENANT` | 특정 물류사 소속 사용자 | 필수 | NULL | 해당 물류사의 고객사 및 운영 데이터 |
| `CLIENT` | 특정 고객사/화주사 소속 사용자 | 필수 | 필수 | 해당 고객사의 운영 데이터 |

### SYSTEM

`SYSTEM` 사용자는 물류사 직원이 아니라 OMS 플랫폼 운영자다.

- 물류사 tenant 생성, 수정, 비활성화를 담당한다.
- 물류사 최초 관리자 계정을 생성할 수 있다.
- 기본적으로 특정 물류사의 OIS 업로드, 배치 확정, 롤백 같은 실무 처리를 하지 않는다.
- 운영 데이터 접근이 필요한 경우에는 tenant/client를 명시적으로 선택한 지원 모드로 접근해야 한다.
- 지원 모드 접근은 감사 로그를 남겨야 한다.

### TENANT

`TENANT` 사용자는 특정 물류사 소속 사용자다.

- `tenant_id`는 반드시 존재해야 한다.
- `client_id`는 NULL이다.
- 해당 물류사 내부의 여러 고객사 데이터를 다룰 수 있다.
- 단, 실제 행동 가능 범위는 role에 따라 달라진다.
- 다른 물류사의 tenant, 고객사, 배치, 사용자, 로그에는 접근할 수 없다.

### CLIENT

`CLIENT` 사용자는 특정 고객사/화주사 사용자다.

- `tenant_id`, `client_id`가 모두 반드시 존재해야 한다.
- 자기 고객사 데이터만 접근할 수 있다.
- 다른 고객사 또는 물류사 전체 데이터에 접근할 수 없다.
- 1차 MVP에서는 조회/다운로드 중심으로 제한한다.

## 3. Role 정의

현재 코드 기준 역할은 아래 enum을 기준으로 한다.

| Role | 의미 | 기본 사용처 |
|---|---|---|
| `SYSTEM_ADMIN` | 시스템 전체 관리자 | `SYSTEM` 사용자 |
| `ADMIN` | 조직 관리자 | `TENANT` 관리자 |
| `OPERATOR` | 운영 실무자 | `TENANT` 운영자 |
| `VIEWER` | 조회 사용자 | `TENANT`, `CLIENT` 조회자 |
| `API_USER` | API 관련 사용자 후보 | 현재 외부 API는 API Key 기반이므로 로그인 사용자와 분리 검토 |
| `SUPPORT` | 지원 담당자 후보 | 세부 권한 확인 필요 |

문서와 프론트 타입에 존재하는 `PUBLIC`은 로그인 전 접근 개념이다.
백엔드 `UserRole` enum에는 사용자 role로 저장하지 않는다.

## 4. 표준 사용자 조합

| 운영 명칭 | userScopeType | role | 설명 |
|---|---|---|---|
| `SYSTEM_ADMIN` | `SYSTEM` | `SYSTEM_ADMIN` | OMS 플랫폼 전체 관리자 |
| `TENANT_ADMIN` | `TENANT` | `ADMIN` | 특정 물류사 관리자 |
| `TENANT_OPERATOR` | `TENANT` | `OPERATOR` | 특정 물류사 운영 실무자 |
| `TENANT_VIEWER` | `TENANT` | `VIEWER` | 특정 물류사 조회 사용자 |
| `CLIENT_OPERATOR` | `CLIENT` | `OPERATOR` | 특정 고객사 업로드, 검증, 확정 요청 담당자 |
| `CLIENT_VIEWER` | `CLIENT` | `VIEWER` | 특정 고객사 조회 사용자 |

`CLIENT + OPERATOR`, `CLIENT + VIEWER`는 허용한다.
`CLIENT + ADMIN`과 CLIENT 사용자의 복수 role 조합은 허용하지 않는다.

## 5. 사용자 생성 정책

사용자 생성 화면에서 `tenant_id`, `client_id` 숫자를 직접 입력하지 않는다.
운영자는 먼저 관리 대상 조직을 생성/선택하고, 그 선택값을 기준으로 사용자를 생성한다.

```text
SYSTEM_ADMIN
→ 물류사(Tenant) 생성
→ 물류사 선택
→ 해당 물류사의 TENANT_ADMIN / TENANT_OPERATOR / TENANT_VIEWER 생성

TENANT_ADMIN
→ 자기 물류사의 고객사(Client) 생성
→ 고객사 선택
→ 해당 고객사의 CLIENT_OPERATOR / CLIENT_VIEWER 생성
```

- `SYSTEM_ADMIN`은 `/tenants`에서 물류사를 생성/관리한다.
- `SYSTEM_ADMIN`은 `/clients`에서 특정 물류사를 선택한 뒤 고객사를 생성/관리할 수 있다.
- `TENANT_ADMIN`은 `/clients`에서 자기 물류사의 고객사만 생성/관리한다.
- `TENANT_ADMIN`이 사용자를 만들 때 `tenant_id`는 로그인 사용자의 `tenant_id`로 고정된다.
- `CLIENT` 사용자는 MVP에서 사용자/고객사/물류사 관리 권한이 없다.
- 존재하지 않는 tenant/client를 직접 입력해 서버 오류가 나지 않도록, 프론트는 선택형 UI를 사용하고 백엔드는 400/403/404로 명확히 응답한다.

### SYSTEM_ADMIN이 생성할 수 있는 사용자

- `SYSTEM + SYSTEM_ADMIN`
- `TENANT + ADMIN`
- `TENANT + OPERATOR`
- `TENANT + VIEWER`
- `CLIENT + OPERATOR`
- `CLIENT + VIEWER`

### TENANT_ADMIN이 생성할 수 있는 사용자

같은 `tenant_id` 범위에서만 아래 사용자를 생성할 수 있다.

- `TENANT + ADMIN`
- `TENANT + OPERATOR`
- `TENANT + VIEWER`
- `CLIENT + OPERATOR`
- `CLIENT + VIEWER`

### TENANT_ADMIN이 생성할 수 없는 사용자

- `SYSTEM` 사용자
- 다른 `tenant_id`의 사용자
- `CLIENT + ADMIN`
- `SYSTEM_ADMIN` role 사용자

### CLIENT 사용자의 사용자 관리

`CLIENT` 사용자는 1차 MVP에서 사용자 관리 기능을 사용할 수 없다.

## 6. Page Access Matrix

| Page | SYSTEM_ADMIN | TENANT_ADMIN | TENANT_OPERATOR | TENANT_VIEWER | CLIENT_OPERATOR | CLIENT_VIEWER |
|---|---:|---:|---:|---:|---:|---:|
| Dashboard | O | O | O | O | O | O |
| Tenant Management | O | X | X | X | X | X |
| Client Management | O | O | X | X | X | X |
| OIS Upload | Support/Restricted | O | O | X | O | X |
| Batch List | Support/Read | O | O | O | Own client | Own client |
| Batch Detail | Support/Read | O | O | O | Own client | Own client |
| Validation Results | Support/Read | O | O | O | Own client | Own client |
| Batch Validate | X | O | O | X | Own client | X |
| Batch Confirmation Request | X | O | O | X | Own client | X |
| Batch Final Confirm | X | O | O | X | X | X |
| Batch Cancel/Rollback | X | O | X | X | X | X |
| Orders | Support/Read | O | O | O | Own client | Own client |
| Scan Lines | Support/Read | O | O | O | Own client | Own client |
| PL Lines | Support/Read | O | O | O | Own client | Own client |
| Label Lines | Support/Read | O | O | O | Own client | Own client |
| Label Download | Support/Read | O | O | Read/Optional | Own client | Own client |
| Product Master | Support/Read | O | X | Read/Optional | Public view | Public view |
| Store/Route Master | Support/Read | O | X | Read/Optional | Public view | Public view |
| External API Guide | O | O | O | O | O | O |
| External API Status | Support/Read | O | O | O | Own client only | Own client only |
| API Key Management | O | O | X | X | X | X |
| User Management | O | O | X | X | X | X |
| Audit Logs | O | O | X | X | X | X |

`Support/Read`는 SYSTEM_ADMIN이 tenant/client를 명시적으로 선택한 지원 모드에서 조회만 가능하다는 의미다.
1차 구현에서 지원 모드가 없다면 SYSTEM_ADMIN의 운영 페이지 접근은 제한한다.

## 7. API Access Policy

### 공통 API 검증 규칙

- 모든 내부 운영 API는 현재 로그인 사용자의 scope를 먼저 확인한다.
- `TENANT` 사용자는 자신의 `tenant_id`와 다른 요청을 보낼 수 없다.
- `CLIENT` 사용자는 자신의 `tenant_id + client_id`와 다른 요청을 보낼 수 없다.
- `CLIENT` 사용자가 `clientId` 없이 조회하면 서버가 현재 사용자의 `client_id`로 강제한다.
- `SYSTEM` 사용자는 tenant/client 선택 정책이 없는 운영 API를 호출할 수 없다.
- 외부 API는 로그인 사용자가 아니라 `X-Api-Key`에 연결된 `tenant_id + client_id`를 기준으로 조회한다.

### 내부 API 권한 기준

| API 영역 | SYSTEM_ADMIN | TENANT_ADMIN | TENANT_OPERATOR | TENANT_VIEWER | CLIENT_OPERATOR | CLIENT_VIEWER |
|---|---:|---:|---:|---:|---:|---:|
| `/api/v1/auth/me` | O | O | O | O | O | O |
| `/api/v1/users` | O | Same tenant | X | X | X | X |
| `/api/v1/order-excel-batches` GET | Support/Read | O | O | O | Own client | Own client |
| `/api/v1/order-excel-batches` POST | X | O | O | X | Own client | X |
| batch validate | X | O | O | X | Own client | X |
| batch confirmation request | X | O | O | X | Own client | X |
| batch final confirm | X | O | O | X | X | X |
| batch cancel | X | O | X | X | X | X |
| batch rollback | X | O | X | X | X | X |
| order/scan/pl/label query | Support/Read | O | O | O | Own client | Own client |
| label download | Support/Read | O | O | Optional | Own client | Own client |
| master upload/upsert | X | O | X | X | X | X |
| client public master query | Support/Read | O | O | O | Own client | Own client |
| API Key management | O | O | X | X | X | X |
| audit query | O | O | X | X | X | X |

## 8. Frontend 적용 정책

- `NavigationItem`은 `roles`뿐 아니라 `scopes` 조건을 가져야 한다.
- `ProtectedRoute`는 role과 scope를 모두 검사해야 한다.
- 사이드바 메뉴 숨김은 백엔드 권한 검증을 대체하지 않는다.
- `CLIENT` 사용자는 고객사 선택 드롭다운을 볼 수 없다.
- `CLIENT` 사용자는 항상 자신의 `clientId`로 고정된다.
- 로그인 또는 로그아웃 시 저장된 고객사 선택 상태를 초기화한다.
- 고객사 선택 상태는 최소한 사용자별로 분리한다.

권장 저장 키:

```text
oms.clientContext.{userId}
```

또는 scope까지 포함한 더 엄격한 키:

```text
oms.clientContext.{userScopeType}.{tenantId}.{clientId}
```

## 9. Backend 적용 정책

권한 검증은 공통 서비스로 분리한다.

권장 위치:

```text
backend/src/main/kotlin/com/company/oms/auth/AccessScopeService.kt
```

권장 책임:

- 현재 사용자 조회
- role 검증
- tenant 접근 검증
- client 접근 검증
- `CLIENT` 사용자의 client 강제 보정
- SYSTEM 지원 모드 정책 검증

권장 메서드 예시:

```kotlin
fun requireSystemAdmin(): CurrentUser
fun requireTenantAdmin(): CurrentUser
fun requireAnyRole(vararg roles: UserRole): CurrentUser
fun resolveTenantId(requestTenantId: Long?): Long
fun resolveClientId(requestTenantId: Long?, requestClientId: Long?): ResolvedScope
fun requireTenantAccess(tenantId: Long)
fun requireClientAccess(tenantId: Long, clientId: Long)
```

## 10. 감사 로그 정책

아래 행동은 감사 로그 대상이다.

- 배치 확정, 취소, 롤백
- Label 다운로드
- 외부 API 호출
- API Key 생성, 수정, 비활성화
- 사용자 생성, 수정, 비활성화
- SYSTEM_ADMIN의 지원 모드 운영 데이터 접근
- 마스터 업로드 및 upsert

## 11. 1차 MVP 확정 사항

- 기본 운영 사용자는 `TENANT` scope다.
- 물류사 관리자는 `TENANT + ADMIN`이다.
- 고객사 사용자는 `CLIENT + OPERATOR` 또는 `CLIENT + VIEWER` 중 하나의 role을 가진다.
- `CLIENT + OPERATOR`는 자기 고객사의 OIS 업로드, 검증, 배치 확정 요청을 할 수 있다.
- `CLIENT` 사용자는 최종 배치 확정, 마스터 관리, API Key 관리, 사용자 관리를 할 수 없다.
- `SYSTEM_ADMIN`은 물류사를 관리하는 플랫폼 관리자다.
- `SYSTEM_ADMIN`의 운영 데이터 직접 처리 권한은 기본 허용하지 않는다.

## 12. 확인 필요 사항

| 항목 | 영향 |
|---|---|
| SYSTEM_ADMIN 지원 모드 UI 제공 시점 | 운영 페이지 접근 허용 여부 결정 |
| CLIENT 사용자의 Label 다운로드 허용 범위 | 고객사 포털 성격에 따라 다운로드 허용/차단 결정 |
| TENANT_VIEWER의 Label 다운로드 허용 여부 | 조회 전용 사용자의 파일 반출 가능 범위 결정 |
| SUPPORT role의 실제 사용 여부 | 장애 대응/CS 계정 정책 결정 |
| API_USER role 유지 여부 | 외부 API Key 인증과 로그인 사용자 역할의 중복 정리 |
| 고객사 사용자의 직접 로그인 제공 시점 | CLIENT scope 화면/메뉴 정교화 범위 결정 |

## 13. 참고한 일반 패턴

- OMS/WMS 계열 시스템은 role과 데이터 접근 범위를 분리해 운영한다.
- 다중 고객사 물류 시스템은 고객사별 데이터 격리를 기본으로 둔다.
- 고객사 포털은 고객사 자기 데이터 조회, 리포트, 다운로드 중심으로 제공하는 경우가 일반적이다.
- tenant 관리자와 platform/system 관리자는 별도 계층으로 분리한다.
