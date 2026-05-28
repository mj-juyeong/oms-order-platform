# DB 선택 판단 문서

이 문서는 OMS Phase 1의 DB 선택 방향을 리뷰하기 위한 판단 문서다. DB를 최종 확정하지 않고, 1차 MVP에서 현실적으로 선택 가능한 기본안과 대안을 분리한다.

## 1. 선택 후보

| 후보 | 검토 위치 |
|---|---|
| MySQL | 회사 표준이 MySQL이라는 전제를 둘 때 1차 MVP 기본 후보 |
| PostgreSQL | JSONB, GIN index, partial index, materialized view 등 확장성 비교안 |

## 2. 1차 MVP 기본 방향

- 회사 운영 표준이 MySQL이라면 1차 MVP 기본 후보는 MySQL로 둔다.
- PostgreSQL은 향후 리포트, 유연 검색, 대용량 분석, JSONB 기반 원본 row 검색이 커질 때의 비교안으로 유지한다.
- 이 문서의 결론은 최종 확정이 아니라 리뷰 가능한 선택안이다.
- DB 설계는 MySQL/PostgreSQL 양쪽에서 구현 가능한 표준 RDB 모델을 우선한다.
- PostgreSQL 전용 기능은 기본 설계에 넣지 않고 선택 기능 또는 DB별 대안으로 분리한다.

## 3. 비교 기준

| 비교 항목 | MySQL | PostgreSQL | 판단 |
|---|---|---|---|
| 운영 표준성 | 회사가 현재 MySQL을 사용 중이라면 운영/장애 대응/백업 체계를 재사용할 수 있다. | 회사 표준이 아니면 신규 운영 부담이 있다. | 운영 표준 확인 전까지 MySQL 우세 |
| 개발팀 숙련도 | 기존 MySQL 경험이 있으면 SQL 튜닝과 장애 대응이 빠르다. | PostgreSQL 경험이 충분하면 고급 SQL 활용성이 좋다. | 팀 숙련도 확인 필요 |
| JSON/검색/인덱스 확장성 | JSON 컬럼과 일반 인덱스 사용 가능. 복잡 검색은 제한적이다. | JSONB, GIN, partial/expression index 선택지가 넓다. | 고도화는 PostgreSQL 우세 |
| 대용량 조회 | 표준 B-Tree, 복합 인덱스, 페이징으로 MVP 처리 가능. | 복합 조회와 분석성 SQL 최적화 선택지가 넓다. | MVP는 동등, 분석 확장은 PostgreSQL 우세 |
| Migration 도구 호환성 | Flyway/Liquibase 모두 안정적이다. | Flyway/Liquibase 모두 안정적이다. | 동등 |
| Docker 로컬 개발 | MySQL Docker Compose 구성이 단순하다. | PostgreSQL Docker Compose 구성이 단순하다. | 동등 |
| Testcontainers 테스트 | MySQL 컨테이너 사용 가능. | PostgreSQL 컨테이너 사용 가능. | 동등 |

## 4. OMS 요구사항과 DB 영향

| 요구사항 | DB 설계 영향 |
|---|---|
| OIS 엑셀 업로드 배치 | `upload_batches`, `uploaded_files`, `excel_sheet_results` 중심의 트랜잭션 모델 |
| `Scan_upload_*`, `PL_EA`, `PL_Box`, `Label_EA`, `Label_Box` 저장 | 각 입력 목적별 line table 분리 |
| `Scan_upload_군량리` 0건 허용 | line row가 없어도 `excel_sheet_results.data_row_count = 0`으로 정상 기록 |
| PL 기반 주문 조회 | `order_lines`는 원본 주문이 아니라 `pl_lines`에서 재구성한 조회용 요약 |
| 마스터 매칭 | 운영 데이터의 코드가 상품/배송지 마스터에 각각 직접 매칭 |
| CONFIRMED 배치만 외부 API/다운로드 노출 | `upload_batches.status`와 날짜/고객사 조건 인덱스 중요 |
| 문자열 코드 보존 | 주문번호, 거래처코드, 품목코드, 바코드, QR코드는 `varchar` |
| 원본/정규화값 추적 | line table의 원본 row JSON 보조 저장, `validation_errors.original_value`, `normalized_value` |

## 5. 공통 설계 원칙

