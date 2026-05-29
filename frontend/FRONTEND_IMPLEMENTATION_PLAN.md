# Frontend Implementation Plan

- 작성일: 2026-05-28
- 목적: OMS Admin/Backoffice 프론트엔드 구현 시 참고할 실행 계획
- 범위: 구현 계획 문서 작성만 포함한다. React 코드, 라우팅, CSS, Tailwind 설정, API 코드는 이 문서 작성 단계에서 수정하지 않는다.
- 기준: 실제 구현은 현재 `frontend/src` 구조, React, TypeScript, Tailwind CSS, React Router 기반을 우선한다.

## 1. 구현 목표

OMS 프론트엔드의 목표는 물류 운영자가 OIS 엑셀 업로드부터 검증, 배치 확정, 조회, API 제공 상태 확인, 라벨 다운로드까지 처리할 수 있는 Admin/Backoffice 업무 화면을 구현하는 것이다.

이 제품은 마케팅 페이지가 아니라 물류 운영자용 실무 시스템이다. 따라서 화면 구현의 핵심은 예쁜 장식보다 다음 항목이다.

- 대량 테이블의 가독성
- 빠른 필터링과 정렬
- 배치 상태와 검증 상태의 즉시 인지
- Error, Warning, Info 구분
- 업로드, 파싱, 검증, 확정, 외부 제공, 다운로드 흐름의 명확한 표시
- 주문번호, 거래처코드, 품목코드, 바코드, QR코드 같은 문자열 코드의 안전한 표시와 복사

MVP 구현 범위는 다음 화면을 포함한다.

- 로그인
- 대시보드
- OIS 엑셀 업로드
- 배치 목록
- 배치 상세
- 검증 결과
- 주문 조회
- Scan 조회
- PL 조회
- Label 조회
- API 제공 현황
- 라벨 다운로드
- 상품 마스터
- 배송지/차량 마스터
- 이력/로그 조회

현재 repo에는 위 화면의 라우트와 skeleton 페이지가 이미 존재한다. 이후 구현은 기존 파일을 기준으로 확장하되, Stitch HTML의 DOM 구조나 Tailwind class를 직접 복사하지 않는다.

## 2. 구현 기준 문서 우선순위

요구사항과 디자인 참고 자료가 충돌할 경우 아래 순서를 따른다.

| 우선순위 | 기준 문서/자료 | 사용 방식 |
|---|---|---|
| 1 | `AGENTS.md` | 프로젝트 최상위 규칙, 금지사항, 도메인 정의 |
| 2 | `docs/OMS_개발팀_전달용_최종요구사항_Codex_대화반영_최종.md` | 업무 요구사항의 최상위 기준 |
| 3 | `docs/UI_DESIGN_BRIEF.md` | UI/UX 원칙, 화면 목록, 컴포넌트 기준 |
| 4 | `docs/DESIGN_HANDOFF_PAGE_MAPPING.md` | `design-handoff/stitch_oms` 폴더명과 실제 OMS 화면 매핑 |
| 5 | `design-handoff/stitch/STITCH_DESIGN_REVIEW.md` | Stitch 시안에서 유지/수정해야 할 UX 체크리스트 |
| 6 | `design-handoff/stitch_oms/screenshots/*`, `design-handoff/stitch_oms/*/code.html` | 레이아웃, 정보 배치, 밀도, 톤 참고용 |
| 7 | `docs/API_DESIGN_DRAFT.md` | API 경로, 권한, 응답 필드 예상 기준 |
| 8 | `docs/ERD_DESIGN.md` | 화면에 노출할 데이터 관계와 도메인 구조 확인 |
| 9 | `docs/IMPLEMENTATION_PLAN.md` | 전체 프로젝트 단계와 선후관계 확인 |

Stitch 산출물은 production 코드가 아니다. 실제 구현에서는 현재 `frontend/src/components`, `frontend/src/pages`, `frontend/src/routes`, `frontend/src/types`, `frontend/src/api` 구조를 우선한다.
페이지 구현 또는 디자인 반영 작업 전에는 `docs/DESIGN_HANDOFF_PAGE_MAPPING.md`에서 해당 화면의 디자인 폴더를 먼저 확인한다.

## 3. 화면 구현 우선순위

| Phase | 범위 | 목표 | 완료 기준 |
|---|---|---|---|
| Phase 1 | 공통 Layout / Sidebar / Header / Breadcrumb | 모든 화면이 같은 App shell 안에서 일관되게 보이도록 정리 | 메뉴, header, breadcrumb, page title, 권한 placeholder가 일관됨 |
| Phase 2 | OIS 엑셀 업로드 | 파일 업로드, 시트 인식 결과, 검증 실행 동선 구현 | 업로드 전/선택/완료/검증 대기 상태가 명확히 분리됨 |
| Phase 3 | 배치 목록 | 대량 배치 조회와 필터 UX 구현 | 상태, E/W/I, API/라벨 가능 여부가 표에서 보임 |
| Phase 4 | 배치 상세 | 배치 상태 흐름과 액션 정책 구현 | Error, 검증 대기, 확정 완료 상태별 버튼 정책이 맞음 |
| Phase 5 | 검증 결과 | Error 중심 검증 상세 확인 UX 구현 | Error 기본 필터, RawValueDrawer, 원본/정규화값 비교가 가능함 |
| Phase 6 | 대시보드 | 오늘 막힌 업무와 운영 지표 요약 구현 | Error/Warning, 확정 대기, 외부 제공 제외, 마스터 상태가 보임 |
| Phase 7 | 주문 조회 | PL 기반 OMS 주문 요약 조회 구현 | 원본 주문 생성/수정처럼 보이지 않음 |
| Phase 8 | Scan / PL / Label 조회 | 저장된 원천 데이터 조회 화면 구현 | 코드성 값이 CodeCell로 표시되고 EA/BOX, Scan suffix가 보존됨 |
| Phase 9 | API 제공 현황 | WOS/PL 외부 API 제공 가능 상태 관제 | WOS는 Scan, PL은 PL_EA/PL_Box 기준으로 CONFIRMED 배치만 제공 가능함이 보임 |
| Phase 10 | 상품 마스터 | 현재 상품 마스터 조회와 CSV upsert 업로드 구현 | 버전 활성화가 아닌 upsert 요약/이력 중심 |
| Phase 11 | 배송지/차량 마스터 | 현재 배송지/차량 마스터 조회와 XLSX upsert 업로드 구현 | 상품 마스터와 별도 화면으로 유지 |
| Phase 12 | 라벨 다운로드 | 확정 배치만 다운로드 가능한 UX 구현 | 미확정 배치 다운로드 불가 사유가 명확함 |
| Phase 13 | 이력/로그 조회 | 배치, 다운로드, 외부 API 호출 로그 조회 구현 | requestId, actor, action, 상태 전후가 추적 가능함 |

