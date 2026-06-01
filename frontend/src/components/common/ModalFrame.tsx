import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

interface ModalFrameProps {
  children: ReactNode;
  onClose: () => void;
  panelClassName: string;
}

const MODAL_FRAME_ANIMATION_MS = 160;

export function ModalFrame({ children, onClose, panelClassName }: ModalFrameProps) {
  const [visible, setVisible] = useState(false);
  const closingRef = useRef(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const requestClose = useCallback(() => {
    if (closingRef.current) {
      return;
    }

    closingRef.current = true;
    setVisible(false);
    window.setTimeout(onClose, MODAL_FRAME_ANIMATION_MS);
  }, [onClose]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        requestClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [requestClose]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 transition-opacity duration-150 ease-out motion-reduce:transition-none ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      onPointerDown={requestClose}
      role="presentation"
    >
      <div
        aria-modal="true"
        className={`${panelClassName} transition-all duration-150 ease-out motion-reduce:transform-none motion-reduce:transition-none ${
          visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-[0.98] opacity-0'
        }`}
        onPointerDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        {children}
      </div>
    </div>
  );
}
