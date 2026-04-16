import { describe, expect, it } from 'vitest';

import {
  buildBookingPricing,
  buildPaymentCloseUpdate,
  calculateBookingRevenue,
  hasRequiredBookingRates,
  normalizeOptionalTimestamp,
  repriceBookingDays,
  shouldRetryBookingInsertWithoutDropoffTime,
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
        rates,
        holidayDates: ['2026-07-04'],
      }),
    ).toEqual({
      type: 'boarding',
      isHoliday: true,
      totalAmount: 185,
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

describe('calculateBookingRevenue', () => {
  it('adds optional tips to the booking subtotal', () => {
    expect(calculateBookingRevenue(220, 18.5)).toBe(238.5);
    expect(calculateBookingRevenue(220, undefined)).toBe(220);
  });
});

describe('buildPaymentCloseUpdate', () => {
  it('normalizes close-out fields for completed paid bookings', () => {
    expect(
      buildPaymentCloseUpdate({
        tipAmount: 14.239,
        paymentNotes: 'Paid via Venmo',
        paidAt: '2026-07-05T18:30:00.000Z',
      }),
    ).toEqual({
      status: 'completed',
      is_paid: true,
      tip_amount: 14.24,
      payment_notes: 'Paid via Venmo',
      paid_at: '2026-07-05T18:30:00.000Z',
      updated_at: '2026-07-05T18:30:00.000Z',
    });
  });
});

describe('shouldRetryBookingInsertWithoutDropoffTime', () => {
  it('returns true for schema cache errors about bookings.dropoff_time', () => {
    expect(
      shouldRetryBookingInsertWithoutDropoffTime({
        code: 'PGRST204',
        message: "Could not find the 'dropoff_time' column of 'bookings' in the schema cache",
      }),
    ).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(
      shouldRetryBookingInsertWithoutDropoffTime({
        code: 'PGRST204',
        message: "Could not find the 'pickup_time' column of 'bookings' in the schema cache",
      }),
    ).toBe(false);
    expect(shouldRetryBookingInsertWithoutDropoffTime(null)).toBe(false);
  });
});

describe('normalizeOptionalTimestamp', () => {
  it('returns null for missing or blank timestamp inputs', () => {
    expect(normalizeOptionalTimestamp(undefined)).toBeNull();
    expect(normalizeOptionalTimestamp('')).toBeNull();
    expect(normalizeOptionalTimestamp('   ')).toBeNull();
  });

  it('returns ISO-like values unchanged when present', () => {
    expect(normalizeOptionalTimestamp('2026-07-05T11:00:00')).toBe('2026-07-05T11:00:00');
  });
});

describe('hasRequiredBookingRates', () => {
  it('requires both boarding and daycare rates to be greater than zero', () => {
    expect(hasRequiredBookingRates({ nightly_rate: 60, daycare_rate: 35 })).toBe(true);
    expect(hasRequiredBookingRates({ nightly_rate: 0, daycare_rate: 35 })).toBe(false);
    expect(hasRequiredBookingRates({ nightly_rate: 60, daycare_rate: 0 })).toBe(false);
  });
});