Phase 1과 Phase 2를 먼저 작게 완료한 뒤 같은 패턴으로 목록형 화면을 확장하는 것을 권장한다.

## 4. 공통 컴포넌트 계획

| 컴포넌트 | 목적 | 주요 props 초안 | 사용 화면 | 주의사항 |
|---|---|---|---|---|
| `AppLayout` | 전체 앱 shell 구성 | `children`, `sidebar`, `header`, `breadcrumb` | 인증 후 전체 화면 | 기존 `AppShell`이 있으면 명칭을 유지하거나 alias 없이 하나로 정리 |
| `Sidebar` | 주요 메뉴와 active 상태 표시 | `items`, `currentPath`, `userRoles` | 전체 | 실제 OMS 메뉴 구조와 권한 기준을 반영 |
| `Header` | 사용자, tenant/client context, 알림 표시 | `user`, `tenant`, `client`, `onLogout` | 전체 | 전역 검색은 MVP에서 범위를 명확히 하거나 보류 |
| `Breadcrumb` | 깊은 화면의 위치 표시 | `items` | 배치 상세, 검증 결과, 로그 상세 | 목록 화면은 과하게 깊게 만들지 않음 |
| `PageHeader` | 화면 제목, 설명, primary action | `title`, `description`, `actions`, `notice` | 전체 | 각 화면의 핵심 액션은 하나만 primary로 둠 |
| `FilterBar` | 목록 필터 입력 영역 | `fields`, `values`, `onChange`, `onSubmit`, `onReset` | 목록형 화면 전체 | 자주 쓰는 필터만 기본 노출, 고급 필터는 후속 |
| `DataTable` | 대량 데이터 표 | `columns`, `rows`, `pagination`, `sort`, `density`, `onRowClick` | 목록형 화면 전체 | 고정 헤더, 가로 스크롤, 빈/오류/로딩 상태 필수 |
| `StatusBadge` | 배치/다운로드/API 상태 표시 | `status`, `label`, `size`, `tone` | 배치, 다운로드, 로그 | 상태와 검증 등급을 같은 컴포넌트로 섞지 않음 |
| `SeverityBadge` | Error/Warning/Info 표시 | `severity`, `label`, `count`, `size` | 검증 결과, 배치 상세, 대시보드 | 색상뿐 아니라 텍스트 라벨 필수 |
| `CodeCell` | 코드성 문자열 표시와 복사 | `value`, `copyable`, `truncate`, `label`, `emptyText` | 주문, Scan, PL, Label, 마스터, 검증 결과 | 숫자 변환 금지, 전체값 확인과 복사 동선 제공 |
| `FileUploadDropzone` | 파일 선택/드롭 | `accept`, `maxSizeMb`, `file`, `status`, `onSelect`, `onRemove` | OIS 업로드, 마스터 업로드 | OIS는 XLSM/XLSX, 상품 마스터는 CSV, 배송지/차량은 XLSX |
| `SheetParsingResultTable` | 시트 인식 결과 표시 | `sheets`, `showValidationStatus`, `onRowClick` | OIS 업로드, 배치 상세 | `Scan_upload_*`와 0건 정상 시트 표시 |
| `ValidationSummaryPanel` | E/W/I 요약과 확정 가능 여부 | `errorCount`, `warningCount`, `infoCount`, `canConfirm`, `onFilter` | 배치 상세, 검증 결과 | Error 1건 이상이면 확정 불가를 명확히 표시 |
| `ValidationErrorPanel` | 오류 목록 또는 요약 패널 | `items`, `severity`, `onSelect` | 배치 상세, 검증 결과 | 실제 수정 기능처럼 보이지 않게 주의 |
| `RawValueDrawer` | 원본값/정규화값/마스터 매칭 확인 | `open`, `item`, `rawRow`, `normalizedValues`, `masterMatch`, `onClose` | 검증 결과, 조회 상세 | Drawer focus trap과 닫기 버튼 필요 |
| `ConfirmActionModal` | 확정/취소/롤백/다운로드 확인 | `open`, `actionType`, `title`, `message`, `onConfirm`, `onCancel` | 배치 상세, 라벨 다운로드, 마스터 업로드 | 위험 작업은 명확한 문구와 권한 확인 필요 |
| `Toast` / `Alert` | 일시/고정 피드백 | `type`, `title`, `message`, `actions` | 전체 | Alert는 화면 상태, Toast는 작업 결과에 사용 |
| `DownloadButton` | 다운로드 가능 여부와 실행 | `available`, `reason`, `downloadType`, `onDownload`, `loading` | 라벨 다운로드, 로그 | disabled 사유를 텍스트로 제공 |
| `MasterUploadPanel` | 마스터 파일 업로드 영역 | `masterType`, `accept`, `lastUpload`, `onUpload` | 상품 마스터, 배송지/차량 마스터 | 버전 선택/활성화 UI를 만들지 않음 |
| `MasterUploadResultSummary` | upsert 결과 요약 | `insertedCount`, `updatedCount`, `unchangedCount`, `failedCount`, `status` | 마스터 화면 | inserted/updated/unchanged/failed 용어 통일 |
| `UploadHistoryTable` | 파일 단위 업로드 이력 | `items`, `pagination`, `onRowClick` | 마스터 화면, OIS 업로드 이력 | row 단위 변경 이력은 MVP 제외 |

현재 repo에는 `MasterVersionSelector`가 존재한다. 최신 요구사항과 맞지 않으므로 이후 구현에서는 버전 선택 컴포넌트로 확장하지 말고, `MasterUploadPanel`, `MasterUploadResultSummary`, `CurrentMasterCriteriaPanel` 계열로 대체하는 방향이 맞다.

## 5. OMS 업무 규칙 반영 계획

