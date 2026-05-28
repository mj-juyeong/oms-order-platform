import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800 disabled:bg-slate-300',
  secondary: 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:text-slate-400',
  danger: 'border-red-600 bg-red-600 text-white hover:bg-red-700 disabled:bg-slate-300',
  ghost: 'border-transparent bg-transparent text-slate-700 hover:bg-slate-100 disabled:text-slate-400',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ children, className = '', size = 'md', variant = 'secondary', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md border font-semibold transition ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
