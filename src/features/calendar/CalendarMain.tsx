import { DogAvatar } from '@/components/ui/DogAvatar';
import { SlideUpSheet } from '@/components/ui/SlideUpSheet';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { CreateBookingSheet } from '@/features/bookings/CreateBookingSheet';
import { useCalendarBookings } from '@/hooks/useBookings';
import { CaretLeft, CaretRight, PawPrint, Plus } from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import { addDays, addMonths, format, isSameMonth, isToday, subMonths } from 'date-fns';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  assignWeekLanes,
  getBookingsForDate,
  getBookingsForWeek,
  getMonthDays,
  type BookingLaneMap,
  type CalendarBooking,
} from './calendarUtils';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_VISIBLE_LANES = 4;
const LANE_H = 17; // px per lane bar
const LANE_GAP = 2; // px gap between lanes

// ─── Per-dog color palette (hashed from dog_id for consistency) ────────────────
// 5 distinct, on-brand colors with solid bg + white/dark text
// ─── Per-dog color palette (harmonious & distinct) ──────────────────────────
const DOG_PALETTE = [
  { bg: '#9DBE94', text: '#fff' }, // Soft Sage
  { bg: '#DB9B7D', text: '#fff' }, // Muted Terracotta
  { bg: '#87AFC7', text: '#fff' }, // Soft Blue
  { bg: '#B4A2D1', text: '#fff' }, // Dusty Purple
  { bg: '#D4C29A', text: '#fff' }, // Sand
  { bg: '#8FB4AC', text: '#fff' }, // Pale Teal
  { bg: '#D19BA6', text: '#fff' }, // Muted Rose
  { bg: '#C2D194', text: '#fff' }, // Green Apple
  { bg: '#9AA7D4', text: '#fff' }, // Periwinkle
  { bg: '#D4C894', text: '#fff' }, // Soft Gold
  { bg: '#A69282', text: '#fff' }, // Warm Grey
  { bg: '#9DB48F', text: '#fff' }, // Olive
];

function dogColor(dogId: string) {
  let h = 0;
  for (let i = 0; i < dogId.length; i++) h = ((h << 5) - h + dogId.charCodeAt(i)) | 0;
  return DOG_PALETTE[Math.abs(h) % DOG_PALETTE.length];
}

// ─── Constants for consistent high-contrast colors ────────────────────────────
const COLOR_TODAY = '#576574';      // High-contrast blueish-grey for "Today"
const COLOR_BADGE_ACTIVE = '#D4845A'; // High-contrast terracotta for badges

