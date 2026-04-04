export type BookingType = 'boarding' | 'daycare';
export type BookingRateType = 'boarding' | 'daycare';

/** A date string 'yyyy-MM-dd' or a Date object */
export type BookingDateInput = string | Date;

export interface ProfileRateSettings {
  nightly_rate: number | null;
  daycare_rate: number | null;
  holiday_surcharge: number | null;
  cutoff_time: string | null;
}

export interface BookingDayCalculationRow {
  date: string;
  rate_type: BookingRateType;
  is_holiday: boolean;
  amount: number;
}

export interface BookingPricingResult {
  type: BookingType;
  isHoliday: boolean;
  totalAmount: number;
  nights: number;
}

/** Determine if a booking is daycare (same day) or boarding (multi-day) */
export function detectBookingType(startDate: string, endDate: string): BookingType {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const dayDiff = Math.round((end.getTime() - start.getTime()) / 86400000);
  return dayDiff === 0 ? 'daycare' : 'boarding';
}

/** Sum the amounts across all booking day rows */
export function calculateBookingTotal(days: ReadonlyArray<{ amount: number }>): number {
  return roundCurrency(days.reduce((sum, d) => sum + d.amount, 0));
}

function toDateStr(input: BookingDateInput): string {
  if (typeof input === 'string') return input;
  return input.toISOString().split('T')[0];
}

/**
 * Generate per-day pricing rows for a booking.
 * Daycare = single row for start day. Boarding = one row per night (check-in through day before check-out).
 */
export function generateBookingDays(input: {
  startDate: string;
  endDate: string;
  rates: ProfileRateSettings;
  holidayDates?: Iterable<BookingDateInput>;
  pickupDateTime?: string;
}): BookingDayCalculationRow[] {
  const start = new Date(input.startDate + 'T00:00:00');
  const end = new Date(input.endDate + 'T00:00:00');
  const dayDiff = Math.round((end.getTime() - start.getTime()) / 86400000);

  if (dayDiff < 0) {
    throw new RangeError('Check-out date cannot be before check-in date');
  }

  const nightlyRate = input.rates.nightly_rate ?? 0;
  const daycareRate = input.rates.daycare_rate ?? 0;
  const holidaySurcharge = input.rates.holiday_surcharge ?? 0;

  // Build holiday set
  const holidaySet = new Set<string>();
  if (input.holidayDates) {
    for (const d of input.holidayDates) {
      holidaySet.add(toDateStr(d));
    }
  }

  if (dayDiff === 0) {
    // Daycare — single day
    const dateStr = input.startDate;
    const is_holiday = holidaySet.has(dateStr);
    const amount = roundCurrency(daycareRate + (is_holiday ? holidaySurcharge : 0));
    return [{ date: dateStr, rate_type: 'daycare', is_holiday, amount }];
  }

  // Boarding — one row per night starting at check-in
  const rows: BookingDayCalculationRow[] = [];
  for (let i = 0; i < dayDiff; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const is_holiday = holidaySet.has(dateStr);
    const amount = roundCurrency(nightlyRate + (is_holiday ? holidaySurcharge : 0));
    rows.push({ date: dateStr, rate_type: 'boarding', is_holiday, amount });
  }
  return rows;
}

/**
 * Legacy helper — kept for backward compatibility.
 */
export function calculateBookingPricing(
  startDate: string,
  endDate: string,
  rates: { nightly_rate: number; daycare_rate: number; holiday_surcharge: number },
  isHoliday: boolean,
): BookingPricingResult {
  const days = generateBookingDays({
    startDate,
    endDate,
    rates: { ...rates, cutoff_time: null },
    holidayDates: isHoliday ? [startDate] : [],
  });
  const type = detectBookingType(startDate, endDate);
  const totalAmount = calculateBookingTotal(days);
  return { type, isHoliday, totalAmount, nights: type === 'daycare' ? 0 : days.length };
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}
