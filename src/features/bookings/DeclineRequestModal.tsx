import { useState } from 'react';
import { X, Warning } from '@phosphor-icons/react';
import { Card } from '@/components/ui/Card';
import { DogAvatar } from '@/components/ui/DogAvatar';
import { useDeclineRequest } from '@/hooks/useBookings';
import { type BookingRecord } from '@/lib/bookingService';
import { formatBookingRange } from './bookingUi';
import { useToast } from '@/components/ui/useToast';

interface DeclineRequestModalProps {
  booking: BookingRecord;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeclineRequestModal({ booking, onClose, onSuccess }: DeclineRequestModalProps) {
  const { addToast } = useToast();
  const declineMutation = useDeclineRequest();
  const [reason, setReason] = useState('');

  const handleDecline = async () => {
    try {
      await declineMutation.mutateAsync({ bookingId: booking.id, reason: reason || undefined });
      addToast('Booking request declined', 'info');
      onSuccess();
    } catch (error) {
      addToast('Failed to decline request', 'error');
    }
  };

  const isLoading = declineMutation.isPending;

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
            <div className="w-10 h-10 rounded-full bg-terracotta/10 flex items-center justify-center">
              <Warning size={20} weight="fill" className="text-terracotta" />
            </div>
            <div>
              <h2 className="text-lg font-black text-bark">Decline Request</h2>
              <p className="text-xs text-bark-light/50 font-black uppercase tracking-widest">
                Are you sure?
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

          <div className="mb-5">
            <label className="block text-xs font-black text-bark-light/60 uppercase tracking-wide mb-2">
              Reason (optional)
            </label>
            <textarea
              className="w-full px-3 py-2 rounded-xl bg-pebble/10 border border-pebble/20 text-bark text-sm font-black placeholder:text-bark-light/30 focus:outline-none focus:ring-2 focus:ring-terracotta/20 resize-none"
              rows={3}
              placeholder="e.g., unavailable on those dates..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

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
              className="flex-1 py-3 px-4 rounded-xl bg-terracotta text-white font-black uppercase text-sm tracking-wide hover:bg-terracotta/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              onClick={handleDecline}
              disabled={isLoading}
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
              {isLoading ? 'Declining...' : 'Decline'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
