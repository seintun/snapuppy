import { CloudArrowUp } from '@phosphor-icons/react';
import { useOfflineSync } from '@/hooks/useOfflineSync';

export function SyncStatusBanner() {
  const { isOnline, isSyncing } = useOfflineSync();

  if (!isOnline || !isSyncing) return null;

  return (
    <div className="pointer-events-none fixed left-1/2 top-[calc(10px+env(safe-area-inset-top))] z-[85] w-fit -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-full border border-sage/35 bg-cream/90 px-3.5 py-2 text-[11px] font-black text-bark shadow-[0_8px_18px_rgba(74,55,40,0.12)] backdrop-blur-sm transition-all duration-150 ease-out motion-reduce:transition-none">
        <CloudArrowUp size={15} weight="bold" className="text-sage animate-bounce-subtle" />
        <span className="tracking-[0.04em]">Syncing changes...</span>
      </div>
    </div>
  );
}
