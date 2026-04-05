import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { SignOut } from '@phosphor-icons/react';
import { useClientBookings, useClientSession } from './clientQueries';
import { clearClientSession } from './clientAuth';
import { ClientBookingCard } from './ClientBookingCard';
import { Card } from '@/components/ui/Card';
import { DogAvatar } from '@/components/ui/DogAvatar';

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin" />
      <p className="text-bark-light text-sm">Loading your bookings...</p>
    </div>
  );
}

function EmptyState({ type }: { type: 'upcoming' | 'past' }) {
  return (
    <Card className="text-center py-8">
      <p className="text-bark-light">
        {type === 'upcoming' ? 'No upcoming bookings' : 'No past bookings yet'}
      </p>
    </Card>
  );
}

function BookingSection({
  title,
  bookings,
  emptyType,
}: {
  title: string;
  bookings: ReturnType<typeof useClientBookings>['bookings'];
  emptyType: 'upcoming' | 'past';
}) {
  return (
    <section className="mb-6">
      <h2 className="text-lg font-bold text-bark mb-3">{title}</h2>
      {bookings.length === 0 ? (
        <EmptyState type={emptyType} />
      ) : (
        <div className="flex flex-col gap-3">
          {bookings.map((booking) => (
            <ClientBookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </section>
  );
}

export function ClientDashboard() {
  const navigate = useNavigate();
  const { bookings, loading } = useClientBookings();
  const session = useClientSession();

  const handleLogout = useCallback(() => {
    clearClientSession();
    navigate('/client');
  }, [navigate]);

  if (!session) {
    navigate('/client');
    return null;
  }

  const activeBookings = bookings.filter((b) => b.status === 'active');
  const completedBookings = bookings.filter((b) => b.status === 'completed');

  return (
    <div className="min-h-screen pb-20 px-4 pt-6">
      <header className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <DogAvatar name={session.dogName} src={null} size="lg" />
            <div>
              <p className="text-sm text-bark-light">Welcome back</p>
              <h1 className="text-2xl font-extrabold text-bark">{session.clientName}</h1>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-pebble/50 transition-colors"
            aria-label="Log out"
          >
            <SignOut weight="bold" size={24} />
          </button>
        </div>
      </header>

      {loading ? (
        <LoadingState />
      ) : (
        <>
          <BookingSection title="Upcoming" bookings={activeBookings} emptyType="upcoming" />
          <BookingSection title="Past Bookings" bookings={completedBookings} emptyType="past" />
        </>
      )}
    </div>
  );
}
