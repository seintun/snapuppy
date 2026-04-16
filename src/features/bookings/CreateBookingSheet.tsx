import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CaretDown,
  CaretLeft,
  CaretRight,
  Check,
  CalendarBlank,
  PawPrint,
} from '@phosphor-icons/react';
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
import { useAuthContext } from '@/features/auth/useAuthContext';
import { useToast } from '@/components/ui/useToast';
import { buildBookingPricing } from '@/lib/bookingService';
import { useBookingOptions, useCreateBooking } from '@/hooks/useBookings';
import { useCreateDog } from '@/hooks/useDogs';
import { CreateBookingSchema, type CreateBookingFormData } from '@/lib/schemas';
import { DogAvatar } from '@/components/ui/DogAvatar';
import { TimePicker } from '@/components/ui/TimePicker';

export interface CreateBookingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  prefilledDate?: string;
  onSuccess?: () => void;
}

const today = () => new Date().toISOString().split('T')[0];
const DEFAULT_BOOKING_TIME = '11:00';

function toBookingDateTime(date: string, time?: string): string | undefined {
  const normalized = time?.trim();
  if (!normalized) return undefined;
  return `${date}T${normalized}:00`;
}

function DogDropdown({
  dogs,
  value,
  onChange,
  error,
}: {
  dogs: Array<{ id: string; name: string; owner_name: string | null; photo_url: string | null }>;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedDog = dogs.find((d) => d.id === value);

  return (
    <div className="form-field">
      <label className="form-label" id="dog-label">
        Dog *
      </label>
      <div className="relative">
        <button
          type="button"
          aria-labelledby="dog-label"
          className={`form-input w-full flex items-center gap-3 ${error ? 'border-terracotta' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          {selectedDog ? (
            <>
              <DogAvatar name={selectedDog.name} src={selectedDog.photo_url} size="sm" />
              <span className="flex-1 text-left">{selectedDog.name}</span>
              {selectedDog.owner_name && (
                <span className="text-xs text-bark-light truncate">{selectedDog.owner_name}</span>
              )}
            </>
          ) : (
            <span className="flex-1 text-left text-bark-light">Select a dog…</span>
          )}
          <CaretDown
            size={18}
            className={`text-bark-light transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-pebble rounded-xl shadow-lg z-10 max-h-60 overflow-auto">
            {dogs.length === 0 ? (
              <div className="p-3 text-sm text-bark-light text-center">
                No dogs yet — add one in the Dogs tab first.
              </div>
            ) : (
              dogs.map((dog) => (
                <button
                  key={dog.id}
                  type="button"
                  className={`w-full flex items-center gap-3 p-3 hover:bg-cream transition-colors ${
                    dog.id === value ? 'bg-sage-light' : ''
                  }`}
                  onClick={() => {
                    onChange(dog.id);
                    setIsOpen(false);
                  }}
                >
                  <DogAvatar name={dog.name} src={dog.photo_url} size="sm" />
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-bark">{dog.name}</div>
                    {dog.owner_name && (
                      <div className="text-xs text-bark-light">{dog.owner_name}</div>
                    )}
                  </div>
                  {dog.id === value && <Check size={18} className="text-sage" />}
                </button>
              ))
            )}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-terracotta mt-1">{error}</p>}
    </div>
  );
}

/** Single unified date-range picker — one calendar, two-tap flow */
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
  // 'start' = next tap sets check-in, 'end' = next tap sets check-out
  const [selecting, setSelecting] = useState<'start' | 'end'>('start');
  const [isOpen, setIsOpen] = useState(false);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [viewMonth, setViewMonth] = useState(
    startDate ? new Date(startDate + 'T12:00:00') : new Date(),
  );
  const wrapperRef = useRef<HTMLDivElement>(null);

  const startD = startDate ? parseISO(startDate) : null;
  const endD = endDate ? parseISO(endDate) : null;

  // Close on outside click
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

  // Confirmed range: between settled start and end dates
  const isConfirmedRange = (date: Date) => {
    if (!startD || !endD) return false;
    return isAfter(date, startD) && isBefore(date, endD);
  };

  // Live hover preview: when picking end date, show potential range
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
      // If new start is after current end, clear end
      if (endD && isAfter(date, endD)) onEndChange(str);
      setSelecting('end');
    } else {
      // If picked before start, swap roles
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
      {/* Two trigger pills side by side */}
      <div className="grid grid-cols-2 gap-3">
        {/* Check-in */}
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

        {/* Check-out */}
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

      {/* Validation errors */}
      {(startError || endError) && (
        <p className="text-xs text-terracotta mt-1 flex items-center gap-1">
          <span>⚠</span> {startError ?? endError}
        </p>
      )}

      {/* Single shared calendar dropdown */}
      {isOpen && (
        <div
          className="mt-2 z-30"
          style={{ animation: 'cal-drop-in 0.18s cubic-bezier(0.22,1,0.36,1) both' }}
        >
          <div
            className="bg-cream border border-pebble rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 8px 32px rgba(74,55,40,0.14)' }}
          >
            {/* Context hint */}
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

            {/* Month header */}
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
              {/* Day labels */}
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

              {/* Calendar grid */}
              <div className="grid grid-cols-7" onMouseLeave={() => setHoverDate(null)}>
                {daysInMonth(viewMonth).map((date, i) => {
                  if (!date) return <div key={i} />;
                  const isStart = startD && isSameDay(date, startD);
                  // Show end highlight only if dates differ (boarding); same-day = daycare, show start only
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

            {/* Footer */}
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

export function CreateBookingSheet({
  isOpen,
  onClose,
  prefilledDate,
  onSuccess,
}: CreateBookingSheetProps) {
  const { user } = useAuthContext();
  const { addToast } = useToast();

  const { data: options = { dogs: [], profile: null } } = useBookingOptions();
  const { mutateAsync: createBookingMutation, isPending: submitting } = useCreateBooking();
  const { mutateAsync: createDogMutation } = useCreateDog();
  const [quickAdd, setQuickAdd] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateBookingFormData>({
    resolver: zodResolver(CreateBookingSchema),
    defaultValues: {
      startDate: prefilledDate ?? today(),
      endDate: prefilledDate ?? today(),
      isHoliday: false,
      dogId: '',
      status: 'active',
      pickupDateTime: DEFAULT_BOOKING_TIME,
      dropoffDateTime: DEFAULT_BOOKING_TIME,
      notes: '',
    },
  });

  // Watch fields for real-time pricing calculation
  const startDate = useWatch({ control, name: 'startDate' });
  const endDate = useWatch({ control, name: 'endDate' });
  const isHoliday = useWatch({ control, name: 'isHoliday' });
  const selectedDogId = useWatch({ control, name: 'dogId' });
  const pickupDateTime = useWatch({ control, name: 'pickupDateTime' });
  const dropoffDateTime = useWatch({ control, name: 'dropoffDateTime' });

  // Reset form when opening/closing or prefilled date changes
  useEffect(() => {
    if (isOpen) {
      const d = prefilledDate ?? today();
      reset({
        startDate: d,
        endDate: d,
        isHoliday: false,
        dogId: '',
        status: 'active',
        pickupDateTime: DEFAULT_BOOKING_TIME,
        dropoffDateTime: DEFAULT_BOOKING_TIME,
        notes: '',
      });
    }
  }, [isOpen, prefilledDate, reset]);

  // Pricing calculation
  const pricing = useMemo(() => {
    if (!options.profile) return null;
    try {
      return buildBookingPricing({
        startDate,
        endDate,
        rates: {
          nightly_rate: options.profile.nightly_rate ?? 0,
          daycare_rate: options.profile.daycare_rate ?? 0,
          holiday_surcharge: options.profile.holiday_surcharge ?? 0,
          cutoff_time: options.profile.cutoff_time ?? '11:00',
        },
        holidayDates: isHoliday ? true : [],
      });
    } catch {
      return null;
    }
  }, [startDate, endDate, options.profile, isHoliday]);

  const onFormSubmit = useCallback(
    async (data: CreateBookingFormData) => {
      if (!user) return;

      try {
        let nextDogId = data.dogId ?? '';

        if (quickAdd && !nextDogId) {
          const name = window.prompt('Dog name for quick add');
          const phone = window.prompt('Owner phone (10 digits)');
          if (!name) {
            addToast('Dog name is required for quick add.', 'error');
            return;
          }
          const createdDog = await createDogMutation({
            name,
            owner_name: 'Quick Add',
            owner_phone: phone ?? null,
            notes: null,
            photo_url: null,
            breed: null,
          });
          nextDogId = createdDog.id;
        }

        if (!nextDogId) {
          addToast('Please select a dog or use Quick Add.', 'error');
          return;
        }

        await createBookingMutation({
          ...data,
          dogId: nextDogId,
          pickupDateTime: toBookingDateTime(data.startDate, data.pickupDateTime),
          dropoffDateTime: toBookingDateTime(data.endDate, data.dropoffDateTime),
          source: quickAdd ? 'manual' : 'manual',
          holidayDates: data.isHoliday ? true : [],
        });

        addToast('Woof! Booking confirmed! 🐾', 'success');
        onSuccess?.();
        onClose();
      } catch (err) {
        addToast(err instanceof Error ? err.message : 'Failed to create booking', 'error');
      }
    },
    [user, createBookingMutation, createDogMutation, quickAdd, addToast, onSuccess, onClose],
  );

  const hasNightlyRate = (options.profile?.nightly_rate ?? 0) > 0;
  const hasDaycareRate = (options.profile?.daycare_rate ?? 0) > 0;
  const ratesSet = !!options.profile && hasNightlyRate && hasDaycareRate;

  return (
    <SlideUpSheet isOpen={isOpen} onClose={onClose} title="New Booking">
      <form onSubmit={(e) => void handleSubmit(onFormSubmit)(e)} className="flex flex-col gap-4">
        {/* Dog selector */}
        <label className="flex items-center justify-between rounded-xl border border-pebble p-3">
          <span className="text-sm font-bold text-bark">Quick Add</span>
          <input
            type="checkbox"
            checked={quickAdd}
            onChange={(e) => setQuickAdd(e.target.checked)}
          />
        </label>
        {!quickAdd ? (
          <DogDropdown
            dogs={options.dogs}
            value={selectedDogId ?? ''}
            onChange={(v) => setValue('dogId', v, { shouldValidate: true, shouldDirty: true })}
            error={errors.dogId?.message}
          />
        ) : (
          <p className="text-xs text-bark-light">
            Quick Add will create a dog from basic prompt fields.
          </p>
        )}

        {/* Unified date-range picker */}
        <DateRangePicker
          startDate={startDate ?? today()}
          endDate={endDate ?? startDate ?? today()}
          onStartChange={(v) =>
            setValue('startDate', v, { shouldValidate: true, shouldDirty: true })
          }
          onEndChange={(v) => setValue('endDate', v, { shouldValidate: true, shouldDirty: true })}
          startError={errors.startDate?.message}
          endError={errors.endDate?.message}
        />

        {/* Holiday toggle */}
        <div
          className={`flex items-center justify-between rounded-xl p-3.5 border-1.5 transition-all duration-150 ${
            isHoliday ? 'bg-blush border-terracotta' : 'bg-cream border-pebble'
          }`}
        >
          <div>
            <div className={`font-bold text-sm ${isHoliday ? 'text-terracotta' : 'text-bark'}`}>
              🎄 Holiday booking
            </div>
            <div className="text-[11px] text-bark-light mt-0.5">Applies holiday surcharge</div>
          </div>
          <label className="relative inline-block w-11 h-6 cursor-pointer">
            <input type="checkbox" className="sr-only" {...register('isHoliday')} />
            <span
              className={`absolute inset-0 rounded-full transition-colors duration-200 ${
                isHoliday ? 'bg-terracotta' : 'bg-pebble'
              }`}
            />
            <span
              className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white transition-all duration-200 shadow-sm ${
                isHoliday ? 'left-[23px]' : 'left-[3px]'
              }`}
            />
          </label>
        </div>

        {/* Rate preview */}
        <div className="bg-sage-light rounded-xl p-3.5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] font-bold text-bark-light uppercase tracking-wider">
              Rate Preview
            </span>
            <span className="text-[11px] font-bold text-sage bg-white rounded-full px-2 py-0.5 uppercase">
              {pricing?.type ?? (startDate === endDate ? 'daycare' : 'boarding')}
            </span>
          </div>

          {!ratesSet && (
            <p className="text-[11px] text-bark-light mb-2">
              ⚠️ Set both Boarding and Daycare rates in Profile to confirm booking.
            </p>
          )}

          {pricing && pricing.days.length > 0 && (
            <div className="flex flex-col pb-2">
              <div className="flex justify-between items-center text-[13px] text-bark">
                <div className="flex items-center">
                  <span className="font-bold">
                    {pricing.type === 'boarding' ? 'Boarding' : 'Daycare'}
                  </span>
                  {pricing.isHoliday && (
                    <span className="text-[10px] font-black text-terracotta uppercase bg-white px-1.5 py-[1px] rounded-md ml-2 drop-shadow-sm">
                      Holiday
                    </span>
                  )}
                  <span className="text-bark-light font-medium ml-2">
                    × {pricing.days.length}{' '}
                    {pricing.type === 'boarding'
                      ? pricing.days.length === 1
                        ? 'night'
                        : 'nights'
                      : 'day'}
                  </span>
                </div>
                <span className="text-bark-light font-semibold text-xs">
                  ${pricing.days[0].amount.toFixed(2)}/{pricing.type === 'boarding' ? 'nt' : 'day'}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center border-t border-sage pt-2">
            <span className="font-bold text-bark">Total</span>
            <span className="text-2xl font-black text-terracotta tracking-tight">
              ${(pricing?.totalAmount ?? 0).toFixed(2)}
            </span>
          </div>
        </div>

        <label className="form-label">
          Booking notes
          <textarea className="form-input mt-1" {...register('notes')} />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="form-label">Pickup Time</label>
            <TimePicker
              value={pickupDateTime || DEFAULT_BOOKING_TIME}
              onChange={(value) => setValue('pickupDateTime', value)}
            />
          </div>
          <div>
            <label className="form-label">Dropoff Time</label>
            <TimePicker
              value={dropoffDateTime || DEFAULT_BOOKING_TIME}
              onChange={(value) => setValue('dropoffDateTime', value)}
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn-sage mt-1"
          disabled={submitting || (!selectedDogId && !quickAdd) || !ratesSet}
        >
          {submitting ? 'Confirming…' : 'Confirm Booking 🐾'}
        </button>
        {!ratesSet && (
          <p className="text-xs font-bold text-terracotta text-center mt-1">
            Rate required: Set Boarding and Daycare pricing in Profile before confirming.
          </p>
        )}
      </form>
    </SlideUpSheet>
  );
}
