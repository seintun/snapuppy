import { useState } from 'react';
import { SlideUpSheet } from '@/components/ui/SlideUpSheet';
import type { BookingRecord } from '@/lib/bookingService';

interface DeclineRequestModalProps {
  isOpen: boolean;
  booking: BookingRecord | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export function DeclineRequestModal({ isOpen, booking, onClose, onConfirm }: DeclineRequestModalProps) {
  const [reason, setReason] = useState('');

  return (
    <SlideUpSheet isOpen={isOpen} onClose={onClose} title="Decline Request">
      {!booking ? <p className="text-sm text-bark-light">No request selected.</p> : null}
      {booking ? (
        <div className="space-y-3">
          <p className="text-sm text-bark">
            Decline request for <strong>{booking.dog?.name ?? 'Dog'}</strong>?
          </p>
          <textarea
            className="form-input min-h-[84px]"
            placeholder="Optional reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button type="button" className="btn-danger w-full" onClick={() => onConfirm(reason)}>
            Decline Request
          </button>
        </div>
      ) : null}
    </SlideUpSheet>
  );
}
