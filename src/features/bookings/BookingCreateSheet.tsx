import { useEffect, useMemo, useState } from 'react';
import { SlideUpSheet } from '@/components/ui/SlideUpSheet';
import { useToast } from '@/components/ui/useToast';
import { buildBookingPricing, type BookingFormOptions, type BookingRecord, type BookingStatus } from '@/lib/bookingService';
import { formatCurrency } from './bookingUi';

interface BookingCreateSheetProps {
  isOpen: boolean;
  onClose: () => void;
  dogs: BookingFormOptions['dogs'];
  profile: BookingFormOptions['profile'];
  onCreate: (input: {
    dogId: string;
    startDate: string;
    endDate: string;
    status: BookingStatus;
    pickupDateTime?: string;
  }) => Promise<BookingRecord>;
}

interface CreateBookingFormState {
  dogId: string;
  startDate: string;
  endDate: string;
  pickupTime: string;
  status: BookingStatus;
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function BookingCreateSheet({
  isOpen,
  onClose,
  dogs,
  profile,
  onCreate,
}: BookingCreateSheetProps) {
  const { addToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CreateBookingFormState>({
    dogId: '',
    startDate: getTodayKey(),
    endDate: getTodayKey(),
    pickupTime: '',
    status: 'active',
  });

  useEffect(() => {
    if (!isOpen) return;

    const today = getTodayKey();
    setForm({
      dogId: dogs[0]?.id ?? '',
      startDate: today,
      endDate: today,
      pickupTime: '',
      status: 'active',
    });
  }, [dogs, isOpen]);

  const pricingPreview = useMemo(() => {
    if (!profile || !form.startDate || !form.endDate || form.endDate < form.startDate) {
      return null;
    }

    try {
      return buildBookingPricing({
        startDate: form.startDate,
        endDate: form.endDate,
        pickupDateTime: form.pickupTime ? `${form.endDate}T${form.pickupTime}:00` : undefined,
        rates: {
          nightly_rate: profile.nightly_rate,
          daycare_rate: profile.daycare_rate,
          holiday_surcharge: profile.holiday_surcharge,
          cutoff_time: profile.cutoff_time,
        },
      });
    } catch {
      return null;
    }
  }, [form.endDate, form.pickupTime, form.startDate, profile]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profile) {
      addToast('Set your profile rates before creating a booking.', 'error');
      return;
    }

    if (!dogs.length || !form.dogId) {
      addToast('Add a dog before creating a booking.', 'error');
      return;
    }

    if (form.endDate < form.startDate) {
      addToast('End date must be on or after the start date.', 'error');
      return;
    }

    setSubmitting(true);

    try {
      await onCreate({
        dogId: form.dogId,
        startDate: form.startDate,
        endDate: form.endDate,
        status: form.status,
        pickupDateTime: form.pickupTime ? `${form.endDate}T${form.pickupTime}:00` : undefined,
      });
      addToast('Booking created.', 'success');
      onClose();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to create booking.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SlideUpSheet isOpen={isOpen} onClose={onClose} title="New Booking">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!dogs.length ? (
          <p style={{ margin: 0, color: 'var(--terracotta)' }}>
            Add a dog first, then come back to create a booking.
          </p>
        ) : null}

        {!profile ? (
          <p style={{ margin: 0, color: 'var(--terracotta)' }}>
            Save your boarding and daycare rates in Profile first.
          </p>
        ) : null}

        <div className="form-field">
          <label className="form-label" htmlFor="booking-dog">
            Dog
          </label>
          <select
            id="booking-dog"
            className="form-input"
            value={form.dogId}
            onChange={(event) => setForm((current) => ({ ...current, dogId: event.target.value }))}
            disabled={!dogs.length}
          >
            {dogs.map((dog) => (
              <option key={dog.id} value={dog.id}>
                {dog.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <div className="form-field">
            <label className="form-label" htmlFor="booking-start-date">
              Start date
            </label>
            <input
              id="booking-start-date"
              className="form-input"
              type="date"
              value={form.startDate}
              onChange={(event) =>
                setForm((current) => ({ ...current, startDate: event.target.value }))
              }
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="booking-end-date">
              End date
            </label>
            <input
              id="booking-end-date"
              className="form-input"
              type="date"
              value={form.endDate}
              min={form.startDate}
              onChange={(event) =>
                setForm((current) => ({ ...current, endDate: event.target.value }))
              }
              required
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <div className="form-field">
            <label className="form-label" htmlFor="booking-pickup-time">
              Pickup time
            </label>
            <input
              id="booking-pickup-time"
              className="form-input"
              type="time"
              value={form.pickupTime}
              onChange={(event) =>
                setForm((current) => ({ ...current, pickupTime: event.target.value }))
              }
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="booking-status">
              Status
            </label>
            <select
              id="booking-status"
              className="form-input"
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as BookingStatus,
                }))
              }
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {pricingPreview ? (
          <div
            style={{
              border: '1px solid var(--line)',
              borderRadius: 12,
              padding: 12,
              background: 'var(--cream)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <strong>{pricingPreview.type === 'daycare' ? 'Daycare' : 'Boarding'} preview</strong>
              <span>{formatCurrency(pricingPreview.totalAmount)}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pricingPreview.days.map((day) => (
                <div
                  key={day.date}
                  style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14 }}
                >
                  <span>
                    {day.date} · {day.rate_type}
                    {day.is_holiday ? ' · holiday' : ''}
                  </span>
                  <span>{formatCurrency(day.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <p style={{ margin: 0, color: 'var(--bark-light)', fontSize: 13 }}>
          Holiday toggles and per-day rate tweaks can be adjusted after creation.
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-secondary" type="button" onClick={onClose} style={{ flex: 1 }}>
            Cancel
          </button>
          <button
            className="btn-sage"
            type="submit"
            disabled={submitting || !dogs.length || !profile}
            style={{ flex: 1 }}
          >
            {submitting ? 'Saving…' : 'Create booking'}
          </button>
        </div>
      </form>
    </SlideUpSheet>
  );
}
