import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { BottomTabs } from './BottomTabs';
import { Fab } from './FAB';
import { PwaStatus } from './PwaStatus';
import { SlideUpSheet } from '@/components/ui/SlideUpSheet';

export function AppLayout() {
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <main id="main-content" className="app-content">
        <Outlet />
      </main>

      <Fab onClick={() => setIsQuickAddOpen(true)} />
      <BottomTabs />
      <PwaStatus />

      <SlideUpSheet
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        title="Quick Booking"
      >
        <p style={{ marginTop: 0, color: 'var(--bark-light)' }}>
          Booking creation form lands in Step 6.
        </p>
      </SlideUpSheet>
    </div>
  );
}
