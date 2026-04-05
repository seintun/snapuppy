import { describe, expect, it } from 'vitest';

import { generateRecurringOccurrences } from '@/lib/recurringService';

describe('generateRecurringOccurrences', () => {
  it('builds weekly occurrences for the selected weekdays across the next three months', () => {
    expect(
      generateRecurringOccurrences({
        startDate: '2026-04-06',
        endDate: '2026-04-30',
        repeatDays: ['monday', 'wednesday'],
        repeatPattern: 'weekly',
        horizonMonths: 1,
      }).map((item) => item.date),
    ).toEqual([
      '2026-04-06',
      '2026-04-08',
      '2026-04-13',
      '2026-04-15',
      '2026-04-20',
      '2026-04-22',
      '2026-04-27',
      '2026-04-29',
    ]);
  });

  it('supports biweekly intervals', () => {
    expect(
      generateRecurringOccurrences({
        startDate: '2026-04-06',
        repeatDays: ['monday'],
        repeatPattern: 'biweekly',
        horizonMonths: 1,
      }).map((item) => item.date),
    ).toEqual(['2026-04-06', '2026-04-20']);
  });
});