- MySQL/PostgreSQL 양쪽에서 구현 가능한 표준 RDB 모델을 우선한다.
- 자주 검색하는 값은 JSON에만 넣지 않고 일반 컬럼으로 분리한다.
- PostgreSQL 전용 기능은 선택 기능으로 분리한다.
- 주문번호, 거래처코드, 품목코드, 바코드, QR코드는 `varchar`로 보존한다.
- 업무 날짜(`delivery_date`, `due_date`)와 생성/처리 시각(`created_at`, `uploaded_at`, `confirmed_at`)을 분리한다.
- 금액, 수량, CBM, 박스수량 등 숫자는 `decimal`/`numeric` 계열을 우선 검토한다.
- 원본 엑셀 row number, sheet name, 원본 표시값, 정규화 값을 추적 가능하게 설계한다.
- 운영 기준 timezone은 `Asia/Seoul`을 우선 검토하되, DB 저장 타입과 애플리케이션 변환 정책은 Phase 2 전에 확정한다.
- 1차 MVP의 마스터는 tenant별 현재 데이터를 upsert한다. 업로드마다 전체 마스터 version을 생성하지 않는다.
- 마스터 업로드 파일 단위 이력은 남기되, row 단위 변경 이력은 1차 MVP에서 제외한다.

## 6. MySQL 선택 시 장점과 리스크

### 장점

- 회사 표준이 MySQL이면 운영 경험, 백업, 모니터링, 장애 대응 체계를 재사용할 수 있다.
- 1차 MVP 범위는 표준 테이블, FK, unique, B-Tree index로 구현 가능하다.
- Spring Boot, Kotlin, JPA, Flyway/Liquibase와 연동 사례가 많다.
- 로컬 개발과 Testcontainers 테스트 구성이 단순하다.

### 리스크

- PostgreSQL 대비 JSON 검색, partial index, materialized view 등 고급 최적화 선택지가 제한적이다.
- CHECK 제약, JSON index, window function 지원은 MySQL 버전에 따라 차이가 있으므로 운영 버전 확인이 필요하다.
- 마스터 upsert 기준 unique key는 `product_master_items(tenant_id, ezadmin_code)`, `store_route_master_items(tenant_id, baljugo_code)`를 우선한다.
- collation 정책을 잘못 잡으면 코드성 문자열 비교에서 대소문자/공백 이슈가 생길 수 있다.

## 7. PostgreSQL 선택 시 장점과 리스크

### 장점

- JSONB + GIN index로 원본 row 보조 검색과 검증 오류 분석을 확장하기 쉽다.
- partial index로 `CONFIRMED` 배치, 미해결 오류 조회, 활성 마스터 행 조회를 세밀하게 최적화할 수 있다.
- materialized view로 리포트/대시보드 고도화에 유리하다.
- 데이터 제약과 분석성 SQL 표현력이 좋다.

### 리스크

- 회사 표준이 MySQL이면 운영팀의 신규 학습과 운영 부담이 발생한다.
- MVP 일정에서는 고급 기능의 이점보다 도입 비용이 더 클 수 있다.
- PostgreSQL 전용 기능을 기본 설계로 사용하면 MySQL 전환 가능성이 낮아진다.
- 기존 회사 백업/모니터링/장애 대응 체계와의 호환성 확인이 필요하다.

## 8. 1차 MVP 권장안

1차 MVP 권장 DB는 MySQL이다.

단, 이 권장안은 회사 표준이 MySQL이라는 전제를 둔 선택안이다. 최종 DB 확정 전에는 다음을 확인해야 한다.

- 회사 운영 MySQL 버전
- 운영 표준 collation/charset
- DB 운영팀의 백업/복구/모니터링 표준
- 개발팀 MySQL/PostgreSQL 숙련도
- Flyway 또는 Liquibase 중 회사 표준 migration 도구
- 로컬 개발 DB 방식: Docker Compose 또는 Testcontainers

## 9. Phase 2 진입 전 권장 기본값

아래 값은 최종 확정이 아니라 Phase 2 Backend 기반 구조를 설계하기 위한 권장 기본값이다. 운영 담당자 또는 회사 표준과 충돌하면 회사 표준을 우선한다.

