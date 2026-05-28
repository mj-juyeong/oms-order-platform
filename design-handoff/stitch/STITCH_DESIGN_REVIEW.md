# Stitch Design Review

## 1. Executive Summary

### 전체 평가

`design-handoff/stitch_oms`의 최신 Stitch 시안은 이전보다 OMS Admin/Backoffice에 훨씬 가까워졌다. OIS 업로드, 대시보드, 배치 상세, 검증 결과 화면은 운영자가 배치 상태와 Error/Warning을 빠르게 파악하는 구조가 잡혀 있고, 흰색/회색/남색 기반의 차분한 운영 시스템 톤도 적절하다.

다만 실제 OMS 요구사항 기준으로는 아직 구현 전 수정해야 할 UX 충돌이 남아 있다. 가장 큰 축은 두 가지다.

1. OMS는 원본 주문 생성/수정 시스템이 아니므로 주문 조회와 PL/Label 조회에서 `신규 등록`, `수정`, `인쇄`처럼 보이는 액션은 제거하거나 후순위 운영 액션으로 분리해야 한다.
2. 최신 `UI_DESIGN_BRIEF.md`와 최종 요구사항 기준 마스터 관리는 버전 활성화 방식이 아니라 현재 마스터에 파일을 `upsert`하는 방식이므로, 마스터 화면과 검증 기준 UI에서 `활성 버전`, `버전 활성화`, `버전 선택` 중심 UX를 제거해야 한다.

### 바로 구현해도 되는 부분

- OIS 업로드 화면의 `검증 실행` Primary action 전환
- `Scan_upload_장지`, `Scan_upload_군량리`, `PL_EA`, `PL_Box`, `Label_EA`, `Label_Box` 시트 인식 결과 구성
- `Scan_upload_군량리` 0건 정상 시트 표현
- 대시보드의 Error/Warning, 확정 대기, 외부 제공 제외, API 제공 가능 지표 구성
- 배치 상세의 확정 완료 상태에서 `API 제공 상태 보기`, `라벨 다운로드`를 후속 액션으로 둔 방향
- 검증 결과 화면의 Error 기본 필터, 오른쪽 Drawer, 원본 표시값/정규화값, 마스터 매칭 결과 패턴
- DataTable, CodeCell, SeverityBadge, BatchStatusBadge로 발전 가능한 시각 패턴

### 구현 전에 수정해야 하는 부분

- 주문 조회 화면의 `신규 주문 등록`, `요약 정보 수정` 제거
- PL 조회 화면의 `QR 일괄 인쇄`, 우하단 `+` 플로팅 버튼 제거
- Label 조회의 `출고라벨/입고라벨` 용어를 `Label_EA/Label_Box` 또는 `EA/BOX` 기준으로 정리
- Sidebar 메뉴를 실제 OMS 화면 구조에 맞게 확장하고 화면별 active 상태를 바로잡기
- 마스터 화면의 `활성 버전`, `버전 활성화`, `버전 선택` 제거
- 마스터 화면을 `현재 마스터`, `마지막 업로드일`, `upsert 결과`, `업로드 이력` 중심으로 재구성
- OIS 업로드와 배치 상세에서 `적용 마스터 버전` 대신 `현재 마스터 기준`, `검증 기준 시각`, `검증 당시 마스터 건수`로 표현 변경
- 검증 결과 예시 시트명을 `B2B_Orders`, `B2C_Orders`가 아니라 실제 입력 시트명으로 교체
- 상품 마스터 화면의 우측 overflow와 잘림 현상 보정

## 2. Screen-by-Screen Review

### 2.1 OIS 엑셀 업로드

#### 좋은 점

- 상단 Stepper가 `파일 선택 -> 시트 인식 -> 검증 대기` 흐름을 보여준다.
- 과거의 `배치 확정` Primary action이 `검증 실행`으로 바뀐 것은 올바르다.
- `.xlsm` 지원이 명시되어 있다.
- 시트 인식 결과에 OMS 필수 시트가 포함되어 있다.
- `Scan_upload_군량리`가 데이터 행 수 0, 파싱 상태 정상, 검증 상태 대기로 표시되어 요구사항과 맞다.
- 오른쪽 `현재 검증 기준 마스터` 영역이 생겨 마스터 기준 검증 흐름을 설명하기 쉬워졌다.

