interface CodeCellProps {
  className?: string;
  maxWidthClass?: string;
  value?: string;
  muted?: boolean;
  truncate?: boolean;
  wrap?: boolean;
}

export function CodeCell({
  className = '',
  maxWidthClass = 'max-w-[180px]',
  muted = false,
  truncate = true,
  value,
  wrap = false,
}: CodeCellProps) {
  const displayValue = value && value.length > 0 ? value : '-';
  const copyable = Boolean(value && value.length > 0 && value !== '-');
  const valueClassName = truncate
    ? `${maxWidthClass} truncate`
    : wrap
      ? 'whitespace-pre-wrap break-all'
      : 'whitespace-nowrap';

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-md border px-2 py-1 font-mono text-xs ${
        muted ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-slate-200 bg-slate-50 text-slate-900'
      } ${className}`}
      onDoubleClick={(event) => {
        if (!copyable) {
          return;
        }

        event.stopPropagation();
        void navigator.clipboard?.writeText(displayValue);
      }}
      title={copyable ? `${displayValue} 더블클릭하여 복사` : displayValue}
    >
      <span className={`${valueClassName} ${copyable ? 'cursor-copy' : ''}`}>{displayValue}</span>
    </span>
  );
}
