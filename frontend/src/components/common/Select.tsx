import type { SelectHTMLAttributes } from 'react';

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
}

export function Select({ className = '', label, options, style, ...props }: SelectProps) {
  return (
    <label className="block min-w-0">
      {label ? <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span> : null}
      <select
        className={`h-10 w-full appearance-none rounded-md border border-slate-300 bg-white bg-no-repeat py-0 pl-3 pr-10 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50 disabled:text-slate-500 ${className}`}
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3e%3cpath stroke=%27%2364758b%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27m6 8 4 4 4-4%27/%3e%3c/svg%3e")',
          backgroundPosition: 'right 0.75rem center',
          backgroundSize: '1rem 1rem',
          ...style,
        }}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