| 항목 | 권장 기본값 | 이유 | 장점 | 단점/리스크 |
|---|---|---|---|---|
| 최종 DB 및 버전 | MySQL 8.4 LTS | 회사 표준이 MySQL이라는 전제와 LTS 계열 운영 안정성을 함께 고려 | 운영 표준 활용, 장기 지원 성격, MVP 기능 충분 | 회사 운영 버전이 MySQL 8.0이면 호환 기준을 낮춰야 할 수 있음 |
| Migration 도구 | Flyway | 현재 필요한 것은 SQL 기반 schema versioning이며 migration 초안도 SQL로 작성되어 있음 | 단순함, 러닝커브 낮음, SQL 리뷰가 쉬움 | 복잡한 rollback/변경 이력 메타는 Liquibase보다 약함 |
| 로컬 개발 DB | Docker Compose | 개발자가 동일한 MySQL 환경을 쉽게 띄울 수 있음 | onboarding 단순, 수동 확인 쉬움 | CI 테스트 격리성은 Testcontainers보다 약함 |
| 통합 테스트 DB | Testcontainers | 테스트마다 격리된 DB를 띄워 재현성을 확보 | CI 안정성, 테스트 독립성 | Docker 의존, 테스트 시간이 늘 수 있음 |
| Persistence | Spring Data JPA | 최종 요구사항과 AGENTS.md에서 JPA 우선 검토로 제시됨 | CRUD/관계/트랜잭션 생산성 좋음 | 대량 insert와 복잡 조회는 bulk/native query 보완 필요 |
| tenant/client seed | 최소 seed 1세트 제공 | 업로드, 마스터, 권한이 모두 tenant/client 전제이므로 개발 초기 데이터가 필요 | 개발/테스트 흐름 단순 | 운영 seed와 개발 seed 분리 필요 |
| 내부 인증 | JWT | React SPA + REST API 구조에 적합 | 프론트/백엔드 분리 쉬움 | 만료/갱신/폐기 정책 필요 |
| 외부 인증 | API Key | 최종 요구사항에서 외부 API 기본 후보로 제시됨 | WOS/PL 연동이 단순함 | 키 만료/회전/폐기 정책 필요 |
| 파일 저장 위치 | 로컬 파일스토리지 추상화 우선 | S3/NAS 확정 전 MVP에서 구현 부담을 낮춤 | 구현 단순, 추후 교체 가능 | 운영 백업/삭제/보관 정책 필요 |
| 업로드 파일 최대 크기 | 100MB 기본값 | XLSM/XLSX 업로드에 충분한 초기 제한값 | 과도한 업로드 방지, 운영 조정 쉬움 | 실제 파일이 더 크면 상향 필요 |
| Warning 확정 정책 | Warning이 있어도 확정 허용 | 요구사항은 Error가 있으면 확정 불가라고 명시함 | 운영 유연성 확보 | Warning 방치 위험. 확정 시 warning count와 audit 기록 필요 |
| `Label_EA` 품목코드 예외 | 우선 Warning | 최종 요구사항에서 소분/가상 상품 가능성과 확인 필요가 제시됨 | 실제 운영 데이터 수용 가능 | 예외 남용 시 상품 매칭 품질 저하 |
| 차량명 불일치 등급 | 우선 Warning | 차량명은 운영 변동 가능성이 있고 차수별 기능은 추후 구현 | 업로드 차단 감소 | 배송 오류 영향이 크면 Error 승격 필요 |
| 대표 배송일 기준 | PL/Label `due_date` 우선, Scan `delivery_date`는 원본 보존 | `order_lines`가 PL 기반이고 조회/라벨 흐름은 납기요청일 중심 | 주문/PL/Label 기준 일관성 | Scan 배송일과 불일치하면 검증 정책 필요 |

## 10. PostgreSQL을 선택하는 조건

다음 조건이 확인되면 PostgreSQL을 1차 또는 조기 전환 후보로 재검토한다.

- 운영팀이 PostgreSQL 운영을 지원할 수 있다.
- 원본 row JSON 검색, 오류 리포트, 대시보드, 분석성 쿼리가 MVP 초기부터 핵심 요구가 된다.
- partial index/materialized view를 활용한 조회 최적화가 일정상 필요하다.
- MySQL 회사 표준이 강제 사항이 아니거나 신규 서비스는 PostgreSQL 허용 정책이 있다.

## 11. 결론

- 현재 리뷰안: MySQL을 1차 MVP 기본 후보로 둔다.
- PostgreSQL은 확장성 비교안으로 유지한다.
- Phase 2 기본 구현안은 MySQL 8.4 LTS, Flyway, Docker Compose, Testcontainers, Spring Data JPA, 내부 JWT, 외부 API Key를 기준으로 검토한다.
- 실제 스키마는 표준 RDB 중심으로 설계하고, DB별 전용 기능은 선택 기능으로 분리한다.
- DB 최종 확정은 Phase 2 Backend 기반 구조 구현 전에 완료해야 한다.
