import { useEffect, useId, type ReactNode } from 'react';

interface ModalProps {
  children: ReactNode;
  onClose: () => void;
  open: boolean;
  size?: 'default' | 'wide';
  title: string;
}

export function Modal({ children, onClose, open, size = 'default', title }: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const sizeClass = size === 'wide' ? 'max-w-7xl' : 'max-w-5xl';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4"
      onPointerDown={onClose}
      role="presentation"
    >
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className={`flex max-h-[90vh] w-full ${sizeClass} flex-col rounded-lg bg-white shadow-xl`}
        onPointerDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-bold text-slate-950" id={titleId}>
            {title}
          </h2>
          <button
            aria-label="모달 닫기"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-lg font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            onClick={onClose}
            type="button"
          >
            &times;
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
