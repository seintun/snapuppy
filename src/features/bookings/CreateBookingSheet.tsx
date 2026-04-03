import { useCallback, useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SlideUpSheet } from '@/components/ui/SlideUpSheet';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { useToast } from '@/components/ui/useToast';
import { buildBookingPricing } from '@/lib/bookingService';
import { useBookingOptions, useCreateBooking } from '@/hooks/useBookings';
import { CreateBookingSchema, type CreateBookingFormData } from '@/lib/schemas';

export interface CreateBookingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  prefilledDate?: string;
  onSuccess?: () => void;
}

const today = () => new Date().toISOString().split('T')[0];

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
    <SlideUpSheet isOpen={isOpen} onClose={onClose} title="New Booking 🐾">
      <form onSubmit={(e) => void handleSubmit(onFormSubmit)(e)} className="flex flex-col gap-3.5">
        {/* Dog selector */}
        <div className="form-field">
          <label className="form-label" htmlFor="booking-dog">
            Dog *
          </label>
          <select
            id="booking-dog"
            className={`form-input w-full ${errors.dogId ? 'border-terracotta' : ''}`}
            {...register('dogId')}
            required
          >
            <option value="">Select a dog…</option>
            {options.dogs.map((dog) => (
              <option key={dog.id} value={dog.id}>
                {dog.name}
                {dog.owner_name ? ` (${dog.owner_name})` : ''}
              </option>
            ))}
          </select>
          {errors.dogId && <p className="text-xs text-terracotta mt-1">{errors.dogId.message}</p>}
          {options.dogs.length === 0 && (
            <p className="text-xs text-bark-light mt-1">
              No dogs yet — add one in the Dogs tab first.
            </p>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="form-field">
            <label className="form-label" htmlFor="booking-start">
              Check-in
            </label>
            <input
              id="booking-start"
              type="date"
              className={`form-input w-full ${errors.startDate ? 'border-terracotta' : ''}`}
              {...register('startDate')}
              required
            />
            {errors.startDate && (
              <p className="text-xs text-terracotta mt-1">{errors.startDate.message}</p>
            )}
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="booking-end">
              Check-out
            </label>
            <input
              id="booking-end"
              type="date"
              className={`form-input w-full ${errors.endDate ? 'border-terracotta' : ''}`}
              {...register('endDate')}
              required
            />
            {errors.endDate && (
              <p className="text-xs text-terracotta mt-1">{errors.endDate.message}</p>
            )}
          </div>
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
