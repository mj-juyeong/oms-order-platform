# DB 선택 판단 문서

## 1. DB 선택 배경

OMS의 1차 MVP 핵심 범위는 OIS 엑셀 업로드, `Scan_upload_*`/PL/Label 저장, 상품 마스터 및 배송지/차량 마스터 매칭, 검증, 조회, 외부 API, 엑셀 다운로드다. 이 범위는 표준 RDB 모델과 일반 인덱스, 트랜잭션, 페이징 조회로 구현 가능하다.

따라서 DB 선택은 특정 DB의 고급 기능보다 회사 운영 경험, 개발/운영 인력 숙련도, 장애 대응 능력, 배포 인프라, 백업/복구 체계를 우선 고려한다.

## 2. 전제

- 회사는 현재 MySQL을 사용 중이다.
- DB는 아직 최종 확정하지 않는다.
- PostgreSQL로 단정하지 않는다.
- 1차 MVP는 MySQL을 기본 후보로 검토한다.
- PostgreSQL은 향후 확장성 비교안으로 함께 검토한다.

## 3. MySQL 사용 시 장점

- 회사의 기존 운영 경험과 인프라를 활용할 수 있다.
- 운영자와 개발자가 익숙한 백업, 모니터링, 장애 대응 체계를 사용할 가능성이 높다.
- 1차 MVP 범위인 업로드, 저장, 검증, 조회, API, 다운로드는 MySQL로 충분히 구현 가능하다.
- Spring Boot, Kotlin, JPA, Flyway/Liquibase와 안정적으로 연동된다.
- 표준 RDB 테이블, 일반 B-Tree index, FK, unique 제약으로 주요 요구사항을 충족할 수 있다.

## 4. MySQL 사용 시 리스크

- PostgreSQL 대비 JSON 검색, 복잡한 조건 검색, 부분 인덱스, materialized view 등에서 선택지가 제한될 수 있다.
- 대규모 검증 리포트나 유연한 원본 row 검색 요구가 커지면 설계 보완이 필요할 수 있다.
- MySQL 버전에 따라 CHECK 제약, JSON index, window function 지원 수준이 다르므로 운영 버전 확인이 필요하다.
- 문자열 collation 정책을 잘못 잡으면 코드성 값 비교에서 의도치 않은 대소문자/공백 문제가 발생할 수 있다.

## 5. PostgreSQL 사용 시 장점

- JSONB, GIN index를 활용하면 원본 row 보조 검색과 유연한 검증 조건 검색에 강점이 있다.
- partial index, expression index, materialized view 등 복잡한 조회 최적화 선택지가 많다.
- 데이터 정합성 제약과 분석성 SQL 표현력이 강하다.
- 향후 리포트 고도화, 대시보드, 오류 유형 분석, 마스터 변경 영향 분석에 유리할 수 있다.

## 6. PostgreSQL 사용 시 리스크

- 회사의 현재 운영 표준이 MySQL이면 신규 운영 부담이 생긴다.
- 운영팀의 백업, 복구, 모니터링, 장애 대응 경험이 부족할 수 있다.
- 단기간 MVP에서는 PostgreSQL 고급 기능의 이점보다 도입 비용이 더 클 수 있다.
- PostgreSQL 전용 기능을 기본 설계에 넣으면 MySQL 전환 가능성이 낮아진다.

## 7. OMS 요구사항과 DB 요구사항의 관계

| 요구사항 | DB 관점 |
|---|---|
| 엑셀 업로드 배치 관리 | 트랜잭션, 상태 컬럼, 파일 메타 테이블로 구현 가능 |
| Scan/PL/Label 저장 | 표준 line table 구조로 구현 가능 |
| 마스터 매칭 | 코드 컬럼과 version_id 기반 index join으로 구현 가능 |
| 검증 오류 관리 | validation_errors 테이블과 severity/index로 구현 가능 |
| 차수별 조회 | 현재 개념이 명확하지 않으므로 1차 MVP 필수 구현에서 제외한다. 필요 컬럼은 보존하되 조회/다운로드 설계는 추후 확정한다. |
| 외부 API | CONFIRMED batch index와 조건 검색으로 구현 가능 |
| 다운로드 | 조회 결과 기반 파일 생성, download_logs 저장 |
| 원본 row 보존 | JSON 보조 컬럼 또는 raw text 컬럼으로 구현 가능 |

## 8. 1차 MVP 기준 추천안

1차 MVP 기준 추천안은 MySQL이다.

이유:

- 현재 회사가 MySQL을 사용 중이라는 운영 현실이 중요하다.
- MVP 핵심 범위는 MySQL의 표준 기능으로 충분히 구현 가능하다.
- DB 설계를 MySQL/PostgreSQL 공통 RDB 구조로 잡으면 향후 PostgreSQL 검토 여지를 유지할 수 있다.
- PostgreSQL 고급 기능은 1차 MVP 필수 조건이 아니라 향후 고도화 선택지에 가깝다.

## 9. 향후 PostgreSQL로 가는 경우 고려할 점

- JSONB에 원본 row를 저장하고 GIN index로 유연 검색을 제공할지 검토한다.
- 검증 오류 대시보드용 materialized view를 검토한다.
- partial index로 CONFIRMED 배치, active master version, unresolved validation error 조회를 최적화할 수 있다.
- MySQL 호환성을 유지할지, PostgreSQL 전용 최적화를 허용할지 의사결정이 필요하다.
- migration 전략과 데이터 이관 검증 절차를 별도로 설계해야 한다.

## 10. MySQL로 구현할 때 주의할 점

- 코드성 값은 `VARCHAR`로 저장한다.
- 주문번호, 거래처코드, 품목코드, 바코드, QR코드는 숫자 타입으로 저장하지 않는다.
- 자주 검색하는 값은 JSON 내부에만 두지 말고 일반 컬럼으로 분리한다.
- collation은 코드 비교 정책을 고려해 정한다.
- 대용량 업로드를 고려해 batch_id, delivery_date, product_code, store_code, barcode, qr_code, status에 인덱스를 둔다.
- MySQL 버전에 따른 JSON, CHECK, window function 지원 수준을 확인한다.
- TEXT/JSON 컬럼에는 과도한 검색 의존을 만들지 않는다.

## 11. 최종 결론

1차 MVP는 MySQL을 현실적인 기본안으로 추천한다. 다만 DB 설계는 MySQL과 PostgreSQL 모두에서 무리 없이 구현 가능한 표준 RDB 구조를 우선하고, PostgreSQL 전용 기능은 향후 고도화 선택 기능으로 분리한다.
