# P0-1 조회페이지 스코프별 기본 흐름 구현계획

- 작성일: 2026-06-02
- 기준 문서: `docs/mid_presentation_feedback_status_20260602/FUTURE_FEATURES.md`
- 대상 기능: `P0-1. 조회페이지 스코프별 기본 흐름 정리`
- 목적: 주문/Scan/PL/Label 조회 화면에 진입했을 때 사용자 스코프에 맞는 고객사 선택, 기본 조회 범위, 조회 차단 상태를 명확히 고정한다.

---

## 1. 구현 방향

조회페이지는 단순히 상단 헤더의 고객사 선택을 요구하는 방식이 아니라, TENANT 사용자가 처음 진입했을 때 화면 본문에서 고객사 목록을 먼저 보여주고 그 안에서 고객사를 선택하게 한다.

권장 UX는 다음 순서다.

```text
TENANT 사용자 조회페이지 진입
  -> 고객사 미선택 상태 확인
  -> 조회 테이블 대신 고객사 선택 리스트 표시
  -> 고객사 선택
  -> 전역 client context 저장
  -> 선택 고객사 기준으로 주문/Scan/PL/Label 조회
```

고객사가 많아 화면이 복잡해지는 경우에는 1차 구현 후 `고객사 선택 모달` 또는 검색형 command dialog로 확장한다. 1차는 리스트/검색 패널을 우선한다.

---

## 2. 스코프별 동작

### 2-1. CLIENT 사용자

- 자기 `tenantId + clientId` 범위만 조회한다.
- 고객사 선택 리스트나 고객사 선택 모달은 노출하지 않는다.
- 상단 헤더에는 잠긴 고객사명이 표시된다.
- 첫 진입 시에는 조회 테이블을 바로 보여주지 않고, 해당 고객사의 배치 목록을 먼저 보여준다.
- 사용자가 배치를 선택하면 선택한 `batchId` 기준으로 주문을 조회한다.
- 배치 선택 후에는 필요에 따라 납기일/상태 필터를 추가 조정할 수 있다.
- 기본 배치 목록은 오늘 이후 예정 데이터 또는 최근 업로드 배치를 우선 보여준다.

### 2-2. TENANT 사용자

- 고객사 선택 전에는 조회 API를 호출하지 않는다.
- 조회 테이블, 요약 카드, 페이지네이션 대신 고객사 선택 패널을 먼저 보여준다.
- 고객사 선택 패널에는 현재 tenant의 고객사 목록을 표시한다.
- 고객사를 선택하면 `saveClientContextSelection({ mode: 'client', clientId, clientName })`으로 전역 선택 상태를 저장한다.
- 이후 해당 고객사의 배치 목록을 먼저 보여주고, 배치 선택 후 주문/Scan/PL/Label을 조회한다.
- 같은 조회페이지와 다른 조회페이지에서도 선택 고객사 기준을 공유한다.
- 고객사 변경은 상단 헤더 또는 조회페이지의 고객사 변경 버튼에서 수행한다.

### 2-3. SYSTEM 사용자

- tenant 선택 정책이 아직 확정되지 않았으므로 1차 구현에서는 조회페이지 본문에 `확인 필요` 안내 상태를 표시한다.
- 임시 지원 모드가 필요하면 tenant 선택 후 TENANT 사용자와 같은 고객사 선택 흐름을 적용한다.
- 이번 P0-1 범위에서는 SYSTEM tenant 선택 UI를 새로 만들지 않는다.

---

## 3. 고객사 선택 UX

### 3-1. 1차 권장안: 페이지 내 고객사 선택 리스트

화면 본문에 `ClientSelectionPanel`을 표시한다.

표시 정보:

- 고객사명
- 고객사 코드
- 외부 코드가 있으면 외부 코드
- 상태
- 최근 배치 수 또는 최근 업로드 일시는 있으면 표시하고, 없으면 생략한다.

기본 기능:

- 고객사명/코드 검색 input
- 고객사 카드 또는 compact row 리스트
- 선택 버튼
- 고객사가 없을 때 고객사 관리 화면으로 이동하는 버튼

장점:

- 처음 들어온 사용자가 다음 행동을 바로 이해할 수 있다.
- 조회 화면 안에서 업무 흐름이 끊기지 않는다.
- 모바일에서도 모달보다 안정적이다.

### 3-2. 2차 대안: 고객사 선택 모달

고객사 수가 많거나 화면 공간을 줄여야 하면 `ClientSelectionModal`을 추가한다.

모달 전환 조건:

- 고객사 수가 많아 리스트가 길어지는 경우
- 조회 화면 상단에 선택 요약만 남기고 싶을 경우
- 키보드 검색/선택 UX가 필요해지는 경우

