import { EmptyState } from '@/components/ui/EmptyState';

export function CalendarScreen() {
  return (
    <>
      <h1 style={{ marginTop: 0 }}>Calendar</h1>
      <EmptyState title="No bookings yet" description="Tap + to add your first stay." />
    </>
  );
}