| 업무 규칙 | 구현 반영 방식 |
|---|---|
| `Scan_upload_*`는 정식 입력 시트 | OIS 업로드와 배치 상세에서 시트 유형 `Scan`으로 정상 표시 |
| `Scan_upload_군량리` 같은 0건 시트는 정상 | `dataRowCount = 0`이어도 `정상`, `0건 정상 시트` 문구 표시 |
| Error 1건 이상이면 배치 확정 disabled | `BatchActionBar`에서 `errorCount > 0`이면 `배치 확정` disabled 및 사유 표시 |
| 검증 대기 상태에서는 배치 확정 불가 | `VALIDATION_PENDING` 또는 `PARSED` 상태에서는 primary action을 `검증 실행`으로 표시 |
| 확정되지 않은 배치는 API 제공/라벨 다운로드 불가 | 목록, 상세, 라벨 다운로드 화면에 `불가` 상태와 사유 표시 |
| 코드성 값은 문자열 유지 및 복사 가능 | 주문번호, 거래처코드, 품목코드, 바코드, QR코드에 `CodeCell` 사용 |
| Error/Warning/Info는 색상과 텍스트 병기 | `SeverityBadge`는 라벨 텍스트를 필수로 받음 |
| 주문 조회는 PL 기반 요약 조회 | 화면 제목/설명/액션에서 원본 주문 생성/수정 제거 |
| 차수별 조회/다운로드는 MVP 핵심 아님 | 차량/차수/권역은 컬럼으로 보존하되 전용 CTA/메뉴는 만들지 않음 |
| 상품 마스터와 배송지/차량 마스터는 별도 화면 | `/masters/products`, `/masters/store-routes`를 별도 route와 page로 유지 |

## 6. 화면별 구현 메모

### 6.1 로그인

| 항목 | 내용 |
|---|---|
| 목적 | OMS 내부 사용자 인증 |
| 주요 UI 영역 | 로그인 카드, 아이디 입력, 비밀번호 입력, 로그인 버튼, 오류 메시지 |
| 주요 액션 | 로그인, 비밀번호 표시 전환 |
| 상태별 정책 | 입력 전 로그인 disabled 가능, 인증 실패 시 오류 표시, 세션 만료 시 재로그인 안내 |
| 주요 테이블 컬럼 | 없음 |
| 빈 상태 | 첫 접속 시 로그인 폼만 표시 |
| 오류 상태 | `INVALID_CREDENTIALS`, `USER_DISABLED`, `UNAUTHORIZED` |
| API 연동 예상 지점 | `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout` |
| Stitch 참고 | 차분한 Admin 톤 |
| Stitch 그대로 금지 | 과한 홍보성 hero나 불필요한 이미지 중심 구성 |

### 6.2 대시보드

| 항목 | 내용 |
|---|---|
| 목적 | 오늘 막힌 업무와 운영 지표를 빠르게 파악 |
| 주요 UI 영역 | MetricCard grid, Error Type TOP 5, 최근 배치, 확정 대기, API 상태, 최근 다운로드 |
| 주요 액션 | OIS 업로드 이동, 배치 상세 이동, 검증 결과 이동 |
| 상태별 정책 | Error 배치 클릭 시 Error 필터가 적용된 검증 결과로 이동 |
| 주요 테이블 컬럼 | 배치번호, 고객사, 배송일, 상태, E/W/I, 업로드시각, 확정시각 |
| 빈 상태 | 오늘 업로드 배치 없음, 업로드 화면 진입 제공 |
| 오류 상태 | 집계 조회 실패, 권한 없음 |
| API 연동 예상 지점 | 배치 목록, 검증 집계, 다운로드 로그, API 상태 |
| Stitch 참고 | Error/Warning 중심 지표, 외부 제공 제외, API 제공 가능 카드 |
| Stitch 그대로 금지 | 하단 패널이 잘리는 구성, 범위가 모호한 전역 검색 강조 |

### 6.3 OIS 엑셀 업로드

| 항목 | 내용 |
|---|---|
| 목적 | OIS XLSM/XLSX 파일 업로드, 시트 인식, 검증 실행 진입 |
| 주요 UI 영역 | UploadStepIndicator, FileUploadDropzone, CurrentMasterCriteriaPanel, SheetParsingResultTable, RecentUploadList |
| 주요 액션 | 파일 선택, 업로드 시작, 검증 실행, 배치 상세 이동 |
| 상태별 정책 | 업로드 전 `파일 선택`, 파일 선택 후 `업로드 시작`, 파싱 완료 후 `검증 실행`, 검증 대기에서 `배치 확정` 숨김/disabled |
| 주요 테이블 컬럼 | 시트명, 시트유형, suffix, 데이터 행 수, 파싱 상태, 검증 상태, 메시지 |
| 빈 상태 | 파일 드롭존과 업로드 전 안내 |
| 오류 상태 | 확장자 오류, 파일 크기 초과, 필수 시트 없음, 파싱 실패, 현재 마스터 없음 |
| API 연동 예상 지점 | `POST /api/v1/order-excel-batches`, `POST /api/v1/order-excel-batches/{batchId}/validate`, 배치 상세 조회 |
| Stitch 참고 | `파일 선택 -> 시트 인식 -> 검증 대기` 흐름, 0건 정상 시트 표현 |
| Stitch 그대로 금지 | 업로드 완료 Alert와 업로드 시작 버튼이 동시에 활성처럼 보이는 상태 혼합 |

### 6.4 배치 목록

| 항목 | 내용 |
|---|---|
| 목적 | OIS 업로드 배치의 상태와 후속 처리 가능 여부 조회 |
| 주요 UI 영역 | PageHeader, collapsed BatchFilterPanel, BatchList, Pagination |
| 주요 액션 | 새 업로드, 배치 상세, 검증 결과 보기 |
| 상태별 정책 | 목록은 상태와 다음 작업 중심으로 표시하고, API 제공/라벨 다운로드 가능 여부는 배치 상세와 라벨 다운로드 화면에서 확인 |
| 주요 목록 정보 | 배치번호+원본 파일명, 고객사+배송일/납기일, 상태+E/W/I, 다음 작업, 업로드자+업로드시각, 확정시각 |
| 빈 상태 | 검색 결과 없음, 필터 초기화 제공 |
| 오류 상태 | 목록 조회 실패, 권한 없음 |
| API 연동 예상 지점 | `GET /api/v1/order-excel-batches` |
| Stitch 참고 | 필터 카드, 상태 chip, pagination, density 선택. 필터는 기본 접힘 상태로 두고 필요 시 펼침 |
| Stitch 그대로 금지 | 의미가 불분명한 `엑셀 다운로드` 버튼, OIS 목록에 CSV 파일명 예시 |

### 6.5 배치 상세

