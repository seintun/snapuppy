import type { Tables } from '@/types/database';

export type BookingDateInput = Date | string;
export type BookingType = 'boarding' | 'daycare';
export type BookingRateType = BookingType;

export type ProfileRateSettings = Pick<
  Tables<'profiles'>,
  'nightly_rate' | 'daycare_rate' | 'holiday_surcharge' | 'cutoff_time'
>;

export interface BookingDayCalculationRow
  extends Omit<Pick<Tables<'booking_days'>, 'date' | 'rate_type' | 'is_holiday' | 'amount'>, 'rate_type'> {
  rate_type: BookingRateType;
}

export interface BookingDayOverrideInput {
  date: BookingDateInput;
  amount?: number;
  isHoliday?: boolean;
  is_holiday?: boolean;
  rateType?: BookingRateType;
  rate_type?: BookingRateType;
}

export type BookingDayOverridesInput =
  | ReadonlyArray<BookingDayOverrideInput>
  | Record<string, Omit<BookingDayOverrideInput, 'date'>>;

export interface GenerateBookingDaysParams {
  startDate: BookingDateInput;
  endDate: BookingDateInput;
  rates: ProfileRateSettings;
  holidayDates?: Iterable<BookingDateInput>;
  overrides?: BookingDayOverridesInput;
  cutoffTime?: string;
  pickupDateTime?: BookingDateInput;
}

interface NormalizedBookingDayOverride {
  amount?: number;
  is_holiday?: boolean;
  rate_type?: BookingRateType;
}

const ISO_DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;
const CUTOFF_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export function detectBookingType(startDate: BookingDateInput, endDate: BookingDateInput): BookingType {
  const startKey = toDateKey(startDate);
  const endKey = toDateKey(endDate);

  return startKey === endKey ? 'daycare' : 'boarding';
}

export function generateBookingDays({
  startDate,
  endDate,
  rates,
  holidayDates,
  overrides,
  cutoffTime,
  pickupDateTime,
}: GenerateBookingDaysParams): BookingDayCalculationRow[] {
  assertValidRates(rates);

  const bookingType = detectBookingType(startDate, endDate);
  const startKey = toDateKey(startDate);
  const endKey = toDateKey(endDate);

  if (compareDateKeys(endKey, startKey) < 0) {
    throw new RangeError('endDate must be on or after startDate');
  }

  const holidaySet = new Set(Array.from(holidayDates ?? [], toDateKey));
  const normalizedOverrides = normalizeOverrides(overrides);

  if (bookingType === 'daycare') {
    return [buildBookingDayRow(startKey, 'daycare', rates, holidaySet, normalizedOverrides)];
  }

  const baseBoardingDays = getDateRange(startKey, endKey).map((date) =>
    buildBookingDayRow(date, 'boarding', rates, holidaySet, normalizedOverrides),
  );

  const appliedCutoffTime = cutoffTime ?? rates.cutoff_time;
  const totalChargeableDays = applyCutoffDaycareCharge(
    baseBoardingDays.length,
    appliedCutoffTime,
    pickupDateTime,
  );

  if (totalChargeableDays > baseBoardingDays.length) {
    baseBoardingDays.push(
      buildBookingDayRow(endKey, 'daycare', rates, holidaySet, normalizedOverrides),
    );
  }

  return baseBoardingDays;
}

export function calculateBookingTotal(
  days: ReadonlyArray<Pick<BookingDayCalculationRow, 'amount'>>,
): number {
  return toCurrencyAmount(days.reduce((total, day) => total + toCents(day.amount), 0) / 100);
}

export function applyCutoffDaycareCharge(
  baseDays: number,
  cutoffTime: string,
  pickupDateTime?: BookingDateInput,
): number {
  if (!Number.isInteger(baseDays) || baseDays < 0) {
    throw new RangeError('baseDays must be a non-negative integer');
  }

  if (!pickupDateTime) {
    return baseDays;
  }

  const [cutoffHour, cutoffMinute, cutoffSecond] = parseCutoffTime(cutoffTime);
  const pickup = toDateTime(pickupDateTime);

  const pickupSeconds =
    pickup.getHours() * 60 * 60 + pickup.getMinutes() * 60 + pickup.getSeconds();
  const cutoffSeconds = cutoffHour * 60 * 60 + cutoffMinute * 60 + cutoffSecond;

  return pickupSeconds >= cutoffSeconds ? baseDays + 1 : baseDays;
}

