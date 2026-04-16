import { format } from 'date-fns';
import { Badge } from '@/components/ui/Badge';
import type { BookingStatus } from '@/lib/bookingService';
import { getStatusLabel, getStatusVariant } from '@/features/bookings/bookingUi';

interface ClientBookingCardProps {
  booking: {
    id: string;
    start_date: string;
    end_date: string;
    status: string;
    total_amount: number;
    dog?: { name?: string | null } | null;
  };
  onSelect?: (bookingId: string) => void;
}

export function ClientBookingCard({ booking, onSelect }: ClientBookingCardProps) {
  const status = toBookingStatus(booking.status);

  return (
    <button
      type="button"
      className="surface-card p-3 w-full text-left"
      onClick={() => onSelect?.(booking.id)}
    >
      <p className="text-sm font-black text-bark">{booking.dog?.name ?? 'Dog Booking'}</p>
      <p className="text-xs text-bark-light">
        {format(new Date(booking.start_date), 'MMM d')} -{' '}
        {format(new Date(booking.end_date), 'MMM d, yyyy')}
      </p>
      <div className="mt-2 flex items-center justify-between text-xs">
        <Badge
          variant={getStatusVariant(status)}
          className="text-[10px] px-2 py-0.5 uppercase tracking-wide"
        >
          {getStatusLabel(status)}
        </Badge>
        <span className="font-bold text-terracotta">${booking.total_amount.toFixed(2)}</span>
      </div>
    </button>
  );
}

function toBookingStatus(status: string): BookingStatus {
  if (status === 'pending' || status === 'completed' || status === 'cancelled') {
    return status;
  }
  return 'active';
}
