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
    paddingLeft: info.isStart ? 4 : 0,
    paddingRight: info.isEnd ? 4 : 0,
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
    borderLeft:
      info.isHoliday && info.isStart ? '3px solid var(--terracotta)' : undefined,
  };

  return (
    <div
      className={`h-[18px] text-[9px] font-bold flex items-center overflow-hidden whitespace-nowrap cursor-pointer mb-[1px] tracking-[0.02em] text-white ${info.isDaycare ? 'bg-sky' : 'bg-sage'}`}
      style={style}
      onClick={onClick}
      title={info.label}
    >
      {info.label && (
        <span className="overflow-hidden text-ellipsis max-w-[60px]">
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
    <div className="flex flex-col h-full bg-warm-beige">
      {/* Month header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2.5 bg-cream border-b border-pebble">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center bg-transparent border-none cursor-pointer text-bark rounded-full focus-visible:outline-sky"
          aria-label="Previous month"
        >
          <CaretLeft size={20} weight="bold" />
        </button>

        <div className="text-center">
          <div className="font-extrabold text-lg text-bark tracking-tight">
            {format(currentMonth, 'MMMM yyyy')}
          </div>
          {!isSameMonth(todayDate, currentMonth) && (
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="text-[11px] text-sage font-bold bg-sage-light border-none rounded-full px-2.5 py-0.5 cursor-pointer mt-0.5"
            >
              Today
            </button>
          )}
        </div>

        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center bg-transparent border-none cursor-pointer text-bark rounded-full focus-visible:outline-sky"
          aria-label="Next month"
        >
          <CaretRight size={20} weight="bold" />
        </button>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 bg-cream border-b border-pebble">
        {DAY_LABELS.map((day) => (
          <div key={day} className="text-center py-1.5 text-[10px] font-bold text-bark-light uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-bark-light animate-pulse font-bold text-sm">
          Loading Calendar...
        </div>
      ) : (
        <div className="grid grid-cols-7 auto-rows-fr flex-1 overflow-y-auto">
          {days.map((day, i) => {
            const dayBookings = getBookingsForDate(bookings, day);
            const inCurrentMonth = isSameMonth(day, currentMonth);
            const todayCell = isToday(day);
            const colIndex = i % 7;

            return (
              <button
                key={i}
                type="button"
                onClick={() => inCurrentMonth && handleDateTap(day)}
                disabled={!inCurrentMonth}
                className={`text-left outline-none p-0 flex flex-col items-stretch border-b border-pebble min-h-[80px] pt-1 pb-0.5 transition-colors duration-150 ${inCurrentMonth ? 'cursor-pointer focus-visible:bg-pebble active:bg-pebble' : 'cursor-default opacity-45 bg-warm-beige'} ${inCurrentMonth ? 'bg-cream' : ''} ${colIndex < 6 ? 'border-r' : ''}`}
                aria-label={inCurrentMonth ? `${format(day, 'MMMM d')} — add booking` : undefined}
              >
                <div className="flex justify-center mb-0.5">
                  <span className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] ${todayCell ? 'font-extrabold bg-sage text-white' : 'font-semibold bg-transparent text-bark'}`}>
                    {format(day, 'd')}
                  </span>
                </div>

                <div className="overflow-hidden flex-1 px-0.5">
                  {dayBookings.slice(0, 3).map((booking) => (
                    <BookingBlock
                      key={booking.id}
                      booking={booking}
                      date={day}
                      onClick={(e) => handleBookingClick(e, booking)}
                    />
                  ))}
                  {dayBookings.length > 3 && (
                    <div className="text-[9px] text-bark-light text-center font-semibold">
                      +{dayBookings.length - 3}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* FAB */}
      <button
        id="calendar-fab"
        onClick={() => handleDateTap(todayDate)}
        className="fixed right-5 bottom-[88px] w-14 h-14 rounded-full bg-terracotta text-white border-none cursor-pointer flex items-center justify-center shadow-[0_4px_16px_rgba(212,132,90,0.4)] transition-transform duration-150 hover:scale-105 active:scale-95 z-50 focus-visible:outline-sky focus-visible:outline-offset-2"
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
