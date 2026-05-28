# OMS 구현 계획

이 문서는 OMS를 단계별로 구현하기 위한 실행 계획이다. 현재 단계의 목적은 대규모 기능 구현이 아니라, Codex와 개발자가 같은 기준으로 움직일 수 있는 구현 순서를 정의하는 것이다.

## Phase 0: 프로젝트 초기 세팅

| 항목 | 내용 |
|---|---|
| 목표 | Backend/Frontend 프로젝트 골격과 공통 개발 규칙을 준비한다. |
| 작업 목록 | Repository 구조 생성, Spring Boot Kotlin 초기화, Vite React TypeScript 초기화, Tailwind 설정, 공통 lint/format 정책 정의, 환경변수 샘플 작성, 기본 README 정리 |
| 완료 기준 | Backend와 Frontend가 로컬에서 기동 가능한 상태이며, 기본 health check와 기본 라우트가 동작한다. |
| 산출물 | `backend/`, `frontend/`, 환경변수 샘플, 개발 실행 가이드 |
| 우선순위 | P0 |
| 선행 조건 | 최종 요구사항 문서 확인 |
| 확인 필요 사항 | 패키지명, 회사 표준 코드 스타일, 로컬 개발 DB 방식 |

## Phase 1: DB 선택 및 데이터 모델 설계

| 항목 | 내용 |
|---|---|
| 목표 | MySQL과 PostgreSQL을 비교하고 1차 MVP 기준 DB 후보 및 공통 RDB 모델을 확정한다. |
| 작업 목록 | DB 선택 기준 정리, MySQL/PostgreSQL 비교, tenant/client 스코프 설계, 물류사 기준 마스터 upsert 설계, 핵심 테이블 설계, 인덱스 초안 작성, 마이그레이션 도구 검토, 문자열 코드 타입 정책 확정 |
| 완료 기준 | DB 선택안과 테이블 설계 초안이 리뷰 가능하며, DB 전용 기능이 선택 기능으로 분리되어 있다. |
| 산출물 | `DB_DECISION.md`, `DB_DESIGN_PROPOSAL.md`, migration 초안 |
| 우선순위 | P0 |
| 선행 조건 | 요구사항 문서, 마스터 데이터 구조 확인 |
| 확인 필요 사항 | 회사 운영 DB 버전, MySQL 사용 표준, migration 도구 표준, 고객사별 코드 매핑 필요 여부 |

## Phase 2: Backend 기반 구조

| 항목 | 내용 |
|---|---|
| 목표 | API, 예외, 보안, JPA, 파일 저장, 감사 로그의 공통 기반을 구축한다. |
| 작업 목록 | 공통 응답 포맷, 공통 예외 처리, requestId, 인증/인가 뼈대, 사용자 스코프(SYSTEM/TENANT/CLIENT) 설계 반영, JPA 설정, transaction 정책, 파일 저장 인터페이스, audit logging 인터페이스 구현 |
| 완료 기준 | 샘플 API가 공통 응답/예외/로그 정책을 적용해 동작한다. |
| 산출물 | Backend common module, auth skeleton, audit skeleton, integration test 기본 설정 |
| 우선순위 | P0 |
| 선행 조건 | Phase 0, Phase 1 |
| 확인 필요 사항 | JWT/Session 선택, API Key 저장 정책, 파일 저장 위치, SYSTEM 관리자 tenant 선택 정책, CLIENT 사용자 로그인 제공 여부 |

## Phase 3: Frontend 기반 구조

| 항목 | 내용 |
|---|---|
| 목표 | 운영 화면을 빠르게 추가할 수 있는 React 기반 구조를 만든다. |
| 작업 목록 | 라우팅, Layout, Sidebar/Header, API client, TanStack Query 설정, 공통 Table/Badge/Button/Input, 인증 라우트, 에러 화면 구성 |
| 완료 기준 | 로그인 더미 흐름, 배치 목록 더미 화면, 공통 Table이 동작한다. |
| 산출물 | Frontend app shell, 공통 컴포넌트, API 타입 구조 |
| 우선순위 | P0 |
| 선행 조건 | Phase 0 |
| 확인 필요 사항 | UI 디자인 기준, 권한별 메뉴, 사내 UI 가이드 존재 여부 |

## Phase 4: 파일 업로드 / 엑셀 파싱 / 배치 관리

| 항목 | 내용 |
|---|---|
| 목표 | OIS 입력 엑셀을 업로드하고 `Scan_upload_*`, `PL_EA`, `PL_Box`, `Label_EA`, `Label_Box` 데이터를 DB에 저장한다. |
| 작업 목록 | Multipart upload API, uploaded file metadata, batch 생성, Apache POI parser, sheet detector, column mapper, raw/normalized value 보존, sheet result 저장, batch status 관리 |
| 완료 기준 | 기준 XLSM 파일을 업로드하면 배치가 생성되고 각 시트 행 수와 저장 결과가 조회된다. |
| 산출물 | Upload API, Excel parser, `scan_lines`, `pl_lines`, `label_lines`, `excel_sheet_results` 저장 로직 |
| 우선순위 | P0 |
| 선행 조건 | Phase 1, Phase 2 |
| 확인 필요 사항 | 업로드 파일 최대 크기, 보관 기간, 숨김 시트 처리 범위 |

