import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { SlideUpSheet } from '@/components/ui/SlideUpSheet';
import { useToast } from '@/components/ui/useToast';
import {
  repriceBookingDays,
  type BookingFormOptions,
  type BookingRecord,
  type BookingStatus,
  type EditableBookingDay,
} from '@/lib/bookingService';
import {
  formatBookingDay,
  formatBookingRange,
  formatCurrency,
  getStatusLabel,
  getStatusVariant,
} from './bookingUi';

interface BookingDetailSheetProps {
  booking: BookingRecord | null;
  isOpen: boolean;
  onClose: () => void;
  profile: BookingFormOptions['profile'];
  onSaveDays: (bookingId: string, days: EditableBookingDay[]) => Promise<BookingRecord>;
  onUpdateStatus: (bookingId: string, status: BookingStatus) => Promise<void>;
  onDelete: (bookingId: string) => Promise<void>;
}

export function BookingDetailSheet({
  booking,
  isOpen,
  onClose,
  profile,
  onSaveDays,
  onUpdateStatus,
  onDelete,
}: BookingDetailSheetProps) {
  const { addToast } = useToast();
  const [draftDays, setDraftDays] = useState<EditableBookingDay[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraftDays(booking?.days ?? []);
  }, [booking]);

  const repriced = useMemo(() => {
    if (!profile) {
      return {
        days: draftDays,
        totalAmount: draftDays.reduce((sum, day) => sum + day.amount, 0),
        isHoliday: draftDays.some((day) => day.is_holiday),
      };
    }

    return repriceBookingDays(draftDays, {
      nightly_rate: profile.nightly_rate,
      daycare_rate: profile.daycare_rate,
      holiday_surcharge: profile.holiday_surcharge,
      cutoff_time: profile.cutoff_time,
    });
  }, [draftDays, profile]);

  const hasChanges = useMemo(() => {
    if (!booking || booking.days.length !== repriced.days.length) {
      return false;
    }

    return booking.days.some((day, index) => {
      const nextDay = repriced.days[index];
      return (
        day.rate_type !== nextDay.rate_type ||
        day.is_holiday !== nextDay.is_holiday ||
        day.amount !== nextDay.amount
      );
    });
  }, [booking, repriced.days]);

  function updateDay(date: string, patch: Partial<Pick<EditableBookingDay, 'rate_type' | 'is_holiday'>>) {
    setDraftDays((current) =>
      current.map((day) => (day.date === date ? { ...day, ...patch } : day)),
    );
  }

  async function handleSave() {
    if (!booking || !profile) return;

    setSaving(true);
    try {
      await onSaveDays(booking.id, repriced.days);
      addToast('Booking pricing saved.', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to save booking.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(status: BookingStatus) {
    if (!booking || booking.status === status) return;

    setSaving(true);
    try {
      await onUpdateStatus(booking.id, status);
      addToast(`Booking marked ${getStatusLabel(status).toLowerCase()}.`, 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to update status.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!booking) return;
    if (!confirm(`Delete booking for ${booking.dog?.name ?? 'this dog'}?`)) return;

    setSaving(true);
    try {
      await onDelete(booking.id);
      addToast('Booking deleted.', 'success');
      onClose();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to delete booking.', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (!booking) {
    return null;
  }

  return (
    <SlideUpSheet isOpen={isOpen} onClose={onClose} title="Booking Detail">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'flex-start',
          }}
        >
          <div>
            <h3 style={{ margin: 0 }}>{booking.dog?.name ?? 'Unknown dog'}</h3>
            <p style={{ margin: '6px 0 0', color: 'var(--bark-light)' }}>
              {formatBookingRange(booking)}
            </p>
          </div>

          <Badge variant={getStatusVariant(booking.status)}>{getStatusLabel(booking.status)}</Badge>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 10,
            padding: 12,
            borderRadius: 12,
            border: '1px solid var(--line)',
            background: 'var(--cream)',
          }}
        >
          <div>
            <div style={{ color: 'var(--bark-light)', fontSize: 12 }}>Daily rows</div>
            <strong>{repriced.days.length}</strong>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'var(--bark-light)', fontSize: 12 }}>Booking total</div>
            <strong>{formatCurrency(repriced.totalAmount)}</strong>
          </div>
        </div>

        {!profile ? (
          <p style={{ margin: 0, color: 'var(--terracotta)' }}>
            Save your profile rates before editing per-day pricing.
          </p>
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {repriced.days.map((day) => (
            <div
              key={day.id}
              style={{
                border: '1px solid var(--line)',
                borderRadius: 12,
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <strong>{formatBookingDay(day.date)}</strong>
                <span>{formatCurrency(day.amount)}</span>
              </div>

              <div
                style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 12 }}
              >
                <label className="form-field" htmlFor={`rate-${day.id}`} style={{ marginBottom: 0 }}>
                  <span className="form-label">Rate type</span>
                  <select
                    id={`rate-${day.id}`}
                    className="form-input"
                    value={day.rate_type}
                    onChange={(event) =>
                      updateDay(day.date, {
                        rate_type: event.target.value as EditableBookingDay['rate_type'],
                      })
                    }
                    disabled={!profile || saving}
                  >
                    <option value="boarding">Boarding</option>
                    <option value="daycare">Daycare</option>
                  </select>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontWeight: 600,
                    paddingTop: 26,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={day.is_holiday}
                    onChange={(event) => updateDay(day.date, { is_holiday: event.target.checked })}
                    disabled={!profile || saving}
                  />
                  Holiday
                </label>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void handleStatusChange('active')}
            disabled={saving}
          >
            Active
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void handleStatusChange('completed')}
            disabled={saving}
          >
            Complete
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void handleStatusChange('cancelled')}
            disabled={saving}
          >
            Cancel
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void handleDelete()}
            disabled={saving}
            style={{ color: 'var(--terracotta)' }}
          >
            Delete booking
          </button>
          <button
            type="button"
            className="btn-sage"
            onClick={() => void handleSave()}
            disabled={saving || !profile || !hasChanges}
            style={{ flex: 1 }}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </SlideUpSheet>
  );
}
