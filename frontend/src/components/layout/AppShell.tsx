import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Breadcrumb } from './Breadcrumb';
import { Header } from './Header';
import { PageHeader } from './PageHeader';
import { Sidebar } from './Sidebar';
import { fakeCurrentUser } from '../../app/auth';
import { routeMetaByPath } from '../../routes/routeMeta';

export function AppShell() {
  const location = useLocation();
  const meta = resolveRouteMeta(location.pathname);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileSidebarOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMobileSidebarOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileSidebarOpen]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Sidebar mobileOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
      <div className="min-h-screen lg:pl-[260px]">
        <Header onMenuClick={() => setMobileSidebarOpen(true)} />
        <main className="px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
            <Breadcrumb items={meta.breadcrumbs} />
            <PageHeader {...meta} />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function resolveRouteMeta(pathname: string) {
  if (routeMetaByPath[pathname]) {
    if (pathname === '/dashboard' && fakeCurrentUser.userScopeType === 'SYSTEM') {
      return {
        ...routeMetaByPath[pathname],
        title: '관리자 대시보드',
        description: 'SYSTEM_ADMIN이 물류사, 고객사, 사용자 현황과 관리 진입점을 확인합니다.',
        primaryAction: undefined,
      };
    }

    return routeMetaByPath[pathname];
  }

  if (/^\/batches\/[^/]+\/validation$/.test(pathname)) {
    const batchId = pathname.split('/')[2];
    const meta = routeMetaByPath['/batches/:batchId/validation'];
    return {
      ...meta,
      secondaryActions: [{ label: '배치 상세', to: `/batches/${batchId}` }],
    };
  }

  if (/^\/batches\/[^/]+$/.test(pathname)) {
    const batchId = pathname.split('/')[2];
    const meta = routeMetaByPath['/batches/:batchId'];
    return {
      ...meta,
      secondaryActions: [{ label: '검증 결과', to: `/batches/${batchId}/validation` }],
    };
  }

  return routeMetaByPath['/dashboard'];
}