## Phase 5: 마스터 데이터 관리

| 항목 | 내용 |
|---|---|
| 목표 | 상품 마스터와 배송지/차량 마스터를 업로드하면 tenant별 현재 마스터에 추가/수정 upsert하고 조회할 수 있게 한다. |
| 작업 목록 | 상품 CSV parser, Link_Area XLSX parser, tenant 기준 master upsert, 중복 키 검증, 업로드 이력 요약 저장, 직접 매칭 검증 기준 정리, 조회 API, Frontend 업로드/조회 화면 |
| 완료 기준 | 상품 마스터와 배송지/차량 마스터를 업로드하면 신규 코드는 추가되고 기존 코드는 수정되며, 업로드 파일별 추가/수정/변경없음/실패 건수가 확인된다. |
| 산출물 | Master upload/upsert API, master upload history API, master 조회 화면 |
| 우선순위 | P0 |
| 선행 조건 | Phase 2, Phase 3 |
| 확인 필요 사항 | 마스터 컬럼 최종명, 운영여부 값 체계, 화면 직접 수정 포함 여부 |

## Phase 6: 검증 / 예외 / 배치 확정

| 항목 | 내용 |
|---|---|
| 목표 | 업로드 데이터와 마스터를 검증하고 Error가 없는 배치만 확정한다. |
| 작업 목록 | 필수값 검증, 날짜/수량 검증, 중복 barcode/QR 검증, 상품 마스터 매칭, 배송지/차량 마스터 매칭, 차량/차수/온도 Warning, validation_errors 저장, 재검증, confirm/cancel/rollback |
| 완료 기준 | Error가 있으면 확정이 차단되고, Warning/Info는 정책에 따라 표시된다. |
| 산출물 | Validation engine, validation result screen, batch confirm API |
| 우선순위 | P0 |
| 선행 조건 | Phase 4, Phase 5 |
| 확인 필요 사항 | Warning 확정 허용 여부, 차량명 불일치 등급, Label_EA 품목코드 예외 정책 |

## Phase 7: 조회 / API / 다운로드

| 항목 | 내용 |
|---|---|
| 목표 | 확정된 주문/PL/Label/Scan 데이터를 조회, 외부 API 제공, 라벨 엑셀 다운로드를 제공한다. |
| 작업 목록 | PL 기반 `order_lines` 생성, 주문 조회, Scan 조회, PL 조회, Label 조회, WOS Scan API, PL API, 라벨 다운로드, 다운로드 로그 |
| 완료 기준 | CONFIRMED 배치만 외부 API와 다운로드 대상으로 노출된다. 차수별 주문 조회와 차수별 다운로드는 구현하지 않고 추후 구현 항목으로 남긴다. |
| 산출물 | Order/Scan/PL/Label API, label download API, 조회 화면 |
| 우선순위 | P0 |
| 선행 조건 | Phase 6 |
| 확인 필요 사항 | 라벨 다운로드 컬럼 순서, 외부 API 최신 배치 선택 정책 |

## Phase 8: 권한 / 로그 / 운영 안정화

| 항목 | 내용 |
|---|---|
| 목표 | 운영 환경에서 추적 가능하고 안전하게 사용할 수 있도록 권한과 로그를 강화한다. |
| 작업 목록 | 사용자/역할 관리, SYSTEM/TENANT/CLIENT 사용자 스코프 정책 구현, API Key 관리, batch audit log, API call log, download log, 권한별 메뉴, 관리자 롤백, 성능 튜닝, 대용량 페이징 |
| 완료 기준 | 주요 작업 이력이 남고 권한 없는 사용자가 주요 기능에 접근할 수 없다. |
| 산출물 | User/Role/API Key API, audit screen, 운영 로그 조회 |
| 우선순위 | P1 |
| 선행 조건 | Phase 7 |
| 확인 필요 사항 | 역할 체계, API Key 만료/회전 정책, 로그 보관 기간 |

## Phase 9: 추가 기능 및 고도화

| 항목 | 내용 |
|---|---|
| 목표 | 운영 효율을 높이는 확장 기능을 단계적으로 추가한다. |
| 작업 목록 | 차수별 주문 조회 및 다운로드 개념 확정, 차수별 대시보드, 고객사별 템플릿 관리, 원본/정규화 비교 화면, 마스터 변경 영향 분석, SLA 알림, API 재처리 큐, 오류 리포트, OIS 직접 API 연동 검토 |
| 완료 기준 | MVP 운영 이후 실제 반복 업무 병목을 줄이는 기능이 우선순위에 따라 반영된다. |
| 산출물 | 고도화 backlog, 리포트/대시보드, 자동화 설계 |
| 우선순위 | P2/P3 |
| 선행 조건 | MVP 운영 피드백 |
| 확인 필요 사항 | 차수의 업무 정의, 차수별 조회 기준 데이터, 차수별 다운로드 포맷, 운영 KPI, 고객사별 변형 가능성, 외부 시스템 연동 일정 |