#### 문제점

- 파일명이 `OIS_master_upload_20231025.xlsx`로 보여 마스터 업로드처럼 오해될 수 있다. OIS 주문 엑셀 파일명 예시는 `OIS_order_batch_20260528.xlsm`처럼 바꾸는 편이 좋다.
- 화면 안에 파일 선택 완료, 업로드 완료, 검증 대기 상태가 한 화면에 섞여 있다. 실제 구현에서는 상태별 UI가 명확히 분기되어야 한다.
- 업로드 완료 후 액션이 `검증 실행`으로 바뀐 점은 좋지만 `배치 상세로 이동`, `검증 결과 보기` 보조 액션도 함께 제공해야 한다.
- `현재 검증 기준 마스터`가 “버전”처럼 읽히지 않도록 현재 총 건수, 마지막 업로드일, 마지막 upsert 결과를 중심으로 표시해야 한다.

#### 업무 규칙 위반 가능성

- 최신 시안에서는 검증 대기 상태에서 배치 확정이 활성처럼 보이지 않는다. 이 문제는 대체로 해결되었다.
- 다만 마스터 기준이 없을 때 검증 실행이 가능해 보이면 안 된다. 현재 마스터 데이터가 없으면 `검증 실행`은 disabled이고 Alert로 `현재 마스터 데이터가 없어 검증할 수 없습니다`를 보여야 한다.

#### 수정 제안

- 상태별 Primary action:
  - 업로드 전: `파일 선택`
  - 파일 선택 완료: `업로드 시작`
  - 파싱 완료/검증 대기: `검증 실행`
  - 검증 완료/Error 없음: 배치 상세 또는 검증 결과 화면에서 `배치 확정`
- Alert 문구:
  - `업로드가 완료되었습니다. 인식된 시트를 확인한 뒤 검증을 실행하세요.`
- 현재 검증 기준 마스터 카드:
  - 상품 마스터 마지막 업로드일
  - 상품 마스터 총 건수
  - 배송지/차량 마스터 마지막 업로드일
  - 배송지/차량 마스터 총 건수
  - 마지막 upsert 결과: 추가/수정/변경없음/실패
- `업로드 시작` 버튼과 `업로드 완료` Alert가 동시에 나타나는 경우는 데모 상태로만 유지하고 실제 구현에서는 분기한다.

#### 구현 시 컴포넌트 분리안

- `UploadStepIndicator`
- `FileUploadDropzone`
- `SelectedFilePanel`
- `CurrentMasterCriteriaPanel`
- `UploadStateAlert`
- `SheetParsingResultTable`
- `UploadActionBar`
- `RecentUploadList`

### 2.2 대시보드

#### 좋은 점

- `오늘 업로드 배치`, `확정 대기 배치`, `Error 배치`, `Warning 배치`, `외부 제공 제외`, `API 제공 가능` 지표가 있어 운영 상황 파악에 좋다.
- Error Type TOP 5가 `상품 마스터 미등록`, `배송지/차량 마스터 미등록`, `중복 바코드`, `QR코드 중복`, `필수 컬럼 누락`처럼 OMS 검증 오류 중심으로 정리되었다.
- 확정 대기 배치에 `검증 완료 (Error 0)`가 표시되어 확정 가능 조건을 어느 정도 보여준다.
- 최근 다운로드 로그와 외부 API 상태 패널은 운영자에게 유용하다.

#### 문제점

- 확정 대기 목록에서 두 번째 행처럼 일부가 화면 아래로 잘리는 느낌이 있다. 대시보드 높이 안에서 스크롤 또는 `전체 보기` 이동을 명확히 해야 한다.
- 최근 배치 테이블의 상태가 일부 `Error`, `Warning`처럼 영문으로 보인다. 한국어 중심 UI로 통일하되 Badge 내부에는 `Error`, `Warning` 병기가 가능하다.
- 전역 검색은 범위가 모호하다. MVP에서는 `배치번호/고객사/파일명` 정도로 scope를 명시하거나 화면별 검색에 우선순위를 둔다.

#### 추가해야 할 운영 패널

