import type { BookingRecord } from '@/lib/bookingService';
import { Badge } from '@/components/ui/Badge';

interface PendingRequestCardProps {
  booking: BookingRecord;
  onAccept: () => void;
  onDecline: () => void;
}

export function PendingRequestCard({ booking, onAccept, onDecline }: PendingRequestCardProps) {
  return (
    <div className="surface-card p-3 border border-terracotta/30 bg-blush/30">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-black text-bark">{booking.dog?.name ?? 'Pending request'}</p>
        <Badge variant="amber" className="text-[10px] px-2 py-0.5 uppercase tracking-wide">
          Pending
        </Badge>
      </div>
      <p className="text-xs text-bark-light">{booking.dog?.owner_name ?? 'Client request'}</p>
      <div className="mt-3 flex gap-2">
        <button type="button" className="btn-sage flex-1 !py-2 !text-xs" onClick={onAccept}>
          Confirm Booking
        </button>
        <button type="button" className="btn-danger flex-1 !py-2 !text-xs" onClick={onDecline}>
          Decline
        </button>
      </div>
    </div>
  );
}