1차에서는 모달을 필수 구현으로 두지 않는다.

---

## 4. 기본 조회 기간 정책

`FUTURE_FEATURES.md`의 확인 필요 사항은 유지하되, 임시 정책은 다음처럼 둔다.

| 화면 | 기본 기준 | API 파라미터 |
|---|---|---|
| 주문 조회 | `dueDate >= 오늘` | `dueDateFrom=today` |
| PL 조회 | `dueDate >= 오늘` | `dueDateFrom=today` |
| Scan 조회 | `deliveryDate >= 오늘` | `deliveryDateFrom=today` |
| Label 조회 | 현재 Label line에 날짜 컬럼이 없어 기본 날짜 필터 제외 | 없음 |

주의:

- 사용자가 필터 초기화를 눌러도 고객사 선택은 유지한다.
- 날짜 필터 초기화는 기본값인 오늘 이후로 되돌리는 것을 우선 검토한다.
- 과거 데이터 조회가 필요할 수 있으므로 날짜 필터에서 직접 기간을 전체/과거로 열 수 있게 한다.

---

## 5. 배치 선택 UX

CLIENT 사용자와 고객사를 선택한 TENANT 사용자는 조회 데이터보다 배치를 먼저 선택한다.

### 5-1. 1차 권장안: 페이지 내 배치 선택 리스트

화면 본문에 `BatchSelectionPanel`을 표시한다.

표시 정보:

- 배치번호
- 업로드 파일명
- 납기일 또는 배송일
- 배치 상태
- Error/Warning/Info 건수
- 확정 요청 상태가 있으면 표시

기본 기능:

- 배치번호/파일명 검색 input
- 상태 필터
- 오늘 이후/최근 업로드 quick filter
- 배치 선택 버튼
- 선택한 배치 기준으로 주문 조회 진입

주문 조회 화면의 기본 흐름:

```text
CLIENT 사용자 로그인
  -> 주문 조회 진입
  -> 배치 선택 리스트 표시
  -> 배치 선택
  -> /orders?batchId={batchId} 또는 내부 상태로 batchId 적용
  -> 선택 배치의 주문 조회
```

Scan/PL/Label 조회 화면도 같은 배치 선택 상태를 사용할 수 있다. 다만 사용자가 메뉴를 직접 이동한 경우에는 해당 화면에서 다시 배치를 선택할 수 있게 한다.

---

## 6. Frontend 구현 계획

### 6-1. 신규/수정 파일

```text
frontend/src/app/clientContext.ts
frontend/src/hooks/useQueryScope.ts
frontend/src/components/domain/ClientSelectionPanel.tsx
frontend/src/components/domain/BatchSelectionPanel.tsx
frontend/src/pages/OrdersPage.tsx
frontend/src/pages/ScanLinesPage.tsx
frontend/src/pages/PlLinesPage.tsx
frontend/src/pages/LabelLinesPage.tsx
frontend/src/utils/dateRange.ts
```

### 6-2. `useQueryScope` 역할

반환값 후보:

```ts
interface QueryScopeState {
  tenantId: number | null;
  clientId?: number;
  clientName?: string;
  userScopeType: UserScopeType | null;
  canQuery: boolean;
  needsClientSelection: boolean;
  isClientLocked: boolean;
  blockedReason?: string;
}
```

판단 규칙:

- `CLIENT`: `tenantId`와 고정 `clientId`가 있으면 `canQuery = true`
- `TENANT`: `selection.mode === 'client'`이면 `canQuery = true`
- `TENANT`: `selection.mode === 'all'`이면 `needsClientSelection = true`, `canQuery = false`
- `SYSTEM`: `canQuery = false`, `blockedReason = 'SYSTEM 사용자의 tenant 선택 정책은 확인 필요입니다.'`

### 6-3. `ClientSelectionPanel` 역할

- `omsApi.clients.list({ tenantId })`로 고객사 목록을 가져온다.
- 고객사명/코드 검색을 제공한다.
- 고객사 선택 시 `saveClientContextSelection`을 호출한다.
- 선택 후 해당 페이지가 자동으로 조회 상태로 전환된다.
- 고객사 목록을 불러오지 못하면 재시도 버튼을 제공한다.

### 6-4. `BatchSelectionPanel` 역할

