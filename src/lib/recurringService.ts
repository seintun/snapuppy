import { addDays, addWeeks, addMonths, isBefore, isAfter, getDay } from 'date-fns';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type RecurringBooking = Database['public']['Tables']['recurring_bookings']['Row'];
type RecurringBookingInsert = Database['public']['Tables']['recurring_bookings']['Insert'];
type RecurringPattern = 'weekly' | 'biweekly' | 'monthly';
type RecurringStatus = 'active' | 'paused' | 'cancelled';

type RepeatDay = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

const DAY_MAP: Record<number, RepeatDay> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

function getNextDate(
  currentDate: Date,
  pattern: RecurringPattern,
  repeatDays: RepeatDay[] | null,
): Date {
  let nextDate: Date;

  switch (pattern) {
    case 'weekly':
      nextDate = addWeeks(currentDate, 1);
      break;
    case 'biweekly':
      nextDate = addWeeks(currentDate, 2);
      break;
    case 'monthly':
      nextDate = addMonths(currentDate, 1);
      break;
  }

  if (repeatDays && repeatDays.length > 0) {
    const dayOfWeek = getDay(nextDate);
    const currentDay = DAY_MAP[dayOfWeek];

    if (!repeatDays.includes(currentDay)) {
      const targetDayIndex = repeatDays.indexOf(currentDay);
      if (targetDayIndex === -1) {
        const firstDay = repeatDays[0];
        const targetIndex = [
          'sunday',
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
        ].indexOf(firstDay);
        const daysToAdd = (targetIndex - dayOfWeek + 7) % 7;
        nextDate = addDays(nextDate, daysToAdd || 7);
      }
    }
  }

  return nextDate;
}

export function generateRecurringDates(
  startDate: Date,
  endDate: Date,
  pattern: RecurringPattern,
  repeatDays: string[] | null,
): Date[] {
  const dates: Date[] = [];
  const normalizedRepeatDays = repeatDays as RepeatDay[] | null;
  const threeMonthsOut = addMonths(new Date(), 3);
  const effectiveEnd = isBefore(threeMonthsOut, endDate) ? threeMonthsOut : endDate;

  let currentDate = startDate;

  while (!isAfter(currentDate, effectiveEnd)) {
    if (repeatDays && repeatDays.length > 0) {
      const dayOfWeek = getDay(currentDate);
      const currentDay = DAY_MAP[dayOfWeek];
      if (normalizedRepeatDays?.includes(currentDay)) {
        dates.push(new Date(currentDate));
      }
    } else {
      dates.push(new Date(currentDate));
    }

    currentDate = getNextDate(currentDate, pattern, normalizedRepeatDays);

    if (dates.length > 365) break;
  }

  return dates;
}

export type CreateRecurringInput = {
  sitterId: string;
  dogId: string;
  startDate: string;
  endDate?: string | null;
  repeatPattern?: RecurringPattern | null;
  repeatDays?: string[] | null;
  timeSlotStart?: string | null;
  timeSlotEnd?: string | null;
  notes?: string | null;
};

export async function createRecurringBooking(
  data: CreateRecurringInput,
): Promise<RecurringBooking> {
  const insertData: RecurringBookingInsert = {
    sitter_id: data.sitterId,
    dog_id: data.dogId,
    start_date: data.startDate,
    end_date: data.endDate ?? null,
    repeat_pattern: data.repeatPattern ?? null,
    repeat_days: data.repeatDays ?? null,
    time_slot_start: data.timeSlotStart ?? null,
    time_slot_end: data.timeSlotEnd ?? null,
    notes: data.notes ?? null,
    status: 'active',
  };

  const { data: result, error } = await supabase
    .from('recurring_bookings')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return result;
}

export async function getRecurringByDog(dogId: string): Promise<RecurringBooking[]> {
  const { data, error } = await supabase
    .from('recurring_bookings')
    .select('*')
    .eq('dog_id', dogId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getRecurringById(id: string): Promise<RecurringBooking | null> {
  const { data, error } = await supabase
    .from('recurring_bookings')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function updateRecurringStatus(
  id: string,
  status: RecurringStatus,
): Promise<RecurringBooking> {
  const { data, error } = await supabase
    .from('recurring_bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteRecurringBooking(id: string): Promise<void> {
  const { error } = await supabase
    .from('recurring_bookings')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}
