import { useMemo } from 'react';
import { useBookings } from '@/hooks/useBookings';
import { useDogs } from '@/hooks/useDogs';
import {
  calculateAverageBookingValue,
  calculateMonthlyRevenue,
  calculateOccupancyRate,
  calculatePendingRevenue,
  calculateMetrics,
  getActiveDogsCount,
  getTopDogsByBookings,
} from '@/lib/metricsCalculator';
import { MetricCard } from './MetricCard';

export function MetricsDashboard() {
  const { data: bookings = [] } = useBookings();
  const { data: dogs = [] } = useDogs();

  const metrics = useMemo(() => {
    return calculateMetrics({
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
      <h2 className="text-sm font-black text-bark uppercase tracking-wide mb-3">
        Business Metrics
      </h2>
      <div className="grid grid-cols-2 gap-2 text-sm text-bark">
        <MetricCard
          label="Monthly Revenue"
          value={`$${calculateMonthlyRevenue(metrics).toFixed(2)}`}
        />
        <MetricCard
          label="Pending Revenue"
          value={`$${calculatePendingRevenue(metrics).toFixed(2)}`}
        />
        <MetricCard label="Occupancy" value={`${calculateOccupancyRate(metrics).toFixed(2)}%`} />
        <MetricCard
          label="Avg Booking"
          value={`$${calculateAverageBookingValue(metrics).toFixed(2)}`}
        />
        <MetricCard label="Active Dogs" value={`${getActiveDogsCount(metrics)}`} />
      </div>
      <div className="mt-3">
        <p className="text-xs font-bold text-bark-light uppercase tracking-wide mb-1">Top Dogs</p>
        <div className="space-y-1">
          {getTopDogsByBookings(metrics).map((dog) => (
            <div key={dog.dogId} className="flex items-center justify-between text-xs text-bark">
              <span>{dog.name}</span>
              <span className="font-bold">{dog.bookingCount} bookings</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