| 항목 | 내용 |
|---|---|
| 목적 | 특정 배치의 처리 상태, 시트별 결과, 검증 요약, 후속 액션 확인 |
| 주요 UI 영역 | BatchDetailHeader, BatchActionBar, BatchProgressTimeline, BatchMetaGrid, SheetResultSummaryTable, Warning/Error panels |
| 주요 액션 | 검증 실행/재검증, 배치 확정, 검증 결과 보기, 라벨 다운로드, API 상태 보기, 취소, 롤백 |
| 상태별 정책 | Error 있음 `배치 확정` disabled, 검증 대기 `검증 실행`, 확정 완료 `라벨 다운로드`와 `API 제공 상태 보기` 우선 |
| 주요 테이블 컬럼 | 시트명, 시트유형, suffix, 총 행, 정상, Warning, Error, 상태 |
| 빈 상태 | 파싱 결과 없음, 검증 결과 없음 |
| 오류 상태 | Error 존재, 파싱 실패, 검증 실패, 취소/롤백/실패 상태 |
| API 연동 예상 지점 | `GET /api/v1/order-excel-batches/{batchId}`, `POST /validate`, `POST /confirm`, `POST /cancel`, `POST /rollback` |
| Stitch 참고 | 확정 완료 상태에서 후속 액션 우선, 타임라인, 시트별 요약 |
| Stitch 그대로 금지 | 마스터 `버전` 적용 표시. 최신 기준은 검증 시각/건수 표시 |

### 6.6 검증 결과

| 항목 | 내용 |
|---|---|
| 목적 | Error/Warning/Info를 행 단위로 확인하고 조치 우선순위 판단 |
| 주요 UI 영역 | ValidationSummaryPanel, ValidationFilterBar, ValidationErrorTable, RawValueDrawer |
| 주요 액션 | Severity 필터, 원본값 상세 보기, 관련 마스터 보기, 재검증, 배치 상세 이동 |
| 상태별 정책 | Error 기본 필터 고려, Error가 있으면 확정 불가 Alert 표시 |
| 주요 테이블 컬럼 | Severity, 오류 코드, 시트명, rowNo, 컬럼명, 원본값, 정규화값, 관련 코드, 메시지, 처리 여부 |
| 빈 상태 | 선택한 조건의 검증 결과 없음, Error 0건이면 확정 가능 안내 |
| 오류 상태 | 검증 결과 조회 실패, 현재 마스터 없음 |
| API 연동 예상 지점 | `GET /api/v1/order-excel-batches/{batchId}/validation-errors`, `POST /validate` |
| Stitch 참고 | Error 기본 필터, Drawer, 원본/정규화값 비교, 마스터 매칭 결과 |
| Stitch 그대로 금지 | `B2B_Orders`, `B2C_Orders` 같은 실제 요구사항과 다른 시트명 |

### 6.7 주문 조회

| 항목 | 내용 |
|---|---|
| 목적 | `PL_EA`, `PL_Box` 기반 OMS 주문 요약 데이터 조회 |
| 주요 UI 영역 | 안내 notice, FilterBar, OrdersTable, RowDetailDrawer |
| 주요 액션 | 필터 적용, 행 상세, 배치 상세 이동 |
| 상태별 정책 | 생성/수정 액션 없음, 차수별 조회 CTA 없음 |
| 주요 테이블 컬럼 | 주문번호, 배치번호, 배송일/납기일, 거래처코드, 거래처명, 브랜드, 품목코드, 품명, 단위, 주문량, 차량명, 차수, 권역 |
| 빈 상태 | 조건에 맞는 주문 요약 데이터 없음 |
| 오류 상태 | 조회 실패, 권한 없음 |
| API 연동 예상 지점 | `GET /api/v1/orders`, `GET /api/v1/orders/{orderLineId}` |
| Stitch 참고 | PL 기반 요약 조회 설명 |
| Stitch 그대로 금지 | `신규 주문 등록`, `요약 정보 수정`, 원본 주문 관리처럼 보이는 문구 |

### 6.8 Scan 조회

| 항목 | 내용 |
|---|---|
| 목적 | `Scan_upload_*` 시트 데이터 조회 |
| 주요 UI 영역 | FilterBar, ScanLinesTable, RowDetailDrawer |
| 주요 액션 | 필터 적용, 행 상세, 배치 상세 이동 |
| 상태별 정책 | 0건 정상 시트와 필터 결과 없음 상태를 분리 |
| 주요 테이블 컬럼 | 바코드, 배치번호, 시트명, scanCenter, 배송일, 버스, 주문사업장코드, 주문사업장명, 품목코드, 품목명, 라벨수량, 단위, 온도유형, rowNo |
| 빈 상태 | 필터 결과 없음 또는 선택 시트 0건 정상 |
| 오류 상태 | 조회 실패, 권한 없음 |
| API 연동 예상 지점 | `GET /api/v1/scan-lines` |
| Stitch 참고 | `Scan_upload_*` 정식 입력 데이터 설명 |
| Stitch 그대로 금지 | `Scan_upload_*`를 누락/실패 데이터처럼 보이게 하는 표현 |

### 6.9 PL 조회

| 항목 | 내용 |
|---|---|
| 목적 | `PL_EA`, `PL_Box` 데이터 조회 |
| 주요 UI 영역 | EA/BOX segment, FilterBar, PlLinesTable, RowDetailDrawer |
| 주요 액션 | 필터 적용, 행 상세, 배치 상세 이동 |
| 상태별 정책 | 조회 중심 화면. 신규/인쇄성 액션은 MVP에서 제외 |
| 주요 테이블 컬럼 | PL 유형, 주문번호, 거래처코드, 거래처명, 브랜드, 품목코드, 품명, 단위, 보관온도, 납기요청일, 주문량, 차량명, CBM, QR코드, rowNo |
| 빈 상태 | 조건에 맞는 PL 데이터 없음 |
| 오류 상태 | 조회 실패, 권한 없음 |
| API 연동 예상 지점 | `GET /api/v1/pl-lines` |
| Stitch 참고 | EA/BOX 전환과 코드성 값 표시 |
| Stitch 그대로 금지 | `QR 일괄 인쇄`, 우하단 `+` 플로팅 버튼 |

### 6.10 Label 조회

