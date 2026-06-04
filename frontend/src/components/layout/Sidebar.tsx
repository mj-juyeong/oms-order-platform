import { Link, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { omsApi } from '../../api/oms';
import { fakeCurrentUser, hasAnyRole, hasAnyScope } from '../../app/auth';
import { navigationGroups, navigationItems } from '../../app/navigation';
import type { NavigationIconName } from '../../app/navigation';
import {
  acknowledgeWorkItemCount,
  readAcknowledgedWorkItemCount,
  subscribeWorkItemAcknowledgementChanged,
} from '../../app/workItemAcknowledgement';
import type { WorkItemSummary } from '../../types/notification';

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const [workItemSummary, setWorkItemSummary] = useState<WorkItemSummary | null>(null);
  const [, setAcknowledgementVersion] = useState(0);
  const userKey = useMemo(() => userAcknowledgementKey(), []);
  const visibleItems = useMemo(
    () =>
      navigationItems.filter(
        (item) =>
          (!item.roles || hasAnyRole(fakeCurrentUser.roles, item.roles)) &&
          (!item.scopes || hasAnyScope(fakeCurrentUser.userScopeType, item.scopes)),
      ),
    [],
  );
  const groupedItems = useMemo(
    () =>
      Object.entries(navigationGroups)
        .map(([group, label]) => ({
          group,
          label,
          items: visibleItems.filter((item) => item.group === group),
        }))
        .filter((group) => group.items.length > 0),
    [visibleItems],
  );
  const activeGroup = groupedItems.find((group) => group.items.some((item) => isActiveItem(location.pathname, item.path, item.matchPaths)))?.group;
  const [openGroups, setOpenGroups] = useState<string[]>(() => (activeGroup ? [activeGroup] : ['dashboard']));

  useEffect(() => {
    if (!activeGroup) {
      return;
    }

    setOpenGroups((current) => (current.includes(activeGroup) ? current : [...current, activeGroup]));
  }, [activeGroup]);

  useEffect(() => {
    const tenantId = fakeCurrentUser.tenantId ?? undefined;
    if (!tenantId) {
      setWorkItemSummary(null);
      return;
    }

    let ignore = false;
    async function loadSummary() {
      try {
        const result = await omsApi.workItems.summary({
          tenantId,
          clientId: fakeCurrentUser.userScopeType === 'CLIENT' ? fakeCurrentUser.clientId ?? undefined : undefined,
        });
        if (!ignore) setWorkItemSummary(result);
      } catch {
        if (!ignore) setWorkItemSummary(null);
      }
    }

    loadSummary();
    const intervalId = window.setInterval(loadSummary, 20_000);
    return () => {
      ignore = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => subscribeWorkItemAcknowledgementChanged(() => setAcknowledgementVersion((current) => current + 1)), []);

  useEffect(() => {
    if (!workItemSummary) return;

    visibleItems.forEach((item) => {
      if (!item.badgeKey) return;
      const count = workItemSummary[item.badgeKey] ?? 0;
      const acknowledgedCount = readAcknowledgedWorkItemCount(userKey, item.badgeKey);
      if (count < acknowledgedCount) {
        acknowledgeWorkItemCount(userKey, item.badgeKey, count);
      }
    });
  }, [userKey, visibleItems, workItemSummary]);

  useEffect(() => {
    if (!workItemSummary) return;

    const activeItem = visibleItems.find((item) => item.badgeKey && isActiveItem(location.pathname, item.path, item.matchPaths));
    if (!activeItem?.badgeKey) return;

    acknowledgeWorkItemCount(userKey, activeItem.badgeKey, workItemSummary[activeItem.badgeKey] ?? 0);
  }, [location.pathname, userKey, visibleItems, workItemSummary]);

  function toggleGroup(group: string) {
    setOpenGroups((current) => (current.includes(group) ? current.filter((item) => item !== group) : [...current, group]));
  }

  return (
    <>
      {mobileOpen ? <button aria-label="사이드바 닫기" className="fixed inset-0 z-40 bg-slate-950/45 lg:hidden" onClick={onClose} type="button" /> : null}
      <aside
        className={`fixed inset-y-0 left-0 z-50 h-dvh max-h-dvh w-[280px] border-r border-[#c5c5d3] bg-[#0d1c2f] text-[#d5e3fd] shadow-2xl transition-transform duration-200 lg:z-30 lg:w-[260px] lg:translate-x-0 lg:shadow-none ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-[#d5e3fd]/15 px-5 py-5">
            <Link className="block min-w-0" onClick={onClose} to="/dashboard">
              <p className="text-lg font-bold text-white">OMS Admin</p>
              <p className="mt-1 text-xs text-[#b6c4ff]">물류 운영 관리 시스템</p>
            </Link>
            <button
              aria-label="사이드바 닫기"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[#d5e3fd] transition hover:bg-white/10 hover:text-white lg:hidden"
              onClick={onClose}
              type="button"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain py-4">
            {groupedItems.map((group) => {
              const groupOpen = openGroups.includes(group.group);
              const groupActive = activeGroup === group.group;
              const contentId = `sidebar-group-${group.group}`;

              return (
                <div key={group.group}>
                  <button
                    aria-controls={contentId}
                    aria-expanded={groupOpen}
                    className={`flex min-h-10 w-full items-center justify-between gap-3 px-5 py-2.5 text-left text-sm font-semibold transition ${
                      groupActive ? 'text-[#dce1ff]' : 'text-[#90a8ff] hover:text-white'
                    }`}
                    onClick={() => toggleGroup(group.group)}
                    type="button"
                  >
                    <span className="truncate">{group.label}</span>
                    <ChevronIcon className={`h-4 w-4 shrink-0 transition-transform ${groupOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <div
                    className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                      groupOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                    id={contentId}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div className="mt-1 space-y-1">
                        {group.items.map((item) => {
                          const active = isActiveItem(location.pathname, item.path, item.matchPaths);
                          const rawBadgeCount = item.badgeKey && workItemSummary ? workItemSummary[item.badgeKey] : 0;
                          const acknowledgedCount = item.badgeKey ? readAcknowledgedWorkItemCount(userKey, item.badgeKey) : 0;
                          const badgeCount = Math.max(0, rawBadgeCount - acknowledgedCount);

                          return (
                            <Link
                              aria-current={active ? 'page' : undefined}
                              className={`flex min-h-11 items-center gap-3 border-l-4 px-4 py-2.5 text-sm font-semibold transition ${
                                active
                                  ? 'border-[#dce1ff] bg-[#1e3a8a] text-[#dce1ff]'
                                  : 'border-transparent text-[#d5e3fd] hover:bg-[#3d4143] hover:text-white'
                              }`}
                              key={item.path}
                              onClick={onClose}
                              to={item.path}
                            >
                              <SidebarIcon className="h-5 w-5 shrink-0" name={item.icon} />
                              <span className="truncate">{item.label}</span>
                              {badgeCount > 0 ? <SidebarCountBadge count={badgeCount} /> : null}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>
          <div className="border-t border-[#d5e3fd]/15 px-5 py-4">
            <p className="truncate text-xs font-semibold text-white">{fakeCurrentUser.name ?? fakeCurrentUser.loginId}</p>
          </div>
        </div>
      </aside>
    </>
  );
}

function SidebarCountBadge({ count }: { count: number }) {
  return (
    <span className="ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-amber-400 px-1.5 text-xs font-bold leading-none text-slate-950">
      {count > 99 ? '99+' : count}
    </span>
  );
}

function userAcknowledgementKey() {
  return [
    fakeCurrentUser.userScopeType ?? 'ANONYMOUS',
    fakeCurrentUser.tenantId ?? 'none',
    fakeCurrentUser.clientId ?? 'all',
    fakeCurrentUser.id ?? 'anonymous',
  ].join(':');
}

function isActiveItem(pathname: string, path: string, matchPaths: string[] = []) {
  if (pathname === path) {
    return true;
  }

  return matchPaths.some((matchPath) => pathname.startsWith(matchPath));
}

interface IconProps {
  className?: string;
}

type IconComponent = (props: IconProps) => JSX.Element;

function SidebarIcon({ className, name }: IconProps & { name: NavigationIconName }) {
  const Icon = sidebarIcons[name];
  return <Icon className={className} />;
}

function ChevronIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CloseIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function IconBase({ children, className }: IconProps & { children: ReactNode }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
      {children}
    </svg>
  );
}

const sidebarIcons: Record<NavigationIconName, IconComponent> = {
  dashboard: ({ className }) => (
    <IconBase className={className}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h4A1.5 1.5 0 0 1 11 5.5v4A1.5 1.5 0 0 1 9.5 11h-4A1.5 1.5 0 0 1 4 9.5z" />
      <path d="M13 5.5A1.5 1.5 0 0 1 14.5 4h4A1.5 1.5 0 0 1 20 5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4A1.5 1.5 0 0 1 13 9.5z" />
      <path d="M4 14.5A1.5 1.5 0 0 1 5.5 13h4a1.5 1.5 0 0 1 1.5 1.5v4A1.5 1.5 0 0 1 9.5 20h-4A1.5 1.5 0 0 1 4 18.5z" />
      <path d="M13 14.5a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a1.5 1.5 0 0 1-1.5-1.5z" />
    </IconBase>
  ),
  upload: ({ className }) => (
    <IconBase className={className}>
      <path d="M12 15V4" />
      <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
      <path d="M5 15v3.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15" />
    </IconBase>
  ),
  batch: ({ className }) => (
    <IconBase className={className}>
      <path d="M8 6h12" />
      <path d="M8 12h12" />
      <path d="M8 18h12" />
      <path d="M4 6h.01" />
      <path d="M4 12h.01" />
      <path d="M4 18h.01" />
    </IconBase>
  ),
  orders: ({ className }) => (
    <IconBase className={className}>
      <path d="M5 4h14v16H5z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </IconBase>
  ),
  scan: ({ className }) => (
    <IconBase className={className}>
      <path d="M4 7V5.5A1.5 1.5 0 0 1 5.5 4H7" />
      <path d="M17 4h1.5A1.5 1.5 0 0 1 20 5.5V7" />
      <path d="M20 17v1.5a1.5 1.5 0 0 1-1.5 1.5H17" />
      <path d="M7 20H5.5A1.5 1.5 0 0 1 4 18.5V17" />
      <path d="M7 12h10" />
    </IconBase>
  ),
  pl: ({ className }) => (
    <IconBase className={className}>
      <path d="M4 7.5 12 4l8 3.5-8 3.5z" />
      <path d="M4 7.5v9L12 20l8-3.5v-9" />
      <path d="M12 11v9" />
    </IconBase>
  ),
  label: ({ className }) => (
    <IconBase className={className}>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H14l6 6v7.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5z" />
      <path d="M14 4v6h6" />
      <path d="M8 14h8" />
      <path d="M8 17h5" />
    </IconBase>
  ),
  download: ({ className }) => (
    <IconBase className={className}>
      <path d="M12 4v11" />
      <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
      <path d="M5 19h14" />
    </IconBase>
  ),
  externalApi: ({ className }) => (
    <IconBase className={className}>
      <path d="M8 12h8" />
      <path d="M12 8v8" />
      <path d="M4.5 8.5A3.5 3.5 0 0 1 8 5h8a3.5 3.5 0 0 1 0 7h-1" />
      <path d="M19.5 15.5A3.5 3.5 0 0 1 16 19H8a3.5 3.5 0 0 1 0-7h1" />
    </IconBase>
  ),
  productMaster: ({ className }) => (
    <IconBase className={className}>
      <path d="M5 6c0-1.1 3.1-2 7-2s7 .9 7 2-3.1 2-7 2-7-.9-7-2" />
      <path d="M5 6v6c0 1.1 3.1 2 7 2s7-.9 7-2V6" />
      <path d="M5 12v6c0 1.1 3.1 2 7 2s7-.9 7-2v-6" />
    </IconBase>
  ),
  storeRouteMaster: ({ className }) => (
    <IconBase className={className}>
      <path d="M6 17H4V7h10v10H9" />
      <path d="M14 11h3l3 3v3h-2" />
      <path d="M9 17a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0" />
      <path d="M18 17a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0" />
    </IconBase>
  ),
  users: ({ className }) => (
    <IconBase className={className}>
      <path d="M16 19v-1.5A3.5 3.5 0 0 0 12.5 14h-5A3.5 3.5 0 0 0 4 17.5V19" />
      <path d="M10 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6" />
      <path d="M20 19v-1.5a3.5 3.5 0 0 0-2.5-3.35" />
      <path d="M16 5.2a3 3 0 0 1 0 5.6" />
    </IconBase>
  ),
  audit: ({ className }) => (
    <IconBase className={className}>
      <path d="M12 8v5l3 2" />
      <path d="M4 12a8 8 0 1 0 2.3-5.65" />
      <path d="M4 4v4h4" />
    </IconBase>
  ),
};
