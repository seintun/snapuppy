import { useParams } from 'react-router-dom';
import { useClientBookings } from './clientQueries';
import { getClientSession } from './clientAuth';
import { ReportList } from '@/features/reports';
import { Badge } from '@/components/ui/Badge';
import type { BookingStatus } from '@/lib/bookingService';
import { getStatusLabel, getStatusVariant } from '@/features/bookings/bookingUi';

export function ClientBookingDetail() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const session = getClientSession();
  const { data: bookings = [] } = useClientBookings(session?.sitterId, session?.ownerPhone);
  const booking = bookings.find((item) => item.id === bookingId);

  if (!booking) {
    return <p className="p-4 text-sm text-bark-light">Booking not found.</p>;
  }

  const status = toBookingStatus(booking.status);

  return (
    <div className="p-4 space-y-3">
      <h2 className="text-lg font-black text-bark">{booking.dog?.name ?? 'Booking'}</h2>
      <Badge
        variant={getStatusVariant(status)}
        className="text-[10px] px-2 py-0.5 uppercase tracking-wide"
      >
        {getStatusLabel(status)}
      </Badge>
      <ReportList bookingId={booking.id} readOnly />
    </div>
  );
}

function toBookingStatus(status: string): BookingStatus {
  if (status === 'pending' || status === 'completed' || status === 'cancelled') {
    return status;
  }
  return 'active';
}
