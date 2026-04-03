import { describe, expect, it } from 'vitest';

import {
  buildBookingPricing,
  repriceBookingDays,
  type EditableBookingDay,
} from '@/lib/bookingService';
import type { ProfileRateSettings } from '@/lib/rate-calculator';

const rates: ProfileRateSettings = {
  nightly_rate: 80,
  daycare_rate: 35,
  holiday_surcharge: 25,
  cutoff_time: '11:00',
};

describe('buildBookingPricing', () => {
  it('creates booking days and totals from profile rates', () => {
    expect(
      buildBookingPricing({
        startDate: '2026-07-03',
        endDate: '2026-07-05',
        pickupDateTime: '2026-07-05T12:15:00',
        rates,
        holidayDates: ['2026-07-04'],
      }),
    ).toEqual({
      type: 'boarding',
      isHoliday: true,
      totalAmount: 220,
      days: [
        {
          date: '2026-07-03',
          rate_type: 'boarding',
          is_holiday: false,
          amount: 80,
        },
        {
          date: '2026-07-04',
          rate_type: 'boarding',
          is_holiday: true,
          amount: 105,
        },
        {
          date: '2026-07-05',
          rate_type: 'daycare',
          is_holiday: false,
          amount: 35,
        },
      ],
    });
  });
});

describe('repriceBookingDays', () => {
  it('recalculates amounts when day overrides change', () => {
    const days: EditableBookingDay[] = [
      {
        id: 'day-1',
        booking_id: 'booking-1',
        date: '2026-07-03',
        notes: null,
        rate_type: 'boarding',
        is_holiday: false,
        amount: 80,
      },
      {
        id: 'day-2',
        booking_id: 'booking-1',
        date: '2026-07-04',
        notes: null,
        rate_type: 'boarding',
        is_holiday: false,
        amount: 80,
      },
    ];

    expect(
      repriceBookingDays(days, rates, {
        '2026-07-03': { rate_type: 'daycare' },
        '2026-07-04': { is_holiday: true },
      }),
    ).toEqual({
      isHoliday: true,
      totalAmount: 140,
      days: [
        {
          id: 'day-1',
          booking_id: 'booking-1',
          date: '2026-07-03',
          notes: null,
          rate_type: 'daycare',
          is_holiday: false,
          amount: 35,
        },
        {
          id: 'day-2',
          booking_id: 'booking-1',
          date: '2026-07-04',
          notes: null,
          rate_type: 'boarding',
          is_holiday: true,
          amount: 105,
        },
      ],
    });
  });
});