- `omsApi.batches.list({ tenantId, clientId })`로 배치 목록을 가져온다.
- 기본적으로 오늘 이후 예정 배치 또는 최근 업로드 배치를 먼저 보여준다.
- 배치 선택 시 각 조회페이지의 `batchId` 필터에 반영한다.
- 선택한 배치는 고객사 범위별로 저장해 주문/Scan/PL/Label 화면을 오가도 유지한다.
- 주문 조회는 batchId가 선택되기 전에는 주문 API를 호출하지 않는다.
- 배치를 다시 선택할 수 있는 버튼을 조회 화면 상단에 제공한다.

### 6-5. 조회페이지 적용 방식

각 페이지의 데이터 로딩 전 다음 조건을 먼저 확인한다.

```ts
if (!queryScope.canQuery) {
  setPageData(emptyPage);
  setLoading(false);
  return;
}
```

렌더링은 다음 순서로 둔다.

```tsx
if (queryScope.needsClientSelection) {
  return <ClientSelectionPanel ... />;
}

if (queryScope.blockedReason) {
  return <ScopeBlockedState ... />;
}

if (needsBatchSelection) {
  return <BatchSelectionPanel ... />;
}

return <기존 조회 화면 />;
```

---

## 7. Backend 구현 계획

1차에서는 백엔드 변경을 최소화한다.

현재 조회 컨트롤러는 이미 `AccessScopeService.resolveClientScope()`로 사용자 스코프를 검증한다.

- `CLIENT` 사용자는 자기 고객사 외 `clientId` 요청 시 차단된다.
- `TENANT` 사용자는 같은 tenant의 고객사인지 검증된다.
- `clientId` 생략 시 전체 고객사 조회가 가능하지만, 이번 기능에서는 프론트 조회페이지 정책으로 막는다.

백엔드 보완 후보:

- Label 조회에 날짜 필터가 필요하면 `label_lines` 자체 날짜 컬럼 추가가 아니라, `batch_id -> upload_batches.delivery_date` 기준 필터를 검토한다.
- SYSTEM 지원 모드가 확정되면 tenant 선택 API/프론트 흐름과 함께 별도 구현한다.

---

## 8. 테스트 계획

### Frontend

- TENANT + 고객사 미선택 상태에서 조회 API가 호출되지 않는지 확인한다.
- TENANT + 고객사 선택 후 배치 선택 리스트가 표시되는지 확인한다.
- TENANT + 배치 선택 후 해당 `clientId + batchId`로 주문/Scan/PL/Label API가 호출되는지 확인한다.
- CLIENT 사용자는 고객사 선택 패널 없이 배치 선택 리스트가 표시되는지 확인한다.
- CLIENT + 배치 선택 후 해당 `clientId + batchId`로 주문 API가 호출되는지 확인한다.
- SYSTEM 사용자는 조회 화면에서 확인 필요 안내가 보이는지 확인한다.
- 주문/Scan/PL 기본 날짜 필터가 오늘 이후로 설정되는지 확인한다.

### Backend

- 기존 `AccessScopeService` 테스트가 있으면 유지한다.
- CLIENT가 다른 고객사 `clientId`로 조회할 때 거부되는 테스트를 확인한다.
- TENANT가 다른 tenant의 고객사 `clientId`로 조회할 때 거부되는 테스트를 확인한다.

---

## 9. 완료 기준

- TENANT 사용자는 조회페이지 첫 진입 시 고객사 리스트에서 고객사를 선택할 수 있다.
- 고객사 선택 전에는 주문/Scan/PL/Label 조회 API가 호출되지 않는다.
- 고객사 선택 후 배치 리스트가 먼저 표시된다.
- 배치 선택 후 네 조회페이지가 같은 고객사 컨텍스트와 선택 배치 기준을 사용할 수 있다.
- 배치가 선택된 상태에서 다른 조회페이지로 이동했다가 돌아와도 선택 배치가 유지된다.
- CLIENT 사용자는 자기 고객사 범위의 배치 리스트를 먼저 보고, 배치 선택 후 주문을 조회한다.
- 주문/Scan/PL은 오늘 이후 데이터가 기본 조회 범위로 적용된다.
- Label은 스코프 적용만 완료하고 날짜 필터는 별도 확인 필요로 남긴다.

---

## 10. 확인 필요

- “미래인 주문” 기준을 `납기요청일 >= 오늘`로 볼지, `배송일 >= 오늘`로 볼지 확인 필요.
- TENANT 사용자가 전체 고객사 통합 조회도 필요한지 확인 필요. 필요하면 별도 권한 또는 명시적 `전체 고객사 조회` 버튼으로 분리한다.
- Label 조회의 기본 날짜 기준을 배치 배송일로 적용해도 되는지 확인 필요.
- 선택한 배치를 주문/Scan/PL/Label 화면 간 전역으로 공유할지, 화면별로 독립 선택할지 확인 필요.
