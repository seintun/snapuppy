import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClientBookingCard } from './ClientBookingCard';
import { ClientRequestSheet } from './ClientRequestSheet';
import { getClientSession } from './clientAuth';
import { useClientBookings } from './clientQueries';

export function ClientDashboard() {
  const navigate = useNavigate();
  const session = getClientSession();
  const { data: bookings = [], isLoading } = useClientBookings(session?.sitterId, session?.ownerPhone);
  const [requestOpen, setRequestOpen] = useState(false);

  const upcoming = useMemo(() => bookings.filter((booking) => booking.status === 'active'), [bookings]);
  const past = useMemo(
    () => bookings.filter((booking) => booking.status === 'completed' || booking.status === 'cancelled'),
    [bookings],
  );

  if (!session) {
    return <p className="text-sm text-bark-light">Client session expired. Re-open your invite link.</p>;
  }

  const defaultDogId = bookings[0]?.dog_id ?? '';

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-black text-bark">Welcome, {session.ownerName}</h2>
        <p className="text-sm text-bark-light">Review bookings and send a new request.</p>
      </div>

      <button
        type="button"
        className="btn-sage w-full"
        onClick={() => setRequestOpen(true)}
        disabled={!defaultDogId}
      >
        Request Booking
      </button>

      <section className="space-y-2">
        <h3 className="text-xs font-black uppercase tracking-wide text-bark-light">Upcoming</h3>
        {isLoading ? <p className="text-sm text-bark-light">Loading…</p> : null}
        {upcoming.length === 0 && !isLoading ? (
          <p className="text-sm text-bark-light">No upcoming bookings.</p>
        ) : null}
        {upcoming.map((booking) => (
          <ClientBookingCard
            key={booking.id}
            booking={booking}
            onSelect={(bookingId) => navigate(`/client/${session.token}/bookings/${bookingId}`)}
          />
        ))}
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-black uppercase tracking-wide text-bark-light">Past</h3>
        {past.length === 0 ? <p className="text-sm text-bark-light">No past bookings.</p> : null}
        {past.map((booking) => (
          <ClientBookingCard
            key={booking.id}
            booking={booking}
            onSelect={(bookingId) => navigate(`/client/${session.token}/bookings/${bookingId}`)}
          />
        ))}
      </section>

      {defaultDogId ? (
        <ClientRequestSheet
          isOpen={requestOpen}
          onClose={() => setRequestOpen(false)}
          sitterId={session.sitterId}
          dogId={defaultDogId}
        />
      ) : null}
    </div>
  );
}
