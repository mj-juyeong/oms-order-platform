import { Link } from 'react-router-dom';
import { fakeCurrentUser, hasAnyRole, hasAnyScope } from '../../app/auth';
import type { RouteAction } from '../../routes/routeMeta';

interface PageHeaderProps {
  title: string;
  description: string;
  notice?: string;
  primaryAction?: RouteAction;
  secondaryActions?: RouteAction[];
}

export function PageHeader({ description, notice, primaryAction, secondaryActions = [], title }: PageHeaderProps) {
  const visiblePrimaryAction = primaryAction && isVisibleAction(primaryAction) ? primaryAction : null;
  const visibleSecondaryActions = secondaryActions.filter(isVisibleAction);

  return (
    <section className="border-b border-slate-200 pb-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-normal text-slate-950">{title}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
        </div>
        {visiblePrimaryAction || visibleSecondaryActions.length > 0 ? (
          <div className="flex w-full flex-wrap gap-3 sm:w-auto sm:justify-end sm:gap-4">
            {visibleSecondaryActions.map((action) => (
              <Link
                className="inline-flex h-10 min-w-28 items-center justify-center rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                key={action.to}
                to={action.to}
              >
                {action.label}
              </Link>
            ))}
            {visiblePrimaryAction ? (
              <Link
                className="inline-flex h-10 min-w-28 items-center justify-center rounded-md border border-teal-700 bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800"
                to={visiblePrimaryAction.to}
              >
                {visiblePrimaryAction.label}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
      {notice ? (
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          {notice}
        </div>
      ) : null}
    </section>
  );
}

function isVisibleAction(action: RouteAction) {
  const roleAllowed = !action.roles || hasAnyRole(fakeCurrentUser.roles, action.roles);
  const scopeAllowed = !action.scopes || hasAnyScope(fakeCurrentUser.userScopeType, action.scopes);
  return roleAllowed && scopeAllowed;
}
