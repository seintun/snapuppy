import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
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

/** Returns bookings active on a given date (string comparison, avoids TZ issues) */
export function getBookingsForDate(bookings: CalendarBooking[], date: Date): CalendarBooking[] {
  const dateStr = format(date, 'yyyy-MM-dd');
  return bookings.filter((b) => b.start_date <= dateStr && b.end_date >= dateStr);
}

/** Returns bookings that overlap a week [weekStartStr, weekEndStr] */
export function getBookingsForWeek(
  bookings: CalendarBooking[],
  weekStartStr: string,
  weekEndStr: string,
): CalendarBooking[] {
  return bookings.filter((b) => b.start_date <= weekEndStr && b.end_date >= weekStartStr);
}

export type BookingLaneMap = Record<string, number>; // bookingId → lane index (0-based)

/**
 * Greedy interval-graph lane assignment for a single week.
 * Ensures overlapping bookings never share the same visual row.
 * Inspired by Google Calendar's multi-day event layout.
 */
export function assignWeekLanes(
  weekBookings: CalendarBooking[],
  weekStartStr: string,
  weekEndStr: string,
): BookingLaneMap {
  // Sort: earlier visible start first; ties broken by longer span first
  const sorted = [...weekBookings].sort((a, b) => {
    const aVis = a.start_date < weekStartStr ? weekStartStr : a.start_date;
    const bVis = b.start_date < weekStartStr ? weekStartStr : b.start_date;
    if (aVis !== bVis) return aVis < bVis ? -1 : 1;
    return b.end_date > a.end_date ? 1 : -1; // longer first
  });

  const lanes: BookingLaneMap = {};
  const laneEnds: string[] = []; // last visEnd occupying each lane

  for (const b of sorted) {
    const visStart = b.start_date > weekStartStr ? b.start_date : weekStartStr;
    const visEnd = b.end_date < weekEndStr ? b.end_date : weekEndStr;

    let lane = 0;
    while (lane < laneEnds.length && laneEnds[lane] >= visStart) {
      lane++;
    }
    lanes[b.id] = lane;
    laneEnds[lane] = visEnd;
  }

  return lanes;
}

export function getMonthQueryRange(date: Date): { rangeStart: string; rangeEnd: string } {
  const grid = getMonthDays(date);
  return {
    rangeStart: format(grid[0], 'yyyy-MM-dd'),
    rangeEnd: format(grid[grid.length - 1], 'yyyy-MM-dd'),
  };
}
