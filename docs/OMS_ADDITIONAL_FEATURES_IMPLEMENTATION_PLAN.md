# OMS 추가 기능 구현 계획

- 작성일: 2026-06-01
- 기준 문서: `docs/OMS_개발팀_전달용_최종요구사항_Codex_대화반영_최종.md`
- 목적: 현재 OMS MVP 기능을 기준으로 운영 안정성과 효율을 높일 추가 기능의 구현 순서, 설계 방향, 확인 필요 사항을 정리한다.

---

## 1. 전제

현재 OMS의 중심 흐름은 다음과 같다.

```text
OIS 엑셀 업로드
  -> 시트 파싱
  -> DB 저장
  -> 현재 마스터 기준 검증
  -> Error 없음 확인 후 배치 확정
  -> 주문/Scan/PL/Label 조회
  -> 외부 WOS/PL API 제공
  -> 라벨 다운로드
  -> 감사/API/다운로드 로그 추적
```

추가 기능은 이 흐름을 바꾸지 않고, 운영자가 다음 상황을 더 빨리 발견하고 처리하도록 돕는 방향으로 설계한다.

- 막힌 배치
- 검증 Error
- 확정 지연
- 마감 시간 위험
- 외부 API 실패
- 다운로드 실패
- 마스터 변경 영향
- 반복 오류

OMS는 원본 주문 생성 시스템이 아니므로 추가 기능에서도 주문 생성/수정 기능처럼 보이는 화면이나 API는 만들지 않는다.

---

## 2. 추가 기능 우선순위

| 우선순위 | 기능 | 목표 | 구현 단계 |
|---|---|---|---|
| P1 | 알림 센터 / 작업함 | 운영자가 처리해야 할 이벤트를 한곳에서 확인 | 1차 추가 |
| P1 | 배치 상태 자동 갱신 | 업로드/검증/확정 상태 변화를 새로고침 없이 확인 | 1차 추가 |
| P1 | 마스터 변경 영향 분석 | 마스터 업로드 전후 검증 영향 확인 | 1차 추가 |
| P1 | 고객사별 엑셀 템플릿 관리 | 고객사별 컬럼 차이에 대응 | 2차 추가 |
| P2 | SLA/마감시간 알림 | 마감 전 미확정/오류 배치 조기 감지 | 2차 추가 |
| P2 | API 재처리 큐 | 외부 API 실패 재전송 및 이력 관리 | 2차 추가 |
| P2 | 오류 유형별 리포트 | 반복 오류 원인 분석 | 2차 추가 |
| P2 | 작업자별 처리 현황 | 업로드/검증/확정/다운로드 처리량 확인 | 2차 추가 |
| P2/P3 | 차수별 진행 대시보드 | 차량/차수별 처리량과 오류량 확인 | 차수 업무 개념 확정 후 |
| P3 | OIS 직접 API 연동 | 수동 엑셀 업로드 자동화 | 고도화 |
| P3 | 모바일 현장 조회 | 현장 작업자용 차수/차량별 데이터 확인 | 고도화 |

---

## 3. 실시간 알림 기능 설계

### 3-1. 기능 성격

실시간 알림은 모든 데이터 변경을 즉시 보여주는 기능이 아니라, 운영자가 조치해야 하는 중요 이벤트를 알려주는 기능으로 구현한다.

권장 명칭은 `알림 센터` 또는 `운영 작업함`이다.

### 3-2. 1차 알림 이벤트

