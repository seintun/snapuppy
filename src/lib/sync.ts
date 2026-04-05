import { dequeueOfflineMutation, type OfflineMutation } from '@/lib/offlineQueue';

export type SyncMutationHandler = (mutation: OfflineMutation) => Promise<void>;

export async function processOfflineQueue(handler: SyncMutationHandler): Promise<number> {
  let processed = 0;

  // FIFO processing to preserve mutation order.
  while (true) {
    const mutation = await dequeueOfflineMutation();
    if (!mutation) break;
    await handler(mutation);
    processed += 1;
  }

  return processed;
}
