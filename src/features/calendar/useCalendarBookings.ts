import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getMonthQueryRange, type CalendarBooking } from './calendarUtils';

export function useCalendarBookings(currentMonth: Date) {
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const { rangeStart, rangeEnd } = getMonthQueryRange(currentMonth);
      const { data, error } = await supabase
        .from('bookings')
        .select('id, start_date, end_date, type, is_holiday, status, dog_id, dogs(name, photo_url)')
        .lte('start_date', rangeEnd)
        .gte('end_date', rangeStart)
        .neq('status', 'cancelled');

      if (!error && data) {
        setBookings(data as unknown as CalendarBooking[]);
      }
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    void fetchBookings();
  }, [fetchBookings]);

  return { bookings, loading, refresh: fetchBookings };
}
