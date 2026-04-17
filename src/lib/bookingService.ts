import {
  calculateBookingTotal,
  detectBookingType,
  generateBookingDays,
  type BookingDateInput,
  type BookingDayCalculationRow,
  type BookingRateType,
  type BookingType,
  type ProfileRateSettings,
} from '@/lib/rate-calculator';
import { supabase } from '@/lib/supabase';
import type { InvoiceOverrides } from '@/lib/invoiceGenerator';
import type { Json, Tables, TablesInsert } from '@/types/database';
import { logger } from './logger';
import { DatabaseError } from './errors';

type BookingRow = Tables<'bookings'>;
type BookingDayRow = Tables<'booking_days'>;
type DogRow = Tables<'dogs'>;
type ProfileRow = Tables<'profiles'>;

export type BookingStatus = 'upcoming' | 'active' | 'awaiting' | 'paid' | 'cancelled';
export type BookingSource = 'manual';

export interface EditableBookingDay extends Omit<BookingDayRow, 'rate_type'> {
  rate_type: BookingRateType;
}

export interface BookingPricingSummary {
  type: BookingType;
  isHoliday: boolean;
  totalAmount: number;
  days: BookingDayCalculationRow[];
}

export interface RepricedBookingDays {
  isHoliday: boolean;
  totalAmount: number;
  days: EditableBookingDay[];
}

export interface BookingRecord extends Omit<BookingRow, 'status' | 'type'> {
  status: BookingStatus;
  type: BookingType;
  dog: DogRow | null;
  days: EditableBookingDay[];
}

export interface BookingFormOptions {
  dogs: DogRow[];
  profile: ProfileRow | null;
}

export interface CreateBookingInput {
  sitterId: string;
  dogId: string;
  startDate: string;
  endDate: string;
  status?: BookingStatus;
  source?: BookingSource;
  notes?: string | null;
  pickupDateTime?: string;
  dropoffDateTime?: string;
  holidayDates?: true | Iterable<BookingDateInput>;
}

export interface PaymentCloseInput {
  tipAmount?: number;
  paymentMethod?: string | null;
  paymentNotes?: string | null;
  paidAt?: string;
}

export interface SaveBookingDaysInput {
  bookingId: string;
  sitterId: string;
  days: EditableBookingDay[];
}

interface BookingQueryRow extends BookingRow {
  dog?: DogRow | DogRow[] | null;
  days?: BookingDayRow[] | null;
}

interface LegacyBookingProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  nightly_rate: number;
  daycare_rate: number;
  holiday_surcharge: number;
  cutoff_time: string;
  is_guest: boolean;
  created_at: string;
  updated_at: string;
}

const BOOKING_PROFILE_SELECT = `
  id,
  email,
  display_name,
  nightly_rate,
  daycare_rate,
  holiday_boarding_rate,
  holiday_daycare_rate,
  cutoff_time,
  is_guest,
  created_at,
  updated_at
`;

const BOOKING_PROFILE_SELECT_LEGACY = `
  id,
  email,
  display_name,
  nightly_rate,
  daycare_rate,
  holiday_surcharge,
  cutoff_time,
  is_guest,
  created_at,
  updated_at
`;

async function getSupabase() {
  return supabase;
}

function isMissingHolidayRateColumnsError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const maybeError = error as { code?: string; message?: string };
  if (maybeError.code !== 'PGRST204') return false;
  const message = (maybeError.message ?? '').toLowerCase();
  return message.includes('holiday_boarding_rate') || message.includes('holiday_daycare_rate');
}

function mapLegacyProfileToCurrent(profile: LegacyBookingProfile | null): ProfileRow | null {
  if (!profile) return null;

  return {
    ...profile,
    business_logo_url: null,
    business_name: null,
    client_token: null,
    client_token_expires: null,
    payment_instructions: null,
    holiday_boarding_rate: toCurrencyAmount(profile.nightly_rate + profile.holiday_surcharge),
    holiday_daycare_rate: toCurrencyAmount(profile.daycare_rate + profile.holiday_surcharge),
  };
}

