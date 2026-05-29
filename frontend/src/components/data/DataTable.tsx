import type { MouseEvent, ReactNode } from 'react';
import { EmptyState } from '../common';

export interface DataTableColumn<TItem> {
  key: string;
  header: string;
  cell: (item: TItem) => ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: string;
}

interface DataTableProps<TItem> {
  columns: DataTableColumn<TItem>[];
  data: TItem[];
  getRowKey: (item: TItem) => string;
  emptyTitle?: string;
  emptyDescription?: string;
  getRowClassName?: (item: TItem) => string;
  onRowClick?: (item: TItem) => void;
}

const alignClasses = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

export function DataTable<TItem>({
  columns,
  data,
  emptyDescription = '필터 조건을 변경하거나 데이터를 다시 확인해 주세요.',
  emptyTitle = '표시할 데이터가 없습니다.',
  getRowClassName,
  getRowKey,
  onRowClick,
}: DataTableProps<TItem>) {
  if (data.length === 0) {
    return <EmptyState description={emptyDescription} title={emptyTitle} />;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="max-w-full overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
                  className={`whitespace-nowrap border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase text-slate-500 ${alignClasses[column.align ?? 'left']}`}
                  key={column.key}
                  style={{ minWidth: column.width }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr
                className={`${getRowClassName?.(item) ?? ''} hover:bg-slate-50 ${onRowClick ? 'cursor-pointer' : ''}`}
                key={getRowKey(item)}
                onClick={(event) => handleRowClick(event, item, onRowClick)}
                tabIndex={onRowClick ? 0 : undefined}
              >
                {columns.map((column) => (
                  <td
                    className={`whitespace-nowrap border-b border-slate-100 px-4 py-3 text-slate-700 ${alignClasses[column.align ?? 'left']}`}
                    key={column.key}
                  >
                    {column.cell(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function handleRowClick<TItem>(
  event: MouseEvent<HTMLTableRowElement>,
  item: TItem,
  onRowClick: ((item: TItem) => void) | undefined,
) {
  if (!onRowClick) {
    return;
  }

  const target = event.target;

  if (target instanceof HTMLElement && target.closest('a, button, input, select, textarea')) {
    return;
  }

  onRowClick(item);
}
