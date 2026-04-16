interface MetricBooking {
  id: string;
  dog_id: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  tip_amount?: number | null;
  status: string;
}

interface MetricDog {
  id: string;
  name: string;
  created_at: string;
}

export interface ComputeDashboardMetricsInput {
  now?: Date;
  bookings: MetricBooking[];
  dogs: MetricDog[];
}

export interface DashboardMetrics {
  monthlyRevenue: number;
  pendingRevenue: number;
  occupancyRate: number;
  averageBookingValue: number;
  activeDogs: number;
  newDogsThisMonth: number;
  topDogs: Array<{ dogId: string; name: string; bookingCount: number }>;
}

export function computeDashboardMetrics(input: ComputeDashboardMetricsInput): DashboardMetrics {
  const now = input.now ?? new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;

  const monthBookings = input.bookings.filter(
    (booking) =>
      booking.start_date.startsWith(monthPrefix) || booking.end_date.startsWith(monthPrefix),
  );

  const completedBookings = monthBookings.filter((booking) => booking.status === 'completed');
  const pendingBookings = monthBookings.filter((booking) => booking.status === 'pending');

  const monthlyRevenue = round(
    completedBookings.reduce(
      (sum, booking) => sum + booking.total_amount + (booking.tip_amount ?? 0),
      0,
    ),
  );

  const pendingRevenue = round(
    pendingBookings.reduce((sum, booking) => sum + booking.total_amount, 0),
  );

  const averageBookingValue = completedBookings.length
    ? round(monthlyRevenue / completedBookings.length)
    : 0;

  const activeDogIds = new Set(
    monthBookings
      .filter((booking) => booking.status !== 'cancelled')
      .map((booking) => booking.dog_id),
  );

  const newDogsThisMonth = input.dogs.filter((dog) =>
    dog.created_at.startsWith(monthPrefix),
  ).length;

  const bookingCountsByDog = new Map<string, number>();
  for (const booking of monthBookings) {
    if (booking.status === 'cancelled') continue;
    bookingCountsByDog.set(booking.dog_id, (bookingCountsByDog.get(booking.dog_id) ?? 0) + 1);
  }

  const dogNameById = new Map(input.dogs.map((dog) => [dog.id, dog.name]));
  const topDogs = [...bookingCountsByDog.entries()]
    .map(([dogId, bookingCount]) => ({
      dogId,
      name: dogNameById.get(dogId) ?? 'Unknown',
      bookingCount,
    }))
    .sort((a, b) => b.bookingCount - a.bookingCount)
    .slice(0, 5);

  const bookedNights = monthBookings.reduce((sum, booking) => {
    const start = new Date(`${booking.start_date}T00:00:00Z`);
    const end = new Date(`${booking.end_date}T00:00:00Z`);
    const diff = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
    return sum + diff;
  }, 0);

  const occupancyRate = round((bookedNights / 30) * 100);

  return {
    monthlyRevenue,
    pendingRevenue,
    occupancyRate,
    averageBookingValue,
    activeDogs: activeDogIds.size,
    newDogsThisMonth,
    topDogs,
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
