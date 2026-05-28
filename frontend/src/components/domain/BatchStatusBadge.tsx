import { Badge } from '../common';
import type { BatchStatus } from '../../types/batch';

const statusLabels: Record<BatchStatus, string> = {
  UPLOADED: '업로드됨',
  VALIDATING: '검증 중',
  VALIDATION_FAILED: '검증 실패',
  READY_TO_CONFIRM: '확정 대기',
  CONFIRMED: '확정 완료',
  CANCELLED: '취소됨',
  ROLLED_BACK: '롤백됨',
};

const statusTones: Record<BatchStatus, 'neutral' | 'blue' | 'green' | 'amber' | 'red'> = {
  UPLOADED: 'blue',
  VALIDATING: 'blue',
  VALIDATION_FAILED: 'red',
  READY_TO_CONFIRM: 'amber',
  CONFIRMED: 'green',
  CANCELLED: 'neutral',
  ROLLED_BACK: 'neutral',
};

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  return <Badge tone={statusTones[status]}>{statusLabels[status]}</Badge>;
}