| 이벤트 코드 | 심각도 | 발생 조건 | 이동 대상 |
|---|---|---|---|
| `BATCH_PARSE_FAILED` | ERROR | OIS 엑셀 파싱 실패 | 배치 상세 |
| `VALIDATION_COMPLETED_WITH_ERRORS` | ERROR | 검증 완료 후 Error 1건 이상 | 검증 결과 |
| `VALIDATION_COMPLETED_WITH_WARNINGS` | WARNING | Error는 없고 Warning 1건 이상 | 검증 결과 |
| `BATCH_READY_TO_CONFIRM` | INFO | Error 없이 검증 완료 | 배치 상세 |
| `BATCH_CONFIRMED` | INFO | 배치 확정 완료 | 배치 상세 |
| `LABEL_DOWNLOAD_FAILED` | ERROR | 라벨 다운로드 생성 실패 | 다운로드 로그 |
| `EXTERNAL_API_FAILED` | ERROR | 외부 WOS/PL API 호출 실패 | API 로그 |
| `API_KEY_EXPIRING` | WARNING | API Key 만료 예정 | API Key 관리 |
| `MASTER_UPLOAD_FAILED` | ERROR | 마스터 업로드 실패 | 마스터 화면 |
| `MASTER_UPLOAD_COMPLETED` | INFO | 마스터 업로드 완료 | 마스터 화면 |

### 3-3. 2차 알림 이벤트

| 이벤트 코드 | 심각도 | 발생 조건 | 비고 |
|---|---|---|---|
| `SLA_DEADLINE_APPROACHING` | WARNING | 마감 N분 전 미확정 배치 존재 | 마감 기준 확인 필요 |
| `SLA_DEADLINE_MISSED` | ERROR | 마감 시간 초과 후 미확정 배치 존재 | 마감 기준 확인 필요 |
| `API_RETRY_EXHAUSTED` | ERROR | API 재처리 최대 횟수 초과 | 재처리 정책 확인 필요 |
| `MASTER_IMPACT_DETECTED` | WARNING | 마스터 변경으로 미확정 배치 검증 결과 영향 가능 | 영향 분석 구현 후 |

### 3-4. 전달 방식

1차는 인앱 알림을 기본으로 한다.

| 단계 | 방식 | 설명 |
|---|---|---|
| 1단계 | Polling | 프론트엔드가 15~30초 간격으로 미확인 알림 수와 목록 조회 |
| 2단계 | SSE | 서버에서 단방향 이벤트 전달. 배치 상태/알림에는 충분 |
| 3단계 | WebSocket | 다중 사용자 협업, 실시간 대시보드 요구가 커질 때 검토 |
| 4단계 | 외부 채널 | 이메일, Slack/Teams, 카카오워크 등. ERROR/SLA 중심으로 제한 |

1차 MVP 이후 추가 기능으로는 Polling 또는 SSE를 권장한다. WebSocket은 운영 복잡도가 증가하므로 처음부터 기본값으로 두지 않는다.

---

## 4. Backend 구현 계획

### 4-1. 패키지

신규 패키지 후보:

```text
backend/src/main/kotlin/com/company/oms/notification/
```

구성:

| 파일 | 역할 |
|---|---|
| `NotificationEntity.kt` | 알림 저장 Entity |
| `NotificationRepository.kt` | 알림 조회/저장 |
| `NotificationDtos.kt` | 목록/카운트/읽음 처리 DTO |
| `NotificationService.kt` | 알림 생성, 조회, 읽음 처리 |
| `NotificationController.kt` | 내부 운영 API |
| `NotificationEventPublisher.kt` | 도메인 서비스에서 알림 생성 요청 |
| `NotificationSseController.kt` | 2단계 SSE 도입 시 사용 |

### 4-2. DB 설계

MySQL과 PostgreSQL 양쪽에서 구현 가능한 표준 RDB 구조를 우선한다.

```sql
create table notifications (
  id bigint primary key auto_increment,
  tenant_id bigint not null,
  client_id bigint null,
  user_id bigint null,
  target_scope varchar(30) not null,
  event_type varchar(80) not null,
  severity varchar(20) not null,
  title varchar(200) not null,
  message varchar(1000) not null,
  related_resource_type varchar(50) null,
  related_resource_id varchar(100) null,
  link_path varchar(500) null,
  read_at datetime null,
  occurred_at datetime not null,
  created_at datetime not null
);
```

