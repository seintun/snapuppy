import { useParams } from 'react-router-dom';
import { useClientBookings } from './clientQueries';
import { getClientSession } from './clientAuth';
import { ReportList } from '@/features/reports';

export function ClientBookingDetail() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const session = getClientSession();
  const { data: bookings = [] } = useClientBookings(session?.sitterId, session?.ownerPhone);
  const booking = bookings.find((item) => item.id === bookingId);

  if (!booking) {
    return <p className="p-4 text-sm text-bark-light">Booking not found.</p>;
  }

  return (
    <div className="p-4 space-y-3">
      <h2 className="text-lg font-black text-bark">{booking.dog?.name ?? 'Booking'}</h2>
      <p className="text-sm text-bark-light">Status: {booking.status}</p>
      <ReportList bookingId={booking.id} readOnly />
    </div>
  );
}
