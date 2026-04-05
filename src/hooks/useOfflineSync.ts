import { useEffect, useState, useCallback } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { processQueue, getQueueLength } from '@/lib/offlineQueue';
import { useToast } from '@/components/ui/useToast';

type SyncStatus = 'idle' | 'syncing' | 'error';

export function useOfflineSync() {
  const { isOnline } = useOnlineStatus();
  const { addToast } = useToast();
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [pendingCount, setPendingCount] = useState(0);

  const checkPending = useCallback(async () => {
    const count = await getQueueLength();
    setPendingCount(count);
  }, []);

  useEffect(() => {
    checkPending();
  }, [checkPending]);

  useEffect(() => {
    if (!isOnline || status === 'syncing') return;

    const sync = async () => {
      const hasPending = await getQueueLength();
      if (hasPending === 0) return;

      setStatus('syncing');
      addToast('Syncing offline changes...', 'info');

      const results = await processQueue();

      if (results.failed > 0) {
        setStatus('error');
        addToast(`Sync failed: ${results.failed} changes could not be saved`, 'error');
      } else {
        setStatus('idle');
        addToast(`Synced ${results.success} change${results.success !== 1 ? 's' : ''}`, 'success');
      }

      await checkPending();
    };

    sync();
  }, [isOnline, status, addToast, checkPending]);

  return { status, pendingCount, isOnline };
}