- `현재 마스터 상태`: 상품 마스터/배송지·차량 마스터 마지막 업로드일, 실패 건수
- `검증 대기 배치`: 아직 검증 실행 전이라 확정 불가인 배치
- `외부 제공 제외 사유`: 미확정, Error, 취소, 롤백, 실패별 건수

#### 구현 시 컴포넌트 분리안

- `DashboardMetricGrid`
- `MetricCard`
- `RecentBatchTable`
- `ErrorTypeTopList`
- `PendingConfirmationList`
- `ExternalApiStatusPanel`
- `RecentDownloadLog`
- `MasterFreshnessPanel`

### 2.3 배치 목록

#### 좋은 점

- FilterBar, 상태 chip, Error 포함 여부, DataTable, pagination 구조는 대량 배치 조회에 적합하다.
- 배치번호가 CodeCell처럼 보여 복사 가능한 식별자 UI로 발전시키기 좋다.
- E/W/I가 별도 컬럼으로 보이는 점은 운영자 스캔에 좋다.

#### 문제점

- `엑셀 다운로드` 버튼이 무엇을 다운로드하는지 불명확하다. 배치 목록 내보내기인지, 라벨 다운로드인지 분리해야 한다.
- 테이블에 `API 제공`, `라벨 다운로드`, `확정시각`, `시트 수`, `검증 상태`가 부족하다.
- `Error 포함 여부` 문구는 애매하다. `Error 있음만 보기` 또는 `Error 포함 배치 보기`로 바꿔야 한다.
- 파일명 예시에 `.csv`가 섞여 있는데 OIS 업로드 배치 목록이라면 기준 입력은 `.xlsm` 중심이어야 한다. CSV는 상품 마스터 업로드에 가깝다.

#### 필터/테이블 보강안

- 필터:
  - 배치번호
  - 고객사
  - 배송일/납기일 기간
  - 배치 상태
  - Error 있음만 보기
  - 업로드자
  - 파일명
- 테이블 우선 컬럼:
  - 배치번호
  - 고객사
  - 원본 파일명
  - 배송일/납기일
  - 상태
  - E/W/I
  - 시트 수
  - 총 행 수
  - 확정시각
  - API 제공
  - 라벨 다운로드
  - 업로드자
  - 업로드시각

#### 구현 시 컴포넌트 분리안

- `BatchFilterBar`
- `BatchStatusFilterChips`
- `BatchListTable`
- `SeverityCountCell`
- `ApiLabelAvailabilityCell`
- `TableDensitySelector`
- `Pagination`

### 2.4 배치 상세

#### 좋은 점

- 확정 완료 상태에서 `확정하기` disabled 버튼이 사라지고 `API 제공 상태 보기`, `라벨 다운로드`가 우선된 점은 적절하다.
- 처리 진행 상태가 `업로드 완료 -> 파싱 완료 -> 검증 완료 -> 배치 확정 -> API 제공/라벨 다운로드 가능`으로 정리되어 흐름이 명확하다.
- 시트별 결과 요약에 실제 OMS 시트명이 사용된다.
- Warning 15건, Error 0건을 분리해 보여주고, Error 0건 empty state도 잘 표현되어 있다.
- 상품 마스터와 배송지/차량 마스터 정보가 분리되어 보인다.

#### 문제점

- 최신 브리프 기준 마스터는 버전 활성화가 아니라 현재 마스터 upsert 방식이다. 배치 상세에서도 `상품 마스터 v1.42 적용`, `배송지/차량 마스터 v2.1.8 적용`보다 `상품 마스터 검증 시각`, `배송지/차량 마스터 검증 시각`, `검증 당시 총 건수`가 더 맞다.
- Warning이 있어도 확정 완료 상태로 보이는데, Warning 허용 정책은 확인 필요다. 시안에서는 “Warning 확인 후 확정됨” 정도로 표시하면 더 안전하다.
- 더보기 메뉴에 롤백, 로그 보기 같은 관리자 액션이 들어갈 가능성이 있으므로 위험 액션 계층을 명확히 해야 한다.

#### 상태/액션 정책 수정안

- 확정 완료:
  - Primary: `라벨 다운로드`
  - Secondary: `API 제공 상태 보기`, `검증 결과 보기`, `로그 다운로드`
  - Admin dangerous: `롤백`
  - 숨김/제거: `확정하기`
