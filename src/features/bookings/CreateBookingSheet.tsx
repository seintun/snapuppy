import { useCallback, useEffect, useMemo, useState } from 'react';
import { SlideUpSheet } from '@/components/ui/SlideUpSheet';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { useToast } from '@/components/ui/useToast';
import {
  buildBookingPricing,
  createBooking,
  getBookingFormOptions,
  type BookingFormOptions,
} from '@/lib/bookingService';

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

  const [options, setOptions] = useState<BookingFormOptions>({ dogs: [], profile: null });
  const [selectedDogId, setSelectedDogId] = useState('');
  const [startDate, setStartDate] = useState(prefilledDate ?? today());
  const [endDate, setEndDate] = useState(prefilledDate ?? today());
  const [isHoliday, setIsHoliday] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reset on open
  useEffect(() => {
    if (!isOpen) return;
    const d = prefilledDate ?? today();
    setStartDate(d);
    setEndDate(d);
    setSelectedDogId('');
    setIsHoliday(false);
  }, [isOpen, prefilledDate]);

  // Load dogs + profile
  useEffect(() => {
    if (!isOpen || !user) return;
    getBookingFormOptions(user.id)
      .then(setOptions)
      .catch(() => {
        /* silent */
      });
  }, [isOpen, user]);

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

      setSubmitting(true);
      try {
        await createBooking({
          sitterId: user.id,
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
      } finally {
        setSubmitting(false);
      }
    },
    [selectedDogId, user, startDate, endDate, isHoliday, options, addToast, onSuccess, onClose],
  );

  const ratesSet = options.profile && (options.profile.nightly_rate ?? 0) > 0;

  return (
    <SlideUpSheet isOpen={isOpen} onClose={onClose} title="New Booking 🐾">
      <form
        onSubmit={(e) => void handleSubmit(e)}
        style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
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
            <p style={{ fontSize: 12, color: 'var(--bark-light)', margin: '4px 0 0' }}>
              No dogs yet — add one in the Dogs tab first.
            </p>
          )}
        </div>

        {/* Dates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: isHoliday ? 'var(--blush)' : 'var(--cream)',
            border: `1.5px solid ${isHoliday ? 'var(--terracotta)' : 'var(--pebble)'}`,
            borderRadius: 10,
            padding: '10px 14px',
            transition: 'all 150ms ease',
          }}
        >
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: 14,
                color: isHoliday ? 'var(--terracotta)' : 'var(--bark)',
              }}
            >
              🎉 Holiday booking
            </div>
            <div style={{ fontSize: 11, color: 'var(--bark-light)', marginTop: 2 }}>
              Applies holiday surcharge
            </div>
          </div>
          <label
            style={{
              position: 'relative',
              display: 'inline-block',
              width: 44,
              height: 24,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={isHoliday}
              onChange={(e) => setIsHoliday(e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 99,
                background: isHoliday ? 'var(--terracotta)' : 'var(--pebble)',
                transition: 'background 200ms ease',
              }}
            />
            <span
              style={{
                position: 'absolute',
                top: 3,
                left: isHoliday ? 23 : 3,
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: 'white',
                transition: 'left 200ms ease',
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
              }}
            />
          </label>
        </div>

        {/* Rate preview */}
        <div style={{ background: 'var(--sage-light)', borderRadius: 12, padding: 14 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--bark-light)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Rate Preview
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--sage)',
                background: 'white',
                borderRadius: 99,
                padding: '2px 8px',
                textTransform: 'uppercase',
              }}
            >
              {pricing?.type ?? (startDate === endDate ? 'daycare' : 'boarding')}
            </span>
          </div>

          {!ratesSet && (
            <p style={{ fontSize: 11, color: 'var(--bark-light)', margin: '0 0 8px' }}>
              ⚠️ Set your rates in Profile for accurate estimates.
            </p>
          )}

          {pricing && pricing.days.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
              {pricing.days.map((day) => (
                <div
                  key={day.date}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    color: 'var(--bark)',
                  }}
                >
                  <span>{day.date}</span>
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {day.is_holiday && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: 'var(--terracotta)',
                          textTransform: 'uppercase',
                        }}
                      >
                        Holiday
                      </span>
                    )}
                    <span style={{ fontWeight: 600 }}>${day.amount.toFixed(2)}</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid var(--sage)',
              paddingTop: 8,
            }}
          >
            <span style={{ fontWeight: 700, color: 'var(--bark)' }}>Total</span>
            <span
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: 'var(--terracotta)',
                letterSpacing: '-0.03em',
              }}
            >
              ${(pricing?.totalAmount ?? 0).toFixed(2)}
            </span>
          </div>
        </div>

        <button
          type="submit"
          className="btn-sage"
          disabled={submitting || !selectedDogId}
          style={{ marginTop: 4 }}
        >
          {submitting ? 'Confirming…' : 'Confirm Booking 🐾'}
        </button>
      </form>
    </SlideUpSheet>
  );
}
