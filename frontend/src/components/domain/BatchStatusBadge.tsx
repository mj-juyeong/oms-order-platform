import { Badge } from '../common';
import type { BatchStatus } from '../../types/batch';

const statusLabels: Record<BatchStatus, string> = {
  UPLOADED: '업로드됨',
  VALIDATING: '검증 중',
  VALIDATION_FAILED: '검증 실패',
  READY_TO_CONFIRM: '확정 대기',
  CONFIRMATION_REQUESTED: '확정 요청',
  NEEDS_MORE_INFO: '보완 요청',
  REJECTED: '반려',
  CONFIRMED: '확정 완료',
  CANCELLED: '취소됨',
  ROLLED_BACK: '롤백됨',
};

const statusTones: Record<BatchStatus, 'neutral' | 'amber' | 'red' | 'teal'> = {
  UPLOADED: 'neutral',
  VALIDATING: 'teal',
  VALIDATION_FAILED: 'red',
  READY_TO_CONFIRM: 'amber',
  CONFIRMATION_REQUESTED: 'teal',
  NEEDS_MORE_INFO: 'amber',
  REJECTED: 'red',
  CONFIRMED: 'teal',
  CANCELLED: 'neutral',
  ROLLED_BACK: 'neutral',
};

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  return <Badge tone={statusTones[status]}>{statusLabels[status]}</Badge>;
}
