import { Badge } from '../common';
import type { ValidationSeverity } from '../../types/validation';

const severityLabels: Record<ValidationSeverity, string> = {
  ERROR: 'Error',
  WARNING: 'Warning',
  INFO: 'Info',
};

const severityTones: Record<ValidationSeverity, 'red' | 'amber' | 'neutral'> = {
  ERROR: 'red',
  WARNING: 'amber',
  INFO: 'neutral',
};

export function SeverityBadge({ severity }: { severity: ValidationSeverity }) {
  return <Badge tone={severityTones[severity]}>{severityLabels[severity]}</Badge>;
}