export function buildBookingPricing(input: {
  startDate: string;
  endDate: string;
  rates: ProfileRateSettings;
  holidayDates?: true | Iterable<BookingDateInput>;
  pickupDateTime?: string;
}): BookingPricingSummary {
  const days = generateBookingDays({
    startDate: input.startDate,
    endDate: input.endDate,
    rates: input.rates,
    holidayDates: input.holidayDates,
    pickupDateTime: input.pickupDateTime,
  });

  return {
    type: detectBookingType(input.startDate, input.endDate),
    isHoliday: days.some((day) => day.is_holiday),
    totalAmount: calculateBookingTotal(days),
    days,
  };
}

export function repriceBookingDays(
  days: ReadonlyArray<EditableBookingDay>,
  rates: ProfileRateSettings,
  overrides: Record<
    string,
    Partial<Pick<EditableBookingDay, 'rate_type' | 'is_holiday' | 'amount'>>
  > = {},
): RepricedBookingDays {
  const nextDays = days.map((day) => {
    const override = overrides[day.date];
    const rate_type = override?.rate_type ?? day.rate_type;
    const is_holiday = override?.is_holiday ?? day.is_holiday;
    const boardingRate = rates.nightly_rate ?? 0;
    const daycareRate = rates.daycare_rate ?? 0;
    const holidayBoardingRate = rates.holiday_boarding_rate ?? boardingRate;
    const holidayDaycareRate = rates.holiday_daycare_rate ?? daycareRate;
    const amount =
      override?.amount ??
      toCurrencyAmount(
        rate_type === 'boarding'
          ? is_holiday
            ? holidayBoardingRate
            : boardingRate
          : is_holiday
            ? holidayDaycareRate
            : daycareRate,
      );

    return {
      ...day,
      rate_type,
      is_holiday,
      amount,
    };
  });

  return {
    days: nextDays,
    isHoliday: nextDays.some((day) => day.is_holiday),
    totalAmount: calculateBookingTotal(nextDays),
  };
}

export async function getBookingFormOptions(sitterId: string): Promise<BookingFormOptions> {
  const supabase = await getSupabase();

  const { data: dogs, error: dogsError } = await supabase
    .from('dogs')
    .select(
      `
      id,
      name,
      owner_name,
      owner_phone,
      photo_url,
      notes,
      sitter_id,
      created_at,
      updated_at
    `,
    )
    .eq('sitter_id', sitterId)
    .is('archived_at', null)
    .order('name');

  if (dogsError) throw dogsError;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(BOOKING_PROFILE_SELECT)
    .eq('id', sitterId)
    .maybeSingle();

  if (profileError) {
    if (!isMissingHolidayRateColumnsError(profileError)) throw profileError;

    const { data: legacyProfile, error: legacyError } = await supabase
      .from('profiles')
      .select(BOOKING_PROFILE_SELECT_LEGACY)
      .eq('id', sitterId)
      .maybeSingle();

    if (legacyError) throw legacyError;

    return {
      dogs: (dogs ?? []).map((dog) => ({ ...dog, breed: null }) as DogRow),
      profile: mapLegacyProfileToCurrent(legacyProfile as unknown as LegacyBookingProfile | null),
    };
  }

  return {
    dogs: (dogs ?? []).map((dog) => ({ ...dog, breed: null }) as DogRow),
    profile: profile ? ({ ...profile, business_name: null } as ProfileRow) : null,
  };
}

export async function getBookings(sitterId: string): Promise<BookingRecord[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('bookings')
    .select(
      `
        *,
        dog:dogs(*),
        days:booking_days(*)
      `,
    )
    .eq('sitter_id', sitterId)
    .order('start_date', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => mapBookingRow(row as BookingQueryRow));
}

