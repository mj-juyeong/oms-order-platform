import { Card } from '../common';

interface MetricCardProps {
  label: string;
  value: string | number;
  description: string;
  tone?: 'neutral' | 'green' | 'amber' | 'red' | 'blue';
}

const toneClasses = {
  neutral: 'text-slate-900',
  green: 'text-emerald-700',
  amber: 'text-amber-700',
  red: 'text-red-700',
  blue: 'text-blue-700',
};

export function MetricCard({ description, label, tone = 'neutral', value }: MetricCardProps) {
  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-3 text-2xl font-bold ${toneClasses[tone]}`}>{value}</p>
      <p className="mt-2 text-xs text-slate-500">{description}</p>
    </Card>
  );
}
