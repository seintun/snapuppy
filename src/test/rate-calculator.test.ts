import { describe, expect, it } from 'vitest';

import { calculateBookingPricing } from '@/lib/rate-calculator';

const rates = {
  nightly_rate: 75,
  daycare_rate: 35,
  holiday_boarding_rate: 95,
  holiday_daycare_rate: 50,
};

describe('calculateBookingPricing', () => {
  describe('daycare (same day)', () => {
    it('returns daycare type with 0 nights for same start and end date', () => {
      const result = calculateBookingPricing('2026-04-02', '2026-04-02', rates, false);

      expect(result).toEqual({
        type: 'daycare',
        isHoliday: false,
        totalAmount: 35,
        nights: 0,
      });
    });

    it('applies holiday rate for daycare on holiday', () => {
      const result = calculateBookingPricing('2026-12-25', '2026-12-25', rates, true);

      expect(result).toEqual({
        type: 'daycare',
        isHoliday: true,
        totalAmount: 50,
        nights: 0,
      });
    });
  });

  describe('boarding (multi-day)', () => {
    it('returns boarding type with correct nights for multi-day booking', () => {
      const result = calculateBookingPricing('2026-12-24', '2026-12-26', rates, false);

      expect(result).toEqual({
        type: 'boarding',
        isHoliday: false,
        totalAmount: 150,
        nights: 2,
      });
    });

    it('applies holiday rate for boarding on holiday', () => {
      const result = calculateBookingPricing('2026-12-24', '2026-12-26', rates, true);

      expect(result).toEqual({
        type: 'boarding',
        isHoliday: true,
        totalAmount: 190,
        nights: 2,
      });
    });

    it('handles single-night boarding (consecutive days)', () => {
      const result = calculateBookingPricing('2026-04-02', '2026-04-03', rates, false);

      expect(result).toEqual({
        type: 'boarding',
        isHoliday: false,
        totalAmount: 75,
        nights: 1,
      });
    });
  });

  describe('error handling', () => {
    it('throws RangeError when end date is before start date', () => {
      expect(() => calculateBookingPricing('2026-04-04', '2026-04-02', rates, false)).toThrow(
        RangeError,
      );

      expect(() => calculateBookingPricing('2026-04-04', '2026-04-02', rates, false)).toThrow(
        'Check-out date cannot be before check-in date',
      );
    });
  });

  describe('currency rounding', () => {
    it('rounds to 2 decimal places', () => {
      const ratesWithCents = {
        nightly_rate: 49.99,
        daycare_rate: 29.99,
        holiday_boarding_rate: 59.98,
        holiday_daycare_rate: 39.98,
      };

      const result = calculateBookingPricing('2026-06-15', '2026-06-18', ratesWithCents, false);

      expect(result.totalAmount).toBe(149.97);
    });
  });
});
