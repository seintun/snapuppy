import { useOfflineSync } from '@/hooks/useOfflineSync';

export function SyncStatusBanner() {
  const { isOnline, isSyncing, processedCount } = useOfflineSync();

  if (!isOnline || (!isSyncing && processedCount === 0)) return null;

  return (
    <div className="bg-sage text-white text-xs font-bold px-3 py-2 text-center">
      {isSyncing ? 'Syncing pending changes…' : `Synced ${processedCount} queued updates`}
    </div>
  );
}
