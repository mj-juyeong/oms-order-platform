import { Card } from '../common';
import { SeverityBadge } from './SeverityBadge';

interface ValidationErrorPanelProps {
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

export function ValidationErrorPanel({ errorCount, infoCount, warningCount }: ValidationErrorPanelProps) {
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">검증 요약</p>
          <p className="mt-1 text-sm text-slate-500">
            Error가 있으면 배치 확정은 차단됩니다. Warning 확정 허용 여부는 확인 필요 정책입니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SeverityBadge severity="ERROR" />
          <span className="text-sm font-semibold text-slate-900">{errorCount}</span>
          <SeverityBadge severity="WARNING" />
          <span className="text-sm font-semibold text-slate-900">{warningCount}</span>
          <SeverityBadge severity="INFO" />
          <span className="text-sm font-semibold text-slate-900">{infoCount}</span>
        </div>
      </div>
    </Card>
  );
}
