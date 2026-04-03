import { memo } from 'react';
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { BookingRecord } from '@/lib/bookingService';
import { getStatusVariant } from '@/features/bookings/bookingUi';

interface CalendarMonthGridProps {
  month: Date;
  bookingsByDate: Record<string, BookingRecord[]>;
  onSelectBooking: (bookingId: string) => void;
}

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarMonthGrid = memo(function CalendarMonthGrid({
  month,
  bookingsByDate,
  onSelectBooking,
}: CalendarMonthGridProps) {
  const today = new Date();
  const gridDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-7 gap-2 text-bark-light text-xs font-bold">
        {weekdayLabels.map((label) => (
          <div key={label} className="text-center">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {gridDays.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayBookings = bookingsByDate[dateKey] ?? [];
          const isCurrentMonth = isSameMonth(day, month);
          const isToday = isSameDay(day, today);

          return (
            <div
              key={dateKey}
              className={`min-h-[120px] rounded-xl p-2 flex flex-col gap-1.5 ${isToday ? 'border-2 border-sage' : 'border border-line'} ${isCurrentMonth ? 'bg-white' : 'bg-black/2'}`}
            >
              <div className={`flex justify-between items-center gap-1.5 ${isCurrentMonth ? 'text-bark' : 'text-bark-light'}`}>
                <strong>{format(day, 'd')}</strong>
                {isToday ? (
                  <span className="text-[11px] text-sage font-bold">Today</span>
                ) : null}
              </div>

              <div className="flex flex-col gap-1">
                {dayBookings.slice(0, 3).map((booking) => {
                  const statusVariant = getStatusVariant(booking.status);
                  const bgClass =
                    statusVariant === 'terracotta'
                      ? 'bg-terracotta/20'
                      : statusVariant === 'sky'
                        ? 'bg-sky/20'
                        : 'bg-sage/20';

                  return (
                    <button
                      key={`${dateKey}-${booking.id}`}
                      type="button"
                      onClick={() => onSelectBooking(booking.id)}
                      className={`border-none rounded-full px-2 py-1 text-xs text-left cursor-pointer text-bark ${bgClass}`}
                    >
                      {booking.dog?.name ?? 'Booking'}
                    </button>
                  );
                })}

                {dayBookings.length > 3 ? (
                  <span className="text-xs text-bark-light">
                    +{dayBookings.length - 3} more
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
