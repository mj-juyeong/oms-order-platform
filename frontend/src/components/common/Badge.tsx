import type { ReactNode } from 'react';

type BadgeTone = 'neutral' | 'blue' | 'green' | 'amber' | 'red' | 'teal';

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'border-slate-200 bg-slate-50 text-slate-700',
  blue: 'border-slate-200 bg-slate-50 text-slate-700',
  green: 'border-teal-200 bg-teal-50 text-teal-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
  red: 'border-red-200 bg-red-50 text-red-700',
  teal: 'border-teal-200 bg-teal-50 text-teal-700',
};

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
}

export function Badge({ children, tone = 'neutral' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}
