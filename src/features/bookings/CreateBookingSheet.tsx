import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CaretDown, Check, CalendarBlank } from '@phosphor-icons/react';
import { format, addMonths, subMonths, isSameDay, isToday } from 'date-fns';
import { SlideUpSheet } from '@/components/ui/SlideUpSheet';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { useToast } from '@/components/ui/useToast';
import { buildBookingPricing } from '@/lib/bookingService';
import { useBookingOptions, useCreateBooking } from '@/hooks/useBookings';
import { CreateBookingSchema, type CreateBookingFormData } from '@/lib/schemas';
import { DogAvatar } from '@/components/ui/DogAvatar';

export interface CreateBookingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  prefilledDate?: string;
  onSuccess?: () => void;
}

const today = () => new Date().toISOString().split('T')[0];

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

function DatePicker({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(value ? new Date(value) : new Date());

  const selectedDate = value ? new Date(value) : null;

  const daysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const handleSelect = (date: Date) => {
    onChange(format(date, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  const isSelected = (date: Date) => selectedDate && isSameDay(date, selectedDate);
  const isTodayDate = (date: Date) => isToday(date);

  return (
    <div className="form-field">
      <label className="form-label">{label}</label>
      <div className="relative">
        <button
          type="button"
          className={`form-input w-full flex items-center gap-3 py-3 ${error ? 'border-terracotta' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <CalendarBlank size={20} className="text-sage" />
          <span
            className={`flex-1 text-left ${value ? 'text-bark font-medium' : 'text-bark-light'}`}
          >
            {value ? format(new Date(value), 'MMM d, yyyy') : 'Select'}
          </span>
          <CaretDown
            size={18}
            className={`text-bark-light transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-cream border border-pebble rounded-2xl shadow-xl z-20 p-4">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => setViewMonth(subMonths(viewMonth, 1))}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-sage-light/50 text-sage hover:bg-sage-light transition-colors"
              >
                <CaretDown size={18} className="rotate-90" />
              </button>
              <span className="font-bold text-bark text-sm">{format(viewMonth, 'MMMM yyyy')}</span>
              <button
                type="button"
                onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-sage-light/50 text-sage hover:bg-sage-light transition-colors"
              >
                <CaretDown size={18} className="-rotate-90" />
              </button>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 mb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} className="text-center text-[11px] font-bold text-bark-light">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {daysInMonth(viewMonth).map((date, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={!date}
                  onClick={() => date && handleSelect(date)}
                  className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all ${
                    !date
                      ? 'invisible'
                      : isSelected(date)
                        ? 'bg-sage text-white shadow-md'
                        : isTodayDate(date)
                          ? 'bg-terracotta text-white'
                          : 'text-bark hover:bg-sage-light/50'
                  }`}
                >
                  {date?.getDate()}
                </button>
              ))}
            </div>

            {/* Quick today button */}
            <button
              type="button"
              onClick={() => {
                const todayStr = format(new Date(), 'yyyy-MM-dd');
                onChange(todayStr);
                setIsOpen(false);
              }}
              className="w-full mt-3 py-2 text-xs font-bold text-sage bg-sage-light/30 rounded-lg hover:bg-sage-light/50 transition-colors"
            >
              Today
            </button>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-terracotta mt-1">{error}</p>}
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

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateBookingFormData>({
    resolver: zodResolver(CreateBookingSchema),
    defaultValues: {
      startDate: prefilledDate ?? today(),
      endDate: prefilledDate ?? today(),
      isHoliday: false,
      dogId: '',
      status: 'active',
    },
  });

  // Watch fields for real-time pricing calculation
  const startDate = useWatch({ control, name: 'startDate' });
  const endDate = useWatch({ control, name: 'endDate' });
  const isHoliday = useWatch({ control, name: 'isHoliday' });
  const selectedDogId = useWatch({ control, name: 'dogId' });

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
        holidayDates: isHoliday ? [startDate] : [],
      });
    } catch {
      return null;
    }
  }, [startDate, endDate, options.profile, isHoliday]);

  const onFormSubmit = useCallback(
    async (data: CreateBookingFormData) => {
      if (!user) return;

      try {
        await createBookingMutation({
          ...data,
          holidayDates: data.isHoliday ? [data.startDate] : [],
        });

        addToast('Woof! Booking confirmed! 🐾', 'success');
        onSuccess?.();
        onClose();
      } catch (err) {
        addToast(err instanceof Error ? err.message : 'Failed to create booking', 'error');
      }
    },
    [user, createBookingMutation, addToast, onSuccess, onClose],
  );

  const ratesSet = options.profile && (options.profile.nightly_rate ?? 0) > 0;

  return (
    <SlideUpSheet isOpen={isOpen} onClose={onClose} title="New Booking">
      <form onSubmit={(e) => void handleSubmit(onFormSubmit)(e)} className="flex flex-col gap-4">
        {/* Dog selector */}
        <DogDropdown
          dogs={options.dogs}
          value={selectedDogId}
          onChange={(v) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).__rHF?.(v) || (() => {});
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const e = { target: { value: v } } as any;
            register('dogId').onChange(e);
          }}
          error={errors.dogId?.message}
        />

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <DatePicker
            label="Check-in"
            value={startDate}
            onChange={(v) => register('startDate').onChange({ target: { value: v } })}
            error={errors.startDate?.message}
          />
          <DatePicker
            label="Check-out"
            value={endDate}
            onChange={(v) => register('endDate').onChange({ target: { value: v } })}
            error={errors.endDate?.message}
          />
        </div>

        {/* Holiday toggle */}
        <div
          className={`flex items-center justify-between rounded-xl p-3.5 border-1.5 transition-all duration-150 ${
            isHoliday ? 'bg-blush border-terracotta' : 'bg-cream border-pebble'
          }`}
        >
          <div>
            <div className={`font-bold text-sm ${isHoliday ? 'text-terracotta' : 'text-bark'}`}>
              🎉 Holiday booking
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
              ⚠️ Set your rates in Profile for accurate estimates.
            </p>
          )}

          {pricing && pricing.days.length > 0 && (
            <div className="flex flex-col gap-1 mb-2.5">
              {pricing.days.map((day) => (
                <div key={day.date} className="flex justify-between text-xs text-bark">
                  <span>{day.date}</span>
                  <span className="flex gap-1.5 items-center">
                    {day.is_holiday && (
                      <span className="text-[9px] font-bold text-terracotta uppercase">
                        Holiday
                      </span>
                    )}
                    <span className="font-semibold">${day.amount.toFixed(2)}</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center border-t border-sage pt-2">
            <span className="font-bold text-bark">Total</span>
            <span className="text-2xl font-black text-terracotta tracking-tight">
              ${(pricing?.totalAmount ?? 0).toFixed(2)}
            </span>
          </div>
        </div>

        <button type="submit" className="btn-sage mt-1" disabled={submitting || !selectedDogId}>
          {submitting ? 'Confirming…' : 'Confirm Booking 🐾'}
        </button>
      </form>
    </SlideUpSheet>
  );
}
