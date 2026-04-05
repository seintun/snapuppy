import { SlideUpSheet } from '@/components/ui/SlideUpSheet';
import type { BookingRecord } from '@/lib/bookingService';

interface AcceptRequestModalProps {
  isOpen: boolean;
  booking: BookingRecord | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function AcceptRequestModal({ isOpen, booking, onClose, onConfirm }: AcceptRequestModalProps) {
  return (
    <SlideUpSheet isOpen={isOpen} onClose={onClose} title="Accept Request">
      {!booking ? <p className="text-sm text-bark-light">No request selected.</p> : null}
      {booking ? (
        <div className="space-y-3">
          <p className="text-sm text-bark">
            Confirm request for <strong>{booking.dog?.name ?? 'Dog'}</strong>?
          </p>
          <button type="button" className="btn-sage w-full" onClick={onConfirm}>
            Confirm Booking
          </button>
        </div>
      ) : null}
    </SlideUpSheet>
  );
}
