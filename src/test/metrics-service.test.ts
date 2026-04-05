import { describe, expect, it } from 'vitest';

import { computeDashboardMetrics } from '@/lib/metricsService';

describe('computeDashboardMetrics', () => {
  it('aggregates revenue, occupancy, dog counts, and top dogs for the active month', () => {
    const metrics = computeDashboardMetrics({
      now: new Date('2026-04-20T12:00:00.000Z'),
      bookings: [
        {
          id: 'booking-1',
          dog_id: 'dog-1',
          start_date: '2026-04-03',
          end_date: '2026-04-05',
          total_amount: 200,
          tip_amount: 20,
          status: 'completed',
        },
        {
          id: 'booking-2',
          dog_id: 'dog-1',
          start_date: '2026-04-10',
          end_date: '2026-04-10',
          total_amount: 35,
          tip_amount: 0,
          status: 'active',
        },
        {
          id: 'booking-3',
          dog_id: 'dog-2',
          start_date: '2026-04-18',
          end_date: '2026-04-19',
          total_amount: 160,
          tip_amount: 12,
          status: 'active',
        },
      ],
      dogs: [
        { id: 'dog-1', name: 'Mochi', created_at: '2026-04-02T00:00:00.000Z' },
        { id: 'dog-2', name: 'Juniper', created_at: '2026-03-28T00:00:00.000Z' },
      ],
    });

    expect(metrics.monthlyRevenue).toBe(427);
    expect(metrics.averageBookingValue).toBe(142.33);
    expect(metrics.activeDogs).toBe(2);
    expect(metrics.newDogsThisMonth).toBe(1);
    expect(metrics.occupancyRate).toBe(10);
    expect(metrics.topDogs).toEqual([
      { dogId: 'dog-1', name: 'Mochi', bookingCount: 2 },
      { dogId: 'dog-2', name: 'Juniper', bookingCount: 1 },
    ]);
  });
});
