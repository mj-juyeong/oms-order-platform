import { Button, Card } from '../common';

interface ConfirmActionModalProps {
  open: boolean;
  title: string;
  description: string;
}

export function ConfirmActionModal({ description, open, title }: ConfirmActionModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
      <Card className="w-full max-w-md p-5">
        <p className="text-base font-semibold text-slate-900">{title}</p>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button disabled variant="secondary">
            취소
          </Button>
          <Button disabled variant="primary">
            확인
          </Button>
        </div>
      </Card>
    </div>
  );
}