// ─── Today Info Card ──────────────────────────────────────────────────────────
function TodayCard({
  bookings,
  onBookingClick,
}: {
  bookings: CalendarBooking[];
  onBookingClick: (id: string) => void;
}) {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(today, 1), 'yyyy-MM-dd');

  const arriving = bookings.filter(
    (b) => b.start_date === todayStr || b.start_date === tomorrowStr,
  );
  const departing = bookings.filter(
    (b) => b.end_date === todayStr || b.end_date === tomorrowStr,
  );

  return (
    <div className="mx-2 mb-2 bg-cream rounded-2xl border border-pebble/60 shadow-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-pebble/30 bg-warm-beige/30 flex justify-between items-center">
        <span className="text-[11px] font-black text-bark uppercase tracking-widest">
          {format(today, 'EEEE, MMM do')}
        </span>
        <span 
          className="text-[10px] font-black text-white px-3 py-0.5 rounded-full shadow-sm"
          style={{ background: COLOR_TODAY }}
        >
           Today
        </span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-pebble/40">
        {/* Arriving */}
        <div className="p-2.5">
          <div 
            className="text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-1"
            style={{ color: '#4B6584' }} // Deeper contrast for Arrival
          >
             <PawPrint size={11} weight="fill" /> Arriving
          </div>
          {arriving.length === 0 ? (
            <div className="text-[10px] text-bark-light italic">None</div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {arriving.map((b) => {
                const c = dogColor(b.dog_id);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onBookingClick(b.id)}
                    className="flex items-center gap-2 w-full text-left group"
                  >
                    <span
                      className="text-[10px] font-black rounded-full px-2.5 py-1 truncate max-w-[90px] shadow-sm transform transition-transform group-hover:scale-105"
                      style={{ background: c.bg, color: c.text }}
                    >
                      {b.dogs?.name}
                    </span>
                    <span className="text-[9px] text-bark-light font-bold shrink-0">
                      {b.start_date === todayStr ? 'today' : 'tomorrow'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Departing */}
        <div className="p-2.5">
          <div className="text-[10px] font-black uppercase tracking-widest text-terracotta mb-2 flex items-center gap-1">
             <span className="text-[11px]">👋</span> Departing
          </div>
          {departing.length === 0 ? (
            <div className="text-[10px] text-bark-light italic">None</div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {departing.map((b) => {
                const c = dogColor(b.dog_id);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onBookingClick(b.id)}
                    className="flex items-center gap-2 w-full text-left group"
                  >
                    <span
                      className="text-[10px] font-black rounded-full px-2.5 py-1 truncate max-w-[90px] shadow-sm transform transition-transform group-hover:scale-105"
                      style={{ background: c.bg, color: c.text }}
                    >
                      {b.dogs?.name}
                    </span>
                    <span className="text-[9px] text-bark-light font-bold shrink-0">
                      {b.end_date === todayStr ? 'today' : 'tomorrow'}
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

function hiddenCountForDay(bookings: CalendarBooking[], day: Date, laneMap: BookingLaneMap) {
  const dayBookings = getBookingsForDate(bookings, day);
  return dayBookings.filter(
    (b) => (laneMap[b.id] ?? MAX_VISIBLE_LANES) >= MAX_VISIBLE_LANES,
  ).length;
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
      <div className="grid grid-cols-7 relative">
        {week.map((day, i) => {
          const inMonth = isSameMonth(day, currentMonth);
          const todayCell = isToday(day);
          const dayAllBookings = getBookingsForDate(bookings, day);
          const hiddenCount = hiddenCountForDay(bookings, day, laneMap);

          return (
            <div
              key={i}
              onClick={() => inMonth && onDateTap(day)}
              className={`border-r border-pebble/20 last:border-r-0 pt-1.5 pb-2 flex flex-col items-center select-none cursor-pointer transition-all duration-150 relative group
                ${inMonth 
                  ? (todayCell 
                    ? 'bg-pebble/5 hover:bg-pebble/10 hover:shadow-[inset_0_0_0_1.5px_rgba(87,101,116,0.2)]' 
                    : 'hover:bg-warm-beige hover:shadow-[inset_0_0_0_1px_rgba(232,224,216,0.6)]') 
                  : 'opacity-25 pointer-events-none'}
                ${i === 0 ? 'border-l border-pebble/20' : ''}`}
            >
              <div
                className={`w-7 h-7 flex items-center justify-center rounded-full text-[13px] font-black leading-none mb-1 transition-transform group-hover:scale-110 shadow-sm
                  ${todayCell ? 'text-white' : inMonth ? 'text-bark' : 'text-bark-light'}`}
                style={todayCell ? { background: COLOR_TODAY } : {}}
              >
                {format(day, 'd')}
              </div>
              
              {/* Dog count indicator */}
              <div className="flex items-center justify-center min-h-[18px] transition-transform group-hover:scale-105">
                {dayAllBookings.length > 0 && (
                  <div 
                    className="px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 shadow-md border border-white/40"
                    style={{ background: todayCell ? COLOR_BADGE_ACTIVE : '#FDFBF7', color: todayCell ? '#fff' : COLOR_BADGE_ACTIVE }}
                  >
                    <PawPrint size={11} weight="fill" />
                    <span className="drop-shadow-sm">{dayAllBookings.length}</span>
                  </div>
                )}
                {hiddenCount > 0 && (
                   <span className="text-[9px] font-black text-bark-light/80 ml-1.5">+{hiddenCount}</span>
                )}
              </div>
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
                const agendaDayStr = format(selectedAgendaDate, 'yyyy-MM-dd');
                const isArriving = b.start_date === agendaDayStr;
                const isDeparting = b.end_date === agendaDayStr;
                
                // Calculate stay day (e.g. Day 2 of 5)
                const start = new Date(b.start_date + 'T00:00:00');
                const end = new Date(b.end_date + 'T00:00:00');
                const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                const currentStayDay = Math.ceil((selectedAgendaDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                return (
                  <div
                    key={b.id}
                    onClick={() => handleBookingClick(b.id)}
                    className="bg-cream border border-pebble/40 rounded-2xl p-4 flex items-center justify-between shadow-sm cursor-pointer hover:border-sage/40 transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-4">
                      {/* Vertical status bar */}
                      <div
                        className="w-1.5 self-stretch rounded-full"
                        style={{ background: c.bg }}
                      />
                      
                      <DogAvatar
                        name={b.dogs?.name ?? 'Unknown'}
                        src={b.dogs?.photo_url}
                        size="md"
                      />
                      
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-extrabold text-bark text-base truncate">
                            {b.dogs?.name}
                          </span>
                          {isArriving && (
                            <span className="text-[9px] font-black bg-sage/10 text-sage px-1.5 py-0.5 rounded-md border border-sage/20 uppercase tracking-tight">
                              🐾 Arriving
                            </span>
                          )}
                          {isDeparting && (
                            <span className="text-[9px] font-black bg-terracotta/10 text-terracotta px-1.5 py-0.5 rounded-md border border-terracotta/20 uppercase tracking-tight">
                              👋 Departing
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] font-bold text-bark-light">
                          <span className="uppercase tracking-wider">
                            {b.type}
                          </span>
                          <span className="text-pebble">•</span>
                          <span className="text-bark">
                            Day {currentStayDay} of {totalDays}
                          </span>
                          {b.is_holiday && (
                            <>
                              <span className="text-pebble">•</span>
                              <span className="text-terracotta uppercase">🎄 Holiday</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <CaretRight size={18} weight="bold" className="text-pebble/60" />
                    </div>
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