- 검증 완료/Error 없음:
  - Primary: `배치 확정`
  - Secondary: `검증 결과 보기`, `재검증`
- Error 있음:
  - Primary: `검증 결과 보기`
  - Disabled: `배치 확정`
  - Alert: `Error가 존재하여 배치를 확정할 수 없습니다.`
- 검증 대기:
  - Primary: `검증 실행`
  - Hidden/disabled: `배치 확정`

#### 구현 시 컴포넌트 분리안

- `BatchDetailHeader`
- `BatchActionBar`
- `BatchProgressTimeline`
- `BatchMetaGrid`
- `BatchMasterCheckInfo`
- `SheetResultSummaryTable`
- `WarningListPanel`
- `ErrorSummaryPanel`
- `ConfirmActionModal`

### 2.5 검증 결과

#### 좋은 점

- Error 기본 필터가 적용되어 있다.
- SummaryCard에서 Error/Warning/Info를 색상과 텍스트로 구분한다.
- Drawer가 `검증 상세 정보`, 위치 정보, 값 비교, 관련 행 요약, 마스터 매칭 결과를 보여준다.
- 원본 표시값과 정규화값 비교가 들어가 있어 운영자가 오류 원인을 파악하기 좋다.
- `관련 마스터 보기`, `원본 행 확인`, `재검증 후 확인` 액션은 직접 수정보다 요구사항에 더 적합하다.

#### 문제점

- 아직 시트명이 `B2B_Orders`, `B2C_Orders`로 남아 있다. 실제 OMS 시트인 `PL_EA`, `PL_Box`, `Label_EA`, `Label_Box`, `Scan_upload_장지` 등으로 바꿔야 한다.
- Drawer의 마스터 매칭 결과에 버전처럼 보이는 값이 남아 있다면 최신 브리프 기준으로 `마지막 업로드일`, `총 건수`, `매칭 결과`로 바꿔야 한다.
- 필터는 현재 충분하지만 `처리 여부`, `domainType`, `lineTable` 같은 운영 추적 필터는 후속으로 고려할 수 있다.

#### Drawer/필터/테이블 보강안

- 필터:
  - Severity
  - 시트명
  - 오류 코드
  - 컬럼명
  - rowNo
  - 상품코드
  - 거래처코드/주문사업장코드
  - 처리 여부
- 테이블:
  - Severity
  - 오류 코드
  - 시트명
  - rowNo
  - 컬럼명
  - 원본 표시값
  - 정규화값
  - 관련 코드
  - 메시지
  - 처리 상태
- Drawer:
  - 위치 정보: sheetName, rowNo, columnName
  - 값 비교: rawValue, normalizedValue
  - 관련 행: orderNo, storeCode, productCode, barcode, qrCode
  - 현재 마스터 기준: 마지막 업로드일, 총 건수, 매칭 결과

#### 구현 시 컴포넌트 분리안

- `ValidationResultHeader`
- `ValidationSummaryCards`
- `ValidationFilterBar`
- `ValidationErrorTable`
- `RawValueDrawer`
- `ValidationExportButton`

### 2.6 나머지 화면 요약

#### 주문 조회

- 좋은 점: `PL 기반 OMS 주문 요약 데이터`라는 설명이 들어간 점은 좋다.
- 문제점: `주문 조회 및 관리`, `신규 주문 등록`, `요약 정보 수정`은 요구사항과 충돌한다. OMS는 원본 주문 생성/수정 시스템이 아니다.
- 수정: CTA를 `엑셀 다운로드`, `컬럼 설정`, `데이터 갱신`, `원본 PL 보기`로 제한한다.

#### Scan 조회

- 좋은 점: `Scan_upload_* 시트 정식 입력 데이터` 설명과 0건 시트 안내가 좋다.
- 문제점: `조회 결과 없음`과 `0건 정상 시트`가 같은 empty state처럼 보일 수 있다.
- 수정: `필터 결과 없음`과 `선택한 Scan_upload_* 시트는 0건 정상 시트입니다`를 분리한다.

#### PL 조회

- 좋은 점: EA/BOX 탭, 필터, 주문번호/거래처/품목 CodeCell 방향은 적절하다.
- 문제점: `QR 일괄 인쇄`와 우하단 `+` 버튼은 신규 작업/출력 기능처럼 보여 MVP 조회 화면과 어긋난다.
- 수정: 해당 액션 제거. 필요하면 `엑셀 다운로드`, `원본 행 보기` 정도로 제한한다.

