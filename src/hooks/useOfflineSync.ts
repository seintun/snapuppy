import { useEffect, useState } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { processOfflineQueue } from '@/lib/sync';

export function useOfflineSync() {
  const isOnline = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);

  useEffect(() => {
    if (!isOnline || isSyncing) return;

    let cancelled = false;

    const run = async () => {
      setIsSyncing(true);
      try {
        const count = await processOfflineQueue(async () => {
          // Mutations are already persisted; this hook only drains and tracks queue progress.
        });
        if (!cancelled) {
          setProcessedCount((prev) => prev + count);
        }
      } finally {
        if (!cancelled) setIsSyncing(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [isOnline, isSyncing]);

  return { isOnline, isSyncing, processedCount };
}
