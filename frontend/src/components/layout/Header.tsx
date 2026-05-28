import { fakeCurrentUser } from '../../app/auth';
import { Badge, Select } from '../common';

export function Header() {
  const roleLabels = fakeCurrentUser.roles.filter((role) => role !== 'VIEWER');

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-slate-600">
          <span className="font-semibold text-slate-950">OMS Logistics</span>
          <span className="text-slate-300">|</span>
          <span>{fakeCurrentUser.tenantName}</span>
          <span className="text-slate-300">|</span>
          <Badge tone="teal">{fakeCurrentUser.userScopeType}</Badge>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select
            aria-label="client-context"
            className="w-full sm:w-56"
            defaultValue="wellstory"
            options={[
              { label: '고객사: 웰스토리', value: 'wellstory' },
              { label: '전체 고객사', value: 'all' },
            ]}
          />
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-slate-900">{fakeCurrentUser.name}</span>
            {roleLabels.map((role) => (
              <Badge key={role} tone={role === 'ADMIN' ? 'blue' : 'neutral'}>
                {role}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