export async function getBooking(id: string): Promise<BookingRecord> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('bookings')
    .select(
      `
        *,
        dog:dogs(*),
        days:booking_days(*)
      `,
    )
    .eq('id', id)
    .single();

  if (error) throw error;

  return mapBookingRow(data as BookingQueryRow);
}

export async function createBooking(input: CreateBookingInput): Promise<BookingRecord> {
  const supabase = await getSupabase();
  const [options, dog] = await Promise.all([
    getBookingFormOptions(input.sitterId),
    getDogForSitter(input.sitterId, input.dogId),
  ]);

  if (!options.profile || !hasRequiredBookingRates(options.profile)) {
    throw new Error('Set Boarding and Daycare rates in Profile before creating a booking.');
  }

  const pricing = buildBookingPricing({
    startDate: input.startDate,
    endDate: input.endDate,
    pickupDateTime: input.pickupDateTime,
    holidayDates: input.holidayDates,
    rates: toRateSettings(options.profile),
  });

  const bookingInsert: TablesInsert<'bookings'> = {
    sitter_id: input.sitterId,
    dog_id: input.dogId,
    start_date: input.startDate,
    end_date: input.endDate,
    status: input.status ?? 'upcoming',
    source: input.source ?? 'manual',
    notes: input.notes ?? null,
    pickup_time: normalizeOptionalTimestamp(input.pickupDateTime),
    dropoff_time: normalizeOptionalTimestamp(input.dropoffDateTime),
    type: pricing.type,
    total_amount: pricing.totalAmount,
    is_holiday: pricing.isHoliday,
  };

  let { data: createdBooking, error: bookingError } = await supabase
    .from('bookings')
    .insert(bookingInsert)
    .select('*')
    .single();

  if (bookingError && shouldRetryBookingInsertWithoutDropoffTime(bookingError)) {
    const fallbackInsert = { ...bookingInsert };
    delete fallbackInsert.dropoff_time;
    ({ data: createdBooking, error: bookingError } = await supabase
      .from('bookings')
      .insert(fallbackInsert)
      .select('*')
      .single());
  }

  if (bookingError) {
    logger.error('Failed to insert booking record', bookingError);
    throw new DatabaseError('Failed to create booking', null, bookingError);
  }

  if (!createdBooking) {
    throw new DatabaseError('Failed to create booking', null, null);
  }

  const persistedBooking = createdBooking as BookingRow;

  const dayRows = pricing.days.map<TablesInsert<'booking_days'>>((day) => ({
    booking_id: persistedBooking.id,
    date: day.date,
    rate_type: day.rate_type,
    is_holiday: day.is_holiday,
    amount: day.amount,
    notes: null,
  }));

  const { data: createdDays, error: daysError } = await supabase
    .from('booking_days')
    .insert(dayRows)
    .select('*');

  if (daysError) {
    logger.error('Failed to insert booking days', daysError, { bookingId: persistedBooking.id });
    await supabase.from('bookings').delete().eq('id', persistedBooking.id);
    throw new DatabaseError('Failed to create booking days', null, daysError);
  }

  const bookingWithDays = mapBookingRow({
    ...persistedBooking,
    dog,
    days: createdDays ?? [],
  });

  return bookingWithDays;
}

