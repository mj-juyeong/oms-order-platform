import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Breadcrumb } from './Breadcrumb';
import { Header } from './Header';
import { PageBackProvider, usePageBackOverride } from './PageBackContext';
import { PageHeader } from './PageHeader';
import { Sidebar } from './Sidebar';
import { fakeCurrentUser } from '../../app/auth';
import { routeMetaByPath } from '../../routes/routeMeta';

export function AppShell() {
  return (
    <PageBackProvider>
      <AppShellContent />
    </PageBackProvider>
  );
}

function AppShellContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const meta = resolveRouteMeta(location.pathname);
  const pageBackOverride = usePageBackOverride();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const showBackButton = location.pathname !== '/dashboard' && (pageBackOverride?.visible ?? true);

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
    <div className="min-h-screen overflow-x-clip bg-slate-100 text-slate-900">
      <Sidebar mobileOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
      <div className="min-h-screen min-w-0 overflow-x-clip lg:pl-[260px]">
        <Header onMenuClick={() => setMobileSidebarOpen(true)} />
        <main className="min-w-0 overflow-x-clip px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto flex min-w-0 max-w-[1600px] flex-col gap-5">
            <div className="flex min-w-0 items-center gap-1.5">
              {showBackButton ? (
                <button
                  aria-label={pageBackOverride?.label ?? '이전 화면으로 이동'}
                  className="-ml-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-transparent text-slate-400 transition hover:bg-slate-200/70 hover:text-slate-700 active:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-100 sm:h-8 sm:w-8"
                  onClick={() => handleBackClick(location.pathname, navigate, pageBackOverride)}
                  title={pageBackOverride?.label ?? '이전 화면으로 이동'}
                  type="button"
                >
                  <ArrowLeft aria-hidden="true" size={17} strokeWidth={2.2} />
                </button>
              ) : null}
              <Breadcrumb items={meta.breadcrumbs} />
            </div>
            <PageHeader {...meta} />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function handleBackClick(
  pathname: string,
  navigate: ReturnType<typeof useNavigate>,
  pageBackOverride: ReturnType<typeof usePageBackOverride>,
) {
  if (pageBackOverride?.onBack) {
    pageBackOverride.onBack();
    return;
  }

  if ((window.history.state?.idx ?? 0) > 0) {
    navigate(-1);
    return;
  }

  navigate(fallbackBackPath(pathname), { replace: true });
}

function fallbackBackPath(pathname: string) {
  if (/^\/batches\/[^/]+/.test(pathname)) {
    return '/batches';
  }

  return '/dashboard';
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