권장 인덱스:

```sql
create index idx_notifications_tenant_unread
  on notifications (tenant_id, read_at, occurred_at);

create index idx_notifications_user_unread
  on notifications (user_id, read_at, occurred_at);

create index idx_notifications_event_time
  on notifications (event_type, occurred_at);
```

주의:

- `tenant_id`는 기본 필수다.
- `client_id`는 고객사 범위 알림일 때만 사용한다.
- `user_id`는 특정 사용자에게만 보내는 알림일 때 사용한다.
- SYSTEM 사용자용 전역 알림 정책은 확인 필요로 둔다.
- `related_resource_id`는 배치 ID, 로그 ID, API Key ID 등을 문자열로 저장해 확장성을 확보한다.

### 4-3. API

내부 운영 API는 `/api/v1` prefix를 사용한다.

| Method | Path | 설명 |
|---|---|---|
| `GET` | `/api/v1/notifications` | 알림 목록 조회 |
| `GET` | `/api/v1/notifications/unread-count` | 미확인 알림 수 조회 |
| `POST` | `/api/v1/notifications/{notificationId}/read` | 단건 읽음 처리 |
| `POST` | `/api/v1/notifications/read-all` | 조건 기준 전체 읽음 처리 |
| `DELETE` | `/api/v1/notifications/{notificationId}` | 알림 숨김 또는 삭제. 1차는 보류 가능 |

목록 조회 필터:

| 필드 | 설명 |
|---|---|
| `severity` | `ERROR`, `WARNING`, `INFO` |
| `eventType` | 알림 이벤트 코드 |
| `readStatus` | `UNREAD`, `READ`, `ALL` |
| `from`, `to` | 발생 시각 범위 |
| `page`, `size` | 페이징 |

### 4-4. 알림 생성 위치

알림 생성은 상태 전환이 확정된 뒤에 수행한다.

| 기존 서비스 | 생성 이벤트 |
|---|---|
| `OisUploadService` | 파싱 실패, 업로드 완료 |
| `BatchValidationService` | 검증 완료, Error/Warning 발생 |
| `ConfirmedBatchService` | 확정 완료, 확정 실패 |
| `LabelDownloadService` | 다운로드 실패 |
| `ExternalApiStatusService` 또는 API 로그 서비스 | 외부 API 실패 |
| `MasterUpsertService` | 마스터 업로드 완료/실패 |
| API Key 서비스 | 만료 예정 알림 |

중복 알림 방지 정책:

- 동일 `event_type + related_resource_type + related_resource_id`에 대해 미확인 알림이 있으면 새로 만들지 않고 `occurred_at` 또는 메시지만 갱신하는 방식을 검토한다.
- 검증을 재실행한 경우에는 이전 검증 알림과 구분할 수 있도록 검증 실행 시각을 메시지에 포함한다.

---

## 5. Frontend 구현 계획

### 5-1. 신규 파일

```text
frontend/src/types/notification.ts
frontend/src/api/notifications.ts
frontend/src/components/domain/NotificationBell.tsx
frontend/src/components/domain/NotificationDrawer.tsx
frontend/src/pages/NotificationsPage.tsx
```

### 5-2. Header 알림 UX

Header 우측에 알림 아이콘을 추가한다.

표시 항목:

- 미확인 알림 수 badge
- 최근 알림 10건
- 심각도 badge
- 발생 시각
- 관련 화면으로 이동
- 단건 읽음 처리
- 전체 읽음 처리

### 5-3. 알림 목록 화면

Route 후보:

```text
/notifications
```

화면 구성:

- 상단 필터: 심각도, 읽음 여부, 이벤트 유형, 기간
- 목록 테이블: 발생시각, 심각도, 제목, 메시지, 관련 리소스, 상태
- 행 클릭 시 관련 화면 이동
- 대량 읽음 처리

### 5-4. 배치 상태 자동 갱신