#### Label 조회/라벨 다운로드

- 좋은 점: 미확정 배치 다운로드 제한 Alert가 명확하다.
- 문제점: `출고라벨/입고라벨`은 요구사항의 `Label_EA/Label_Box`와 다르게 읽힐 수 있다.
- 수정: `EA`, `BOX`, `Label_EA`, `Label_Box` 기준으로 용어를 정리한다.

#### 상품 마스터/배송지·차량 마스터

- 좋은 점: 두 마스터가 별도 화면으로 나뉜 점은 맞다.
- 문제점: `_10` 배송지/차량 마스터에는 `마스터 버전 활성화`, `v2.4.12 현재 활성`이 남아 있어 최신 upsert 요구사항과 충돌한다.
- 수정: `현재 마스터`, `마지막 업로드`, `추가/수정/변경없음/실패`, `업로드 이력` 중심으로 재구성한다.

## 3. Global UI System Review

### Sidebar

- 현재 Stitch 시안은 화면별로 Sidebar active 상태가 일관되지 않다.
- 실제 구현 전 메뉴를 OMS 정보구조에 맞게 고정해야 한다.
- 권장 메뉴:
  - 대시보드
  - OIS 엑셀 업로드
  - 배치 목록
  - 주문 조회
  - Scan 조회
  - PL 조회
  - Label 조회
  - 라벨 다운로드
  - 상품 마스터
  - 배송지/차량 마스터
  - 이력/로그

### Header

- 제품명과 사용자/알림 영역은 유지 가능하다.
- 전역 검색은 범위를 명시하지 않으면 혼란스럽다. MVP에서는 화면별 FilterBar를 우선한다.
- tenant/client 컨텍스트 표시 영역을 고려한다.

### Breadcrumb

- 배치 상세, 검증 결과, 로그 상세에는 적합하다.
- 조회 화면은 Breadcrumb보다 화면 제목과 설명이 더 중요하다.

### Page title

- 대체로 잘 보이지만 일부 화면명은 조정이 필요하다.
- `주문 조회 및 관리`는 `주문 조회` 또는 `PL 기반 주문 요약 조회`로 변경한다.

### Button hierarchy

- 상태별 Primary action은 하나만 둔다.
- `배치 확정`은 검증 완료 + Error 0건에서만 노출한다.
- 확정 완료 상태에서는 `라벨 다운로드`, `API 제공 상태 보기`가 우선이다.
- 조회 화면에서 `신규`, `수정`, `+` 버튼은 요구사항 확인 전 제거한다.

### Badge

- 색상과 텍스트 라벨 조합은 좋다.
- 상태 Badge와 Severity Badge를 분리한다.
- Warning은 노란/주황 계열, Error는 붉은 계열, Confirmed는 초록 계열로 고정한다.

### Alert

- OIS 업로드, 라벨 다운로드, 검증 결과의 Alert 사용은 적절하다.
- Alert는 다음 액션을 정확히 안내해야 한다.
- 미확정 배치의 API/라벨 다운로드 불가 상태는 목록/상세/다운로드 화면 모두에서 반복 표시한다.

### DataTable

- 고정 헤더, pagination, density, 가로 스크롤은 유지한다.
- 상품 마스터 화면처럼 우측이 잘리는 경우 페이지 전체가 아니라 테이블 컨테이너만 가로 스크롤해야 한다.
- 긴 컬럼은 column visibility 또는 density 설정을 제공한다.

### Typography

- Noto Sans KR + JetBrains Mono 조합은 적합하다.
- 코드성 값은 반드시 모노스페이스 + 복사 가능한 UI로 표시한다.
- 문서 기준상 letter spacing은 과도한 음수보다 0에 가깝게 유지한다.

### Spacing

- 전반적으로 업무형 화면의 밀도는 적절하다.
- 일부 Dashboard 패널은 하단 잘림이 있으므로 scroll 영역 또는 더보기 링크를 명확히 한다.

### Color usage

- 남색 기반의 안정감은 좋다.
- `외부 제공 제외` 같은 정보성 blocked 상태는 회색/파랑 계열과 텍스트를 함께 사용한다.
- API/다운로드 가능 여부는 아이콘만 쓰지 말고 `가능/불가` 텍스트를 병기한다.

