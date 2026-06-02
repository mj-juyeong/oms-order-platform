import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { EmptyState } from '../common';

export type SortDirection = 'asc' | 'desc';

export interface DataTableSort {
  field: string;
  direction: SortDirection;
}

export interface DataTableColumn<TItem> {
  key: string;
  header: string;
  cell: (item: TItem) => ReactNode;
  align?: 'left' | 'right' | 'center';
  sticky?: 'left' | 'right';
  width?: string;
  sortKey?: string;
}

interface DataTableProps<TItem> {
  columns: DataTableColumn<TItem>[];
  data: TItem[];
  getRowKey: (item: TItem) => string;
  emptyTitle?: string;
  emptyDescription?: string;
  getRowClassName?: (item: TItem) => string;
  onRowClick?: (item: TItem) => void;
  onSortChange?: (sort: DataTableSort) => void;
  renderMobileCard?: (item: TItem) => ReactNode;
  sort?: DataTableSort;
}

const alignClasses = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

const headerAlignClasses = {
  left: 'justify-start text-left',
  right: 'justify-end text-right',
  center: 'justify-center text-center',
};

export function DataTable<TItem>({
  columns,
  data,
  emptyDescription = '필터 조건을 변경하거나 데이터를 다시 확인해 주세요.',
  emptyTitle = '표시할 데이터가 없습니다.',
  getRowClassName,
  getRowKey,
  onRowClick,
  onSortChange,
  renderMobileCard,
  sort,
}: DataTableProps<TItem>) {
  if (data.length === 0) {
    return <EmptyState description={emptyDescription} title={emptyTitle} />;
  }

  const tableMinWidth = columns
    .map((column) => parsePixelWidth(column.width) || defaultColumnWidth(column.align))
    .reduce((total, width) => total + width, 0);

  return (
    <div className="min-w-0 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {renderMobileCard ? (
        <div className="divide-y divide-slate-100 md:hidden">
          {data.map((item) => (
            <div
              className={`${getRowClassName?.(item) ?? ''} bg-white px-4 py-3 ${onRowClick ? 'cursor-pointer active:bg-teal-50' : ''}`}
              key={getRowKey(item)}
              onClick={(event) => handleMobileCardClick(event, item, onRowClick)}
              onKeyDown={(event) => handleMobileCardKeyDown(event, item, onRowClick)}
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
            >
              {renderMobileCard(item)}
            </div>
          ))}
        </div>
      ) : null}
      <div className={`oms-table-scroll w-full max-w-full overflow-x-auto ${renderMobileCard ? 'hidden md:block' : ''}`}>
        <table
          className="oms-responsive-table w-full min-w-full table-fixed border-separate border-spacing-0 text-sm"
          style={tableMinWidth > 0 ? { minWidth: `${tableMinWidth}px` } : undefined}
        >
          <colgroup>
            {columns.map((column) => (
              <col key={column.key} style={{ width: column.width ?? `${defaultColumnWidth(column.align)}px` }} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
                  className={`overflow-hidden whitespace-nowrap border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase text-slate-500 ${stickyHeaderClasses(column)} ${alignClasses[column.align ?? 'left']}`}
                  key={column.key}
                  style={{
                    minWidth: column.width ?? `${defaultColumnWidth(column.align)}px`,
                    width: column.width ?? `${defaultColumnWidth(column.align)}px`,
                    ...stickyPosition(column),
                  }}
                >
                  <ColumnHeader column={column} onSortChange={onSortChange} sort={sort} />
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
                    className={`overflow-hidden whitespace-nowrap border-b border-slate-100 px-4 py-3 text-slate-700 ${stickyBodyClasses(column)} ${alignClasses[column.align ?? 'left']}`}
                    key={column.key}
                    style={stickyPosition(column)}
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

function handleMobileCardClick<TItem>(
  event: MouseEvent<HTMLDivElement>,
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

function handleMobileCardKeyDown<TItem>(
  event: KeyboardEvent<HTMLDivElement>,
  item: TItem,
  onRowClick: ((item: TItem) => void) | undefined,
) {
  if (!onRowClick || (event.key !== 'Enter' && event.key !== ' ')) {
    return;
  }

  event.preventDefault();
  onRowClick(item);
}

function parsePixelWidth(width: string | undefined) {
  if (!width?.endsWith('px')) {
    return 0;
  }

  const value = Number(width.slice(0, -2));
  return Number.isFinite(value) ? value : 0;
}

function defaultColumnWidth(align: DataTableColumn<unknown>['align']) {
  return align === 'right' || align === 'center' ? 104 : 148;
}

function stickyPosition<TItem>(column: DataTableColumn<TItem>) {
  if (column.sticky === 'right') {
    return { right: 0 };
  }

  if (column.sticky === 'left') {
    return { left: 0 };
  }

  return {};
}

function stickyHeaderClasses<TItem>(column: DataTableColumn<TItem>) {
  if (!column.sticky) {
    return '';
  }

  const shadow = column.sticky === 'right' ? 'shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.35)]' : 'shadow-[8px_0_12px_-12px_rgba(15,23,42,0.35)]';
  return `sticky z-20 bg-slate-50 ${shadow}`;
}

function stickyBodyClasses<TItem>(column: DataTableColumn<TItem>) {
  if (!column.sticky) {
    return '';
  }

  const shadow = column.sticky === 'right' ? 'shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.35)]' : 'shadow-[8px_0_12px_-12px_rgba(15,23,42,0.35)]';
  return `sticky z-10 bg-white ${shadow}`;
}

function ColumnHeader<TItem>({
  column,
  onSortChange,
  sort,
}: {
  column: DataTableColumn<TItem>;
  onSortChange?: (sort: DataTableSort) => void;
  sort?: DataTableSort;
}) {
  if (!column.sortKey || !onSortChange) {
    return <span className="block w-full">{column.header}</span>;
  }

  const active = sort?.field === column.sortKey;
  const nextDirection: SortDirection = active && sort?.direction === 'asc' ? 'desc' : 'asc';
  const align = column.align ?? 'left';

  return (
    <button
      className={`inline-flex h-6 w-full items-center gap-1 rounded-sm text-xs font-semibold uppercase text-slate-600 transition hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-teal-100 ${headerAlignClasses[align]}`}
      onClick={() => onSortChange({ field: column.sortKey as string, direction: nextDirection })}
      type="button"
    >
      <span>{column.header}</span>
      {active ? (
        sort?.direction === 'asc' ? (
          <ArrowUp aria-hidden="true" size={13} strokeWidth={2.2} />
        ) : (
          <ArrowDown aria-hidden="true" size={13} strokeWidth={2.2} />
        )
      ) : (
        <ChevronsUpDown aria-hidden="true" className="text-slate-400" size={13} strokeWidth={2.2} />
      )}
    </button>
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