알림 기능과 별도로 배치 관련 화면은 자동 갱신을 적용한다.

| 화면 | 갱신 대상 | 권장 방식 |
|---|---|---|
| `/dashboard` | 오늘 Error/Warning, 확정 대기 수 | 30초 polling |
| `/uploads` | 업로드 직후 배치 상태 | 5~10초 polling, 완료 후 중지 |
| `/batches` | 배치 상태 목록 | 15~30초 polling |
| `/batches/:batchId` | 단건 배치 상태, 시트 결과 | 5~10초 polling, terminal 상태 후 중지 |
| `/batches/:batchId/validation` | 검증 완료 여부, 오류 건수 | 검증 중일 때만 polling |

Terminal 상태 후보:

- `CONFIRMED`
- `CANCELED`
- `ROLLED_BACK`
- `FAILED`

실제 enum 명칭은 현재 `OmsEnums.kt` 기준으로 맞춘다.

---

## 6. SLA/마감시간 알림 구현 계획

### 6-1. 확인 필요

SLA 알림은 업무 기준이 확정되어야 한다.

| 확인 항목 | 설명 |
|---|---|
| 마감 기준 일자 | 배송일, 납기요청일, 업로드일 중 무엇을 기준으로 할지 |
| 마감 시간 | 고객사/센터/차수별로 다른지 |
| 알림 선행 시간 | 예: 마감 60분 전, 30분 전 |
| 미처리 기준 | 미확정, Error 존재, 검증 미실행 중 무엇을 포함할지 |
| 수신자 | tenant 운영자 전체, 관리자, 담당자 지정 여부 |

### 6-2. DB 후보

```sql
create table sla_policies (
  id bigint primary key auto_increment,
  tenant_id bigint not null,
  client_id bigint null,
  policy_name varchar(100) not null,
  basis_type varchar(30) not null,
  deadline_time varchar(10) not null,
  warning_minutes_before int not null,
  enabled boolean not null,
  created_at datetime not null,
  updated_at datetime not null
);
```

### 6-3. Scheduler

Spring Scheduler 또는 배치 잡으로 5분 단위 점검을 수행한다.

점검 조건:

- 대상 배송일/납기일의 배치 중 미확정 상태
- 검증 Error 존재
- 검증 미실행 상태
- 마감 임박 또는 초과

---

## 7. API 재처리 큐 구현 계획

### 7-1. 적용 대상

외부 WOS/PL API가 OMS로부터 데이터를 가져가는 pull 방식이면 재처리 큐가 아니라 API 호출 로그와 장애 알림이 우선이다.

OMS가 외부 시스템으로 직접 push하는 방식이 생기면 재처리 큐가 필요하다.

따라서 현재 기준에서는 `확인 필요`로 둔다.

### 7-2. 구현 후보

| 구성 | 설명 |
|---|---|
| `external_api_delivery_jobs` | 외부 전송 작업 큐 |
| `external_api_delivery_attempts` | 재시도 이력 |
| retry policy | 최대 횟수, backoff, 수동 재시도 |
| admin action | 실패 작업 재처리, 중단, 무시 |

---

## 8. 마스터 변경 영향 분석 구현 계획

### 8-1. 목표

상품/배송지 마스터 업로드가 미확정 배치 검증 결과에 어떤 영향을 줄 수 있는지 확인한다.

예:

- 기존 Error였던 품목코드가 새 상품 마스터 업로드 후 해소될 수 있음
- 기존 정상 배송지 코드가 마스터 변경 후 미등록으로 바뀔 수 있음
- 배송지/차량 차수, 차량명 변경으로 차수별 조회 결과가 달라질 수 있음

### 8-2. 구현 방식

1차는 실제 마스터 반영 전 preview가 아니라, 마스터 업로드 후 미확정 배치 재검증 후보를 알려주는 방식으로 시작한다.

권장 순서:

1. 마스터 업로드 완료
2. 변경된 key 목록 수집
3. 미확정 배치의 운영 데이터에서 해당 key 사용 여부 조회
4. 영향 가능 배치 목록 생성
5. 알림 `MASTER_IMPACT_DETECTED` 생성
6. 운영자가 배치 재검증 실행

### 8-3. API 후보

| Method | Path | 설명 |
|---|---|---|
| `GET` | `/api/v1/masters/impact-candidates` | 마스터 변경 영향 후보 조회 |
| `POST` | `/api/v1/batches/{batchId}/revalidate` | 배치 재검증 |

---

## 9. 고객사별 엑셀 템플릿 관리 구현 계획

### 9-1. 목표

고객사별로 시트명, 컬럼명, 필수 컬럼, 코드 컬럼명이 달라질 가능성에 대비한다.

단, 현재 1차 기준 입력 엑셀은 고정되어 있으므로 기본 파서는 유지한다.

### 9-2. 설계 원칙

- 기본 템플릿은 현재 요구사항 문서의 시트 구조를 따른다.
- 고객사별 템플릿은 `client_id` 기준 선택 기능으로 둔다.
- 파서 로직 전체를 동적으로 바꾸기보다, 컬럼 alias와 필수값 정책부터 관리한다.

### 9-3. 확인 필요

- 고객사별로 실제로 시트명이 달라지는지
- 컬럼명이 달라지는지
- 컬럼 순서만 달라지는지
- 특정 고객사 전용 필수값이 있는지

---

## 10. 오류 유형별 리포트 구현 계획

### 10-1. 목표

반복 오류를 고객사, 배치, 마스터, 컬럼, 오류 코드 기준으로 분석한다.

### 10-2. 화면 후보

Route:

```text
/reports/validation-errors
```

지표:

- 기간별 Error/Warning 추이
- 오류 코드 Top N
- 고객사별 오류 건수
- 품목코드 미등록 Top N
- 배송지코드 미등록 Top N
- 배치별 오류율

### 10-3. 구현 방식

1차는 `validation_errors` 집계 API로 충분하다.

별도 통계 테이블은 데이터량이 커진 뒤 검토한다.

---

## 11. 작업자별 처리 현황 구현 계획

### 11-1. 목표

감사 로그를 기반으로 사용자별 처리량과 병목을 확인한다.

지표:

- 업로드 건수
- 검증 실행 건수
- 확정 건수
- 롤백/취소 건수
- 다운로드 건수
- API Key 관리 작업

### 11-2. 구현 방식

기존 감사 로그를 우선 활용한다.

신규 테이블을 만들기보다 `batch_audit_logs`, `download_logs`, `api_call_logs`를 집계한다.

---

## 12. 구현 순서 제안

### Phase A. 알림 기반 구축

1. `notifications` migration 추가
2. Notification entity/repository/service/controller 구현
3. 알림 목록/미확인 수/읽음 처리 API 구현
4. 검증 완료, 배치 확정, 다운로드 실패, API 실패 이벤트 연결
5. 프론트엔드 Header 알림 아이콘과 Drawer 구현
6. 알림 목록 페이지 구현
7. 테스트 작성

완료 기준:

- 검증 Error가 발생하면 알림이 생성된다.
- Header에서 미확인 수가 보인다.
- 알림 클릭 시 관련 화면으로 이동한다.
- 읽음 처리 후 미확인 수가 감소한다.

### Phase B. 배치 상태 자동 갱신

1. 배치 목록/상세/검증 화면에 polling 정책 적용
2. 처리 중 상태에서만 짧은 interval 사용
3. terminal 상태 도달 시 polling 중지
4. 대시보드 주요 카운트 자동 갱신

완료 기준:

- 업로드 후 검증 완료 상태가 새로고침 없이 반영된다.
- 검증 중 화면에서 Error/Warning 카운트가 갱신된다.

### Phase C. 마스터 변경 영향 분석

