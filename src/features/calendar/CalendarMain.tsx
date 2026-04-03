import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { format, addMonths, subMonths, isSameMonth, isToday } from 'date-fns';
import { CaretLeft, CaretRight, Plus } from '@phosphor-icons/react';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { useCalendarBookings } from '@/hooks/useBookings';
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

  return (
    <div
      className={`h-[18px] text-[9px] font-bold flex items-center overflow-hidden whitespace-nowrap cursor-pointer mb-[1px] tracking-[0.02em] text-white transition-all duration-150 active:scale-[0.98] ${
        info.isDaycare ? 'bg-sky' : 'bg-sage'
      } ${
        info.isStart && info.isEnd
          ? 'rounded-full mx-0.5 px-1'
          : info.isStart
            ? 'rounded-l-full ml-0.5 pl-1'
            : info.isEnd
              ? 'rounded-r-full mr-0.5 pr-1'
              : ''
      } ${info.isHoliday && info.isStart ? 'border-l-2 border-terracotta' : ''}`}
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
  const { user } = useAuthContext();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [bookingSheetDate, setBookingSheetDate] = useState<string | undefined>(undefined);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: bookings = [], isLoading, isPlaceholderData } = useCalendarBookings(currentMonth);

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
    // Invalidate both general bookings and monthly calendar cache
    void queryClient.invalidateQueries({ queryKey: ['bookings', user?.id] });
    void queryClient.invalidateQueries({ queryKey: ['calendar-bookings', user?.id] });
  }, [handleClose, queryClient, user?.id]);

  return (
    <div className="flex flex-col h-full bg-warm-beige pb-20">
      {/* Month header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2.5 bg-cream border-b border-pebble">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="w-11 h-11 flex items-center justify-center bg-transparent border-none cursor-pointer text-bark rounded-full transition-colors hover:bg-pebble/30 focus-visible:outline-sky"
          aria-label="Previous month"
        >
          <CaretLeft size={20} weight="bold" />
        </button>

        <div className="text-center">
          <div className="font-extrabold text-lg text-bark tracking-tight leading-tight">
            {format(currentMonth, 'MMMM yyyy')}
          </div>
          {!isSameMonth(todayDate, currentMonth) && (
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="text-[11px] text-sage font-bold bg-sage-light border-none rounded-full px-2.5 py-0.5 cursor-pointer mt-0.5 active:scale-95 transition-transform"
            >
              Today
            </button>
          )}
        </div>

        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="w-11 h-11 flex items-center justify-center bg-transparent border-none cursor-pointer text-bark rounded-full transition-colors hover:bg-pebble/30 focus-visible:outline-sky"
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
      <div className={`flex-1 overflow-y-auto grid grid-cols-7 auto-rows-fr transition-opacity duration-200 ${isPlaceholderData ? 'opacity-60' : 'opacity-100'}`}>
        {isLoading && !bookings.length ? (
          <div className="col-span-7 flex flex-col items-center justify-center text-bark-light font-bold text-sm h-full animate-pulse">
            Loading Calendar…
          </div>
        ) : (
          days.map((day, i) => {
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
                className={`text-left outline-none p-0 flex flex-col items-stretch border-b border-pebble min-h-[84px] pt-1.5 pb-0.5 transition-colors duration-150 ${
                  inCurrentMonth 
                    ? 'cursor-pointer bg-cream focus-visible:bg-pebble active:bg-pebble' 
                    : 'cursor-default opacity-40 bg-warm-beige'
                } ${colIndex < 6 ? 'border-r' : ''}`}
                aria-label={inCurrentMonth ? `${format(day, 'MMMM d')} — add booking` : undefined}
              >
                <div className="flex justify-center mb-1">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] transition-colors ${
                    todayCell 
                      ? 'font-extrabold bg-sage text-white' 
                      : 'font-semibold bg-transparent text-bark'
                  }`}>
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
                    <div className="text-[9px] text-bark-light text-center font-bold mt-0.5">
                      +{dayBookings.length - 3} more
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => handleDateTap(todayDate)}
        className="fixed right-5 bottom-[88px] w-14 h-14 rounded-full bg-terracotta text-white border-none cursor-pointer flex items-center justify-center shadow-[0_6px_20px_rgba(212,132,90,0.45)] transition-all duration-200 hover:scale-105 active:scale-95 z-50 focus-visible:outline-sky focus-visible:outline-offset-2 animate-bounce-subtle"
        aria-label="New booking"
      >
        <Plus size={28} weight="bold" />
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
