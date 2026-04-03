import { Outlet, useLocation } from 'react-router-dom';
import { BottomTabs } from './BottomTabs';
import { PwaStatus } from './PwaStatus';

export function AppLayout() {
  const location = useLocation();
  const isDetailScreen = location.pathname.split('/').filter(Boolean).length > 1;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <main id="main-content" className="app-content">
        <Outlet />
      </main>

      {!isDetailScreen && <BottomTabs />}
      <PwaStatus />
    </div>
  );
}
