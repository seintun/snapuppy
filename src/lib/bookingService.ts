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
import type { Tables, TablesInsert } from '@/types/database';
import { logger } from './logger';
import { DatabaseError } from './errors';

type BookingRow = Tables<'bookings'>;
type BookingDayRow = Tables<'booking_days'>;
type DogRow = Tables<'dogs'>;
type ProfileRow = Tables<'profiles'>;

export type BookingStatus = 'active' | 'completed' | 'cancelled';

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
  pickupDateTime?: string;
  holidayDates?: true | Iterable<BookingDateInput>;
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

async function getSupabase() {
  return supabase;
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
    const amount =
      override?.amount ??
      toCurrencyAmount(
        (rate_type === 'boarding' ? (rates.nightly_rate ?? 0) : (rates.daycare_rate ?? 0)) +
          (is_holiday ? (rates.holiday_surcharge ?? 0) : 0),
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

  const [{ data: dogs, error: dogsError }, { data: profile, error: profileError }] =
    await Promise.all([
      supabase
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
        .order('name'),
      supabase
        .from('profiles')
        .select(
          `
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
        `,
        )
        .eq('id', sitterId)
        .maybeSingle(),
    ]);

  if (dogsError) throw dogsError;
  if (profileError) throw profileError;

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
    .neq('status', 'cancelled')
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

  if (!options.profile) {
    throw new Error('Set your profile rates before creating a booking.');
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
    status: input.status ?? 'active',
    type: pricing.type,
    total_amount: pricing.totalAmount,
    is_holiday: pricing.isHoliday,
  };

  const { data: createdBooking, error: bookingError } = await supabase
    .from('bookings')
    .insert(bookingInsert)
    .select('*')
    .single();

  if (bookingError) {
    logger.error('Failed to insert booking record', bookingError);
    throw new DatabaseError('Failed to create booking', null, bookingError);
  }

  const dayRows = pricing.days.map<TablesInsert<'booking_days'>>((day) => ({
    booking_id: createdBooking.id,
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
    logger.error('Failed to insert booking days', daysError, { bookingId: createdBooking.id });
    await supabase.from('bookings').delete().eq('id', createdBooking.id);
    throw new DatabaseError('Failed to create booking days', null, daysError);
  }

  const bookingWithDays = mapBookingRow({
    ...createdBooking,
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
  return status === 'completed' || status === 'cancelled' ? status : 'active';
}

function normalizeType(type: string): BookingType {
  return type === 'daycare' ? 'daycare' : 'boarding';
}

function normalizeRateType(rateType: string): BookingRateType {
  return rateType === 'daycare' ? 'daycare' : 'boarding';
}

function toRateSettings(profile: ProfileRow): ProfileRateSettings {
  return {
    nightly_rate: profile.nightly_rate,
    daycare_rate: profile.daycare_rate,
    holiday_surcharge: profile.holiday_surcharge,
    cutoff_time: profile.cutoff_time,
  };
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
    .single();

  if (error) throw error;

  return { ...dog, breed: null } as DogRow;
}

function toCurrencyAmount(value: number): number {
  return Math.round(value * 100) / 100;
}
