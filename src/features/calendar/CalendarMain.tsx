import { AddButton } from '@/components/ui/AddButton';
import { DogAvatar } from '@/components/ui/DogAvatar';
import { SlideUpSheet } from '@/components/ui/SlideUpSheet';
import { CreateBookingSheet } from '@/features/bookings/CreateBookingSheet';
import { useCalendarBookings } from '@/hooks/useBookings';
import { CaretLeft, CaretRight, PawPrint } from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import { addMonths, format, isSameDay, isSameMonth, isToday, subMonths } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  assignWeekLanes,
  getBookingsForWeek,
  getMonthDays,
  type BookingLaneMap,
  type CalendarBooking,
} from './calendarUtils';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_VISIBLE_LANES = 4;

// ─── Per-dog color palette (Vibrant & Distinct) ──────────────────────────
const DOG_PALETTE = [
  { bg: 'rgba(143, 184, 134, 0.95)', text: '#fff' }, // Sage
  { bg: 'rgba(212, 132, 90, 0.95)', text: '#fff' },  // Terracotta
  { bg: 'rgba(126, 200, 227, 0.95)', text: '#fff' }, // Sky
  { bg: 'rgba(235, 185, 96, 0.95)', text: '#fff' },  // Golden Oak
  { bg: 'rgba(182, 143, 196, 0.95)', text: '#fff' }, // Berry
  { bg: 'rgba(110, 139, 116, 0.95)', text: '#fff' }, // Bark Green
  { bg: 'rgba(219, 126, 126, 0.95)', text: '#fff' }, // Rosewood
  { bg: 'rgba(100, 149, 237, 0.95)', text: '#fff' }, // Cornflower
  { bg: 'rgba(160, 120, 90, 0.95)', text: '#fff' },  // Cedar
  { bg: 'rgba(147, 197, 114, 0.95)', text: '#fff' }, // Lime Glow
  { bg: 'rgba(240, 142, 128, 0.95)', text: '#fff' }, // Peach
  { bg: 'rgba(95, 158, 160, 0.95)', text: '#fff' },  // Cadet Blue
];

function dogColor(dogId: string) {
  let h = 0;
  for (let i = 0; i < dogId.length; i++) h = ((h << 5) - h + dogId.charCodeAt(i)) | 0;
  return DOG_PALETTE[Math.abs(h) % DOG_PALETTE.length];
}

