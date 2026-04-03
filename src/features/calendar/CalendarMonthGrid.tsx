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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: 8,
          color: 'var(--bark-light)',
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {weekdayLabels.map((label) => (
          <div key={label} style={{ textAlign: 'center' }}>
            {label}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 8 }}>
        {gridDays.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayBookings = bookingsByDate[dateKey] ?? [];
          const isCurrentMonth = isSameMonth(day, month);
          const isToday = isSameDay(day, today);

          return (
            <div
              key={dateKey}
              style={{
                minHeight: 120,
                borderRadius: 12,
                border: isToday ? '2px solid var(--sage)' : '1px solid var(--line)',
                background: isCurrentMonth ? 'white' : 'rgba(0,0,0,0.02)',
                padding: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 6,
                  alignItems: 'center',
                  color: isCurrentMonth ? 'var(--bark)' : 'var(--bark-light)',
                }}
              >
                <strong>{format(day, 'd')}</strong>
                {isToday ? (
                  <span style={{ fontSize: 11, color: 'var(--sage)', fontWeight: 700 }}>Today</span>
                ) : null}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {dayBookings.slice(0, 3).map((booking) => (
                  <button
                    key={`${dateKey}-${booking.id}`}
                    type="button"
                    onClick={() => onSelectBooking(booking.id)}
                    style={{
                      border: 'none',
                      borderRadius: 999,
                      padding: '4px 8px',
                      background:
                        getStatusVariant(booking.status) === 'terracotta'
                          ? 'rgba(193, 104, 81, 0.18)'
                          : getStatusVariant(booking.status) === 'sky'
                            ? 'rgba(122, 171, 214, 0.18)'
                            : 'rgba(143, 184, 134, 0.22)',
                      color: 'var(--bark)',
                      fontSize: 12,
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    {booking.dog?.name ?? 'Booking'}
                  </button>
                ))}

                {dayBookings.length > 3 ? (
                  <span style={{ fontSize: 12, color: 'var(--bark-light)' }}>
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
