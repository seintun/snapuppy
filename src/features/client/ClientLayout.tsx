import { Outlet } from 'react-router-dom';
import { clearClientSession } from './clientAuth';

export function ClientLayout() {
  return (
    <div className="min-h-dvh bg-warm-beige">
      <header className="sticky top-0 z-10 bg-cream/90 backdrop-blur border-b border-pebble/30 px-4 py-3 flex items-center justify-between">
        <h1 className="text-sm font-black text-bark uppercase tracking-wide">Client Portal</h1>
        <button
          type="button"
          className="btn-danger !px-3 !py-1.5 !text-xs"
          onClick={() => {
            clearClientSession();
            window.location.reload();
          }}
        >
          Logout
        </button>
      </header>
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  );
}
