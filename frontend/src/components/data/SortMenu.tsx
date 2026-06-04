import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowDownUp, ArrowUp, Check, X } from 'lucide-react';
import { Button } from '../common';
import type { DataTableSort, SortDirection } from './DataTable';

export interface SortOption {
  label: string;
  value: string;
}

interface SortMenuProps {
  label?: string;
  onChange: (sort: DataTableSort) => void;
  options: SortOption[];
  sort: DataTableSort;
}

export function SortMenu({ label = '정렬', onChange, options, sort }: SortMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ mobile: boolean; top: number; right: number; width: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const activeOption = options.find((option) => option.value === sort.field) ?? options[0];
  const directionLabel = sort.direction === 'asc' ? '오름차순' : '내림차순';

  useEffect(() => {
    if (!open) {
      return;
    }

    function closeOnOutsideClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }

    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function updatePosition() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const mobile = window.innerWidth < 768;
      setPosition({
        mobile,
        top: rect.bottom + 8,
        right: Math.max(12, window.innerWidth - rect.right),
        width: mobile ? Math.min(320, window.innerWidth - 24) : 280,
      });
    }

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  function toggleOpen() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const mobile = window.innerWidth < 768;
      setPosition({
        mobile,
        top: rect.bottom + 8,
        right: Math.max(12, window.innerWidth - rect.right),
        width: mobile ? Math.min(320, window.innerWidth - 24) : 280,
      });
    }
    setOpen((current) => !current);
  }

  function selectField(field: string) {
    onChange({ field, direction: sort.direction });
  }

  function selectDirection(direction: SortDirection) {
    onChange({ field: sort.field, direction });
    setOpen(false);
  }

  return (
    <div className="relative inline-flex">
      <Button
        aria-expanded={open}
        aria-haspopup="menu"
        className="min-w-[156px] justify-between"
        onClick={toggleOpen}
        ref={buttonRef}
        size="sm"
        variant="secondary"
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <ArrowDownUp aria-hidden="true" size={14} />
          <span className="truncate">{label}: {activeOption?.label ?? sort.field}</span>
        </span>
        {sort.direction === 'asc' ? <ArrowUp aria-label={directionLabel} size={14} /> : <ArrowDown aria-label={directionLabel} size={14} />}
      </Button>

      {open && position ? (
        <div
          className="fixed z-50 overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl"
          ref={menuRef}
          role="menu"
          style={
            position.mobile
              ? { left: '50%', top: position.top, transform: 'translateX(-50%)', width: position.width }
              : { right: position.right, top: position.top, width: position.width }
          }
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <p className="text-xs font-bold text-slate-500">정렬 기준</p>
            <button
              aria-label="닫기"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              onClick={() => setOpen(false)}
              type="button"
            >
              <X aria-hidden="true" size={14} />
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {options.map((option) => {
              const active = sort.field === option.value;
              return (
                <button
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-slate-50 ${active ? 'font-semibold text-teal-800' : 'text-slate-700'}`}
                  key={option.value}
                  onClick={() => selectField(option.value)}
                  role="menuitemradio"
                  type="button"
                >
                  <span>{option.label}</span>
                  {active ? <Check aria-hidden="true" size={15} /> : null}
                </button>
              );
            })}
          </div>
          <div className="border-t border-slate-100 bg-slate-50 p-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                aria-pressed={sort.direction === 'asc'}
                className={`h-8 rounded-md border text-xs font-semibold transition ${sort.direction === 'asc' ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
                onClick={() => selectDirection('asc')}
                type="button"
              >
                오름차순
              </button>
              <button
                aria-pressed={sort.direction === 'desc'}
                className={`h-8 rounded-md border text-xs font-semibold transition ${sort.direction === 'desc' ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
                onClick={() => selectDirection('desc')}
                type="button"
              >
                내림차순
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
