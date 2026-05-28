import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({ description = '잠시 후 다시 시도해 주세요.', onRetry, title = '화면을 표시할 수 없습니다.' }: ErrorStateProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6">
      <p className="text-sm font-semibold text-red-800">{title}</p>
      <p className="mt-2 text-sm text-red-700">{description}</p>
      {onRetry ? (
        <Button className="mt-4" onClick={onRetry} size="sm" variant="secondary">
          다시 시도
        </Button>
      ) : null}
    </div>
  );
}
