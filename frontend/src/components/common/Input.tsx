import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ className = '', label, id, ...props }: InputProps) {
  return (
    <label className="block min-w-0">
      {label ? <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span> : null}
      <input
        className={`h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 ${className}`}
        id={id}
        {...props}
      />
    </label>
  );
}
