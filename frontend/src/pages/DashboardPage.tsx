export function DashboardPage() {
  return (
    <main className="min-h-screen bg-oms-panel text-oms-ink">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-10">
        <div className="border-b border-oms-line pb-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-oms-accent">OMS Platform</p>
          <h1 className="mt-3 text-3xl font-bold">Dashboard</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Phase 0 frontend scaffold is ready. Operational widgets, upload flows, batch search, master screens, and
            live API integration are intentionally not implemented yet.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {['Vite React TypeScript', 'Tailwind CSS', 'React Router'].map((label) => (
            <div key={label} className="rounded-lg border border-oms-line bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Ready</p>
              <p className="mt-2 text-lg font-semibold">{label}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