| 항목 | 내용 |
|---|---|
| 목적 | `Label_EA`, `Label_Box` 데이터 조회 |
| 주요 UI 영역 | EA/BOX segment, FilterBar, LabelLinesTable, RowDetailDrawer |
| 주요 액션 | 필터 적용, 행 상세, 라벨 다운로드 화면 이동 |
| 상태별 정책 | 조회 화면에서는 다운로드 실행보다 데이터 확인을 우선 |
| 주요 테이블 컬럼 | Label 유형, 주문번호, 거래처코드, 거래처명, 품목코드, 품명, 주문량, 순번, 매칭코드, QR코드, 박스순번, 총박스수량, rowNo |
| 빈 상태 | 조건에 맞는 Label 데이터 없음 |
| 오류 상태 | 조회 실패, 권한 없음 |
| API 연동 예상 지점 | `GET /api/v1/label-lines`, `GET /api/v1/label-lines/{labelLineId}` |
| Stitch 참고 | 라벨 데이터 조회 패턴 |
| Stitch 그대로 금지 | `출고라벨/입고라벨`처럼 요구사항과 다른 유형명 고정 |

### 6.11 API 제공 현황

| 항목 | 내용 |
|---|---|
| 목적 | OMS가 외부 시스템에 제공하는 WOS/PL API의 제공 가능 상태와 최근 호출 상태를 운영자가 확인 |
| 주요 UI 영역 | Channel tabs(WOS/PL), ExternalApiStatusSummary, ProvideableBatchTable, EndpointInfoPanel, RecentApiCallLogTable |
| 주요 액션 | WOS/PL 탭 전환, 배치 상세 이동, 원천 데이터 조회 이동, API 호출 로그 이동, endpoint 복사 |
| 상태별 정책 | `CONFIRMED` 배치만 `제공 가능`으로 표시한다. `VALIDATION_FAILED`, `READY_TO_CONFIRM`, `UPLOADED`, `CANCELLED`, `ROLLED_BACK` 배치는 제공 제외 사유를 함께 표시한다. |
| WOS 기준 | `Scan_upload_*` 데이터 기반. 배송일, Scan 센터, 거래처/배송지 코드, 상품코드, 바코드, 제공 행 수를 보여준다. |
| PL 기준 | `PL_EA`, `PL_Box` 데이터 기반. EA/BOX 구분, 납기일, 거래처코드, 품목코드, 차량명, 주문량, 제공 행 수를 보여준다. |
| 주요 테이블 컬럼 | 채널, 배치번호, 고객사, 기준일, 상태, 제공 가능 여부, 제공 행 수, endpoint, 최근 호출시각, 최근 응답, 제외 사유 |
| 빈 상태 | 제공 가능한 확정 배치 없음. 업로드/검증/확정 동선 안내 |
| 오류 상태 | API 제공 현황 조회 실패, 권한 없음, API Key 없음, 최근 호출 실패 |
| API 연동 예상 지점 | `GET /api/v1/external-api/status`, `GET /api/v1/audit/api-calls`, `GET /api/v1/order-excel-batches` |
| Stitch 참고 | 별도 Stitch 전용 화면은 없으므로 대시보드의 API 제공 가능 카드, 배치 목록의 상태 chip, 이력/로그의 API 호출 로그 패턴을 조합 |
| Stitch 그대로 금지 | 조회 화면을 외부 시스템 데이터 수정 화면처럼 보이게 하거나, 미확정 배치를 제공 가능하게 보이게 하는 표현 |

이 화면은 `Scan 조회`, `PL 조회`와 다르다. Scan/PL 조회는 OMS 내부 원천 데이터 확인 화면이고, `API 제공 현황`은 WOS/PL 외부 시스템이 현재 어떤 데이터를 받을 수 있는지 보여주는 관제 화면이다.

라벨은 요구사항상 API가 아니라 엑셀 다운로드 형태로 제공하므로 이 화면에서는 WOS/PL API만 다룬다. 라벨 제공 상태는 `라벨 다운로드` 화면에서 다룬다.

### 6.12 라벨 다운로드

| 항목 | 내용 |
|---|---|
| 목적 | 확정된 배치의 Label 데이터를 엑셀로 다운로드 |
| 주요 UI 영역 | 다운로드 조건 Alert, FilterBar, DownloadableBatchTable, DownloadLog panel |
| 주요 액션 | 라벨 엑셀 다운로드, 다운로드 로그 보기, 배치 상세 이동 |
| 상태별 정책 | `CONFIRMED`가 아니면 다운로드 disabled 및 사유 표시 |
| 주요 테이블 컬럼 | 배치번호, 고객사, 배송일, 상태, Label EA 건수, Label BOX 건수, 다운로드 가능 여부, 최근 다운로드시각, 다운로드자 |
| 빈 상태 | 다운로드 가능한 확정 배치 없음 |
| 오류 상태 | 미확정 배치, 데이터 없음, 권한 없음, 다운로드 실패 |
| API 연동 예상 지점 | `GET /api/v1/downloads/labels`, `GET /api/v1/audit/downloads` |
| Stitch 참고 | 확정 배치만 다운로드 가능 Alert |
| Stitch 그대로 금지 | 차수별 주문 다운로드를 핵심 CTA처럼 강조 |

### 6.13 상품 마스터

| 항목 | 내용 |
|---|---|
| 목적 | 현재 상품 마스터 조회, CSV 업로드/upsert, 업로드 이력 확인 |
| 주요 UI 영역 | MasterUploadPanel, MasterUploadResultSummary, ProductMasterFilterBar, ProductMasterTable, UploadHistoryTable |
| 주요 액션 | CSV 업로드, 검색, 업로드 이력 보기 |
| 상태별 정책 | 업로드 권한은 `ADMIN`, 조회는 `VIEWER` 이상 |
| 주요 테이블 컬럼 | ezadminCode, 상품명, 거래처 상품코드, 박스입수량, 출고단위, 보관온도, CBM, 운영여부, rowNo |
| 빈 상태 | 현재 상품 마스터 없음, 검색 결과 없음 |
| 오류 상태 | CSV 확장자 오류, 필수 컬럼 누락, 중복 키, 부분 실패 |
| API 연동 예상 지점 | `POST /api/v1/masters/products/uploads`, `GET /api/v1/masters/products/uploads`, `GET /api/v1/masters/products` |
| Stitch 참고 | 현재 마스터 요약과 업로드 이력 패널 |
| Stitch 그대로 금지 | `버전 선택`, `버전 활성화`, 화면 직접 수정 중심 UX |

### 6.14 배송지/차량 마스터

