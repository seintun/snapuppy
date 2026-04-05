import type { BookingStatus } from '@/lib/bookingService';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type BookingRow = Database['public']['Tables']['bookings']['Row'];
type BookingDayRow = Database['public']['Tables']['booking_days']['Row'];
type DogRow = Database['public']['Tables']['dogs']['Row'];

export interface ClientBooking {
  id: string;
  dogId: string;
  dogName: string;
  dogPhotoUrl: string | null;
  startDate: string;
  endDate: string;
  status: BookingStatus;
  type: 'boarding' | 'daycare';
  totalAmount: number;
  isHoliday: boolean;
  days: { date: string; rateType: string; amount: number }[];
}

interface ClientBookingRow extends BookingRow {
  dog?: DogRow | DogRow[] | null;
  days?: BookingDayRow[] | null;
}

function mapBookingRow(row: ClientBookingRow): ClientBooking {
  const dog = Array.isArray(row.dog) ? (row.dog[0] ?? null) : (row.dog ?? null);
  const days = (row.days ?? []).map((d) => ({
    date: d.date,
    rateType: d.rate_type,
    amount: d.amount,
  }));

  return {
    id: row.id,
    dogId: row.dog_id,
    dogName: dog?.name ?? 'Unknown',
    dogPhotoUrl: dog?.photo_url ?? null,
    startDate: row.start_date,
    endDate: row.end_date,
    status: normalizeStatus(row.status),
    type: row.type === 'daycare' ? 'daycare' : 'boarding',
    totalAmount: row.total_amount,
    isHoliday: row.is_holiday ?? false,
    days,
  };
}

function normalizeStatus(status: string): BookingStatus {
  return status === 'completed' || status === 'cancelled' ? status : 'active';
}

export async function getClientBookings(sitterId: string, dogId: string): Promise<ClientBooking[]> {
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
    .eq('dog_id', dogId)
    .order('start_date', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => mapBookingRow(row as ClientBookingRow));
}