## 4. State and Action Policy

| 상태 | Primary action | Secondary action | Disabled action | Alert message | 이동 가능한 화면 |
|---|---|---|---|---|---|
| 업로드 전 | 파일 선택 | 배치 목록으로 | 업로드 시작, 검증 실행, 배치 확정 | OIS 엑셀 파일을 선택하세요. `.xlsm`, `.xlsx` 파일을 지원합니다. | 배치 목록 |
| 파일 선택 완료 | 업로드 시작 | 파일 제거, 취소 | 검증 실행, 배치 확정 | 파일이 선택되었습니다. 고객사와 현재 마스터 상태를 확인한 뒤 업로드를 시작하세요. | 배치 목록 |
| 파싱 중 | 업로드 취소 | 없음 | 업로드 시작, 검증 실행, 배치 확정 | 파일을 업로드하고 시트를 인식하는 중입니다. | 배치 목록 |
| 파싱 완료 / 검증 대기 | 검증 실행 | 배치 상세로 이동 | 배치 확정, 라벨 다운로드, API 제공 | 업로드가 완료되었습니다. 인식된 시트를 확인한 뒤 검증을 실행하세요. | 배치 상세, 배치 목록 |
| 검증 중 | 없음 | 배치 상세로 이동 | 검증 실행, 배치 확정, 다운로드 | 현재 마스터 데이터를 기준으로 검증 중입니다. | 배치 상세 |
| Error 있음 | 검증 결과 보기 | 재검증, 배치 상세로 이동 | 배치 확정, 라벨 다운로드, API 제공 | Error가 존재하여 배치를 확정할 수 없습니다. | 검증 결과, 배치 상세 |
| Warning만 있음 | 배치 확정 또는 검증 결과 보기 | 재검증, Warning 확인 | 라벨 다운로드, API 제공 | Error는 없지만 Warning이 있습니다. 운영 정책 확인 후 확정하세요. | 검증 결과, 배치 상세 |
| 검증 완료 / 확정 가능 | 배치 확정 | 검증 결과 보기, 재검증 | 라벨 다운로드, API 제공 | Error가 없어 배치 확정이 가능합니다. | 배치 상세, 검증 결과 |
| 확정 완료 | 라벨 다운로드 | API 제공 상태 보기, 검증 결과 보기, 로그 다운로드 | 배치 확정 | 이미 확정된 배치입니다. 외부 API 제공 및 라벨 다운로드 대상입니다. | 라벨 다운로드, 로그, 배치 상세 |
| 취소됨 | 배치 목록으로 | 로그 보기 | 검증 실행, 배치 확정, 라벨 다운로드, API 제공 | 취소된 배치입니다. 후속 처리 대상에서 제외됩니다. | 배치 목록, 로그 |
| 롤백됨 | 배치 목록으로 | 로그 보기 | 배치 확정, 라벨 다운로드, API 제공 | 롤백된 배치입니다. 외부 API 제공 및 다운로드 대상에서 제외됩니다. | 배치 목록, 로그 |
| 실패 | 오류 상세 보기 | 재업로드, 배치 목록으로 | 배치 확정, 라벨 다운로드, API 제공 | 처리 실패 상태입니다. 실패 사유를 확인하고 다시 업로드하세요. | 실패 상세, 배치 목록 |

## 5. Component Mapping

