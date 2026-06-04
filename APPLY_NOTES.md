# 적용 방법

이 ZIP은 Codex 토큰 절약용 Markdown 최종본만 포함한다.

아래 경로에 그대로 덮어쓰면 된다.

```text
repo-root/
  AGENTS.md
  README.md
  frontend/
    AGENTS.md
    FRONTEND_IMPLEMENTATION_PLAN.md
  backend/
    AGENTS.md
    BACKEND_IMPLEMENTATION_PLAN.md
```

핵심 변경점:

- 루트 `AGENTS.md`는 공통 규칙과 문서 읽기 제한만 남겼다.
- Frontend/Backend 전용 규칙은 각 폴더의 `AGENTS.md`로 분리했다.
- README의 “작업 전 아래 문서를 우선 확인한다” 문구를 “필요 시 관련 섹션만 확인”으로 바꿨다.
- FE/BE 구현계획 문서 상단에 “참고용이며 일반 작업 시 전체를 읽지 않는다”는 주의 문구를 추가했다.
