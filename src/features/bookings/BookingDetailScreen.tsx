import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Warning } from '@phosphor-icons/react';
import { useToast } from '@/components/ui/useToast';
import { DogAvatar } from '@/components/ui/DogAvatar';
import {
  useBooking,
  useSaveBookingDays,
  useUpdateBookingStatus,
} from '@/hooks/useBookings';
import type { EditableBookingDay } from '@/lib/bookingService';

export function BookingDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const { data: booking, isLoading, isError, error: queryError } = useBooking(id);
  const { mutateAsync: saveBookingDaysMutation } = useSaveBookingDays();
  const { mutateAsync: updateBookingStatusMutation } = useUpdateBookingStatus();

  const [draftDays, setDraftDays] = useState<EditableBookingDay[]>([]);
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (booking) {
      setDraftDays(booking.days);
    }
  }, [booking]);

  const handleToggleDayHoliday = useCallback(
    async (day: EditableBookingDay) => {
      if (!booking) return;
      const updatedDays = draftDays.map((d) =>
        d.id === day.id ? { ...d, is_holiday: !d.is_holiday } : d,
      );
      setDraftDays(updatedDays);
      try {
        await saveBookingDaysMutation({
          id: booking.id,
          days: updatedDays,
        });
        addToast('Day updated 🐾', 'success');
      } catch {
        setDraftDays(booking.days); // revert
        addToast('Failed to update day', 'error');
      }
    },
    [booking, draftDays, saveBookingDaysMutation, addToast],
  );

  const handleToggleDayType = useCallback(
    async (day: EditableBookingDay) => {
      if (!booking) return;
      const newType = day.rate_type === 'boarding' ? 'daycare' : 'boarding';
      const updatedDays = draftDays.map((d) =>
        d.id === day.id ? { ...d, rate_type: newType as 'boarding' | 'daycare' } : d,
      );
      setDraftDays(updatedDays);
      try {
        await saveBookingDaysMutation({
          id: booking.id,
          days: updatedDays,
        });
        addToast('Rate type updated 🐾', 'success');
      } catch {
        setDraftDays(booking.days);
        addToast('Failed to update day', 'error');
      }
    },
    [booking, draftDays, saveBookingDaysMutation, addToast],
  );

  const handleCancel = useCallback(async () => {
    if (!booking) return;
    setSaving(true);
    try {
      await updateBookingStatusMutation({ id: booking.id, status: 'cancelled' });
      addToast('Booking cancelled', 'info');
      navigate('/bookings');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to cancel booking', 'error');
    } finally {
      setSaving(false);
      setCancelConfirm(false);
    }
  }, [booking, navigate, addToast, updateBookingStatusMutation]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-sm text-bark-light">
        Loading…
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="p-6 text-center text-terracotta">
        <Warning size={40} className="mb-2 inline-block" />
        <p>{queryError instanceof Error ? queryError.message : 'Booking not found'}</p>
        <button className="btn-sage mt-4" onClick={() => navigate(-1)}>
          Go back
        </button>
      </div>
    );
  }

  const dog = booking.dog;
  const typeLabel = booking.type === 'boarding' ? 'Boarding' : 'Daycare';
  const statusColors: Record<string, string> = {
    active: 'bg-sage',
    completed: 'bg-bark-light',
    cancelled: 'bg-terracotta',
  };

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="bg-cream px-5 pt-4 pb-6 border-b border-pebble">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-bark-light font-semibold text-sm bg-transparent border-none cursor-pointer py-2 mb-4"
        >
          <ArrowLeft size={18} weight="bold" />
          Bookings
        </button>

        <div className="flex items-center gap-4">
          {dog ? (
            <DogAvatar name={dog.name} src={dog.photo_url} size="lg" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-sage-light flex items-center justify-center text-3xl">
              🐾
            </div>
          )}

          <div>
            <h1 className="m-0 text-2xl font-black text-bark tracking-tight">
              {dog?.name ?? 'Unknown Dog'}
            </h1>
            {dog?.owner_name && (
              <div className="text-xs text-bark-light mt-0.5">
                {dog.owner_name}
                {dog.owner_phone ? ` · ${dog.owner_phone}` : ''}
              </div>
            )}
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              <span className="bg-sage text-white rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase">
                {typeLabel}
              </span>
              <span className={`${statusColors[booking.status] ?? 'bg-pebble'} text-white rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase`}>
                {booking.status}
              </span>
              {booking.is_holiday && (
                <span className="bg-blush text-terracotta rounded-full px-2.5 py-0.5 text-[10px] font-bold">
                  🎉 Holiday
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-3">
        {/* Dates + total */}
        <div className="bg-cream rounded-[14px] py-4 px-4.5 flex justify-between items-center shadow-[0_2px_8px_rgba(74,55,40,0.08)]">
          <div>
            <div className="text-[10px] font-bold text-bark-light uppercase tracking-wider mb-1">
              Stay
            </div>
            <div className="font-extrabold text-bark text-sm">
              {format(parseISO(booking.start_date), 'MMM d')} →{' '}
              {format(parseISO(booking.end_date), 'MMM d, yyyy')}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold text-bark-light uppercase tracking-wider mb-1">
              Total
            </div>
            <div className="text-[26px] font-black text-terracotta tracking-tight">
              ${booking.total_amount.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Daily breakdown accordion */}
        <div className="bg-cream rounded-[14px] overflow-hidden shadow-[0_2px_8px_rgba(74,55,40,0.08)]">
          <button
            onClick={() => setShowBreakdown((v) => !v)}
            className="w-full flex justify-between items-center py-3.5 px-4.5 bg-sage-light border-none cursor-pointer font-bold text-[13px] text-bark"
          >
            <span>🗓️ Daily Breakdown</span>
            <span
              className="text-base transition-transform duration-200 inline-block"
              style={{ transform: showBreakdown ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              ▲
            </span>
          </button>

          {showBreakdown && (
            <div>
              {draftDays.length === 0 ? (
                <div className="p-4 text-center text-[13px] text-bark-light">
                  No daily breakdown available
                </div>
              ) : (
                draftDays.map((day, i) => (
                  <div
                    key={day.id}
                    className={`px-4.5 py-3 flex justify-between items-center ${i > 0 ? 'border-t border-pebble' : ''}`}
                  >
                    <div>
                      <div className="font-semibold text-[13px] text-bark">
                        {format(parseISO(day.date), 'EEE, MMM d')}
                      </div>
                      <div className="flex gap-1.5 mt-1">
                        <button
                          onClick={() => void handleToggleDayType(day)}
                          disabled={booking.status !== 'active'}
                          className={`text-[9px] font-bold uppercase text-white border-none rounded-full px-2 py-0.5 ${day.rate_type === 'boarding' ? 'bg-sage' : 'bg-sky'} ${booking.status === 'active' ? 'cursor-pointer' : 'cursor-default'}`}
                          title="Toggle rate type"
                        >
                          {day.rate_type}
                        </button>
                        {day.is_holiday && (
                          <span className="text-[9px] font-bold uppercase text-terracotta bg-blush rounded-full px-2 py-0.5">
                            Holiday
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-bark text-[15px]">
                        ${day.amount.toFixed(2)}
                      </span>
                      {booking.status === 'active' && (
                        <button
                          onClick={() => void handleToggleDayHoliday(day)}
                          className={`w-8 h-8 rounded-lg border-none cursor-pointer text-base flex items-center justify-center ${day.is_holiday ? 'bg-blush' : 'bg-warm-beige'}`}
                          title="Toggle holiday"
                        >
                          🎉
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Cancel */}
        {booking.status === 'active' && (
          <div className="mt-2">
            {cancelConfirm ? (
              <div className="bg-blush rounded-[14px] p-4 border-[1.5px] border-terracotta">
                <p className="m-0 mb-3 font-bold text-terracotta text-sm">
                  Cancel this booking? This cannot be undone.
                </p>
                <div className="flex gap-2.5">
                  <button
                    onClick={() => void handleCancel()}
                    disabled={saving}
                    className="flex-1 min-h-[44px] bg-terracotta text-white border-none rounded-lg font-bold text-sm cursor-pointer"
                  >
                    {saving ? 'Cancelling…' : 'Yes, cancel'}
                  </button>
                  <button
                    onClick={() => setCancelConfirm(false)}
                    className="flex-1 min-h-[44px] bg-cream text-bark border-[1.5px] border-pebble rounded-lg font-bold text-sm cursor-pointer"
                  >
                    Keep booking
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setCancelConfirm(true)}
                className="w-full min-h-[48px] bg-transparent text-terracotta border-[1.5px] border-terracotta rounded-[14px] font-bold text-sm cursor-pointer"
              >
                Cancel booking
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
