interface FullScreenLoadingOverlayProps {
  title: string;
  description?: string;
  detail?: string;
}

export function FullScreenLoadingOverlay({ description, detail, title }: FullScreenLoadingOverlayProps) {
  return (
    <div
      aria-live="polite"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white px-6 py-7 text-center shadow-xl">
        <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-teal-700" />
        <p className="mt-5 text-base font-bold text-slate-950">{title}</p>
        {description ? <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p> : null}
        {detail ? (
          <p className="mt-4 break-all rounded-md bg-slate-50 px-3 py-2 font-mono text-xs font-semibold text-slate-600">
            {detail}
          </p>
        ) : null}
      </div>
    </div>
  );
}
