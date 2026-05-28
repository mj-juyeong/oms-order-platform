import { Link, useLocation } from 'react-router-dom';
import { fakeCurrentUser, hasAnyRole } from '../../app/auth';
import { navigationGroups, navigationItems } from '../../app/navigation';

export function Sidebar() {
  const location = useLocation();
  const visibleItems = navigationItems.filter((item) => !item.roles || hasAnyRole(fakeCurrentUser.roles, item.roles));
  const groupedItems = Object.entries(navigationGroups).map(([group, label]) => ({
    group,
    label,
    items: visibleItems.filter((item) => item.group === group),
  })).filter((group) => group.items.length > 0);

  return (
    <aside className="border-r border-slate-200 bg-slate-950 text-white lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:w-64">
      <div className="flex min-h-full flex-col lg:h-full">
        <div className="border-b border-white/10 px-5 py-5">
          <Link className="block" to="/dashboard">
            <p className="text-lg font-bold">OMS Admin</p>
            <p className="mt-1 text-xs text-slate-400">물류 운영 관리 시스템</p>
          </Link>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {groupedItems.map((group) => (
            <div key={group.group}>
              <p className="px-2 text-xs font-semibold text-slate-500">{group.label}</p>
              <div className="mt-2 space-y-1">
                {group.items.map((item) => {
                  const active = isActiveItem(location.pathname, item.path, item.matchPaths);

                  return (
                    <Link
                      aria-current={active ? 'page' : undefined}
                      className={`block rounded-md px-3 py-2.5 transition ${
                        active ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                      key={item.path}
                      to={item.path}
                    >
                      <span className="block text-sm font-semibold">{item.label}</span>
                      <span className={`mt-0.5 block text-xs ${active ? 'text-slate-600' : 'text-slate-500'}`}>
                        {item.description}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 px-5 py-4">
          <p className="text-xs font-semibold text-slate-300">{fakeCurrentUser.name}</p>
          <p className="mt-1 text-xs text-slate-500">차수별 조회/다운로드는 추후 기능</p>
        </div>
      </div>
    </aside>
  );
}

function isActiveItem(pathname: string, path: string, matchPaths: string[] = []) {
  if (pathname === path) {
    return true;
  }

  return matchPaths.some((matchPath) => pathname.startsWith(matchPath));
}
