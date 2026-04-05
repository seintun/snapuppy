import { useMemo } from 'react';
import { X } from '@phosphor-icons/react';
import { Card } from '@/components/ui/Card';
import { DogAvatar } from '@/components/ui/DogAvatar';
import { useAcceptRequest, useBookingOptions } from '@/hooks/useBookings';
import { buildBookingPricing, type BookingRecord } from '@/lib/bookingService';
import { formatCurrency, formatBookingRange } from './bookingUi';
import { useToast } from '@/components/ui/useToast';

interface AcceptRequestModalProps {
  booking: BookingRecord;
  onClose: () => void;
  onSuccess: () => void;
}

export function AcceptRequestModal({ booking, onClose, onSuccess }: AcceptRequestModalProps) {
  const { addToast } = useToast();
  const { data: options } = useBookingOptions();
  const acceptMutation = useAcceptRequest();

  const pricing = useMemo(() => {
    if (!options?.profile) return null;
    return buildBookingPricing({
      startDate: booking.start_date,
      endDate: booking.end_date,
      rates: {
        nightly_rate: options.profile.nightly_rate,
        daycare_rate: options.profile.daycare_rate,
        holiday_surcharge: options.profile.holiday_surcharge,
        cutoff_time: options.profile.cutoff_time,
      },
    });
  }, [booking.start_date, booking.end_date, options?.profile]);

  const handleAccept = async () => {
    try {
      await acceptMutation.mutateAsync(booking.id);
      addToast('Booking request accepted!', 'success');
      onSuccess();
    } catch (error) {
      addToast('Failed to accept request', 'error');
    }
  };

  const isLoading = acceptMutation.isPending;
  const canAccept = pricing && !isLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-bark/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-cream rounded-2xl shadow-xl border border-pebble/20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          className="absolute top-3 right-3 p-1.5 rounded-full bg-pebble/10 text-bark-light hover:bg-pebble/20 transition-colors z-10"
          onClick={onClose}
        >
          <X size={18} weight="bold" />
        </button>

        <div className="p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-sage/10 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-sage"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-black text-bark">Accept Request</h2>
              <p className="text-xs text-bark-light/50 font-black uppercase tracking-widest">
                Confirm booking
              </p>
            </div>
          </div>

          <Card className="bg-pebble/5 border-pebble/10 mb-5">
            <div className="flex items-center gap-3">
              <DogAvatar name={booking.dog?.name ?? 'Dog'} src={booking.dog?.photo_url} size="lg" />
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-bark truncate">{booking.dog?.name ?? 'Unknown'}</h3>
                <p className="text-xs text-bark-light/60 font-black uppercase tracking-widest">
                  {booking.dog?.owner_name || 'Owner'}
                </p>
                <p className="text-[10px] text-bark-light/50 mt-1">{formatBookingRange(booking)}</p>
              </div>
            </div>
          </Card>

          {pricing && (
            <div className="bg-sage/5 rounded-xl p-4 mb-5 border border-sage/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-bark-light/60 uppercase tracking-wide">
                  Pricing
                </span>
                {pricing.isHoliday && (
                  <span className="px-2 py-0.5 rounded-full bg-amber/20 text-[10px] font-black text-amber uppercase">
                    Holiday
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-sage">
                  {formatCurrency(pricing.totalAmount)}
                </span>
                <span className="text-xs text-bark-light/40 font-black">
                  {pricing.days.length} {pricing.days.length === 1 ? 'day' : 'days'}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              className="flex-1 py-3 px-4 rounded-xl bg-pebble/20 text-bark-light font-black uppercase text-sm tracking-wide hover:bg-pebble/30 transition-colors"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="flex-1 py-3 px-4 rounded-xl bg-sage text-white font-black uppercase text-sm tracking-wide hover:bg-sage/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              onClick={handleAccept}
              disabled={!canAccept}
            >
              {isLoading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : null}
              {isLoading ? 'Accepting...' : 'Confirm Booking'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