| 항목 | 내용 |
|---|---|
| 목적 | 현재 배송지/차량 마스터 조회, XLSX 업로드/upsert, 업로드 이력 확인 |
| 주요 UI 영역 | MasterUploadPanel, MasterUploadResultSummary, StoreRouteFilterBar, StoreRouteMasterTable, UploadHistoryTable |
| 주요 액션 | XLSX 업로드, 검색, 업로드 이력 보기 |
| 상태별 정책 | 업로드 권한은 `ADMIN`, 조회는 `VIEWER` 이상 |
| 주요 테이블 컬럼 | baljugoCode, 거래처코드, 브랜드명, 지점명, 권역, 차수, 차량명, 담당기사, 운영여부, rowNo |
| 빈 상태 | 현재 배송지/차량 마스터 없음, 검색 결과 없음 |
| 오류 상태 | XLSX 확장자 오류, 기준 시트 없음, 필수 컬럼 누락, 중복 발주고코드, 부분 실패 |
| API 연동 예상 지점 | `POST /api/v1/masters/store-routes/uploads`, `GET /api/v1/masters/store-routes/uploads`, `GET /api/v1/masters/store-routes` |
| Stitch 참고 | 상품 마스터와 같은 학습 패턴 |
| Stitch 그대로 금지 | 상품 마스터와 통합하거나 `마스터 버전 활성화`로 표현 |

### 6.15 이력/로그 조회

| 항목 | 내용 |
|---|---|
| 목적 | 배치 상태 변경, 다운로드, 외부 API 호출 추적 |
| 주요 UI 영역 | LogType tabs, FilterBar, AuditTable, LogDetailDrawer |
| 주요 액션 | 필터 적용, 로그 상세, 관련 배치 이동 |
| 상태별 정책 | `ADMIN` 중심 화면. 필요 시 `VIEWER` 권한은 일부 로그만 허용 |
| 주요 테이블 컬럼 | 로그 유형, 배치번호, action/path, 상태, actor/API key, requestId, 발생시각, 응답시간, 메시지 |
| 빈 상태 | 조건에 맞는 로그 없음 |
| 오류 상태 | 조회 실패, 권한 없음 |
| API 연동 예상 지점 | `GET /api/v1/audit/batches`, `GET /api/v1/audit/api-calls`, `GET /api/v1/audit/downloads`, `GET /api/v1/downloads/{downloadLogId}` |
| Stitch 참고 | 배치/다운로드/API 로그 탭 구조 |
| Stitch 그대로 금지 | 로그 주체, 시간, requestId가 빠진 단순 활동 피드 |

## 7. 마스터 데이터 upsert 반영 계획

최신 기준에서 마스터 데이터는 업로드마다 전체 버전을 만들고 활성화하는 방식이 아니다. tenant별 현재 마스터 데이터에 파일 내용을 upsert하고, 파일 단위 처리 요약을 업로드 이력으로 남긴다.

### 7.1 UI에서 제거할 개념

- `마스터 버전 선택`
- `현재 활성 버전`
- `버전 활성화`
- 배치 검증 시 `적용 버전`
- 상품 마스터와 배송지/차량 마스터를 하나로 묶은 통합 마스터 화면

### 7.2 상품 마스터 화면 방향

- 현재 상품 마스터 총 건수
- 마지막 업로드일
- 마지막 업로드 상태
- inserted/updated/unchanged/failed 요약
- CSV 업로드
- 현재 상품 마스터 검색
- 파일 단위 업로드 이력

Upsert key는 `tenant_id + ezadmin_code` 기준이다.

### 7.3 배송지/차량 마스터 화면 방향

- 현재 배송지/차량 마스터 총 건수
- 마지막 업로드일
- 마지막 업로드 상태
- inserted/updated/unchanged/failed 요약
- XLSX 업로드
- 현재 배송지/차량 마스터 검색
- 파일 단위 업로드 이력

Upsert key는 `tenant_id + baljugo_code` 기준이다.

### 7.4 OIS 업로드/배치/검증 화면에서의 표현

OIS 업로드와 검증 화면에서는 “선택한 마스터 버전” 대신 다음 정보를 표시한다.

- 상품 마스터 마지막 업로드일
- 상품 마스터 현재 총 건수
- 배송지/차량 마스터 마지막 업로드일
- 배송지/차량 마스터 현재 총 건수
- 배치 검증 시각: `productMasterCheckedAt`, `storeRouteMasterCheckedAt`
- 마스터 데이터가 없을 경우 검증 실행 disabled

배치 상세에서는 `검증 당시 현재 마스터 기준`이라는 표현을 사용한다. 운영자가 과거 버전을 선택했다고 오해하지 않게 한다.

## 8. 라우팅 계획

현재 repo에는 대부분의 route와 page component가 이미 존재한다. 신규 `API 제공 현황`은 `/external-api/status` route와 page component를 추가한 뒤 아래 표를 기준으로 화면 깊이를 채운다.

| Route path | Page component | 목적 | 현재 상태/메모 |
|---|---|---|---|
| `/login` | `LoginPage` | 로그인 | 인증 API 연결 전 skeleton |
| `/dashboard` | `DashboardPage` | 운영 지표 대시보드 | mock 집계에서 실제 쿼리로 전환 필요 |
| `/uploads` | `UploadsPage` | OIS 엑셀 업로드 | Phase 2 핵심 |
| `/batches` | `BatchesPage` | 배치 목록 | 필터/테이블 강화 필요 |
| `/batches/:batchId` | `BatchDetailPage` | 배치 상세 | 상태별 ActionBar 핵심 |
| `/batches/:batchId/validation` | `ValidationResultsPage` | 검증 결과 | Drawer와 Error 기본 필터 필요 |
| `/orders` | `OrdersPage` | PL 기반 주문 요약 조회 | 생성/수정 액션 금지 |
| `/scan-lines` | `ScanLinesPage` | Scan 조회 | 0건 정상 시트 표현 필요 |
| `/pl-lines` | `PlLinesPage` | PL 조회 | 인쇄/신규 액션 금지 |
| `/label-lines` | `LabelLinesPage` | Label 조회 | Label_EA/Label_Box 용어 정리 |
| `/external-api/status` | `ExternalApiStatusPage` | WOS/PL API 제공 현황 | CONFIRMED 배치만 제공 가능, 최근 API 호출 상태 표시 |
| `/downloads/labels` | `LabelDownloadsPage` | 라벨 다운로드 | CONFIRMED 배치만 가능 |
| `/masters/products` | `ProductMasterPage` | 상품 마스터 | upsert 구조로 정리 |
| `/masters/store-routes` | `StoreRouteMasterPage` | 배송지/차량 마스터 | upsert 구조로 정리 |
| `/audit` | `AuditPage` | 이력/로그 | 배치/다운로드/API 로그 탭 |

