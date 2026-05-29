import { fakeCurrentUser } from '../../app/auth';
import { Select } from '../common';

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3 text-sm text-slate-600">
          <span className="font-semibold text-slate-950">OMS Logistics</span>
          <span className="h-4 w-px bg-slate-200" aria-hidden="true" />
          <span className="truncate">{fakeCurrentUser.tenantName}</span>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end sm:gap-6">
          <Select
            aria-label="client-context"
            className="w-full sm:w-52"
            defaultValue="wellstory"
            options={[
              { label: '고객사: 웰스토리', value: 'wellstory' },
              { label: '전체 고객사', value: 'all' },
            ]}
          />
          <div className="flex items-center text-sm">
            <span className="font-semibold text-slate-900">{fakeCurrentUser.name}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
