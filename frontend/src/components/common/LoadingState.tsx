export function LoadingState({ label = '데이터를 불러오는 중입니다.' }: { label?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
      <div className="mt-4 h-3 w-full animate-pulse rounded bg-slate-100" />
      <div className="mt-2 h-3 w-4/5 animate-pulse rounded bg-slate-100" />
      <p className="mt-4 text-sm text-slate-500">{label}</p>
    </div>
  );
}
