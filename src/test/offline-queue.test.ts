import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  clearOfflineQueue,
  dequeueOfflineMutation,
  enqueueOfflineMutation,
  listOfflineMutations,
} from '@/lib/offlineQueue';

describe('offlineQueue', () => {
  beforeEach(async () => {
    await clearOfflineQueue();
  });

  afterEach(async () => {
    await clearOfflineQueue();
  });

  it('stores mutations in fifo order', async () => {
    await enqueueOfflineMutation({
      kind: 'close-booking',
      payload: { bookingId: 'booking-1', tipAmount: 12 },
    });
    await enqueueOfflineMutation({
      kind: 'close-booking',
      payload: { bookingId: 'booking-2', tipAmount: 0 },
    });

    expect(await listOfflineMutations()).toHaveLength(2);

    const first = await dequeueOfflineMutation();
    const second = await dequeueOfflineMutation();

    expect(first?.payload).toEqual({ bookingId: 'booking-1', tipAmount: 12 });
    expect(second?.payload).toEqual({ bookingId: 'booking-2', tipAmount: 0 });
    expect(await listOfflineMutations()).toEqual([]);
  });
});