function buildBookingDayRow(
  date: string,
  defaultRateType: BookingRateType,
  rates: ProfileRateSettings,
  holidaySet: ReadonlySet<string>,
  overrides: ReadonlyMap<string, NormalizedBookingDayOverride>,
): BookingDayCalculationRow {
  const override = overrides.get(date);
  const rate_type = override?.rate_type ?? defaultRateType;
  const is_holiday = override?.is_holiday ?? holidaySet.has(date);
  const amount = toCurrencyAmount(
    override?.amount ?? resolveDailyAmount(rate_type, rates, is_holiday),
  );

  return {
    date,
    rate_type,
    is_holiday,
    amount,
  };
}

function normalizeOverrides(
  overrides?: BookingDayOverridesInput,
): ReadonlyMap<string, NormalizedBookingDayOverride> {
  if (!overrides) {
    return new Map();
  }

  if (Array.isArray(overrides)) {
    return new Map(
      overrides.map((override) => [
        toDateKey(override.date),
        {
          amount: override.amount,
          is_holiday: override.isHoliday ?? override.is_holiday,
          rate_type: override.rateType ?? override.rate_type,
        },
      ]),
    );
  }

  return new Map(
    Object.entries(overrides).map(([date, override]) => [
      toDateKey(date),
      {
        amount: override.amount,
        is_holiday: override.isHoliday ?? override.is_holiday,
        rate_type: override.rateType ?? override.rate_type,
      },
    ]),
  );
}

function resolveDailyAmount(
  rateType: BookingRateType,
  rates: ProfileRateSettings,
  isHoliday: boolean,
): number {
  const baseRate = rateType === 'boarding' ? rates.nightly_rate : rates.daycare_rate;
  const surcharge = isHoliday ? rates.holiday_surcharge : 0;

  return toCurrencyAmount(baseRate + surcharge);
}

function assertValidRates(rates: ProfileRateSettings): void {
  for (const [name, value] of Object.entries({
    nightly_rate: rates.nightly_rate,
    daycare_rate: rates.daycare_rate,
    holiday_surcharge: rates.holiday_surcharge,
  })) {
    if (!Number.isFinite(value)) {
      throw new TypeError(`${name} must be a finite number`);
    }
  }

  parseCutoffTime(rates.cutoff_time);
}

function parseCutoffTime(cutoffTime: string): [number, number, number] {
  if (!CUTOFF_TIME_PATTERN.test(cutoffTime)) {
    throw new RangeError('cutoffTime must be in HH:MM or HH:MM:SS format');
  }

  const [hours, minutes, seconds = '00'] = cutoffTime.split(':');

  return [Number(hours), Number(minutes), Number(seconds)];
}

function getDateRange(startKey: string, endKey: string): string[] {
  const start = parseDateKey(startKey);
  const end = parseDateKey(endKey);
  const span = Math.round((end.getTime() - start.getTime()) / DAY_MS);

  return Array.from({ length: span }, (_, index) =>
    formatDateKey(new Date(start.getTime() + index * DAY_MS)),
  );
}

function compareDateKeys(left: string, right: string): number {
  return left.localeCompare(right);
}

function toDateKey(input: BookingDateInput): string {
  if (typeof input === 'string') {
    const match = input.match(ISO_DATE_PREFIX);

    if (match) {
      return match[0];
    }
  }

  const value = toDateTime(input);

  return [value.getFullYear(), pad(value.getMonth() + 1), pad(value.getDate())].join('-');
}

function parseDateKey(dateKey: string): Date {
  const match = dateKey.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/);

  if (!match) {
    throw new RangeError(`Invalid date: ${dateKey}`);
  }

  const [, year, month, day] = match;

  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

function formatDateKey(date: Date): string {
  return [date.getUTCFullYear(), pad(date.getUTCMonth() + 1), pad(date.getUTCDate())].join('-');
}

function toDateTime(input: BookingDateInput): Date {
  const value =
    input instanceof Date
      ? new Date(input.getTime())
      : new Date(ISO_DATE_PREFIX.test(input) && input.length === 10 ? `${input}T00:00:00` : input);

  if (Number.isNaN(value.getTime())) {
    throw new RangeError(`Invalid date input: ${String(input)}`);
  }

  return value;
}

function toCents(amount: number): number {
  if (!Number.isFinite(amount)) {
    throw new TypeError('amount must be a finite number');
  }

  return Math.round(amount * 100);
}

function toCurrencyAmount(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}