추후 후보지만 MVP에서 핵심 route로 만들지 않을 항목:

- `/orders/by-round`
- `/downloads/orders/by-round`
- 고객사별 코드 매핑 관리 화면
- 원본 주문 생성/수정 화면

## 9. API 연동 계획

아래 이름은 실제 구현 시 `src/api`, `src/types`, query hooks를 정리하기 위한 초안이다. 현재 repo에 TanStack Query가 설치되어 있지 않으므로, 도입 여부는 Phase 1에서 결정한다. 도입 전에는 API 함수명과 타입부터 정리한다.

| 영역 | 예상 API 모듈 | Endpoint | Query key / mutation 이름 초안 | 사용 화면 |
|---|---|---|---|---|
| Auth | `src/api/auth.ts` | `POST /api/v1/auth/login` | `loginMutation` | 로그인 |
| Auth | `src/api/auth.ts` | `GET /api/v1/auth/me` | `['auth','me']` | Layout, 권한 |
| Upload | `src/api/uploads.ts` | `POST /api/v1/order-excel-batches` | `uploadOrderExcelMutation` | OIS 업로드 |
| Batch | `src/api/batches.ts` | `GET /api/v1/order-excel-batches` | `['batches', filters]` | 배치 목록, 대시보드 |
| Batch | `src/api/batches.ts` | `GET /api/v1/order-excel-batches/{batchId}` | `['batch', batchId]` | 배치 상세 |
| Batch | `src/api/batches.ts` | `POST /api/v1/order-excel-batches/{batchId}/confirm` | `confirmBatchMutation` | 배치 상세 |
| Batch | `src/api/batches.ts` | `POST /api/v1/order-excel-batches/{batchId}/cancel` | `cancelBatchMutation` | 배치 상세 |
| Batch | `src/api/batches.ts` | `POST /api/v1/order-excel-batches/{batchId}/rollback` | `rollbackBatchMutation` | 배치 상세 |
| Validation | `src/api/validation.ts` | `POST /api/v1/order-excel-batches/{batchId}/validate` | `validateBatchMutation` | OIS 업로드, 배치 상세 |
| Validation | `src/api/validation.ts` | `GET /api/v1/order-excel-batches/{batchId}/validation-errors` | `['validationErrors', batchId, filters]` | 검증 결과 |
| Order | `src/api/orders.ts` | `GET /api/v1/orders` | `['orders', filters]` | 주문 조회 |
| Order | `src/api/orders.ts` | `GET /api/v1/orders/{orderLineId}` | `['order', orderLineId]` | 주문 상세 Drawer |
| Scan | `src/api/scan.ts` | `GET /api/v1/scan-lines` | `['scanLines', filters]` | Scan 조회 |
| PL | `src/api/pl.ts` | `GET /api/v1/pl-lines` | `['plLines', filters]` | PL 조회 |
| Label | `src/api/labels.ts` | `GET /api/v1/label-lines` | `['labelLines', filters]` | Label 조회 |
| Label | `src/api/labels.ts` | `GET /api/v1/label-lines/{labelLineId}` | `['labelLine', labelLineId]` | Label 상세 Drawer |
| External API | `src/api/externalApi.ts` | `GET /api/v1/external-api/status` | `['externalApiStatus', filters]` | API 제공 현황 |
| External API | `src/api/externalApi.ts` | `GET /api/v1/audit/api-calls` | `['apiCallLogs', filters]` | API 제공 현황, 이력/로그 |
| Download | `src/api/downloads.ts` | `GET /api/v1/downloads/labels` | `downloadLabelsMutation` | 라벨 다운로드 |
| Product Master | `src/api/masters.ts` | `POST /api/v1/masters/products/uploads` | `uploadProductMasterMutation` | 상품 마스터 |
| Product Master | `src/api/masters.ts` | `GET /api/v1/masters/products/uploads` | `['productMasterUploads', filters]` | 상품 마스터 이력 |
| Product Master | `src/api/masters.ts` | `GET /api/v1/masters/products` | `['productMasters', filters]` | 상품 마스터 조회 |
| Store Route Master | `src/api/masters.ts` | `POST /api/v1/masters/store-routes/uploads` | `uploadStoreRouteMasterMutation` | 배송지/차량 마스터 |
| Store Route Master | `src/api/masters.ts` | `GET /api/v1/masters/store-routes/uploads` | `['storeRouteMasterUploads', filters]` | 배송지/차량 마스터 이력 |
| Store Route Master | `src/api/masters.ts` | `GET /api/v1/masters/store-routes` | `['storeRouteMasters', filters]` | 배송지/차량 마스터 조회 |
| Audit | `src/api/audit.ts` | `GET /api/v1/audit/batches` | `['batchAuditLogs', filters]` | 이력/로그 |
| Audit | `src/api/audit.ts` | `GET /api/v1/audit/api-calls` | `['apiCallLogs', filters]` | 이력/로그 |
| Audit | `src/api/audit.ts` | `GET /api/v1/audit/downloads` | `['downloadLogs', filters]` | 이력/로그 |

API 응답 타입은 `src/types`에 도메인별로 둔다. Backend 공통 응답 포맷의 `success`, `data`, `error`, `meta.requestId`, `meta.timestamp`를 처리할 수 있도록 API client 타입을 먼저 정리한다.

## 10. 구현 전 체크리스트

### 10.1 UX/요구사항 체크리스트

