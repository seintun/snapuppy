import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Warning } from '@phosphor-icons/react';
import { useToast } from '@/components/ui/useToast';
import { DogAvatar } from '@/components/ui/DogAvatar';
import { useBooking, useUpdateBookingStatus } from '@/hooks/useBookings';
import { useQueryClient } from '@tanstack/react-query';

export function BookingDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const { data: booking, isLoading, isError, error: queryError } = useBooking(id);
  const { mutateAsync: updateBookingStatusMutation } = useUpdateBookingStatus();

  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCancel = useCallback(async () => {
    if (!booking) return;
    setSaving(true);
    try {
      await updateBookingStatusMutation({ id: booking.id, status: 'cancelled' });
      await queryClient.invalidateQueries({ queryKey: ['calendar-bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['bookings'] });
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
  const statusColors: Record<string, string> = {
    active: 'bg-sage',
    completed: 'bg-bark-light',
    cancelled: 'bg-terracotta',
  };

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="bg-cream px-4 pt-2 pb-4 border-b border-pebble/60 shadow-[0_2px_8px_rgba(74,55,40,0.04)]">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-bark-light hover:text-bark font-bold text-xs bg-transparent border-none cursor-pointer py-1 mb-3 transition-colors"
        >
          <ArrowLeft size={16} weight="bold" />
          Back
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {dog ? (
              <DogAvatar name={dog.name} src={dog.photo_url} size="md" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-sage-light flex items-center justify-center text-xl">
                🐾
              </div>
            )}

            <div>
              <h1 className="m-0 text-xl font-black text-bark tracking-tight leading-none">
                {dog?.name ?? 'Unknown Dog'}
              </h1>
              <div className="text-[11px] text-bark-light mt-1.5 font-bold tracking-wide">
                {format(parseISO(booking.start_date), 'MMM d')} →{' '}
                {format(parseISO(booking.end_date), 'MMM d, yyyy')}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <span
              className={`${statusColors[booking.status] ?? 'bg-pebble'} text-white rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider drop-shadow-sm`}
            >
              {booking.status}
            </span>
            {booking.is_holiday && (
              <span className="bg-terracotta text-white rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider drop-shadow-sm">
                Holiday
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-3">
        {/* Reservation Summary */}
        <div className="bg-cream rounded-[14px] shadow-[0_2px_8px_rgba(74,55,40,0.08)] overflow-hidden">
          <div className="p-4 bg-[linear-gradient(to_bottom,var(--color-sage-light)_0%,transparent_150%)]">
            <div className="text-[10px] font-bold text-bark-light uppercase tracking-wider mb-3">
              Invoice Breakdown
            </div>
            <div className="flex flex-col gap-3">
              {Object.values(
                booking.days.reduce(
                  (acc, day) => {
                    const key = `${day.rate_type}-${day.is_holiday}-${day.amount}`;
                    if (!acc[key]) {
                      acc[key] = {
                        count: 0,
                        amount: day.amount,
                        type: day.rate_type,
                        holiday: day.is_holiday,
                        total: 0,
                      };
                    }
                    acc[key].count++;
                    acc[key].total += day.amount;
                    return acc;
                  },
                  {} as Record<
                    string,
                    { count: number; amount: number; type: string; holiday: boolean; total: number }
                  >,
                ),
              ).map((item, i) => (
                <div key={i} className="flex justify-between items-center text-[13px] text-bark">
                  <div className="flex items-center flex-wrap gap-x-2">
                    <span className="font-bold capitalize">{item.type}</span>
                    {item.holiday && (
                      <span className="text-[10px] font-black text-terracotta uppercase bg-white/60 border border-terracotta/20 px-1.5 py-[1px] rounded-md drop-shadow-sm">
                        Holiday
                      </span>
                    )}
                    <span className="text-bark-light font-medium ml-1">
                      × {item.count}{' '}
                      {item.type === 'boarding' ? (item.count === 1 ? 'night' : 'nights') : 'day'}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[14px]">${item.total.toFixed(2)}</div>
                    <div className="text-[10px] text-bark-light font-medium mt-0.5">
                      ${item.amount.toFixed(2)}/each
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-end mt-4 pt-4 border-t border-pebble/50">
              <span className="font-bold text-bark text-sm pb-1">Total</span>
              <span className="text-[28px] leading-none font-black text-terracotta tracking-tight">
                ${booking.total_amount.toFixed(2)}
              </span>
            </div>
          </div>
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
