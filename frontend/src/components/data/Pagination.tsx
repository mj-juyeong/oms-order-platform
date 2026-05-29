interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange?: (page: number) => void;
}

export function Pagination({ onPageChange, page, total, totalPages }: PaginationProps) {
  const canMovePrev = Boolean(onPageChange) && page > 1;
  const canMoveNext = Boolean(onPageChange) && page < totalPages;

  return (
    <div className="flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <span className="whitespace-nowrap">
        총 <strong className="text-slate-900">{total}</strong>건
      </span>
      <div className="inline-flex w-fit items-center overflow-hidden rounded-md border border-slate-200 bg-white">
        <button
          aria-label="이전 페이지"
          className={`flex h-8 w-8 items-center justify-center border-r border-slate-200 ${
            canMovePrev ? 'text-slate-700 hover:bg-slate-50' : 'text-slate-300'
          }`}
          disabled={!canMovePrev}
          onClick={() => onPageChange?.(page - 1)}
          type="button"
        >
          &lt;
        </button>
        <span className="min-w-16 px-3 text-center text-xs font-semibold text-slate-700">
          {page} / {totalPages}
        </span>
        <button
          aria-label="다음 페이지"
          className={`flex h-8 w-8 items-center justify-center border-l border-slate-200 ${
            canMoveNext ? 'text-slate-700 hover:bg-slate-50' : 'text-slate-300'
          }`}
          disabled={!canMoveNext}
          onClick={() => onPageChange?.(page + 1)}
          type="button"
        >
          &gt;
        </button>
      </div>
    </div>
  );
}