function WeekRow({
  week,
  bookings,
  currentMonth,
  selectedDate,
  onDateClick,
  onBookingClick,
}: {
  week: Date[];
  bookings: CalendarBooking[];
  currentMonth: Date;
  selectedDate: Date | null;
  onDateClick: (d: Date) => void;
  onBookingClick: (id: string) => void;
}) {
  const weekStartStr = format(week[0], 'yyyy-MM-dd');
  const weekEndStr = format(week[6], 'yyyy-MM-dd');

  const weekBookings = getBookingsForWeek(bookings, weekStartStr, weekEndStr);
  const laneMap: BookingLaneMap = assignWeekLanes(weekBookings, weekStartStr, weekEndStr);
  const maxLane = weekBookings.length > 0 ? Math.max(...Object.values(laneMap)) : -1;
  const totalLanes = maxLane + 1;
  const visibleLanes = Math.min(totalLanes, MAX_VISIBLE_LANES);
  const visibleBookings = weekBookings.filter((b) => (laneMap[b.id] ?? 999) < MAX_VISIBLE_LANES);

  const dayIdx = (dateStr: string): number => {
    const idx = week.findIndex((d) => format(d, 'yyyy-MM-dd') === dateStr);
    return idx >= 0 ? idx : -1;
  };

  return (
    <div className="border-b border-pebble/10 last:border-b-0 h-full flex flex-col overflow-hidden">
      {/* Date Row */}
      <div className="grid grid-cols-7 relative pt-0.5">
        {week.map((day, i) => {
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const selected = selectedDate && isSameDay(day, selectedDate);
          const dateStr = format(day, 'yyyy-MM-dd');
          
          const dayBookings = getBookingsForWeek(bookings, dateStr, dateStr);
          const totalDogs = dayBookings.length;
          const isArriving = dayBookings.some(b => b.start_date === dateStr);
          const isDeparting = dayBookings.some(b => b.end_date === dateStr);

          return (
            <div
              key={i}
              onClick={() => inMonth && onDateClick(day)}
              className={`flex flex-col items-center select-none relative transition-all h-full
                ${inMonth ? (selected ? 'bg-sage/10 ring-1 ring-inset ring-sage/20' : 'hover:bg-sage/5 cursor-pointer') : 'opacity-10 pointer-events-none'}`}
            >
              <div
                className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-black transition-all mt-0.5
                  ${selected ? 'bg-sage text-white shadow-lg scale-110' : today ? 'bg-terracotta text-white' : 'text-bark'}`}
              >
                {format(day, 'd')}
              </div>
              
              <div className="flex flex-col items-center gap-0.5 mt-0.5 pointer-events-none">
                {totalDogs > 0 && inMonth && (
                  <span className="text-[10px] font-black text-sage flex items-center gap-0.5 px-1.5 py-0.5 bg-white/70 rounded-full border border-white shadow-sm backdrop-blur-[2px] transform scale-110 leading-none mb-1">
                    🐾<span className="opacity-60 scale-75">x</span>{totalDogs}
                  </span>
                )}
                <div className="flex gap-1 h-2 items-center">
                  {isArriving && <div className="w-1.5 h-1.5 rounded-full bg-sage shadow-sm border border-white" aria-label="Arrival" />}
                  {isDeparting && <div className="w-1.5 h-1.5 rounded-full bg-terracotta shadow-sm border border-white" aria-label="Departure" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Booking Bars */}
      <div
        className="relative px-0.5 pb-0.5 ml-px flex-1"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gridTemplateRows: `repeat(${visibleLanes || 1}, 1fr)`,
          gap: `1px 0`,
        }}
      >
        {visibleBookings.map((b) => {
          const lane = laneMap[b.id];
          const c = dogColor(b.dog_id);
          const bStart = b.start_date;
          const bEnd = b.end_date;

          const isStartInWeek = bStart >= weekStartStr;
          const isEndInWeek = bEnd <= weekEndStr;

          const colStart = (isStartInWeek ? dayIdx(bStart) : 0) + 1;
          const colEnd = (isEndInWeek ? dayIdx(bEnd) : 6) + 2;

          const rL = isStartInWeek ? '4px' : '0';
          const rR = isEndInWeek ? '4px' : '0';

          return (
            <button
              key={b.id}
              onClick={(e) => { e.stopPropagation(); onBookingClick(b.id); }}
              className="flex items-center px-1.5 overflow-hidden whitespace-nowrap cursor-pointer transition-all hover:brightness-95 active:scale-[0.98] shadow-sm backdrop-blur-[2px]"
              style={{
                gridColumn: `${colStart} / ${colEnd}`,
                gridRow: lane + 1,
                background: c.bg,
                color: c.text,
                borderRadius: `${rL} ${rR} ${rR} ${rL}`,
                fontSize: '8px',
                fontWeight: 900,
                margin: '0.25px',
                border: '1px solid rgba(255,255,255,0.2)',
                minHeight: '13px',
              }}
            >
              <span className="truncate drop-shadow-sm uppercase tracking-tighter">
                {isStartInWeek || (week[0].getDay() === 0 && !isStartInWeek) ? b.dogs?.name : ''}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CalendarMain() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: bookings = [], isLoading } = useCalendarBookings(currentMonth);

  const days = getMonthDays(currentMonth);
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const handleBookingClick = useCallback((id: string) => navigate(`/bookings/${id}`), [navigate]);

  const agendaBookings = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return getBookingsForWeek(bookings, dateStr, dateStr);
  }, [bookings, selectedDate]);

  return (
    <div className="flex flex-col h-full bg-transparent pb-24 -mx-4 overflow-hidden">
      {/* Navigation Header */}
      <div className="mx-4 mt-1 px-4 py-2 glass-card rounded-[24px] flush-shadow mb-2 border-b border-white/20">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="w-9 h-9 flex items-center justify-center text-bark-light hover:bg-pebble/20 rounded-full transition-all active:scale-75"
          >
            <CaretLeft size={18} weight="bold" />
          </button>
          
          <div className="text-center group cursor-pointer" onClick={() => setCurrentMonth(new Date())}>
            <h2 className="font-black text-lg text-bark uppercase tracking-[0.2em] group-hover:text-sage transition-colors leading-none">{format(currentMonth, 'MMMM')}</h2>
            <p className="text-[9px] font-bold text-bark-light tracking-[0.3em] mt-0.5 opacity-60 text-center">{format(currentMonth, 'yyyy')}</p>
          </div>

          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="w-9 h-9 flex items-center justify-center text-bark-light hover:bg-pebble/20 rounded-full transition-all active:scale-75"
          >
            <CaretRight size={18} weight="bold" />
          </button>
        </div>
      </div>

      {/* Week Labels */}
      <div className="grid grid-cols-7 px-4 mb-1.5 gap-1">
        {DAY_LABELS.map((d, i) => (
          <div key={i} className="text-center text-[8.5px] font-black text-bark-light opacity-70 uppercase tracking-[0.15em]">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div 
        className="mx-3 glass-card rounded-[24px] flush-shadow overflow-hidden mb-2 border border-white/20 flex-1"
        style={{
          display: 'grid',
          gridTemplateRows: `repeat(${weeks.length}, 1fr)`,
        }}
      >
        {isLoading && !bookings.length ? (
          <div className="flex items-center justify-center text-bark-light font-black uppercase tracking-widest opacity-40 text-[10px]">Syncing...</div>
        ) : (
          weeks.map((week, wi) => (
            <WeekRow
              key={wi}
              week={week}
              bookings={bookings}
              currentMonth={currentMonth}
              selectedDate={selectedDate}
              onDateClick={setSelectedDate}
              onBookingClick={handleBookingClick}
            />
          ))
        )}
      </div>

      <div className="mx-6 flex items-center gap-2 bg-sage/5 p-2 rounded-xl border border-sage/10 mb-1">
        <PawPrint size={14} weight="duotone" className="text-sage" />
        <p className="text-[8.5px] font-bold text-bark leading-tight">
          Tap a date to see the daily pups. Full status at <span className="text-sage font-black">🏠 Home</span>.
        </p>
      </div>

      <AddButton
        onClick={() => setIsSheetOpen(true)}
        variant="calendar"
        isActive={isSheetOpen}
        ariaLabel="New booking"
      />

      {/* Daily Agenda Detail */}
      <SlideUpSheet
        isOpen={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        title={selectedDate ? format(selectedDate, 'MMM do, yyyy') : ''}
      >
        <div className="flex flex-col gap-4 pb-8 min-h-[300px]">
          {agendaBookings.length === 0 ? (
            <div className="text-center py-16 opacity-40">
              <span className="text-4xl mb-3 block">💤</span>
              <p className="text-xs font-black text-bark-light uppercase tracking-widest">No pups today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {agendaBookings.map((b) => (
                <div
                  key={b.id}
                  onClick={() => { handleBookingClick(b.id); setSelectedDate(null); }}
                  className="glass-card p-4 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer border border-pebble/10"
                >
                  <div className="flex items-center gap-4">
                    <DogAvatar name={b.dogs?.name ?? ''} src={b.dogs?.photo_url} size="md" />
                    <div>
                      <h4 className="font-black text-bark text-base leading-none">{b.dogs?.name}</h4>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-[9px] font-black bg-pebble/10 text-bark-light px-2 py-0.5 rounded uppercase tracking-tighter shadow-sm border border-pebble/5">{b.type}</span>
                        {selectedDate && b.start_date === format(selectedDate, 'yyyy-MM-dd') && (
                          <span className="text-[8px] font-black bg-sage/10 text-sage px-1.5 py-0.5 rounded uppercase border border-sage/10">Arrival</span>
                        )}
                        {selectedDate && b.end_date === format(selectedDate, 'yyyy-MM-dd') && (
                          <span className="text-[8px] font-black bg-terracotta/10 text-terracotta px-1.5 py-0.5 rounded uppercase border border-terracotta/10">Departure</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <CaretRight size={20} weight="bold" className="text-pebble/40" />
                </div>
              ))}
            </div>
          )}
        </div>
      </SlideUpSheet>

      <CreateBookingSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        prefilledDate={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')}
        onSuccess={() => {
          setIsSheetOpen(false);
          void queryClient.invalidateQueries({ queryKey: ['bookings'] });
          void queryClient.invalidateQueries({ queryKey: ['calendar-bookings'] });
        }}
      />
    </div>
  );
}
