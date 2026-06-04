# Frontend 작업 규칙

이 파일은 `frontend/` 안에서 작업할 때 루트 `AGENTS.md`에 추가로 적용한다.

## 1. 문서 확인 제한

- 일반 프론트 수정은 현재 `frontend/src`의 관련 파일과 루트 `AGENTS.md`를 우선 기준으로 한다.
- 다음 구현 항목이나 화면 정책이 애매할 때만 `docs/mid_presentation_feedback_status_20260602/FUTURE_FEATURES.md`의 관련 항목을 확인한다.
- `frontend/FRONTEND_IMPLEMENTATION_PLAN.md`는 전체 프론트 구현 계획, 화면 우선순위, 공통 컴포넌트 방향을 재검토할 때만 필요한 섹션만 읽는다.
- 디자인 작업이 명시된 경우에만 `docs/DESIGN_HANDOFF_PAGE_MAPPING.md`, Stitch review, screenshot 등 필요한 화면의 디자인 산출물만 확인한다.
- API 필드가 애매할 때만 `docs/API_DESIGN_DRAFT.md`의 관련 endpoint 섹션을 확인한다.

## 2. 기술 기준

- Frontend는 React, TypeScript, Tailwind CSS, Vite, React Router, TanStack Query, React Hook Form + Zod를 우선 기준으로 한다.
- API 호출은 `src/api`, 화면은 `src/pages`, 공통 UI는 `src/components`, 도메인 타입은 `src/types`에 둔다.
- 기존 `frontend/src` 구조와 컴포넌트를 우선 재사용한다.
- Stitch HTML의 DOM 구조, Tailwind class, spacing, color token을 그대로 복사하지 않는다.

## 3. UI / 업무 규칙

- 운영자가 대량 표 데이터를 다루므로 테이블 가독성, 필터, 정렬, 페이징, 고정 헤더, 가로 스크롤을 우선 고려한다.
- 배치 상태, 검증 등급, 다운로드 상태는 공통 Badge 컴포넌트로 일관되게 표시한다.
- Error, Warning, Info는 색상과 텍스트를 함께 사용해 구분한다.
- 파일 업로드 화면은 진행 상태, 실패 사유, 검증 결과 이동 동선을 제공한다.
- 주문 조회 화면은 원본 주문 생성/수정처럼 보이지 않게 한다.
- 확정되지 않은 배치는 API 제공 또는 라벨 다운로드가 가능해 보이면 안 된다.
- 차수별 조회/다운로드는 1차 MVP 핵심 메뉴처럼 강조하지 않는다.

## 4. 검증

- 프론트 변경 후 가능한 경우 `npm run lint`와 `npm run build`를 확인한다.
- 실제 실행이 어렵다면 변경 파일, 미실행 사유, 수동 확인 포인트를 짧게 보고한다.
