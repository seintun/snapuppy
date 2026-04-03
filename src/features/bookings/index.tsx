import { EmptyState } from '@/components/ui/EmptyState';

export function BookingsScreen() {
  return (
    <>
      <h1 style={{ marginTop: 0 }}>Bookings</h1>
      <EmptyState title="No active bookings" description="Your booking cards will show here." />
    </>
  );
}
