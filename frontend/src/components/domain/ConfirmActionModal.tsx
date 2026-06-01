import { Button, Card, ModalFrame } from '../common';

interface ConfirmActionModalProps {
  cancelLabel?: string;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
  description: string;
}

export function ConfirmActionModal({
  cancelLabel = '취소',
  confirmLabel = '확인',
  confirmVariant = 'primary',
  description,
  loading = false,
  onClose,
  onConfirm,
  open,
  title,
}: ConfirmActionModalProps) {
  if (!open) {
    return null;
  }

  return (
    <ModalFrame onClose={onClose} panelClassName="w-full max-w-md">
      <Card className="w-full max-w-md p-5">
        <p className="text-base font-semibold text-slate-900">{title}</p>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button disabled={loading} onClick={onClose} variant="secondary">
            {cancelLabel}
          </Button>
          <Button disabled={loading} onClick={onConfirm} variant={confirmVariant}>
            {loading ? '처리 중' : confirmLabel}
          </Button>
        </div>
      </Card>
    </ModalFrame>
  );
}