export async function saveBookingDays(input: SaveBookingDaysInput): Promise<BookingRecord> {
  logger.debug('Saving booking days', { bookingId: input.bookingId });
  const supabase = await getSupabase();
  const [{ profile }, booking] = await Promise.all([
    getBookingFormOptions(input.sitterId),
    getBooking(input.bookingId),
  ]);

  if (!profile) {
    throw new Error('Set your profile rates before updating booking pricing.');
  }

  const repriced = repriceBookingDays(input.days, toRateSettings(profile));

  const updateResults = await Promise.all(
    repriced.days.map((day) =>
      supabase
        .from('booking_days')
        .update({
          rate_type: day.rate_type,
          is_holiday: day.is_holiday,
          amount: day.amount,
          notes: day.notes,
        })
        .eq('id', day.id)
        .eq('booking_id', input.bookingId),
    ),
  );

  const updateError = updateResults.find((result) => result.error)?.error;
  if (updateError) {
    logger.error('Failed to update booking days', updateError, { bookingId: input.bookingId });
    throw new DatabaseError('Failed to update booking days', null, updateError);
  }

  const { error: bookingError } = await supabase
    .from('bookings')
    .update({
      total_amount: repriced.totalAmount,
      is_holiday: repriced.isHoliday,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.bookingId)
    .eq('sitter_id', input.sitterId);

  if (bookingError) {
    logger.error('Failed to update booking total', bookingError, { bookingId: input.bookingId });
    throw new DatabaseError('Failed to update booking total', null, bookingError);
  }

  const updatedBooking: BookingRecord = {
    ...booking,
    total_amount: repriced.totalAmount,
    is_holiday: repriced.isHoliday,
    days: repriced.days,
    updated_at: new Date().toISOString(),
  };

  return updatedBooking;
}

export async function saveInvoiceOverrides(
  bookingId: string,
  sitterId: string,
  overrides: InvoiceOverrides,
  totalAmount?: number,
): Promise<void> {
  const supabase = await getSupabase();
  const invoiceOverridesJson: Json = {
    lineItems: overrides.lineItems.map((item) => ({
      type: item.type,
      isHoliday: item.isHoliday,
      count: item.count,
      rate: item.rate,
    })),
    creditAmount: overrides.creditAmount,
    ...(overrides.adjustments
      ? {
          adjustments: overrides.adjustments.map((adjustment) => ({
            id: adjustment.id,
            kind: adjustment.kind,
            description: adjustment.description,
            amount: adjustment.amount,
          })),
        }
      : {}),
  };
  const updatePayload: any = { invoice_overrides: invoiceOverridesJson };
  if (totalAmount !== undefined) {
    updatePayload.total_amount = totalAmount;
  }
  const { error } = await supabase
    .from('bookings')
    .update(updatePayload)
    .eq('id', bookingId)
    .eq('sitter_id', sitterId);

  if (error) throw error;
}

export async function updateBookingStatus(
  bookingId: string,
  sitterId: string,
  status: BookingStatus,
): Promise<void> {
  const supabase = await getSupabase();

  const { error } = await supabase
    .from('bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .eq('sitter_id', sitterId);

  if (error) throw error;
}

export async function checkInBooking(bookingId: string, sitterId: string): Promise<void> {
  await updateBookingStatus(bookingId, sitterId, 'active');
}

export async function checkOutBooking(bookingId: string, sitterId: string): Promise<void> {
  await updateBookingStatus(bookingId, sitterId, 'awaiting');
}

export async function autoAdvanceBookings(sitterId: string): Promise<void> {
  const supabase = await getSupabase();
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  const { error: checkInError } = await supabase
    .from('bookings')
    .update({ status: 'active', updated_at: now })
    .eq('sitter_id', sitterId)
    .eq('status', 'upcoming')
    .lte('start_date', today);

  if (checkInError) throw checkInError;

  const { error: checkOutError } = await supabase
    .from('bookings')
    .update({ status: 'awaiting', updated_at: now })
    .eq('sitter_id', sitterId)
    .eq('status', 'active')
    .lt('end_date', today);

  if (checkOutError) throw checkOutError;
}

export async function deleteBooking(bookingId: string, sitterId: string): Promise<void> {
  const supabase = await getSupabase();

  const { error: daysError } = await supabase
    .from('booking_days')
    .delete()
    .eq('booking_id', bookingId);
  if (daysError) throw daysError;

  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', bookingId)
    .eq('sitter_id', sitterId);

  if (error) throw error;
}

export async function closeBooking(bookingId: string, sitterId: string, input: PaymentCloseInput) {
  const supabase = await getSupabase();
  const payload = buildPaymentCloseUpdate(input);
  const { error } = await supabase
    .from('bookings')
    .update(payload)
    .eq('id', bookingId)
    .eq('sitter_id', sitterId)
    .eq('status', 'awaiting');
  if (error) throw error;
}

function mapBookingRow(row: BookingQueryRow): BookingRecord {
  const dog = Array.isArray(row.dog) ? (row.dog[0] ?? null) : (row.dog ?? null);
  const days = normalizeBookingDays(row.days ?? []);

  return {
    ...row,
    dog,
    days,
    status: normalizeStatus(row.status),
    type: normalizeType(row.type),
  };
}

function normalizeBookingDays(days: ReadonlyArray<BookingDayRow>): EditableBookingDay[] {
  return [...days]
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((day) => ({
      ...day,
      rate_type: normalizeRateType(day.rate_type),
    }));
}

function normalizeStatus(status: string): BookingStatus {
  if (
    status === 'upcoming' ||
    status === 'active' ||
    status === 'awaiting' ||
    status === 'paid' ||
    status === 'cancelled'
  ) {
    return status;
  }
  if (status === 'completed') return 'paid';
  if (status === 'pending') return 'upcoming';
  return 'upcoming';
}

function normalizeType(type: string): BookingType {
  return type === 'daycare' ? 'daycare' : 'boarding';
}

function normalizeRateType(rateType: string): BookingRateType {
  return rateType === 'daycare' ? 'daycare' : 'boarding';
}

export function shouldRetryBookingInsertWithoutDropoffTime(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const code = 'code' in error ? String(error.code) : '';
  const message = 'message' in error ? String(error.message) : '';

  return (
    code === 'PGRST204' && message.includes("'dropoff_time'") && message.includes("'bookings'")
  );
}

export function normalizeOptionalTimestamp(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toRateSettings(profile: ProfileRow): ProfileRateSettings {
  return {
    nightly_rate: profile.nightly_rate,
    daycare_rate: profile.daycare_rate,
    holiday_boarding_rate: profile.holiday_boarding_rate,
    holiday_daycare_rate: profile.holiday_daycare_rate,
    cutoff_time: profile.cutoff_time,
  };
}

export function hasRequiredBookingRates(
  profile: Pick<
    ProfileRow,
    'nightly_rate' | 'daycare_rate' | 'holiday_boarding_rate' | 'holiday_daycare_rate'
  >,
): boolean {
  return [
    profile.nightly_rate,
    profile.daycare_rate,
    profile.holiday_boarding_rate,
    profile.holiday_daycare_rate,
  ].every((rate) => Number.isFinite(rate) && rate >= 0);
}

async function getDogForSitter(sitterId: string, dogId: string): Promise<DogRow> {
  const supabase = await getSupabase();
  const { data: dog, error } = await supabase
    .from('dogs')
    .select(
      `
      id,
      name,
      owner_name,
      owner_phone,
      photo_url,
      notes,
      sitter_id,
      created_at,
      updated_at
    `,
    )
    .eq('id', dogId)
    .eq('sitter_id', sitterId)
    .is('archived_at', null)
    .single();

  if (error) throw error;

  return { ...dog, breed: null } as DogRow;
}

function toCurrencyAmount(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateBookingRevenue(totalAmount: number, tipAmount?: number): number {
  return toCurrencyAmount(totalAmount + (tipAmount ?? 0));
}

export function buildPaymentCloseUpdate(input: PaymentCloseInput): {
  status: 'paid';
  is_paid: true;
  tip_amount: number;
  payment_method: string | null;
  payment_notes: string | null;
  paid_at: string;
  updated_at: string;
} {
  const paidAt = input.paidAt ?? new Date().toISOString();
  return {
    status: 'paid',
    is_paid: true,
    tip_amount: toCurrencyAmount(Math.max(0, input.tipAmount ?? 0)),
    payment_method: input.paymentMethod?.trim() || null,
    payment_notes: input.paymentNotes?.trim() || null,
    paid_at: paidAt,
    updated_at: paidAt,
  };
}
