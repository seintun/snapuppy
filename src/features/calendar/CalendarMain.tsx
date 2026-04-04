import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { format, addMonths, subMonths, isSameMonth, isToday, addDays } from 'date-fns';
import { CaretLeft, CaretRight, Plus, PawPrint } from '@phosphor-icons/react';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { useCalendarBookings } from '@/hooks/useBookings';
import {
  getMonthDays,
  getBookingsForDate,
  getBookingsForWeek,
  assignWeekLanes,
  type CalendarBooking,
  type BookingLaneMap,
} from './calendarUtils';
import { CreateBookingSheet } from '@/features/bookings/CreateBookingSheet';
import { SlideUpSheet } from '@/components/ui/SlideUpSheet';
import { DogAvatar } from '@/components/ui/DogAvatar';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_VISIBLE_LANES = 4;
const LANE_H = 17; // px per lane bar
const LANE_GAP = 2; // px gap between lanes

// ─── Per-dog color palette (hashed from dog_id for consistency) ────────────────
// 5 distinct, on-brand colors with solid bg + white/dark text
const DOG_PALETTE = [
  { bg: '#8FB886', text: '#fff' },          // sage
  { bg: '#D4845A', text: '#fff' },          // terracotta
  { bg: '#5BA4C8', text: '#fff' },          // deeper sky
  { bg: '#9B7EC8', text: '#fff' },          // soft purple
  { bg: '#C8946A', text: '#fff' },          // warm amber
];

function dogColor(dogId: string) {
  let h = 0;
  for (let i = 0; i < dogId.length; i++) h = ((h << 5) - h + dogId.charCodeAt(i)) | 0;
  return DOG_PALETTE[Math.abs(h) % DOG_PALETTE.length];
}

