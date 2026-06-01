import { NavLink, useLocation } from 'react-router-dom';
import { LabelDownloadsPage } from './LabelDownloadsPage';
import { LabelLinesPage } from './LabelLinesPage';

const tabs = [
  { label: 'Label 데이터', path: '/label-lines' },
  { label: '다운로드 대상', path: '/downloads/labels' },
];

export function LabelWorkspacePage() {
  const location = useLocation();
  const activeTab = location.pathname === '/downloads/labels' ? 'downloads' : 'lines';

  return (
    <div className="space-y-5">
      <div className="border-b border-slate-200">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <NavLink
              className={({ isActive }) =>
                `inline-flex h-10 items-center justify-center border-b-2 px-4 text-sm font-semibold transition ${
                  isActive
                    ? 'border-teal-700 text-teal-800'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900'
                }`
              }
              key={tab.path}
              to={tab.path}
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
      </div>

      {activeTab === 'downloads' ? <LabelDownloadsPage /> : <LabelLinesPage />}
    </div>
  );
}