| 컴포넌트 | props 초안 | 사용 화면 | 상태 variant | 접근성 고려사항 |
|---|---|---|---|---|
| `FileUploadDropzone` | `accept`, `maxSizeMb`, `file`, `status`, `onSelect`, `onRemove` | OIS 업로드, 마스터 업로드 | idle, selected, uploading, uploaded, error | keyboard file select, `aria-describedby` |
| `CurrentMasterCriteriaPanel` | `productSummary`, `storeRouteSummary`, `missing`, `lastUploadedAt` | OIS 업로드, 배치 상세 | ready, missing, stale | 마스터 없음 상태를 텍스트로 제공 |
| `MasterUploadSummary` | `totalCount`, `insertedCount`, `updatedCount`, `unchangedCount`, `failedCount`, `lastUploadedAt` | 상품/배송지 마스터 | success, partialFailed, failed | count label과 실패 링크 명확화 |
| `SheetParsingResultTable` | `sheets`, `onRowClick`, `showValidationStatus` | OIS 업로드, 배치 상세 | parsing, parsed, validationPending, validated | table header scope, 0건 정상 문구 제공 |
| `BatchStatusBadge` | `status`, `label`, `size` | 배치 화면 전체 | uploaded, parsing, parsed, validationPending, validating, validated, confirmed, cancelled, rolledBack, failed | 색상 외 텍스트 필수 |
| `SeverityBadge` | `severity`, `count`, `size` | 검증 결과, 배치 상세, 대시보드 | error, warning, info | 색상 외 텍스트/아이콘 제공 |
| `DataTable` | `columns`, `rows`, `pagination`, `density`, `sort`, `onRowClick` | 목록형 화면 전체 | compact, default, loading, empty, error | `th scope`, keyboard row focus |
| `CodeCell` | `value`, `copyable`, `truncate`, `label`, `preserveWhitespace` | 주문번호, 코드, 바코드, QR | default, warning, error, muted | 복사 버튼 `aria-label`, 전체값 tooltip |
| `ValidationSummaryPanel` | `errorCount`, `warningCount`, `infoCount`, `canConfirm`, `onFilter` | 배치 상세, 검증 결과 | confirmable, blocked, warningOnly | count 버튼에 `aria-pressed` |
| `RawValueDrawer` | `open`, `validationError`, `rawRow`, `normalizedValues`, `masterMatch`, `onClose` | 검증 결과 | error, warning, info | focus trap, close button label |
| `ConfirmActionModal` | `open`, `actionType`, `batchId`, `message`, `onConfirm`, `onCancel` | 배치 확정, 롤백, 마스터 업로드 | confirm, rollback, upload | destructive action 명확화 |
| `DownloadButton` | `available`, `reason`, `onDownload`, `downloadType` | 라벨 다운로드, 목록 | available, unavailable, loading | disabled 사유 tooltip + 텍스트 |
| `BatchActionBar` | `status`, `permissions`, `counts`, `onValidate`, `onConfirm`, `onDownload`, `onRollback` | 업로드, 배치 상세 | preValidation, blocked, confirmable, confirmed, terminal | disabled 사유 노출 |

## 6. Implementation Priority

### Phase 1: 공통 Layout / Sidebar / Header

- Sidebar 정보구조를 실제 OMS 화면 목록에 맞게 확정한다.
- 화면별 active 메뉴 상태를 정확히 연결한다.
- Header에는 사용자, 알림, client context 표시를 준비한다.

### Phase 2: OIS 업로드 화면

- `검증 실행` 중심 흐름과 현재 마스터 기준 검증 UI를 구현한다.
- 마스터 데이터 없음 상태와 0건 정상 시트를 반드시 구현한다.

### Phase 3: 배치 상세

- 상태별 ActionBar와 배치 진행 Timeline을 구현한다.
- 확정 완료 상태에서는 후속 액션을 우선한다.

### Phase 4: 대시보드

- Error/Warning, 확정 대기, 외부 제공 제외, API 제공 가능 지표를 구현한다.
- Error Type TOP 5는 검증 오류 코드 기반으로 연결한다.

### Phase 5: 배치 목록

- 필터, 대량 테이블, E/W/I, API/라벨 가능 여부 컬럼을 구현한다.

### Phase 6: 검증 결과

- Error 기본 필터, ValidationErrorTable, RawValueDrawer를 구현한다.
- 실제 OMS 시트명과 검증 코드로 예시를 교체한다.

### Phase 7: 공통 Badge / DataTable / CodeCell 정리

- Badge, DataTable, CodeCell, DownloadButton, ConfirmActionModal을 공통화한다.

### Phase 8: 마스터 upsert 화면

- 상품 마스터와 배송지/차량 마스터를 현재 마스터 upsert 구조로 구현한다.
- 버전 활성화 UX는 구현하지 않는다.

## 7. Exact UI Copy Suggestions