// ─── Today Info Card ──────────────────────────────────────────────────────────
function TodayCard({
  bookings,
  onBookingClick,
}: {
  bookings: CalendarBooking[];
  onBookingClick: (id: string) => void;
}) {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  const arriving = bookings.filter(
    (b) => b.start_date === todayStr || b.start_date === tomorrowStr,
  );
  const departing = bookings.filter(
    (b) => b.end_date === todayStr || b.end_date === tomorrowStr,
  );

  if (arriving.length === 0 && departing.length === 0) return null;

  return (
    <div className="mx-2 mb-2 bg-cream rounded-2xl border border-pebble/60 shadow-sm overflow-hidden">
      <div className="grid grid-cols-2 divide-x divide-pebble/40">
        {/* Arriving */}
        <div className="p-2.5">
          <div className="text-[9px] font-black uppercase tracking-widest text-sage mb-1.5">
            🐾 Arriving
          </div>
          {arriving.length === 0 ? (
            <div className="text-[9px] text-bark-light italic">None</div>
          ) : (
            <div className="flex flex-col gap-1">
              {arriving.map((b) => {
                const c = dogColor(b.dog_id);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onBookingClick(b.id)}
                    className="flex items-center gap-1.5 w-full text-left"
                  >
                    <span
                      className="text-[10px] font-black rounded-full px-2 py-0.5 truncate max-w-[80px]"
                      style={{ background: c.bg, color: c.text }}
                    >
                      {b.dogs?.name}
                    </span>
                    <span className="text-[9px] text-bark-light shrink-0">
                      {b.start_date === todayStr ? 'today' : 'tmrw'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Departing */}
        <div className="p-2.5">
          <div className="text-[9px] font-black uppercase tracking-widest text-terracotta mb-1.5">
            🚗 Departing
          </div>
          {departing.length === 0 ? (
            <div className="text-[9px] text-bark-light italic">None</div>
          ) : (
            <div className="flex flex-col gap-1">
              {departing.map((b) => {
                const c = dogColor(b.dog_id);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onBookingClick(b.id)}
                    className="flex items-center gap-1.5 w-full text-left"
                  >
                    <span
                      className="text-[10px] font-black rounded-full px-2 py-0.5 truncate max-w-[80px]"
                      style={{ background: c.bg, color: c.text }}
                    >
                      {b.dogs?.name}
                    </span>
                    <span className="text-[9px] text-bark-light shrink-0">
                      {b.end_date === todayStr ? 'today' : 'tmrw'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Week Row (Google Calendar-style spanning bars) ───────────────────────────
function WeekRow({
  week,
  bookings,
  currentMonth,
  onDateTap,
  onBookingClick,
}: {
  week: Date[];
  bookings: CalendarBooking[];
  currentMonth: Date;
  onDateTap: (d: Date) => void;
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

  // Lookup day index within this week (0-6) for a date string
  const dayIdx = (dateStr: string): number => {
    const idx = week.findIndex((d) => format(d, 'yyyy-MM-dd') === dateStr);
    return idx >= 0 ? idx : -1;
  };

  return (
    <div className="border-b border-pebble/30 last:border-b-0">
      {/* Date number row */}
      <div className="grid grid-cols-7">
        {week.map((day, i) => {
          const inMonth = isSameMonth(day, currentMonth);
          const todayCell = isToday(day);
          const dayAllBookings = getBookingsForDate(bookings, day);
          const hiddenCount = dayAllBookings.filter(
            (b) => (laneMap[b.id] ?? MAX_VISIBLE_LANES) >= MAX_VISIBLE_LANES,
          ).length;

          return (
            <div
              key={i}
              onClick={() => inMonth && onDateTap(day)}
              className={`border-r border-pebble/20 last:border-r-0 pt-1 flex flex-col items-center select-none cursor-pointer transition-colors
                ${inMonth ? 'hover:bg-sage-light/20 active:bg-sage-light/40' : 'opacity-25 pointer-events-none'}
                ${i === 0 ? 'border-l border-pebble/20' : ''}`}
            >
              <div
                className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-black leading-none
                  ${todayCell ? 'bg-sage text-white shadow-sm' : inMonth ? 'text-bark' : 'text-bark-light'}`}
              >
                {format(day, 'd')}
              </div>
              {hiddenCount > 0 && (
                <div className="text-[7px] font-black text-bark-light/70 leading-none mb-0.5">
                  +{hiddenCount}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Booking bars — CSS grid with explicit gridColumn / gridRow */}
      {visibleLanes > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gridTemplateRows: `repeat(${visibleLanes}, ${LANE_H}px)`,
            gap: `${LANE_GAP}px 0`,
            paddingBottom: '3px',
          }}
        >
          {visibleBookings.map((b) => {
            const lane = laneMap[b.id];
            const c = dogColor(b.dog_id);

            const bStart = b.start_date;
            const bEnd = b.end_date;

            const isStartInWeek = bStart >= weekStartStr;
            const isEndInWeek = bEnd <= weekEndStr;

            // Column indices (0-based → CSS grid 1-based)
            const rawStartIdx = isStartInWeek ? dayIdx(bStart) : 0;
            const rawEndIdx = isEndInWeek ? dayIdx(bEnd) : 6;
            const colStart = (rawStartIdx >= 0 ? rawStartIdx : 0) + 1;
            const colEnd = (rawEndIdx >= 0 ? rawEndIdx : 6) + 2; // exclusive

            // Show label at booking start OR at row-wrap (Sunday = col 0)
            const showLabel = isStartInWeek || week[0].getDay() === 0;

            const rL = isStartInWeek ? '3px' : '0';
            const rR = isEndInWeek ? '3px' : '0';

            return (
              <button
                key={b.id}
                type="button"
                title={b.dogs?.name ?? ''}
                onClick={(e) => {
                  e.stopPropagation();
                  onBookingClick(b.id);
                }}
                style={{
                  gridColumn: `${colStart} / ${colEnd}`,
                  gridRow: lane + 1,
                  background: c.bg,
                  color: c.text,
                  borderRadius: `${rL} ${rR} ${rR} ${rL}`,
                  marginLeft: isStartInWeek ? '2px' : '0',
                  marginRight: isEndInWeek ? '2px' : '0',
                  fontSize: '9px',
                  fontWeight: 800,
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: isStartInWeek ? '6px' : '3px',
                  paddingRight: '3px',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  opacity: 1,
                  transition: 'opacity 120ms',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0.8')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
              >
                {showLabel ? (b.dogs?.name ?? '') : ''}
              </button>
            );
          })}
        </div>
      )}

      {/* Empty row padding so weeks without bookings still have height */}
      {visibleLanes === 0 && <div style={{ height: '18px' }} />}
    </div>
  );
}

// ─── Main CalendarMain ────────────────────────────────────────────────────────
export function CalendarMain() {
  const { user } = useAuthContext();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [bookingSheetDate, setBookingSheetDate] = useState<string | undefined>(undefined);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: bookings = [], isLoading, isPlaceholderData } = useCalendarBookings(currentMonth);

  const days = getMonthDays(currentMonth);
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const [selectedAgendaDate, setSelectedAgendaDate] = useState<Date | null>(null);

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

  const isSameMonthView = isSameMonth(new Date(), currentMonth);

  return (
    <div className="flex flex-col h-full bg-warm-beige pb-20 -mx-4">
      {/* Month header */}
      <div className="bg-cream px-4 py-3 rounded-b-[20px] shadow-sm mb-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="w-9 h-9 flex items-center justify-center bg-sage-light/50 text-sage rounded-full hover:bg-sage-light transition-colors"
            aria-label="Previous month"
          >
            <CaretLeft size={18} weight="bold" />
          </button>
          <div className="text-center">
            <h2 className="font-extrabold text-xl text-bark tracking-tight">
              {format(currentMonth, 'MMMM')}
            </h2>
            <p className="text-xs text-bark-light font-semibold">{format(currentMonth, 'yyyy')}</p>
          </div>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="w-9 h-9 flex items-center justify-center bg-sage-light/50 text-sage rounded-full hover:bg-sage-light transition-colors"
            aria-label="Next month"
          >
            <CaretRight size={18} weight="bold" />
          </button>
        </div>
        {!isSameMonthView && (
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="mx-auto mt-2 flex items-center gap-1.5 text-xs font-bold text-sage bg-sage-light px-3 py-1 rounded-full transition-all active:scale-95"
          >
            <PawPrint size={11} />
            Today
          </button>
        )}
      </div>

      {/* Today's arrivals/departures card */}
      {isSameMonthView && (
        <TodayCard bookings={bookings} onBookingClick={handleBookingClick} />
      )}

      {/* Weekday labels */}
      <div className="grid grid-cols-7 px-2 mb-0.5">
        {DAY_LABELS.map((d) => (
          <div
            key={d}
            className="text-center py-1 text-[10px] font-black text-bark-light uppercase tracking-widest"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        className={`flex-1 overflow-y-auto px-2 border border-pebble/30 mx-2 rounded-xl bg-cream transition-opacity duration-200 ${isPlaceholderData ? 'opacity-60' : 'opacity-100'}`}
      >
        {isLoading && !bookings.length ? (
          <div className="flex items-center justify-center h-40 text-bark-light font-bold text-sm">
            Loading…
          </div>
        ) : (
          weeks.map((week, wi) => (
            <WeekRow
              key={wi}
              week={week}
              bookings={bookings}
              currentMonth={currentMonth}
              onDateTap={(d) => setSelectedAgendaDate(d)}
              onBookingClick={handleBookingClick}
            />
          ))
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => {
          setBookingSheetDate(format(new Date(), 'yyyy-MM-dd'));
          setIsSheetOpen(true);
        }}
        className="fixed right-5 bottom-[88px] w-14 h-14 rounded-full bg-terracotta text-white flex items-center justify-center shadow-lg shadow-terracotta/30 transition-all hover:scale-105 active:scale-95 z-40"
        aria-label="New booking"
      >
        <Plus size={28} weight="bold" />
      </button>

      {/* New booking sheet */}
      <CreateBookingSheet
        isOpen={isSheetOpen}
        onClose={handleClose}
        prefilledDate={bookingSheetDate}
        onSuccess={handleSuccess}
      />

      {/* Daily agenda sheet */}
      <SlideUpSheet
        isOpen={!!selectedAgendaDate}
        onClose={() => setSelectedAgendaDate(null)}
        title={selectedAgendaDate ? format(selectedAgendaDate, 'EEEE, MMM d') : 'Agenda'}
      >
        <div className="flex flex-col gap-3 pb-8">
          {!selectedAgendaDate ||
          getBookingsForDate(bookings, selectedAgendaDate).length === 0 ? (
            <div className="text-center py-10 bg-cream rounded-2xl border border-pebble/60 flex flex-col items-center">
              <span className="text-3xl mb-2">🌴</span>
              <span className="text-bark font-bold">No dogs today</span>
              <span className="text-xs text-bark-light">A well deserved break!</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {getBookingsForDate(bookings, selectedAgendaDate).map((b) => {
                const c = dogColor(b.dog_id);
                return (
                  <div
                    key={b.id}
                    onClick={() => handleBookingClick(b.id)}
                    className="bg-cream border border-pebble/40 rounded-2xl p-3 flex items-center justify-between shadow-[0_2px_8px_rgba(74,55,40,0.04)] cursor-pointer hover:border-sage/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {/* Color dot matching calendar bar */}
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: c.bg }}
                      />
                      <DogAvatar
                        name={b.dogs?.name ?? 'Unknown'}
                        src={b.dogs?.photo_url}
                        size="md"
                      />
                      <div>
                        <div className="font-bold text-bark text-sm leading-tight">
                          {b.dogs?.name}
                        </div>
                        <div className="text-[10px] text-bark-light font-bold uppercase tracking-wider mt-0.5">
                          {b.type}
                          {b.is_holiday && (
                            <span className="text-terracotta ml-1">· HOLIDAY</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <CaretRight size={16} weight="bold" className="text-pebble" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SlideUpSheet>
    </div>
  );
}
