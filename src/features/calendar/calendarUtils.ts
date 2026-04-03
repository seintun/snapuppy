import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isWithinInterval,
  parseISO,
  format,
} from 'date-fns';

/** 42-day grid (6 weeks) for the month containing `date` */
export function getMonthDays(date: Date): Date[] {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 0 });
  return eachDayOfInterval({ start, end });
}

export type CalendarBooking = {
  id: string;
  start_date: string;
  end_date: string;
  type: string;
  is_holiday: boolean;
  status: string;
  dog_id: string;
  dogs: { name: string; photo_url: string | null } | null;
};

export function getBookingsForDate(bookings: CalendarBooking[], date: Date): CalendarBooking[] {
  return bookings.filter((b) => {
    const start = parseISO(b.start_date);
    const end = parseISO(b.end_date);
    return (
      isSameDay(start, date) ||
      isSameDay(end, date) ||
      isWithinInterval(date, { start, end })
    );
  });
}

export type BookingSpanInfo = {
  isStart: boolean;
  isEnd: boolean;
  isMid: boolean;
  isBoarding: boolean;
  isDaycare: boolean;
  isHoliday: boolean;
  label: string;
};

export function getBookingSpanInfo(booking: CalendarBooking, date: Date): BookingSpanInfo {
  const start = parseISO(booking.start_date);
  const end = parseISO(booking.end_date);
  const isStart = isSameDay(start, date);
  const isEnd = isSameDay(end, date);
  return {
    isStart,
    isEnd,
    isMid: !isStart && !isEnd,
    isBoarding: booking.type === 'boarding',
    isDaycare: booking.type === 'daycare',
    isHoliday: booking.is_holiday,
    label: isStart ? (booking.dogs?.name ?? '') : '',
  };
}

export function getMonthQueryRange(date: Date): { rangeStart: string; rangeEnd: string } {
  const grid = getMonthDays(date);
  return {
    rangeStart: format(grid[0], 'yyyy-MM-dd'),
    rangeEnd: format(grid[grid.length - 1], 'yyyy-MM-dd'),
  };
}
