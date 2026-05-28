import { Outlet, useLocation } from 'react-router-dom';
import { Breadcrumb } from './Breadcrumb';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { routeMetaByPath } from '../../routes/routeMeta';

export function AppShell() {
  const location = useLocation();
  const meta = resolveRouteMeta(location.pathname);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Sidebar />
      <div className="min-h-screen lg:pl-64">
        <Header />
        <main className="px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
            <Breadcrumb items={meta.breadcrumbs} />
            <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-normal text-slate-950">{meta.title}</h1>
                <p className="mt-1 text-sm text-slate-500">{meta.description}</p>
              </div>
              {meta.notice ? <p className="max-w-xl text-sm text-slate-500">{meta.notice}</p> : null}
            </div>
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
    return routeMetaByPath['/batches/:batchId/validation'];
  }

  if (/^\/batches\/[^/]+$/.test(pathname)) {
    return routeMetaByPath['/batches/:batchId'];
  }

  return routeMetaByPath['/dashboard'];
}
