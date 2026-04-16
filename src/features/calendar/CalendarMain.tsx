import { AddButton } from '@/components/ui/AddButton';
import { DogAvatar } from '@/components/ui/DogAvatar';
import { SlideUpSheet } from '@/components/ui/SlideUpSheet';
import { CreateBookingSheet } from '@/features/bookings/CreateBookingSheet';
import { useCalendarBookings } from '@/hooks/useBookings';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
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
const LANE_H = 16;
const LANE_GAP = 1;

// ─── Per-dog color palette (Vibrant & Distinct) ──────────────────────────
const DOG_PALETTE = [
  { bg: 'rgba(143, 184, 134, 0.95)', text: '#fff' }, // Sage
  { bg: 'rgba(212, 132, 90, 0.95)', text: '#fff' }, // Terracotta
  { bg: 'rgba(126, 200, 227, 0.95)', text: '#fff' }, // Sky
  { bg: 'rgba(235, 185, 96, 0.95)', text: '#fff' }, // Golden Oak
  { bg: 'rgba(182, 143, 196, 0.95)', text: '#fff' }, // Berry
  { bg: 'rgba(110, 139, 116, 0.95)', text: '#fff' }, // Bark Green
  { bg: 'rgba(219, 126, 126, 0.95)', text: '#fff' }, // Rosewood
  { bg: 'rgba(100, 149, 237, 0.95)', text: '#fff' }, // Cornflower
  { bg: 'rgba(160, 120, 90, 0.95)', text: '#fff' }, // Cedar
  { bg: 'rgba(147, 197, 114, 0.95)', text: '#fff' }, // Lime Glow
  { bg: 'rgba(240, 142, 128, 0.95)', text: '#fff' }, // Peach
  { bg: 'rgba(95, 158, 160, 0.95)', text: '#fff' }, // Cadet Blue
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
    <div className="relative border-b border-pebble/10 last:border-b-0 h-full flex flex-col bg-cream/5 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 z-0 grid grid-cols-7">
        {week.map((day, i) => {
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const selected = selectedDate && isSameDay(day, selectedDate);

          return (
            <div
              key={`grid-${i}`}
              className={`border-b ${i < 6 ? 'border-r' : ''} ${
                selected
                  ? 'border-sage/35 bg-sage/[0.04]'
                  : today
                    ? 'border-terracotta/30 bg-terracotta/[0.03]'
                    : inMonth
                      ? 'border-pebble/22'
                      : 'border-pebble/14 bg-pebble/5'
              }`}
            />
          );
        })}
      </div>

      <div className="absolute inset-0 z-[5] grid grid-cols-7">
        {week.map((day, i) => {
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const selected = selectedDate && isSameDay(day, selectedDate);

          return (
            <button
              key={`hit-${i}`}
              type="button"
              onClick={() => inMonth && onDateClick(day)}
              aria-label={format(day, 'MMMM d, yyyy')}
              className={`appearance-none border-0 p-0 m-0 h-full w-full transition-colors
                ${
                  inMonth
                    ? selected
                      ? 'cursor-pointer hover:bg-sage/[0.06]'
                      : today
                        ? 'cursor-pointer hover:bg-terracotta/[0.06]'
                        : 'cursor-pointer hover:bg-sage/[0.05]'
                    : 'pointer-events-none'
                }`}
            />
          );
        })}
      </div>

      {/* Date Header: Clear vertical space */}
      <div className="grid grid-cols-7 relative h-8 shrink-0 pt-1 pointer-events-none z-10">
        {week.map((day, i) => {
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const selected = selectedDate && isSameDay(day, selectedDate);
          const dateStr = format(day, 'yyyy-MM-dd');

          const dayBookings = getBookingsForWeek(bookings, dateStr, dateStr);
          const isArriving = dayBookings.some((b) => b.start_date === dateStr);
          const isDeparting = dayBookings.some((b) => b.end_date === dateStr);

          return (
            <div
              key={i}
              className={`flex flex-col items-center select-none h-full px-0.5 ${inMonth ? '' : 'opacity-35'}`}
            >
              <div
                className={`w-5 h-5 flex items-center justify-center rounded-md text-[8.5px] font-black
                  ${selected ? 'bg-sage text-white' : today ? 'bg-terracotta text-white' : 'text-bark'}`}
              >
                {format(day, 'd')}
              </div>

              <div className="flex flex-col items-center pointer-events-none h-2 mt-0.5">
                <div className="flex gap-0.5 h-1 items-center mt-0.5">
                  {isArriving && (
                    <div
                      className="w-1 h-1 rounded-full bg-sage shadow-sm border border-white"
                      aria-label="Arrival"
                    />
                  )}
                  {isDeparting && (
                    <div
                      className="w-1 h-1 rounded-full bg-terracotta shadow-sm border border-white"
                      aria-label="Departure"
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Booking Bars: Separated below header */}
      <div className="relative z-20 pointer-events-none px-0.5 ml-px flex-1 flex flex-col overflow-hidden">
        <div
          className="grid flex-1 items-start"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gridTemplateRows: `repeat(${visibleLanes || 1}, ${LANE_H}px)`,
            gap: `${LANE_GAP}px 0`,
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
                onClick={(e) => {
                  e.stopPropagation();
                  onBookingClick(b.id);
                }}
                className="pointer-events-auto flex items-center px-1 overflow-hidden whitespace-nowrap cursor-pointer transition-all hover:brightness-95 active:scale-[0.98] shadow-sm"
                style={{
                  gridColumn: `${colStart} / ${colEnd}`,
                  gridRow: lane + 1,
                  background: c.bg,
                  color: c.text,
                  borderRadius: `${rL} ${rR} ${rR} ${rL}`,
                  fontSize: '7px',
                  fontWeight: 900,
                  border: '1px solid rgba(255,255,255,0.2)',
                  height: `${LANE_H}px`,
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
    const unsorted = getBookingsForWeek(bookings, dateStr, dateStr);

    return [...unsorted].sort((a, b) => {
      const aMovement = a.start_date === dateStr || a.end_date === dateStr;
      const bMovement = b.start_date === dateStr || b.end_date === dateStr;

      if (aMovement && !bMovement) return -1;
      if (!aMovement && bMovement) return 1;
      return (a.dogs?.name ?? '').localeCompare(b.dogs?.name ?? '');
    });
  }, [bookings, selectedDate]);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-transparent -mx-4 overflow-hidden relative pb-2">
      {/* Month Navigation */}
      <div className="mx-4 mt-1 px-4 py-1.5 glass-card rounded-[24px] flush-shadow mb-1 border-b border-white/20">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="w-8 h-8 flex items-center justify-center text-bark-light hover:bg-pebble/20 rounded-full transition-all active:scale-75"
          >
            <CaretLeft size={16} weight="bold" />
          </button>

          <div
            className="text-center group cursor-pointer"
            onClick={() => setCurrentMonth(new Date())}
          >
            <h2 className="font-black text-base text-bark uppercase tracking-[0.2em] group-hover:text-sage transition-colors leading-none">
              {format(currentMonth, 'MMMM')}
            </h2>
            <p className="text-[8px] font-bold text-bark-light tracking-[0.3em] mt-0.5 opacity-60 text-center">
              {format(currentMonth, 'yyyy')}
            </p>
          </div>

          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="w-8 h-8 flex items-center justify-center text-bark-light hover:bg-pebble/20 rounded-full transition-all active:scale-75"
          >
            <CaretRight size={16} weight="bold" />
          </button>
        </div>
      </div>

      {/* Day Labels */}
      <div className="grid grid-cols-7 px-4 mb-0.5">
        {DAY_LABELS.map((d, i) => (
          <div
            key={i}
            className="text-center text-[7px] font-black text-bark-light opacity-50 uppercase tracking-[0.1em]"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid: Flex to fit viewport exactly */}
      <div
        className="mx-3 glass-card rounded-[24px] flush-shadow overflow-hidden mb-1 border border-white/20 flex-1 flex flex-col"
        style={{
          display: 'grid',
          gridTemplateRows: `repeat(${weeks.length}, 1fr)`,
        }}
      >
        {isLoading && !bookings.length ? (
          <div className="flex items-center justify-center text-bark-light font-black uppercase tracking-widest opacity-40 text-[9px]">
            Syncing...
          </div>
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

      <div className="mx-6 flex items-center justify-center -mt-1 opacity-60">
        <div className="px-3 py-0.5 bg-sage/5 rounded-full border border-sage/10 backdrop-blur-sm">
          <p className="text-[7.5px] font-black text-bark/40 uppercase tracking-tighter">
            Full status at <span className="text-sage">🏠 Home</span>
          </p>
        </div>
      </div>

      <AddButton
        onClick={() => setIsSheetOpen(true)}
        variant="calendar"
        isActive={isSheetOpen}
        ariaLabel="New booking"
      />

      <SlideUpSheet
        isOpen={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        title={selectedDate ? format(selectedDate, 'MMM do, yyyy') : ''}
      >
        <div className="flex flex-col gap-6 pb-12 min-h-[300px]">
          {agendaBookings.length === 0 ? (
            <div className="text-center py-24 opacity-40">
              <span className="text-4xl mb-3 block">💤</span>
              <p className="text-xs font-black text-bark-light uppercase tracking-[0.2em]">
                No pups today
              </p>
            </div>
          ) : (
            (() => {
              const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
              const arriving = agendaBookings.filter((b) => b.start_date === dateStr);
              const departing = agendaBookings.filter((b) => b.end_date === dateStr);
              const staying = agendaBookings.filter(
                (b) => b.start_date !== dateStr && b.end_date !== dateStr,
              );

              const renderSection = (
                title: string,
                items: typeof agendaBookings,
                colorClass: string,
              ) => {
                if (items.length === 0) return null;
                return (
                  <div key={title} className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 px-1">
                      <div className={`w-1 h-3 rounded-full ${colorClass}`} />
                      <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-bark/40">
                        {title}
                      </h5>
                      <div className="h-px flex-1 bg-pebble/10 ml-1" />
                      <span className="text-[9px] font-black text-bark/30 bg-pebble/5 px-2 py-0.5 rounded-full">
                        {items.length}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {items.map((b) => (
                        <div
                          key={b.id}
                          onClick={() => {
                            handleBookingClick(b.id);
                            setSelectedDate(null);
                          }}
                          className="glass-card p-2.5 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer border border-pebble/10"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <DogAvatar
                              name={b.dogs?.name ?? ''}
                              src={b.dogs?.photo_url}
                              size="sm"
                            />
                            <div className="flex-1 min-w-0 flex items-center gap-3">
                              <div className="min-w-0 shrink-0">
                                <h4 className="font-black text-bark text-sm leading-none truncate">
                                  {b.dogs?.name}
                                </h4>
                                <p className="text-[9px] font-bold text-bark/40 mt-0.5 uppercase tracking-tight">
                                  {format(new Date(b.start_date + 'T00:00:00'), 'MMM d')} —{' '}
                                  {format(new Date(b.end_date + 'T00:00:00'), 'MMM d')}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap flex-1 justify-end mr-1">
                                <span className="text-[8px] font-black bg-pebble/10 text-bark-light px-1.5 py-0.5 rounded uppercase tracking-tighter border border-pebble/5">
                                  {b.type}
                                </span>
                              </div>
                            </div>
                          </div>
                          <CaretRight size={14} weight="bold" className="text-pebble/30 shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              };

              return (
                <>
                  {renderSection('Arriving', arriving, 'bg-sage')}
                  {renderSection('Departing', departing, 'bg-terracotta')}
                  {renderSection('Staying', staying, 'bg-sky')}
                </>
              );
            })()
          )}
        </div>
      </SlideUpSheet>

      <CreateBookingSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        prefilledDate={
          selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
        }
        onSuccess={() => {
          setIsSheetOpen(false);
          void queryClient.invalidateQueries({ queryKey: ['bookings'] });
          void queryClient.invalidateQueries({ queryKey: ['calendar-bookings'] });
        }}
      />
    </div>
  );
}
