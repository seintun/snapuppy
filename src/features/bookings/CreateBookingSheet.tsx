import { useCallback, useEffect, useMemo, useState } from 'react';
import { SlideUpSheet } from '@/components/ui/SlideUpSheet';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { useToast } from '@/components/ui/useToast';
import {
  buildBookingPricing,
} from '@/lib/bookingService';
import { useBookingOptions, useCreateBooking } from '@/hooks/useBookings';

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

  const [selectedDogId, setSelectedDogId] = useState('');
  const [startDate, setStartDate] = useState(prefilledDate ?? today());
  const [endDate, setEndDate] = useState(prefilledDate ?? today());
  const [isHoliday, setIsHoliday] = useState(false);

  // Reset on open
  useEffect(() => {
    if (!isOpen) return;
    const d = prefilledDate ?? today();
    setStartDate(d);
    setEndDate(d);
    setSelectedDogId('');
    setIsHoliday(false);
  }, [isOpen, prefilledDate]);

  const handleStartChange = useCallback(
    (val: string) => {
      setStartDate(val);
      if (endDate < val) setEndDate(val);
    },
    [endDate],
  );

  const handleEndChange = useCallback(
    (val: string) => {
      setEndDate(val >= startDate ? val : startDate);
    },
    [startDate],
  );

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

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedDogId || !user) return;

      try {
        await createBookingMutation({
          dogId: selectedDogId,
          startDate,
          endDate,
          status: 'active',
          holidayDates: isHoliday ? [startDate] : [],
        });

        addToast('Woof! Booking confirmed! 🐾', 'success');
        onSuccess?.();
        onClose();
      } catch (err) {
        addToast(err instanceof Error ? err.message : 'Failed to create booking', 'error');
      }
    },
    [selectedDogId, user, startDate, endDate, isHoliday, createBookingMutation, addToast, onSuccess, onClose],
  );

  const ratesSet = options.profile && (options.profile.nightly_rate ?? 0) > 0;

  return (
    <SlideUpSheet isOpen={isOpen} onClose={onClose} title="New Booking 🐾">
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="flex flex-col gap-3.5"
      >
        {/* Dog selector */}
        <div className="form-field">
          <label className="form-label" htmlFor="booking-dog">
            Dog *
          </label>
          <select
            id="booking-dog"
            className="form-input"
            value={selectedDogId}
            onChange={(e) => setSelectedDogId(e.target.value)}
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
          {options.dogs.length === 0 && (
            <p className="text-xs text-bark-light mt-1 mb-0">
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
              className="form-input"
              value={startDate}
              onChange={(e) => handleStartChange(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="booking-end">
              Check-out
            </label>
            <input
              id="booking-end"
              type="date"
              className="form-input"
              value={endDate}
              min={startDate}
              onChange={(e) => handleEndChange(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Holiday toggle */}
        <div
          className={`flex items-center justify-between rounded-lg px-3.5 py-2.5 transition-all duration-150 border-[1.5px] ${isHoliday ? 'bg-blush border-terracotta' : 'bg-cream border-pebble'}`}
        >
          <div>
            <div
              className={`font-bold text-sm ${isHoliday ? 'text-terracotta' : 'text-bark'}`}
            >
              🎉 Holiday booking
            </div>
            <div className="text-[11px] text-bark-light mt-0.5">
              Applies holiday surcharge
            </div>
          </div>
          <label
            className="relative inline-block w-11 h-6 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={isHoliday}
              onChange={(e) => setIsHoliday(e.target.checked)}
              className="opacity-0 w-0 h-0"
            />
            <span
              className={`absolute inset-0 rounded-full transition-colors duration-200 ${isHoliday ? 'bg-terracotta' : 'bg-pebble'}`}
            />
            <span
              className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white transition-all duration-200 shadow-[0_1px_4px_rgba(0,0,0,0.2)] ${isHoliday ? 'left-[23px]' : 'left-[3px]'}`}
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
            <p className="text-[11px] text-bark-light m-0 mb-2">
              ⚠️ Set your rates in Profile for accurate estimates.
            </p>
          )}

          {pricing && pricing.days.length > 0 && (
            <div className="flex flex-col gap-1 mb-2.5">
              <div className="flex justify-between text-xs text-bark">
                <span>{startDate} to {endDate}</span>
                <span className="font-semibold">
                  {pricing.days.length} {pricing.days.length === 1 ? 'day' : 'days'}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center border-t border-sage pt-2">
            <span className="font-bold text-bark">Total</span>
            <span className="text-[22px] font-black text-terracotta tracking-tight">
              ${(pricing?.totalAmount ?? 0).toFixed(2)}
            </span>
          </div>
        </div>

        <button
          type="submit"
          className="btn-sage mt-1"
          disabled={submitting || !selectedDogId}
        >
          {submitting ? 'Confirming…' : 'Confirm Booking 🐾'}
        </button>
      </form>
    </SlideUpSheet>
  );
}
