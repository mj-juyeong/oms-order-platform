# Design Handoff Page Mapping

이 문서는 `design-handoff/stitch_oms` 산출물의 폴더명과 실제 OMS 화면의 대응 관계를 정리한다.
프론트엔드 페이지 구현, 레이아웃 수정, 시안 반영 작업 전에는 반드시 이 문서를 먼저 확인한다.

## 사용 원칙

- Stitch 산출물은 구현 코드가 아니라 디자인 참고 자료다.
- `code.html`의 DOM 구조와 Tailwind class를 그대로 복사하지 않는다.
- 화면의 정보 배치, 밀도, 색상 톤, 상태 표현, 아이콘 방향을 참고하되 실제 구현은 `frontend/src`의 기존 컴포넌트 구조를 우선한다.
- 요구사항 문서와 시안이 충돌하면 요구사항 문서를 우선한다.
- `design-handoff/stitch/STITCH_DESIGN_REVIEW.md`의 수정 의견을 함께 확인한다.

## 폴더별 화면 매핑

| 디자인 폴더 | 대응 OMS 화면 | 현재 프론트 라우트/페이지 | 참고 메모 |
|---|---|---|---|
| `design-handoff/stitch_oms/ois` | OIS 엑셀 업로드 | `/uploads`, `UploadsPage` | 파일 선택, 시트 인식, 검증 실행 동선 참고 |
| `design-handoff/stitch_oms/scan` | Scan 조회 | `/scan-lines`, `ScanLinesPage` | `Scan_upload_*` 정식 입력 시트 표현 참고 |
| `design-handoff/stitch_oms/pl` | PL 조회 | `/pl-lines`, `PlLinesPage` | PL 원천 데이터 조회 화면 참고 |
| `design-handoff/stitch_oms/label` | Label 조회 | `/label-lines`, `LabelLinesPage` | Label EA/BOX 조회 화면 참고 |
| `design-handoff/stitch_oms/_1` | 주문 조회 및 관리 | `/orders`, `OrdersPage` | 원본 주문 관리가 아니라 PL 기반 OMS 주문 요약 조회로 해석 |
| `design-handoff/stitch_oms/_2` | 대시보드 | `/dashboard`, `DashboardPage` | 운영 지표, 최근 배치, Error/Warning 요약 참고 |
| `design-handoff/stitch_oms/_3` | 배치 목록 | `/batches`, `BatchesPage` | 필터, 대량 테이블, API/라벨 가능 여부 표현 참고 |
| `design-handoff/stitch_oms/_4` | 대시보드 다른 버전 | `/dashboard`, `DashboardPage` | `_2`와 함께 비교하되 중복 시안으로 취급 |
| `design-handoff/stitch_oms/_5` | 배치 상세 | `/batches/:batchId`, `BatchDetailPage` | 상태 흐름, 확정/후속 액션, 시트별 결과 참고 |
| `design-handoff/stitch_oms/_6` | 라벨 다운로드 / 배치 라벨 목록 | `/downloads/labels`, `LabelDownloadsPage` | 확정 배치만 다운로드 가능하다는 상태 표현 참고 |
| `design-handoff/stitch_oms/_7` | 이력/로그 조회 | `/audit`, `AuditPage` | 배치, 다운로드, 외부 API 로그 조회 참고 |
| `design-handoff/stitch_oms/_8` | 상품 마스터 조회/업로드 | `/masters/products`, `ProductMasterPage` | 최신 요구사항상 버전 활성화 UI는 그대로 구현하지 않음. tenant별 현재 마스터 upsert로 해석 |
| `design-handoff/stitch_oms/_9` | 검증 결과 | `/batches/:batchId/validation`, `ValidationResultsPage` | Error 기본 필터, 원본값/정규화값 비교, Drawer 참고 |
| `design-handoff/stitch_oms/_10` | 배송지/차량 마스터 조회/업로드 | `/masters/store-routes`, `StoreRouteMasterPage` | tenant별 현재 마스터 upsert로 해석 |
| `design-handoff/stitch_oms/logistics_core_design_system` | 디자인 시스템 | 공통 컴포넌트 전체 | 색상 토큰, 사이드바, 테이블, 배지, 간격 기준 참고 |

## 구현 전 체크

- 작업하려는 페이지의 대응 디자인 폴더를 먼저 연다.
- 같은 화면의 중복 시안이 있으면 `STITCH_DESIGN_REVIEW.md`의 평가와 최신 요구사항을 기준으로 취사선택한다.
- 시안에 영어 제목이나 보조 라벨이 있더라도 실제 운영자 화면에서는 한국어 업무 용어를 우선한다.
- 사이드바 메뉴는 아이콘과 한국어 메뉴명을 기본으로 하고, 불필요한 영어 보조 라벨은 노출하지 않는다.
- 상품 마스터/배송지·차량 마스터 화면에서 "버전 활성화"처럼 요구사항과 충돌하는 표현은 현재 마스터 upsert 흐름으로 바꾼다.
