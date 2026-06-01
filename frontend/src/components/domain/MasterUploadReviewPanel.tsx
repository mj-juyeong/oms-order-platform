import { AlertTriangle } from 'lucide-react';
import { Badge, Button, Card } from '../common';
import type { MasterUploadPreviewResult, MasterUploadRowFailure } from '../../types/master';

type MasterUploadReviewTarget = 'product' | 'storeRoute';

interface MasterUploadReviewPanelProps {
  cancelLabel?: string;
  confirmLabel?: string;
  loading?: boolean;
  masterLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  preview: MasterUploadPreviewResult;
  target: MasterUploadReviewTarget;
}

export function MasterUploadReviewPanel({
  cancelLabel = '등록하지 않음',
  confirmLabel = '정상행만 등록',
  loading = false,
  masterLabel,
  onCancel,
  onConfirm,
  preview,
  target,
}: MasterUploadReviewPanelProps) {
  const canApply = preview.validCount > 0;
  const targetColumnLabel = target === 'product' ? '상품명' : '차량명';

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700">
              <AlertTriangle aria-hidden="true" size={20} />
            </span>
            <div>
              <p className="text-base font-bold text-amber-950">{masterLabel} 일부 행에서 오류가 발견되었습니다</p>
              <p className="mt-1 text-sm leading-6 text-amber-900">
                실패한 행을 제외하고 정상 행 {preview.validCount.toLocaleString()}건만 등록할 수 있습니다.
              </p>
            </div>
          </div>
          <Badge tone={preview.failedCount > 0 ? 'amber' : 'green'}>{preview.status === 'FAILED' ? '등록 불가' : '확인 필요'}</Badge>
        </div>
      </div>

      <Card className="p-5 shadow-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">검사 요약</p>
            <p className="mt-1 break-all font-mono text-sm text-slate-500">{preview.fileName ?? `upload #${preview.uploadId}`}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <ReviewCount label="전체" value={preview.rowCount} />
          <ReviewCount label="정상" value={preview.validCount} tone="text-emerald-700" />
          <ReviewCount label="신규 예상" value={preview.candidateInsertedCount} tone="text-teal-700" />
          <ReviewCount label="수정 예상" value={preview.candidateUpdatedCount} tone="text-blue-700" />
          <ReviewCount label="실패" value={preview.failedCount} tone="text-red-700" />
        </div>
      </Card>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm font-bold text-slate-900">실패 행</p>
          <Badge tone="red">{preview.failures.length.toLocaleString()}건</Badge>
        </div>
        <div className="max-h-72 overflow-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-xs font-semibold text-slate-500">
                <th className="w-20 px-4 py-3">rowNo</th>
                <th className="w-56 px-4 py-3">{targetColumnLabel}</th>
                <th className="min-w-64 px-4 py-3">실패 사유</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {preview.failures.map((failure, index) => (
                <FailureRow failure={failure} key={`${failure.rowNo}-${failure.errorCode}-${index}`} target={target} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">
          {canApply
            ? `정상행 ${preview.validCount.toLocaleString()}건을 현재 마스터에 등록하시겠습니까?`
            : '등록할 수 있는 정상행이 없습니다.'}
        </p>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          등록하지 않으면 현재 마스터는 변경되지 않고 업로드 이력만 취소 상태로 남습니다.
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button disabled={loading} onClick={onCancel} variant="secondary">
          {loading ? '처리 중' : cancelLabel}
        </Button>
        <Button disabled={loading || !canApply} onClick={onConfirm} variant="primary">
          {loading ? '처리 중' : confirmLabel}
        </Button>
      </div>
    </div>
  );
}

function FailureRow({ failure, target }: { failure: MasterUploadRowFailure; target: MasterUploadReviewTarget }) {
  const displayName = getFailureDisplayName(failure, target);

  return (
    <tr className="align-top">
      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">{failure.rowNo}</td>
      <td className="max-w-56 px-4 py-3">
        <span className="block truncate text-slate-800" title={displayName}>
          {displayName || '-'}
        </span>
      </td>
      <td className="px-4 py-3 text-slate-700">{failure.message}</td>
    </tr>
  );
}

function getFailureDisplayName(failure: MasterUploadRowFailure, target: MasterUploadReviewTarget) {
  const candidates =
    target === 'product'
      ? ['productname', 'product_name', '상품명', '품명']
      : ['vehiclename', 'vehicle_name', '차량명'];

  return getRawRowValue(failure.rawRow, candidates);
}

function getRawRowValue(rawRow: Record<string, string>, candidates: string[]) {
  const normalizedCandidates = new Set(candidates.map(normalizeRawKey));
  const match = Object.entries(rawRow).find(([key, value]) => normalizedCandidates.has(normalizeRawKey(key)) && value.trim());
  return match?.[1]?.trim() ?? '';
}

function normalizeRawKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/-/g, '_');
}

function ReviewCount({ label, tone = 'text-slate-950', value }: { label: string; tone?: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-3">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${tone}`}>{value.toLocaleString()}</p>
    </div>
  );
}
