import type { ReactNode } from 'react';
import { Button } from '../common';

interface FilterBarProps {
  children: ReactNode;
  applyDisabled?: boolean;
  applyLabel?: string;
  hideActions?: boolean;
  onReset?: () => void;
  onSubmit?: () => void;
}

export function FilterBar({ applyDisabled = false, applyLabel = '필터 적용', children, hideActions = false, onReset, onSubmit }: FilterBarProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{children}</div>
      {hideActions ? null : (
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onReset} size="sm" variant="ghost">
            초기화
          </Button>
          <Button disabled={applyDisabled} onClick={onSubmit} size="sm" variant="primary">
            {applyLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
