interface CodeCellProps {
  value?: string;
  muted?: boolean;
}

export function CodeCell({ muted = false, value }: CodeCellProps) {
  const displayValue = value && value.length > 0 ? value : '-';
  const copyable = Boolean(value && value.length > 0 && value !== '-');

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-md border px-2 py-1 font-mono text-xs ${
        muted ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-slate-200 bg-slate-50 text-slate-900'
      }`}
      onDoubleClick={(event) => {
        if (!copyable) {
          return;
        }

        event.stopPropagation();
        void navigator.clipboard?.writeText(displayValue);
      }}
      title={copyable ? `${displayValue} 더블클릭하여 복사` : displayValue}
    >
      <span className={`max-w-[180px] truncate ${copyable ? 'cursor-copy' : ''}`}>{displayValue}</span>
    </span>
  );
}
