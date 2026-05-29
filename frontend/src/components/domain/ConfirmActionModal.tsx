import { Button, Card, ModalFrame } from '../common';

interface ConfirmActionModalProps {
  onClose: () => void;
  open: boolean;
  title: string;
  description: string;
}

export function ConfirmActionModal({ description, onClose, open, title }: ConfirmActionModalProps) {
  if (!open) {
    return null;
  }

  return (
    <ModalFrame onClose={onClose} panelClassName="w-full max-w-md">
      <Card className="w-full max-w-md p-5">
        <p className="text-base font-semibold text-slate-900">{title}</p>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={onClose} variant="secondary">
            취소
          </Button>
          <Button disabled variant="primary">
            확인
          </Button>
        </div>
      </Card>
    </ModalFrame>
  );
}