1. 마스터 업로드 변경 key 수집
2. 미확정 배치 영향 후보 조회 API 구현
3. 영향 후보 화면 또는 마스터 업로드 결과 패널 확장
4. 영향 발생 시 알림 생성
5. 재검증 동선 연결

완료 기준:

- 마스터 업로드 후 영향 가능 배치가 표시된다.
- 운영자는 해당 배치로 이동해 재검증할 수 있다.

### Phase D. SLA/마감시간 알림

1. 마감 기준 업무 정책 확정
2. SLA policy 테이블과 관리 API 구현
3. Scheduler 구현
4. 마감 임박/초과 알림 생성
5. 대시보드에 SLA 위험 배치 표시

완료 기준:

- 마감 N분 전 미확정 배치 알림이 생성된다.
- 마감 초과 배치는 ERROR로 표시된다.

### Phase E. 리포트/운영 분석

1. 오류 유형별 집계 API
2. 작업자별 처리 현황 집계 API
3. 리포트 화면 구현
4. 다운로드 또는 CSV export 검토

완료 기준:

- 기간별 오류 유형과 작업자별 처리량을 조회할 수 있다.

---

## 13. 테스트 계획

### Backend

| 구분 | 테스트 |
|---|---|
| 알림 생성 | 검증 Error 발생 시 알림 생성 |
| 중복 방지 | 동일 배치 동일 이벤트 중복 생성 방지 |
| 읽음 처리 | 단건/전체 읽음 처리 |
| 권한 범위 | tenant/client 범위 밖 알림 조회 불가 |
| 배치 확정 | 확정 완료 알림 생성 |
| 다운로드 실패 | 실패 로그와 알림 생성 |
| API 실패 | API 호출 실패 로그와 알림 생성 |
| SLA | 마감 임박/초과 조건별 알림 생성 |

### Frontend

| 구분 | 테스트 |
|---|---|
| Header | 미확인 알림 수 표시 |
| Drawer | 최근 알림 목록 표시 |
| 이동 | 알림 클릭 시 관련 화면 이동 |
| 읽음 | 읽음 처리 후 badge 감소 |
| 필터 | 알림 목록 심각도/읽음 여부 필터 |
| Polling | 처리 중 배치만 자동 갱신 |

---

## 14. 확인 필요 사항

| 번호 | 항목 | 영향 |
|---:|---|---|
| 1 | 알림 수신 범위: tenant 전체, client별, 사용자별 정책 | DB/API 권한 정책 |
| 2 | SYSTEM 관리자의 알림 조회 범위 | 전역 관리자 UX |
| 3 | SLA 기준 일자와 마감 시간 | SLA 알림 정확도 |
| 4 | Warning 배치 확정 허용 여부 | 알림 심각도와 확정 가능 메시지 |
| 5 | 외부 API가 pull 방식인지 push 방식인지 | API 재처리 큐 필요 여부 |
| 6 | 외부 알림 채널 사용 여부 | 이메일/메신저 연동 범위 |
| 7 | 고객사별 템플릿 차이가 실제로 존재하는지 | 템플릿 관리 우선순위 |
| 8 | 마스터 업로드 전 preview가 필요한지, 업로드 후 영향 분석이면 충분한지 | 마스터 영향 분석 난이도 |

---

## 15. 권장 1차 개발 범위

가장 먼저 구현할 범위는 다음으로 제한한다.

1. 인앱 알림 저장/조회/읽음 처리
2. Header 알림 아이콘과 Drawer
3. 검증 Error/Warning/확정 가능/확정 완료 알림
4. 외부 API 실패/다운로드 실패 알림
5. 배치 목록/상세/검증 화면 polling

이 범위는 현재 OMS의 핵심 업무 흐름과 직접 연결되고, SLA나 고객사 템플릿처럼 운영 정책 확인이 필요한 부분을 기다리지 않고도 구현할 수 있다.

