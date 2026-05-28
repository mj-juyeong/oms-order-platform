import { fakeCurrentUser } from '../../app/auth';
import { Badge, Select } from '../common';

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{fakeCurrentUser.tenantName}</span>
          <span className="text-slate-300">|</span>
          <Badge tone="teal">{fakeCurrentUser.clientName}</Badge>
          <span className="text-slate-300">|</span>
          <span>mock user context</span>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select
            aria-label="client-context"
            className="w-full sm:w-56"
            options={[{ label: '웰스토리', value: 'wellstory' }]}
          />
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-slate-900">{fakeCurrentUser.name}</span>
            <Badge tone="neutral">ADMIN</Badge>
          </div>
        </div>
      </div>
    </header>
  );
}