| 상황 | 추천 문구 |
|---|---|
| 업로드 전 안내 | OIS 엑셀 파일을 업로드하세요. `Scan_upload_*`, `PL_EA`, `PL_Box`, `Label_EA`, `Label_Box` 시트를 인식합니다. |
| 업로드 완료 | 업로드가 완료되었습니다. 인식된 시트를 확인한 뒤 검증을 실행하세요. |
| 시트 0건 정상 | 데이터 행이 0건인 정상 시트입니다. 시트 구조만 인식되었습니다. |
| 검증 대기 | 아직 검증이 실행되지 않았습니다. 배치 확정 전 검증을 먼저 실행하세요. |
| Error로 확정 불가 | Error가 존재하여 배치를 확정할 수 없습니다. 오류를 확인하고 다시 검증하세요. |
| Warning 확인 필요 | Warning이 있습니다. 운영 정책에 따라 확인 후 확정할 수 있습니다. |
| 확정 가능 | Error가 없어 배치 확정이 가능합니다. 확정 후 외부 API 제공 및 라벨 다운로드 대상이 됩니다. |
| 확정 완료 | 배치가 확정되었습니다. 외부 API 제공 및 라벨 다운로드 대상입니다. |
| API 제공 불가 | 확정되지 않은 배치는 외부 API 제공 대상이 아닙니다. |
| 라벨 다운로드 불가 | 확정되지 않은 배치는 라벨 다운로드를 실행할 수 없습니다. |
| 이미 확정된 배치 | 이미 확정된 배치입니다. 라벨 다운로드 또는 API 제공 상태를 확인하세요. |
| 현재 마스터 없음 | 현재 마스터 데이터가 없어 검증을 실행할 수 없습니다. 마스터를 먼저 업로드하세요. |
| 마스터 업로드 완료 | 마스터 업로드가 완료되었습니다. 현재 마스터 데이터에 upsert되었습니다. |
| 마스터 업로드 일부 실패 | 일부 행이 반영되지 않았습니다. 실패 내역을 확인하세요. |
| 주문 조회 안내 | 이 화면은 PL 데이터를 기준으로 재구성한 OMS 주문 요약 조회 화면입니다. |

## 8. Must-Fix Before Implementation

- [ ] 주문 조회 화면의 `신규 주문 등록` 제거
- [ ] 주문 조회 Drawer의 `요약 정보 수정` 제거
- [ ] PL 조회 화면의 `QR 일괄 인쇄` 제거
- [ ] PL 조회 화면의 우하단 `+` 플로팅 버튼 제거
- [ ] Sidebar 메뉴를 실제 OMS 정보구조로 확장
- [ ] 각 화면의 active 메뉴 상태 수정
- [ ] 검증 결과 시트명을 실제 OMS 입력 시트명으로 교체
- [ ] 마스터 화면의 `활성 버전`, `버전 선택`, `버전 활성화` 제거
- [ ] 상품/배송지 마스터를 현재 마스터 upsert UX로 재구성
- [ ] OIS 업로드에서 현재 마스터 기준 검증 정보 표시
- [ ] 배치 상세에서 마스터 버전 대신 검증 기준 시각/건수 표시
- [ ] 상품 마스터 화면의 우측 잘림/overflow 수정
- [ ] Scan 조회의 `조회 결과 없음`과 `0건 정상 시트` empty state 분리
- [ ] Label 유형 용어를 `EA/BOX` 또는 `Label_EA/Label_Box`로 정리
- [ ] 미확정 배치의 API 제공/라벨 다운로드 불가 사유를 텍스트로 표시
- [ ] CodeCell 복사 UI와 전체값 표시 정책 확정

## 9. Nice-to-Have

- 대시보드에 현재 마스터 최신성/마지막 업로드 실패 건수 패널 추가
- 배치 목록에서 column visibility 설정 제공
- Error Type TOP 5 클릭 시 검증 결과 화면으로 이동하며 필터 자동 적용
- DataTable density를 사용자별로 저장
- CodeCell hover 시 복사 버튼과 전체값 tooltip 제공
- 검증 결과 Drawer에서 관련 마스터 조회 화면으로 이동
- 라벨 다운로드 실행 전 Confirm modal 추가
- 로그 상세 Drawer에서 requestId, query, response summary 표시
- 마스터 업로드 결과 Drawer에서 실패 row 다운로드 제공

다음 단계로는 Phase 1 또는 Phase 2만 범위를 제한해 구현하는 것을 추천합니다.
