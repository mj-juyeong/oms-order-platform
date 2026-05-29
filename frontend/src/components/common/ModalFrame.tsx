import { useEffect, type ReactNode } from 'react';

interface ModalFrameProps {
  children: ReactNode;
  onClose: () => void;
  panelClassName: string;
}

export function ModalFrame({ children, onClose, panelClassName }: ModalFrameProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
      onPointerDown={onClose}
      role="presentation"
    >
      <div
        aria-modal="true"
        className={panelClassName}
        onPointerDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        {children}
      </div>
    </div>
  );
}
