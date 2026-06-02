# 중간발표 피드백 구현 상태 관리 규칙

이 폴더는 `MID_PRESENTATION_FEEDBACK_PRIORITY_IMPLEMENTATION_PLAN_20260601.md`를 기준으로 앞으로 구현할 기능과 이미 완료한 기능을 나누어 관리한다.

## 문서 역할

| 문서 | 용도 |
|---|---|
| `FUTURE_FEATURES.md` | 앞으로 구현해야 할 기능, 부분 구현 상태인 기능, 정책 확인이 필요한 기능을 관리한다. |
| `COMPLETED_FEATURES.md` | 구현이 끝난 기능을 완료 근거와 관련 파일 기준으로 정리한다. |

## 작업 흐름

1. 새 작업을 시작할 때는 `FUTURE_FEATURES.md`에서 대상 기능을 확인한다.
2. 구현 중에는 해당 항목의 현재 상태, 추가 필요, 확인 필요 내용을 기준으로 작업한다.
3. 기능 구현이 끝나면 `COMPLETED_FEATURES.md`에 완료 내용을 새로 정리한다.
4. 완료된 항목은 `FUTURE_FEATURES.md`에서 삭제하거나, 남은 보완 범위만 남긴다.
5. 완료 판정은 코드 구현, 화면 반영, API 연결, 테스트 여부를 함께 확인해서 보수적으로 한다.

## 완료 문서에 적을 내용

완료 기능을 `COMPLETED_FEATURES.md`에 옮길 때는 아래 정보를 남긴다.

- 완료 내용
- 변경된 백엔드/API/프론트 범위
- 관련 파일 위치
- 테스트 또는 확인 방법
- 아직 남은 제한사항이 있으면 별도 메모

## 추후 기능 문서에 남길 내용

`FUTURE_FEATURES.md`에는 아직 끝나지 않은 항목만 남긴다.

- 현재 상태
- 추가 필요 작업
- 확인 필요 질문
- 예상 작업 위치
- 우선순위가 바뀌면 그 이유

## 현재 기준

- 기준 문서: `docs/MID_PRESENTATION_FEEDBACK_PRIORITY_IMPLEMENTATION_PLAN_20260601.md`
- 완료 기능 문서: `docs/mid_presentation_feedback_status_20260602/COMPLETED_FEATURES.md`
- 추후 기능 문서: `docs/mid_presentation_feedback_status_20260602/FUTURE_FEATURES.md`

