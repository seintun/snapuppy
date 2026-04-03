import { Outlet } from 'react-router-dom';
import { BottomTabs } from './BottomTabs';
import { PwaStatus } from './PwaStatus';

export function AppLayout() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <main id="main-content" className="app-content">
        <Outlet />
      </main>

      <BottomTabs />
      <PwaStatus />
    </div>
  );
}
