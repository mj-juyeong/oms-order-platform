import { Outlet, useLocation } from 'react-router-dom';
import { Breadcrumb } from './Breadcrumb';
import { Header } from './Header';
import { PageHeader } from './PageHeader';
import { Sidebar } from './Sidebar';
import { routeMetaByPath } from '../../routes/routeMeta';

export function AppShell() {
  const location = useLocation();
  const meta = resolveRouteMeta(location.pathname);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Sidebar />
      <div className="min-h-screen lg:pl-[260px]">
        <Header />
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
