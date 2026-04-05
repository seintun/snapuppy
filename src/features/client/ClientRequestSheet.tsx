import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CaretLeft, CaretRight, CalendarBlank, PawPrint } from '@phosphor-icons/react';
import {
  format,
  addMonths,
  subMonths,
  isSameDay,
  isToday,
  isAfter,
  isBefore,
  parseISO,
} from 'date-fns';
import { SlideUpSheet } from '@/components/ui/SlideUpSheet';
import { useToast } from '@/components/ui/useToast';
import { buildBookingPricing } from '@/lib/bookingService';
import { useClientBooking } from '@/hooks/useClientBooking';
import { getClientSession } from '@/features/client/clientAuth';
import { DogAvatar } from '@/components/ui/DogAvatar';
import { supabase } from '@/lib/supabase';

export interface ClientRequestSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function DateRangePicker({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  startError,
  endError,
}: {
  startDate: string;
  endDate: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  startError?: string;
  endError?: string;
}) {
  const [selecting, setSelecting] = useState<'start' | 'end'>('start');
  const [isOpen, setIsOpen] = useState(false);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [viewMonth, setViewMonth] = useState(
    startDate ? new Date(startDate + 'T12:00:00') : new Date(),
  );
  const wrapperRef = useRef<HTMLDivElement>(null);

  const startD = startDate ? parseISO(startDate) : null;
  const endD = endDate ? parseISO(endDate) : null;

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const daysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
    return days;
  };

  const isConfirmedRange = (date: Date) => {
    if (!startD || !endD) return false;
    return isAfter(date, startD) && isBefore(date, endD);
  };

  const isHoverRange = (date: Date) => {
    if (selecting !== 'end' || !startD || !hoverDate) return false;
    const rangeEnd = isAfter(hoverDate, startD) ? hoverDate : startD;
    const rangeStart = isAfter(hoverDate, startD) ? startD : hoverDate;
    return isAfter(date, rangeStart) && isBefore(date, rangeEnd);
  };

  const isHoverEnd = (date: Date) =>
    selecting === 'end' &&
    hoverDate &&
    isSameDay(date, hoverDate) &&
    startD &&
    !isSameDay(date, startD);

  const handleDaySelect = (date: Date) => {
    const str = format(date, 'yyyy-MM-dd');
    if (selecting === 'start') {
      onStartChange(str);
      if (endD && isAfter(date, endD)) onEndChange(str);
      setSelecting('end');
    } else {
      if (startD && isBefore(date, startD)) {
        onEndChange(startDate);
        onStartChange(str);
      } else {
        onEndChange(str);
      }
      setIsOpen(false);
      setSelecting('start');
    }
  };

  const openFor = (mode: 'start' | 'end') => {
    setSelecting(mode);
    setIsOpen(true);
  };

  const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const triggerBase =
    'flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border-1.5 bg-white transition-all duration-150 cursor-pointer';
  const triggerActive = 'border-sage shadow-[0_0_0_3px_rgba(143,184,134,0.15)]';
  const triggerIdle = 'border-pebble hover:border-sage/50';
  const triggerError = 'border-terracotta';

  return (
    <div className="form-field" ref={wrapperRef}>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => openFor('start')}
          className={`${triggerBase} ${
            isOpen && selecting === 'start'
              ? triggerActive
              : startError
                ? triggerError
                : triggerIdle
          }`}
        >
          <span
            className={`flex items-center justify-center w-6 h-6 rounded-lg shrink-0 transition-colors ${
              isOpen && selecting === 'start' ? 'bg-sage text-white' : 'bg-sage-light text-sage'
            }`}
          >
            <CalendarBlank size={13} weight="bold" />
          </span>
          <div className="text-left min-w-0">
            <div className="text-[10px] font-bold text-bark-light uppercase tracking-wider leading-none mb-0.5">
              Check-in
            </div>
            <div
              className={`text-sm font-bold truncate ${
                startDate ? 'text-bark' : 'text-bark-light font-medium'
              }`}
            >
              {startDate ? format(parseISO(startDate), 'MMM d') : 'Select'}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => openFor('end')}
          className={`${triggerBase} ${
            isOpen && selecting === 'end' ? triggerActive : endError ? triggerError : triggerIdle
          }`}
        >
          <span
            className={`flex items-center justify-center w-6 h-6 rounded-lg shrink-0 transition-colors ${
              isOpen && selecting === 'end'
                ? 'bg-terracotta text-white'
                : 'bg-blush/60 text-terracotta'
            }`}
          >
            <CalendarBlank size={13} weight="bold" />
          </span>
          <div className="text-left min-w-0">
            <div className="text-[10px] font-bold text-bark-light uppercase tracking-wider leading-none mb-0.5">
              Check-out
            </div>
            <div
              className={`text-sm font-bold truncate ${
                endDate ? 'text-bark' : 'text-bark-light font-medium'
              }`}
            >
              {endDate ? format(parseISO(endDate), 'MMM d') : 'Select'}
            </div>
          </div>
        </button>
      </div>

      {(startError || endError) && (
        <p className="text-xs text-terracotta mt-1 flex items-center gap-1">
          <span>⚠</span> {startError ?? endError}
        </p>
      )}

      {isOpen && (
        <div
          className="mt-2 z-30"
          style={{ animation: 'cal-drop-in 0.18s cubic-bezier(0.22,1,0.36,1) both' }}
        >
          <div
            className="bg-cream border border-pebble rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 8px 32px rgba(74,55,40,0.14)' }}
          >
            <div
              className={`flex items-center gap-2 px-4 py-2.5 border-b border-pebble/60 ${
                selecting === 'start' ? 'bg-sage-light/30' : 'bg-blush/20'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  selecting === 'start' ? 'bg-sage' : 'bg-terracotta'
                }`}
              />
              <span className="text-xs font-bold text-bark">
                {selecting === 'start' ? 'Tap to set check-in date' : 'Tap to set check-out date'}
              </span>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-b border-pebble/40">
              <button
                type="button"
                onClick={() => setViewMonth(subMonths(viewMonth, 1))}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-sage hover:bg-sage-light transition-colors"
              >
                <CaretLeft size={16} weight="bold" />
              </button>
              <span className="font-extrabold text-bark text-sm tracking-tight">
                {format(viewMonth, 'MMMM yyyy')}
              </span>
              <button
                type="button"
                onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-sage hover:bg-sage-light transition-colors"
              >
                <CaretRight size={16} weight="bold" />
              </button>
            </div>

            <div className="p-3">
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAY_LABELS.map((d, i) => (
                  <div
                    key={i}
                    className={`text-center text-[10px] font-bold py-1 ${
                      i === 0 || i === 6 ? 'text-terracotta/50' : 'text-bark-light'
                    }`}
                  >
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7" onMouseLeave={() => setHoverDate(null)}>
                {daysInMonth(viewMonth).map((date, i) => {
                  if (!date) return <div key={i} />;
                  const isStart = startD && isSameDay(date, startD);
                  const isEnd =
                    endD && isSameDay(date, endD) && !isSameDay(date, startD ?? new Date(0));
                  const confirmedRange = isConfirmedRange(date);
                  const hoverRange = isHoverRange(date);
                  const hoverEnd = isHoverEnd(date);
                  const todayCell = isToday(date);
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleDaySelect(date)}
                      onMouseEnter={() => setHoverDate(date)}
                      className={`relative h-10 w-full text-[13px] font-semibold transition-all duration-75 flex items-center justify-center ${
                        isStart
                          ? 'bg-sage text-white rounded-xl shadow-sm z-10'
                          : isEnd
                            ? 'bg-terracotta text-white rounded-xl shadow-sm z-10'
                            : hoverEnd
                              ? 'bg-terracotta/70 text-white rounded-xl z-10'
                              : confirmedRange
                                ? 'bg-sage-light text-bark'
                                : hoverRange
                                  ? 'bg-sage-light/50 text-bark'
                                  : todayCell
                                    ? 'text-terracotta font-bold rounded-xl hover:bg-sage-light/40'
                                    : isWeekend
                                      ? 'text-bark-light hover:bg-sage-light/40 rounded-xl'
                                      : 'text-bark hover:bg-sage-light/50 rounded-xl'
                      }`}
                    >
                      {date.getDate()}
                      {todayCell && !isStart && !isEnd && !hoverEnd && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-terracotta" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-2.5 border-t border-pebble/60 bg-warm-beige/40">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setSelecting('start');
                }}
                className="text-xs font-bold text-bark-light hover:text-bark transition-colors px-2 py-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const todayStr = format(new Date(), 'yyyy-MM-dd');
                  if (selecting === 'start') {
                    onStartChange(todayStr);
                    setSelecting('end');
                  } else {
                    onEndChange(todayStr);
                    setIsOpen(false);
                    setSelecting('start');
                  }
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-sage bg-sage-light/60 hover:bg-sage-light px-3 py-1.5 rounded-full transition-colors"
              >
                <PawPrint size={11} weight="fill" />
                Today
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface SitterProfile {
  nightly_rate: number;
  daycare_rate: number;
  holiday_surcharge: number;
  cutoff_time: string;
}

export function ClientRequestSheet({ isOpen, onClose, onSuccess }: ClientRequestSheetProps) {
  const { addToast } = useToast();
  const { mutateAsync: createRequest, isPending: submitting } = useClientBooking();

  const session = getClientSession();
  const today = new Date().toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [specialRequests, setSpecialRequests] = useState('');
  const [sitterProfile, setSitterProfile] = useState<SitterProfile | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStartDate(today);
      setEndDate(today);
      setSpecialRequests('');
    }
  }, [isOpen]);

  useEffect(() => {
    async function fetchProfile() {
      if (!session?.sitterId) return;
      const { data } = await supabase
        .from('profiles')
        .select('nightly_rate, daycare_rate, holiday_surcharge, cutoff_time')
        .eq('id', session.sitterId)
        .single();
      if (data) setSitterProfile(data);
    }
    fetchProfile();
  }, [session?.sitterId]);

  const pricing = useMemo(() => {
    if (!sitterProfile) return null;
    try {
      return buildBookingPricing({
        startDate,
        endDate,
        rates: {
          nightly_rate: sitterProfile.nightly_rate ?? 0,
          daycare_rate: sitterProfile.daycare_rate ?? 0,
          holiday_surcharge: sitterProfile.holiday_surcharge ?? 0,
          cutoff_time: sitterProfile.cutoff_time ?? '11:00',
        },
        holidayDates: [],
      });
    } catch {
      return null;
    }
  }, [startDate, endDate, sitterProfile]);

  const validate = () => {
    if (!session?.dogId) return 'Please select a dog';
    if (!startDate) return 'Please select check-in date';
    if (!endDate) return 'Please select check-out date';
    if (startDate > endDate) return 'Check-out must be after check-in';
    return null;
  };

  const handleSubmit = useCallback(async () => {
    const error = validate();
    if (error) {
      addToast(error, 'error');
      return;
    }

    if (!session?.dogId) return;

    try {
      await createRequest({
        dogId: session.dogId,
        startDate,
        endDate,
      });
      addToast('Request sent! Sitter will review.', 'success');
      onSuccess?.();
      onClose();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to send request', 'error');
    }
  }, [session, startDate, endDate, createRequest, addToast, onSuccess, onClose]);

  const ratesSet = sitterProfile && (sitterProfile.nightly_rate ?? 0) > 0;

  return (
    <SlideUpSheet isOpen={isOpen} onClose={onClose} title="Request Booking">
      <div className="flex flex-col gap-4">
        {session?.dogId && (
          <div className="form-field">
            <label className="form-label">Your Dog</label>
            <div className="flex items-center gap-3 px-4 py-3 bg-sage-light/40 rounded-xl border border-sage/20">
              <DogAvatar name={session.dogName} size="md" />
              <span className="font-semibold text-bark">{session.dogName}</span>
            </div>
          </div>
        )}

        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartChange={setStartDate}
          onEndChange={setEndDate}
        />

        <div className="form-field">
          <label className="form-label">Special Requests</label>
          <textarea
            className="form-input min-h-[100px] resize-none"
            placeholder="Any special instructions or notes for the sitter..."
            value={specialRequests}
            onChange={(e) => setSpecialRequests(e.target.value)}
          />
        </div>

        {pricing && pricing.days.length > 0 && (
          <div className="bg-sage-light rounded-xl p-3.5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] font-bold text-bark-light uppercase tracking-wider">
                Estimate
              </span>
              <span className="text-[11px] font-bold text-sage bg-white rounded-full px-2 py-0.5 uppercase">
                {pricing.type}
              </span>
            </div>
            {!ratesSet && (
              <p className="text-[11px] text-bark-light mb-2">⚠️ Sitter hasn't set rates yet.</p>
            )}
            <div className="flex justify-between items-center border-t border-sage pt-2">
              <span className="font-bold text-bark">Total</span>
              <span className="text-2xl font-black text-terracotta tracking-tight">
                ${(pricing.totalAmount ?? 0).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        <button
          type="button"
          className="btn-sage mt-1"
          disabled={submitting || !session?.dogId}
          onClick={handleSubmit}
        >
          {submitting ? 'Sending...' : 'Send Request'}
        </button>
      </div>
    </SlideUpSheet>
  );
}
