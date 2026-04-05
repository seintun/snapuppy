import { useMemo } from 'react';
import { useBookings } from '@/hooks/useBookings';
import { useDogs } from '@/hooks/useDogs';
import { computeDashboardMetrics } from '@/lib/metricsService';

export function MetricsDashboard() {
  const { data: bookings = [] } = useBookings();
  const { data: dogs = [] } = useDogs();

  const metrics = useMemo(() => {
    return computeDashboardMetrics({
      bookings: bookings.map((booking) => ({
        id: booking.id,
        dog_id: booking.dog_id,
        start_date: booking.start_date,
        end_date: booking.end_date,
        total_amount: booking.total_amount,
        tip_amount: 0,
        status: booking.status,
      })),
      dogs: dogs.map((dog) => ({
        id: dog.id,
        name: dog.name,
        created_at: dog.created_at,
      })),
    });
  }, [bookings, dogs]);

  return (
    <section className="surface-card p-4 mt-4">
      <h2 className="text-sm font-black text-bark uppercase tracking-wide mb-3">Business Metrics</h2>
      <div className="grid grid-cols-2 gap-2 text-sm text-bark">
        <div className="surface-card p-3">
          <p className="text-xs text-bark-light">Monthly Revenue</p>
          <p className="font-black">${metrics.monthlyRevenue.toFixed(2)}</p>
        </div>
        <div className="surface-card p-3">
          <p className="text-xs text-bark-light">Occupancy</p>
          <p className="font-black">{metrics.occupancyRate.toFixed(2)}%</p>
        </div>
        <div className="surface-card p-3">
          <p className="text-xs text-bark-light">Avg Booking</p>
          <p className="font-black">${metrics.averageBookingValue.toFixed(2)}</p>
        </div>
        <div className="surface-card p-3">
          <p className="text-xs text-bark-light">Active Dogs</p>
          <p className="font-black">{metrics.activeDogs}</p>
        </div>
      </div>
    </section>
  );
}
