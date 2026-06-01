import { useEffect, useId, useState, type ReactNode } from 'react';

interface ModalProps {
  children: ReactNode;
  onClose: () => void;
  open: boolean;
  size?: 'default' | 'wide';
  title: string;
}

const MODAL_ANIMATION_MS = 160;

export function Modal({ children, onClose, open, size = 'default', title }: ModalProps) {
  const titleId = useId();
  const [shouldRender, setShouldRender] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    setVisible(false);
    const timeout = window.setTimeout(() => setShouldRender(false), MODAL_ANIMATION_MS);
    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!shouldRender) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, shouldRender]);

  if (!shouldRender) {
    return null;
  }

  const sizeClass = size === 'wide' ? 'max-w-7xl' : 'max-w-5xl';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 transition-opacity duration-150 ease-out motion-reduce:transition-none ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      onPointerDown={onClose}
      role="presentation"
    >
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className={`flex max-h-[90vh] w-full ${sizeClass} flex-col rounded-lg bg-white shadow-xl transition-all duration-150 ease-out motion-reduce:transform-none motion-reduce:transition-none ${
          visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-[0.98] opacity-0'
        }`}
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
