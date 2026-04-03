import { describe, expect, it } from 'vitest';

import {
  applyCutoffDaycareCharge,
  calculateBookingTotal,
  detectBookingType,
  generateBookingDays,
  type ProfileRateSettings,
} from '@/lib/rate-calculator';

const rates: ProfileRateSettings = {
  nightly_rate: 75,
  daycare_rate: 35,
  holiday_surcharge: 20,
  cutoff_time: '12:00',
};

describe('detectBookingType', () => {
  it('returns daycare for same-day bookings and boarding otherwise', () => {
    expect(detectBookingType('2026-04-02', '2026-04-02')).toBe('daycare');
    expect(detectBookingType('2026-04-02', '2026-04-03')).toBe('boarding');
  });
});

describe('generateBookingDays', () => {
  it('builds a single daycare row for same-day bookings', () => {
    expect(
      generateBookingDays({
        startDate: '2026-04-02',
        endDate: '2026-04-02',
        rates,
      }),
    ).toEqual([
      {
        date: '2026-04-02',
        rate_type: 'daycare',
        is_holiday: false,
        amount: 35,
      },
    ]);
  });

  it('builds per-night boarding rows and applies holiday surcharges', () => {
    expect(
      generateBookingDays({
        startDate: '2026-12-24',
        endDate: '2026-12-26',
        rates,
        holidayDates: ['2026-12-25'],
      }),
    ).toEqual([
      {
        date: '2026-12-24',
        rate_type: 'boarding',
        is_holiday: false,
        amount: 75,
      },
      {
        date: '2026-12-25',
        rate_type: 'boarding',
        is_holiday: true,
        amount: 95,
      },
    ]);
  });

  it('adds a pickup-day daycare row after the cutoff time', () => {
    expect(
      generateBookingDays({
        startDate: '2026-04-02',
        endDate: '2026-04-03',
        rates,
        pickupDateTime: '2026-04-03T12:00:00',
      }),
    ).toEqual([
      {
        date: '2026-04-02',
        rate_type: 'boarding',
        is_holiday: false,
        amount: 75,
      },
      {
        date: '2026-04-03',
        rate_type: 'daycare',
        is_holiday: false,
        amount: 35,
      },
    ]);
  });

  it('supports array and record override inputs', () => {
    expect(
      generateBookingDays({
        startDate: '2026-04-02',
        endDate: '2026-04-04',
        rates,
        overrides: [
          {
            date: '2026-04-02',
            rateType: 'daycare',
            isHoliday: true,
          },
        ],
      }),
    ).toEqual([
      {
        date: '2026-04-02',
        rate_type: 'daycare',
        is_holiday: true,
        amount: 55,
      },
      {
        date: '2026-04-03',
        rate_type: 'boarding',
        is_holiday: false,
        amount: 75,
      },
    ]);

    expect(
      generateBookingDays({
        startDate: '2026-04-02',
        endDate: '2026-04-04',
        rates,
        overrides: {
          '2026-04-03': {
            amount: 120,
          },
        },
      }),
    ).toEqual([
      {
        date: '2026-04-02',
        rate_type: 'boarding',
        is_holiday: false,
        amount: 75,
      },
      {
        date: '2026-04-03',
        rate_type: 'boarding',
        is_holiday: false,
        amount: 120,
      },
    ]);
  });
});

describe('calculateBookingTotal', () => {
  it('sums daily rows into a booking total', () => {
    const days = generateBookingDays({
      startDate: '2026-12-24',
      endDate: '2026-12-26',
      rates,
      holidayDates: ['2026-12-25'],
    });

    expect(calculateBookingTotal(days)).toBe(170);
  });
});

describe('applyCutoffDaycareCharge', () => {
  it('adds a chargeable day at or after the cutoff time', () => {
    expect(applyCutoffDaycareCharge(2, '12:00', '2026-04-04T11:59:59')).toBe(2);
    expect(applyCutoffDaycareCharge(2, '12:00', '2026-04-04T12:00:00')).toBe(3);
  });
});