- [ ] `Scan_upload_*`는 정식 입력 시트로 표시한다.
- [ ] `Scan_upload_군량리`처럼 0건인 시트는 정상 케이스로 표시한다.
- [ ] Error가 1건 이상이면 `배치 확정`은 disabled 또는 숨김 처리하고 사유를 표시한다.
- [ ] 검증 대기 상태에서는 `배치 확정`이 가능해 보이지 않게 한다.
- [ ] 확정되지 않은 배치는 API 제공/라벨 다운로드가 불가능하다는 상태를 표시한다.
- [ ] API 제공 현황 화면은 WOS/PL만 다루고, WOS는 `Scan_upload_*`, PL은 `PL_EA`/`PL_Box` 기반임을 명확히 표시한다.
- [ ] API 제공 현황 화면에서 `CONFIRMED`가 아닌 배치는 제공 제외 사유를 표시한다.
- [ ] 라벨은 API 제공 현황에 섞지 않고 라벨 다운로드 화면에서 엑셀 다운로드 대상으로 표시한다.
- [ ] 주문번호, 거래처코드, 품목코드, 바코드, QR코드는 `CodeCell`로 문자열 보존/복사 가능하게 표시한다.
- [ ] Error/Warning/Info는 색상과 텍스트 라벨을 함께 사용한다.
- [ ] 주문 조회는 PL 기반 OMS 주문 요약 조회임을 화면 설명에 남긴다.
- [ ] 차수별 조회/다운로드는 MVP 핵심 메뉴나 CTA로 만들지 않는다.
- [ ] 상품 마스터와 배송지/차량 마스터는 별도 화면으로 유지한다.
- [ ] 마스터는 버전 활성화가 아니라 현재 마스터 upsert 구조로 표현한다.
- [ ] 라벨 유형은 `Label_EA`, `Label_Box` 또는 `EA/BOX` 기준으로 통일한다.
- [ ] Stitch HTML의 Tailwind class와 DOM 구조를 그대로 복사하지 않는다.

### 10.2 `STITCH_DESIGN_REVIEW.md`에서 반드시 반영할 항목

- [ ] 주문 조회 화면의 `신규 주문 등록` 제거
- [ ] 주문 상세 Drawer의 `요약 정보 수정` 제거
- [ ] PL 조회의 `QR 일괄 인쇄`와 `+` 플로팅 버튼 제거
- [ ] Sidebar 메뉴와 active 상태를 실제 OMS 정보구조에 맞게 수정
- [ ] 검증 결과 예시 시트명을 실제 OMS 입력 시트명으로 교체
- [ ] 마스터 화면의 `활성 버전`, `버전 선택`, `버전 활성화` 제거
- [ ] OIS 업로드와 배치 상세에서 현재 마스터 기준 검증 정보 표시
- [ ] 배치 상세에서 마스터 버전 대신 검증 기준 시각/건수 표시
- [ ] Scan 조회의 `조회 결과 없음`과 `0건 정상 시트` 상태 분리
- [ ] 상품 마스터 화면의 우측 overflow/잘림 문제 해결
- [ ] 미확정 배치의 API 제공/라벨 다운로드 불가 사유 텍스트 표시

### 10.3 Phase 1 시작 전 확인 리스크

| 리스크 | 영향 | 대응 |
|---|---|---|
| `MasterVersionSelector`가 현재 요구사항과 충돌 | 마스터 UX가 버전 활성화 방식으로 굳어질 수 있음 | Phase 1 또는 Phase 10 전에 upsert용 컴포넌트 계획으로 대체 |
| TanStack Query 미설치 | API 연동 계획과 실제 dependency가 다를 수 있음 | Phase 1에서 도입 여부 결정 |
| 권한 체계 UI 미정 | 메뉴/버튼 노출 정책이 흔들릴 수 있음 | `VIEWER`, `OPERATOR`, `ADMIN`, `SYSTEM_ADMIN` 기준 placeholder 적용 |
| Warning 확정 허용 여부 미확정 | 확정 버튼 정책에 영향 | Error는 확정 차단으로 확정, Warning은 확인 필요 문구와 정책 주입 가능 구조로 구현 |
| 대표 배송일/납기일 기준 미확정 | 필터와 컬럼명이 화면별로 혼재될 수 있음 | Scan은 배송일, PL/Label/Order는 납기일 또는 dueDate 기준을 문서화 |
| 외부 API 최신 배치 선택 정책 미확정 | 대시보드/API 제공 가능 지표에 영향 | MVP UI는 CONFIRMED 여부 중심으로 표시하고 최신 선택 정책은 확인 필요로 둠 |
| API 제공 현황과 조회 화면의 역할 혼동 | Scan/PL 조회 화면이 외부 제공 관제 화면처럼 비칠 수 있음 | `/scan-lines`, `/pl-lines`는 내부 원천 데이터 확인, `/external-api/status`는 WOS/PL 제공 현황으로 분리 |
| WOS/PL 외부 endpoint 응답 포맷 미확정 | API 제공 현황의 endpoint 설명과 호출 예시 영향 | endpoint, 필수 query, 최신 배치 선택 정책은 확인 필요로 두고, MVP는 제공 가능 여부와 최근 호출 로그 중심 |
| 라벨 다운로드 포맷 미확정 | 다운로드 UI와 로그 컬럼 영향 | 포맷 상세는 후속, MVP는 확정 배치/Label type 기준으로 제한 |

## 11. 구현하지 말아야 할 것

- 원본 주문 생성/수정 화면
- 주문 조회 화면의 `신규 주문 등록`, `주문 수정`, `요약 정보 수정`
- 차수별 조회/다운로드를 MVP 핵심 기능처럼 강조하는 메뉴나 CTA
- `Scan_upload_*`를 누락 데이터처럼 표시하는 UI
- 0건 시트를 오류처럼 표시하는 UI
- Error가 있는 배치의 확정 가능 UI
- 검증 대기 상태에서 확정 가능해 보이는 UI
- 확정 전 API 제공 또는 라벨 다운로드 가능 UI
- 상품 마스터와 배송지/차량 마스터를 직접 조인한 통합 마스터 화면
- 마스터 버전 선택/활성화 중심 UI
- Stitch HTML의 Tailwind class, spacing, color token, DOM 구조를 그대로 복사하는 구현

## 12. 구현 시작 시 읽는 순서

실제 구현을 시작할 때는 다음 순서로 확인한다.

1. `AGENTS.md`
2. `docs/OMS_개발팀_전달용_최종요구사항_Codex_대화반영_최종.md`
3. 이 문서의 `3. 화면 구현 우선순위`
4. 이 문서의 `10. 구현 전 체크리스트`
5. `design-handoff/stitch/STITCH_DESIGN_REVIEW.md`
6. 구현 대상 화면의 Stitch screenshot
7. 현재 `frontend/src`의 기존 page/component/type/api 파일

Phase 1에서는 특히 `Sidebar`, `Header`, `Breadcrumb`, `PageHeader`, `DataTable`, `StatusBadge`, `SeverityBadge`, `CodeCell`의 방향을 먼저 잡는다. Phase 2에서는 OIS 업로드의 상태 분기와 현재 마스터 기준 검증 UI를 우선한다.
