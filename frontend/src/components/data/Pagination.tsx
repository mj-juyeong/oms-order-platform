import { Button } from '../common';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
}

export function Pagination({ page, total, totalPages }: PaginationProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
      <span>
        총 <strong className="text-slate-900">{total}</strong>건
      </span>
      <div className="flex items-center gap-2">
        <Button disabled size="sm" variant="secondary">
          이전
        </Button>
        <span className="min-w-20 text-center">
          {page} / {totalPages}
        </span>
        <Button disabled size="sm" variant="secondary">
          다음
        </Button>
      </div>
    </div>
  );
}
