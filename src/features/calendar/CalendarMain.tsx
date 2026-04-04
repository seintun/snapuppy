import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { format, addMonths, subMonths, isSameMonth, isToday } from 'date-fns';
import { CaretLeft, CaretRight, Plus, PawPrint } from '@phosphor-icons/react';
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
      className={`h-[16px] text-[8px] font-bold flex items-center overflow-hidden whitespace-nowrap cursor-pointer transition-all duration-150 active:scale-[0.98] ${
        info.isDaycare ? 'bg-sky' : 'bg-sage'
      } ${
        info.isStart && info.isEnd
          ? 'rounded-full mx-0.5 px-1'
          : info.isStart
            ? 'rounded-l-full ml-0.5 pl-1'
            : info.isEnd
              ? 'rounded-r-full mr-0.5 pr-1'
              : ''
      }`}
      onClick={onClick}
      title={info.label}
    >
      {info.label && (
        <span className="overflow-hidden text-ellipsis max-w-[50px]">{info.label}</span>
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
    void queryClient.invalidateQueries({ queryKey: ['bookings', user?.id] });
    void queryClient.invalidateQueries({ queryKey: ['calendar-bookings', user?.id] });
  }, [handleClose, queryClient, user?.id]);

  return (
    <div className="flex flex-col h-full bg-warm-beige pb-20 -mx-4">
      {/* Month header - modern card style */}
      <div className="bg-cream px-4 py-4 rounded-b-[20px] shadow-sm mb-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="w-10 h-10 flex items-center justify-center bg-sage-light/50 text-sage rounded-full transition-all hover:bg-sage-light focus-visible:outline-sage"
            aria-label="Previous month"
          >
            <CaretLeft size={20} weight="bold" />
          </button>

          <div className="text-center">
            <h2 className="font-extrabold text-xl text-bark tracking-tight">
              {format(currentMonth, 'MMMM')}
            </h2>
            <p className="text-sm text-bark-light font-medium">{format(currentMonth, 'yyyy')}</p>
          </div>

          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="w-10 h-10 flex items-center justify-center bg-sage-light/50 text-sage rounded-full transition-all hover:bg-sage-light focus-visible:outline-sage"
            aria-label="Next month"
          >
            <CaretRight size={20} weight="bold" />
          </button>
        </div>

        {!isSameMonth(todayDate, currentMonth) && (
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="mx-auto mt-3 flex items-center gap-1.5 text-xs font-bold text-sage bg-sage-light px-3 py-1.5 rounded-full cursor-pointer transition-all active:scale-95"
          >
            <PawPrint size={12} />
            Today
          </button>
        )}
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 px-4 mb-1">
        {DAY_LABELS.map((day) => (
          <div
            key={day}
            className="text-center py-2 text-[11px] font-bold text-bark-light uppercase tracking-wide"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        className={`flex-1 overflow-y-auto grid grid-cols-7 px-4 gap-1 transition-opacity duration-200 ${isPlaceholderData ? 'opacity-60' : 'opacity-100'}`}
      >
        {isLoading && !bookings.length ? (
          <div className="col-span-7 flex flex-col items-center justify-center text-bark-light font-bold text-sm h-full">
            Loading…
          </div>
        ) : (
          days.map((day, i) => {
            const dayBookings = getBookingsForDate(bookings, day);
            const inCurrentMonth = isSameMonth(day, currentMonth);
            const todayCell = isToday(day);

            return (
              <button
                key={i}
                type="button"
                onClick={() => inCurrentMonth && handleDateTap(day)}
                disabled={!inCurrentMonth}
                className={`aspect-square rounded-2xl flex flex-col items-center p-1 transition-all duration-150 ${
                  inCurrentMonth
                    ? todayCell
                      ? 'bg-sage shadow-md'
                      : 'bg-cream hover:bg-sage-light/30'
                    : 'opacity-25 bg-transparent'
                }`}
                aria-label={inCurrentMonth ? `${format(day, 'MMMM d')}` : undefined}
              >
                <span
                  className={`text-xs font-bold ${
                    todayCell ? 'text-white' : inCurrentMonth ? 'text-bark' : 'text-bark-light'
                  }`}
                >
                  {format(day, 'd')}
                </span>

                {inCurrentMonth && dayBookings.length > 0 && (
                  <div className="flex-1 w-full flex flex-col justify-end gap-0.5 mt-0.5">
                    {dayBookings.slice(0, 2).map((booking) => (
                      <BookingBlock
                        key={booking.id}
                        booking={booking}
                        date={day}
                        onClick={(e) => handleBookingClick(e, booking)}
                      />
                    ))}
                    {dayBookings.length > 2 && (
                      <div className="text-[8px] text-bark-light text-center font-bold">
                        +{dayBookings.length - 2}
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => handleDateTap(todayDate)}
        className="fixed right-5 bottom-[88px] w-14 h-14 rounded-full bg-terracotta text-white border-none cursor-pointer flex items-center justify-center shadow-lg shadow-terracotta/30 transition-all duration-200 hover:scale-105 active:scale-95 z-50 focus-visible:outline-sky focus-visible:outline-offset-2"
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
