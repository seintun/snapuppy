import { useCallback, useEffect, useRef, useState } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { processOfflineQueue } from '@/lib/sync';

export function useOfflineSync() {
  const isOnline = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const isRunningRef = useRef(false);
  const wasOnlineRef = useRef<boolean | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const runSync = useCallback(async () => {
    if (isRunningRef.current) return;

    isRunningRef.current = true;
    if (mountedRef.current) {
      setIsSyncing(true);
    }

    try {
      const count = await processOfflineQueue(async () => {
        // Mutations are already persisted; this hook only drains and tracks queue progress.
      });

      if (mountedRef.current && count > 0) {
        setProcessedCount((prev) => prev + count);
      }
    } finally {
      if (mountedRef.current) {
        setIsSyncing(false);
      }
      isRunningRef.current = false;
    }
  }, []);

  useEffect(() => {
    const wasOnline = wasOnlineRef.current;
    const isFirstEvaluation = wasOnline === null;
    const reconnected = wasOnline === false && isOnline;

    wasOnlineRef.current = isOnline;

    if (!isOnline) return;
    if (isFirstEvaluation || reconnected) {
      void runSync();
    }
  }, [isOnline, runSync]);

  return { isOnline, isSyncing, processedCount };
}
