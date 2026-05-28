import { NavLink } from 'react-router-dom';
import { navigationGroups, navigationItems } from '../../app/navigation';

export function Sidebar() {
  const groupedItems = Object.entries(navigationGroups).map(([group, label]) => ({
    group,
    label,
    items: navigationItems.filter((item) => item.group === group),
  }));

  return (
    <aside className="border-r border-slate-200 bg-slate-950 text-white lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:w-64">
      <div className="flex h-full flex-col">
        <div className="border-b border-white/10 px-5 py-5">
          <p className="text-lg font-bold">OMS Platform</p>
          <p className="mt-1 text-xs text-slate-400">운영자 업무 콘솔</p>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {groupedItems.map((group) => (
            <div key={group.group}>
              <p className="px-2 text-xs font-semibold uppercase text-slate-500">{group.label}</p>
              <div className="mt-2 space-y-1">
                {group.items.map((item) => (
                  <NavLink
                    className={({ isActive }) =>
                      `block rounded-md px-3 py-2 text-sm font-medium transition ${
                        isActive ? 'bg-white text-slate-950' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`
                    }
                    key={item.path}
                    to={item.path}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 px-5 py-4 text-xs text-slate-400">
          차수별 조회/다운로드는 추후 기능으로 분리
        </div>
      </div>
    </aside>
  );
}
