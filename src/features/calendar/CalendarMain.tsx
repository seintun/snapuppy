import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { format, addMonths, subMonths, isSameMonth, isToday } from 'date-fns';
import { CaretLeft, CaretRight, Plus, PawPrint } from '@phosphor-icons/react';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { useCalendarBookings } from '@/hooks/useBookings';
import { getMonthDays, getBookingsForDate } from './calendarUtils';
import { CreateBookingSheet } from '@/features/bookings/CreateBookingSheet';
import { SlideUpSheet } from '@/components/ui/SlideUpSheet';
import { DogAvatar } from '@/components/ui/DogAvatar';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];



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

  const [selectedAgendaDate, setSelectedAgendaDate] = useState<Date | null>(null);

  const handleDateTap = useCallback((date: Date) => {
    setSelectedAgendaDate(date);
  }, []);

  const handleFabClick = useCallback(() => {
    setBookingSheetDate(format(new Date(), 'yyyy-MM-dd'));
    setIsSheetOpen(true);
  }, []);

  const handleBookingClick = useCallback(
    (bookingId: string) => {
      setSelectedAgendaDate(null);
      navigate(`/bookings/${bookingId}`);
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
        className={`flex-1 overflow-y-auto grid grid-cols-7 px-2 gap-x-0 gap-y-[2px] transition-opacity duration-200 ${isPlaceholderData ? 'opacity-60' : 'opacity-100'}`}
      >
        {isLoading && !bookings.length ? (
          <div className="col-span-7 flex flex-col items-center justify-center text-bark-light font-bold text-sm h-[40vh]">
            Loading…
          </div>
        ) : (
          days.map((day, i) => {
            const rawDayBookings = getBookingsForDate(bookings, day);
            // Sort by start_date then id to keep vertical positions somewhat consistent for spans
            const dayBookings = [...rawDayBookings].sort((a, b) => 
               a.start_date.localeCompare(b.start_date) || a.id.localeCompare(b.id)
            );
            
            const inCurrentMonth = isSameMonth(day, currentMonth);
            const todayCell = isToday(day);

            return (
              <button
                key={i}
                type="button"
                onClick={() => inCurrentMonth && handleDateTap(day)}
                disabled={!inCurrentMonth}
                className={`min-h-[110px] h-auto border-r border-b border-pebble/30 flex flex-col items-center py-1 transition-all duration-150 ${
                  inCurrentMonth
                    ? todayCell
                      ? 'bg-sage/10' 
                      : 'bg-cream hover:bg-sage-light/20'
                    : 'opacity-25 bg-transparent'
                } ${i % 7 === 0 ? 'border-l' : ''} ${i < 7 ? 'border-t' : ''}`}
                aria-label={inCurrentMonth ? `${format(day, 'MMMM d')}` : undefined}
              >
                <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-black mb-1 ${
                  todayCell ? 'bg-sage text-white shadow-sm' : inCurrentMonth ? 'text-bark' : 'text-bark-light'
                }`}>
                  {format(day, 'd')}
                </div>

                {inCurrentMonth && dayBookings.length > 0 && (
                  <div className="w-full flex flex-col gap-[2px] px-0">
                    {dayBookings.slice(0, 5).map((b) => {
                      const isStart = format(new Date(b.start_date + 'T12:00:00'), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
                      const isEnd = format(new Date(b.end_date + 'T12:00:00'), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
                      
                      return (
                        <div 
                          key={b.id}
                          className={`w-full truncate text-[9px] font-black px-1.5 py-0.5 shadow-sm leading-tight transition-opacity ${
                            todayCell ? 'bg-sage text-white' : 'bg-sage-light text-bark'
                          } ${isStart && isEnd ? 'rounded-md mx-0.5 w-[calc(100%-4px)]' : 
                             isStart ? 'rounded-l-md ml-0.5 w-[calc(100%-2px)]' : 
                             isEnd ? 'rounded-r-md mr-0.5 w-[calc(100%-2px)]' : 'w-full'}`}
                        >
                          {(isStart || day.getDay() === 0) ? b.dogs?.name : ' '}
                        </div>
                      );
                    })}
                    {dayBookings.length > 5 && (
                      <div className="text-[8px] font-black text-center text-bark-light py-0.5 bg-warm-beige/50 mx-0.5 rounded">
                        +{dayBookings.length - 5} others
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
        onClick={handleFabClick}
        className="fixed right-5 bottom-[88px] w-14 h-14 rounded-full bg-terracotta text-white border-none cursor-pointer flex items-center justify-center shadow-lg shadow-terracotta/30 transition-all duration-200 hover:scale-105 active:scale-95 z-40 focus-visible:outline-sky focus-visible:outline-offset-2"
        aria-label="New booking"
      >
        <Plus size={28} weight="bold" />
      </button>

      {/* Sheet for new bookings */}
      <CreateBookingSheet
        isOpen={isSheetOpen}
        onClose={handleClose}
        prefilledDate={bookingSheetDate}
        onSuccess={handleSuccess}
      />

      {/* Sheet for daily agenda */}
      <SlideUpSheet 
        isOpen={!!selectedAgendaDate} 
        onClose={() => setSelectedAgendaDate(null)} 
        title={selectedAgendaDate ? format(selectedAgendaDate, 'EEEE, MMM d') : 'Agenda'}
      >
        <div className="flex flex-col gap-3 pb-8">
          {!selectedAgendaDate || getBookingsForDate(bookings, selectedAgendaDate).length === 0 ? (
            <div className="text-center py-10 bg-cream rounded-2xl border border-pebble/60 flex flex-col items-center">
              <span className="text-3xl mb-2">🌴</span>
              <span className="text-bark font-bold">No dogs today</span>
              <span className="text-xs text-bark-light">A well deserved break!</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {getBookingsForDate(bookings, selectedAgendaDate).map((b) => (
                <div 
                  key={b.id} 
                  onClick={() => handleBookingClick(b.id)}
                  className="bg-cream border border-pebble/40 rounded-2xl p-3 flex items-center justify-between shadow-[0_2px_8px_rgba(74,55,40,0.04)] cursor-pointer hover:border-sage/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <DogAvatar name={b.dogs?.name ?? 'Unknown'} src={b.dogs?.photo_url} size="md" />
                    <div>
                      <div className="font-bold text-bark text-sm leading-tight flex items-center gap-2">
                        {b.dogs?.name}
                      </div>
                      <div className="text-[10px] text-bark-light font-bold uppercase tracking-wider mt-0.5">
                        {b.type} {b.is_holiday && <span className="text-terracotta ml-1">· HOLIDAY</span>}
                      </div>
                    </div>
                  </div>
                  <CaretRight size={16} weight="bold" className="text-pebble" />
                </div>
              ))}
            </div>
          )}
        </div>
      </SlideUpSheet>
    </div>
  );
}
