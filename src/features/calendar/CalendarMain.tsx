import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addMonths, subMonths, isSameMonth, isToday } from 'date-fns';
import { CaretLeft, CaretRight, Plus } from '@phosphor-icons/react';
import { useCalendarBookings } from './useCalendarBookings';
import {
  getMonthDays,
  getBookingsForDate,
  getBookingSpanInfo,
  type CalendarBooking,
} from './calendarUtils';
import { CreateBookingSheet } from '@/features/bookings/CreateBookingSheet';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function BookingBlock({
  booking,
  date,
  onClick,
}: {
  booking: CalendarBooking;
  date: Date;
  onClick: (e: React.MouseEvent) => void;
}) {
  const info = getBookingSpanInfo(booking, date);

  const style: React.CSSProperties = {
    height: 18,
    fontSize: 9,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    paddingLeft: info.isStart ? 4 : 0,
    paddingRight: info.isEnd ? 4 : 0,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    marginBottom: 1,
    borderRadius:
      info.isStart && info.isEnd
        ? 99
        : info.isStart
          ? '99px 0 0 99px'
          : info.isEnd
            ? '0 99px 99px 0'
            : 0,
    marginLeft: info.isStart ? 2 : 0,
    marginRight: info.isEnd ? 2 : 0,
    background: info.isDaycare ? 'var(--sky)' : 'var(--sage)',
    color: 'white',
    borderLeft:
      info.isHoliday && info.isStart ? '3px solid var(--terracotta)' : undefined,
    letterSpacing: '0.02em',
  };

  return (
    <div style={style} onClick={onClick} title={info.label}>
      {info.label && (
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 60 }}>
          {info.label}
        </span>
      )}
    </div>
  );
}

export function CalendarMain() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [bookingSheetDate, setBookingSheetDate] = useState<string | undefined>(undefined);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { bookings, loading, refresh } = useCalendarBookings(currentMonth);
  const navigate = useNavigate();

  const days = getMonthDays(currentMonth);
  const todayDate = new Date();

  const handleDateTap = useCallback((date: Date) => {
    setBookingSheetDate(format(date, 'yyyy-MM-dd'));
    setIsSheetOpen(true);
  }, []);

  const handleBookingClick = useCallback(
    (e: React.MouseEvent, booking: CalendarBooking) => {
      e.stopPropagation();
      navigate(`/bookings/${booking.id}`);
    },
    [navigate],
  );

  const handleClose = useCallback(() => {
    setIsSheetOpen(false);
    setBookingSheetDate(undefined);
  }, []);

  const handleSuccess = useCallback(() => {
    handleClose();
    void refresh();
  }, [handleClose, refresh]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--warm-beige)' }}>
      {/* Month header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 10px', background: 'var(--cream)', borderBottom: '1px solid var(--pebble)' }}>
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          style={{ minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--bark)', borderRadius: 999 }}
          aria-label="Previous month"
        >
          <CaretLeft size={20} weight="bold" />
        </button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--bark)', letterSpacing: '-0.02em' }}>
            {format(currentMonth, 'MMMM yyyy')}
          </div>
          {!isSameMonth(todayDate, currentMonth) && (
            <button
              onClick={() => setCurrentMonth(new Date())}
              style={{ fontSize: 11, color: 'var(--sage)', fontWeight: 700, background: 'var(--sage-light)', border: 'none', borderRadius: 99, padding: '2px 10px', cursor: 'pointer', marginTop: 2 }}
            >
              Today
            </button>
          )}
        </div>

        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          style={{ minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--bark)', borderRadius: 999 }}
          aria-label="Next month"
        >
          <CaretRight size={20} weight="bold" />
        </button>
      </div>

      {/* Day-of-week header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--cream)', borderBottom: '1px solid var(--pebble)' }}>
        {DAY_LABELS.map((day) => (
          <div key={day} style={{ textAlign: 'center', padding: '6px 0', fontSize: 10, fontWeight: 700, color: 'var(--bark-light)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bark-light)' }}>
          Loading…
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: '1fr', flex: 1, overflowY: 'auto' }}>
          {days.map((day, i) => {
            const dayBookings = getBookingsForDate(bookings, day);
            const inCurrentMonth = isSameMonth(day, currentMonth);
            const todayCell = isToday(day);
            const colIndex = i % 7;

            return (
              <div
                key={i}
                onClick={() => inCurrentMonth && handleDateTap(day)}
                style={{
                  borderRight: colIndex < 6 ? '1px solid var(--pebble)' : undefined,
                  borderBottom: '1px solid var(--pebble)',
                  background: inCurrentMonth ? 'var(--cream)' : 'var(--warm-beige)',
                  opacity: inCurrentMonth ? 1 : 0.45,
                  minHeight: 80,
                  padding: '4px 0 2px',
                  cursor: inCurrentMonth ? 'pointer' : 'default',
                  transition: 'background 150ms ease',
                }}
                role={inCurrentMonth ? 'button' : undefined}
                tabIndex={inCurrentMonth ? 0 : undefined}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && inCurrentMonth) {
                    e.preventDefault();
                    handleDateTap(day);
                  }
                }}
                aria-label={inCurrentMonth ? `${format(day, 'MMMM d')} — add booking` : undefined}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 2 }}>
                  <span style={{ width: 22, height: 22, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: todayCell ? 800 : 600, background: todayCell ? 'var(--sage)' : 'transparent', color: todayCell ? 'white' : 'var(--bark)' }}>
                    {format(day, 'd')}
                  </span>
                </div>

                <div style={{ overflow: 'hidden' }}>
                  {dayBookings.slice(0, 3).map((booking) => (
                    <BookingBlock
                      key={booking.id}
                      booking={booking}
                      date={day}
                      onClick={(e) => handleBookingClick(e, booking)}
                    />
                  ))}
                  {dayBookings.length > 3 && (
                    <div style={{ fontSize: 9, color: 'var(--bark-light)', textAlign: 'center', fontWeight: 600 }}>
                      +{dayBookings.length - 3}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FAB */}
      <button
        id="calendar-fab"
        onClick={() => handleDateTap(todayDate)}
        style={{
          position: 'fixed', right: 20, bottom: 88, width: 56, height: 56,
          borderRadius: 999, background: 'var(--terracotta)', color: 'white',
          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', boxShadow: '0 4px 16px rgba(212,132,90,0.4)',
          transition: 'transform 150ms ease, box-shadow 150ms ease', zIndex: 50,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
        aria-label="New booking"
      >
        <Plus size={26} weight="bold" />
      </button>

      <CreateBookingSheet
        isOpen={isSheetOpen}
        onClose={handleClose}
        prefilledDate={bookingSheetDate}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
