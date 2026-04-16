import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { processOfflineQueue } from '@/lib/sync';
import {
  createBooking as svcCreateBooking,
  updateBookingStatus as svcUpdateBookingStatus,
  type CreateBookingInput,
  type BookingStatus,
} from '@/lib/bookingService';
import { logger } from '@/lib/logger';

export function useOfflineSync() {
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const isRunningRef = useRef(false);
  const wasOnlineRef = useRef<boolean | null>(null);

  const runSync = useCallback(async () => {
    if (isRunningRef.current) return;

    isRunningRef.current = true;
    setIsSyncing(true);

    try {
      const count = await processOfflineQueue(async (mutation) => {
        const p = mutation.payload as Record<string, unknown>;

        if (mutation.kind === 'create-booking') {
          const { userId, ...rest } = p;
          await svcCreateBooking({
            sitterId: userId as string,
            ...(rest as Omit<CreateBookingInput, 'sitterId'>),
          });
        } else if (mutation.kind === 'update-booking') {
          await svcUpdateBookingStatus(
            p.id as string,
            p.userId as string,
            p.status as BookingStatus,
          );
        } else {
          logger.warn('useOfflineSync: unhandled mutation kind', { kind: mutation.kind });
        }
      });

      if (count > 0) {
        setProcessedCount((prev) => prev + count);
        void queryClient.invalidateQueries({ queryKey: ['bookings'] });
        void queryClient.invalidateQueries({ queryKey: ['calendar-bookings'] });
      }
    } finally {
      setIsSyncing(false);
      isRunningRef.current = false;
    }
  }, [queryClient]);

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
