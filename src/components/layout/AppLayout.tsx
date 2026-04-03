import { Outlet, useLocation } from 'react-router-dom';
import { BottomTabs } from './BottomTabs';
import { PwaStatus } from './PwaStatus';

export function AppLayout() {
  const location = useLocation();
  const isDetailScreen = location.pathname.split('/').filter(Boolean).length > 1;

  return (
    <div className="min-h-dvh max-w-[520px] mx-auto bg-warm-beige relative flex flex-col overflow-x-hidden">
      <a 
        className="absolute left-3 -top-10 z-[100] bg-bark text-cream px-3 py-2 rounded-lg transition-[top] duration-150 focus-visible:top-3" 
        href="#main-content"
      >
        Skip to content
      </a>

      <main 
        id="main-content" 
        className="flex-1 px-4 pt-[calc(16px+env(safe-area-inset-top))] pb-[100px] overscroll-y-auto animate-in fade-in slide-in-from-bottom-2 duration-200"
      >
        <Outlet />
      </main>

      {!isDetailScreen && <BottomTabs />}
      <PwaStatus />
    </div>
  );
}
