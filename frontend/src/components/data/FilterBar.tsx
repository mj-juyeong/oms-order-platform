import type { ReactNode } from 'react';
import { Button } from '../common';

interface FilterBarProps {
  children: ReactNode;
  onReset?: () => void;
}

export function FilterBar({ children, onReset }: FilterBarProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{children}</div>
      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={onReset} size="sm" variant="ghost">
          초기화
        </Button>
        <Button disabled size="sm" variant="primary">
          필터 적용
        </Button>
      </div>
    </div>
  );
}
