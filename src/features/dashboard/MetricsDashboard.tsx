import { useMemo, useState } from 'react';
import {
  startOfMonth,
  startOfYear,
  subMonths,
  differenceInDays,
  isWithinInterval,
  format,
  subDays,
} from 'date-fns';
import {
  TrendUp,
  TrendDown,
  Minus,
  PawPrint,
  ChartLine,
  CurrencyDollar,
  CalendarCheck,
  Dog,
} from '@phosphor-icons/react';
import { useBookings } from '@/hooks/useBookings';
import { useDogs } from '@/hooks/useDogs';
import { formatCurrency } from '@/features/bookings/bookingUi';
import { DogAvatar } from '@/components/ui/DogAvatar';
import { Badge } from '@/components/ui/Badge';
import type { BookingRecord } from '@/lib/bookingService';

type TimeRange = '30' | '90' | 'ytd';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: number;
  icon: React.ReactNode;
  color: 'sage' | 'terracotta' | 'sky' | 'amber';
}

function MetricCard({ title, value, subtitle, trend, icon, color }: MetricCardProps) {
  const colorClasses = {
    sage: 'bg-sage/10 text-sage border-sage/20',
    terracotta: 'bg-terracotta/10 text-terracotta border-terracotta/20',
    sky: 'bg-sky/10 text-sky border-sky/20',
    amber: 'bg-amber/20 text-amber border-amber/30',
  };

  return (
    <div className="bg-cream rounded-xl shadow-sm border border-pebble p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-black text-bark-light/60 uppercase tracking-[0.15em]">
          {title}
        </span>
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center border ${colorClasses[color]}`}
        >
          {icon}
        </div>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-black text-bark leading-none">{value}</span>
        {trend !== undefined && (
          <div
            className={`flex items-center gap-0.5 text-xs font-bold ${trend > 0 ? 'text-sage' : trend < 0 ? 'text-terracotta' : 'text-bark-light'}`}
          >
            {trend > 0 ? (
              <TrendUp size={14} weight="fill" />
            ) : trend < 0 ? (
              <TrendDown size={14} weight="fill" />
            ) : (
              <Minus size={14} weight="fill" />
            )}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      {subtitle && <span className="text-[10px] font-bold text-bark-light/50">{subtitle}</span>}
    </div>
  );
}

function OccupancyGauge({ rate }: { rate: number }) {
  const getColor = (r: number) => {
    if (r < 50) return 'bg-terracotta';
    if (r < 80) return 'bg-amber';
    return 'bg-sage';
  };

  const getColorClasses = (r: number) => {
    if (r < 50) return 'text-terracotta';
    if (r < 80) return 'text-amber';
    return 'text-sage';
  };

  return (
    <div className="bg-cream rounded-xl shadow-sm border border-pebble p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-black text-bark-light/60 uppercase tracking-[0.15em]">
          Occupancy
        </span>
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center border bg-sky/10 text-sky border-sky/20`}
        >
          <CalendarCheck size={18} weight="fill" />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-end justify-between">
          <span className="text-2xl font-black text-bark leading-none">{Math.round(rate)}%</span>
          <span className={`text-[10px] font-bold ${getColorClasses(rate)}`}>
            {rate < 50 ? 'Low' : rate < 80 ? 'Moderate' : 'Strong'}
          </span>
        </div>
        <div className="h-2 bg-pebble/30 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getColor(rate)}`}
            style={{ width: `${Math.min(rate, 100)}%` }}
          />
        </div>
      </div>
      <span className="text-[10px] font-bold text-bark-light/50">Booked nights / 30 days</span>
    </div>
  );
}

function TopDogsLeaderboard({
  dogs,
  bookings,
}: {
  dogs: Array<{ id: string; name: string; photo_url: string | null }>;
  bookings: BookingRecord[];
}) {
  const topDogs = useMemo(() => {
    const counts: Record<string, number> = {};
    bookings.forEach((b) => {
      if (b.status === 'completed' || b.status === 'active') {
        counts[b.dog_id] = (counts[b.dog_id] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([dogId, count]) => {
        const dog = dogs.find((d) => d.id === dogId);
        return { dogId, count, dog };
      });
  }, [bookings, dogs]);

  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

  return (
    <div className="bg-cream rounded-xl shadow-sm border border-pebble p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-black text-bark-light/60 uppercase tracking-[0.15em]">
          Top Dogs
        </span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center border bg-terracotta/10 text-terracotta border-terracotta/20">
          <PawPrint size={18} weight="fill" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {topDogs.length > 0 ? (
          topDogs.map(({ dogId, count, dog }, index) => (
            <div
              key={dogId}
              className="flex items-center gap-3 py-1.5 border-b border-pebble/20 last:border-0"
            >
              <span className="text-sm w-6">{medals[index]}</span>
              <DogAvatar
                name={dog?.name ?? ''}
                src={dog?.photo_url ?? undefined}
                size="sm"
                className="!w-8 !h-8"
              />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-black text-bark truncate block">
                  {dog?.name ?? 'Unknown'}
                </span>
              </div>
              <Badge variant="sage">{count} bookings</Badge>
            </div>
          ))
        ) : (
          <div className="text-center py-4 border-2 border-dashed border-pebble/40 rounded-[20px] bg-cream/20">
            <p className="text-[9px] font-black text-bark-light/50 uppercase tracking-wider">
              No bookings yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function MetricsDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30');
  const { data: bookings = [] } = useBookings();
  const { data: dogs = [] } = useDogs();

  const today = new Date();
  const daysMap: Record<TimeRange, number> = {
    '30': 30,
    '90': 90,
    ytd: differenceInDays(today, startOfYear(today)) + 1,
  };
  const startDate = subDays(today, daysMap[timeRange]);
  const lastMonthStart = subMonths(startOfMonth(today), 1);
  const lastMonthEnd = subDays(startOfMonth(today), 1);

  const metrics = useMemo(() => {
    const filteredBookings = bookings.filter((b) => {
      const start = new Date(b.start_date);
      return start >= startDate && start <= today;
    });

    const lastMonthBookings = bookings.filter((b) => {
      const start = new Date(b.start_date);
      return isWithinInterval(start, { start: lastMonthStart, end: lastMonthEnd });
    });

    const currentRevenue = filteredBookings.reduce(
      (sum, b) => sum + (b.total_amount ?? 0) + (b.tip_amount ?? 0),
      0,
    );
    const lastMonthRevenue = lastMonthBookings.reduce(
      (sum, b) => sum + (b.total_amount ?? 0) + (b.tip_amount ?? 0),
      0,
    );
    const revenueChange =
      lastMonthRevenue > 0
        ? Math.round(((currentRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
        : 0;

    const completedBookings = filteredBookings.filter((b) => b.status === 'completed');
    const avgBookingValue =
      completedBookings.length > 0 ? currentRevenue / completedBookings.length : 0;

    const activeDogs = new Set(
      filteredBookings.filter((b) => b.status === 'active').map((b) => b.dog_id),
    ).size;

    const newDogsThisMonth = dogs.filter((d) => {
      const created = new Date(d.created_at);
      return created >= startOfMonth(today);
    }).length;

    const bookedNights = filteredBookings.reduce((sum, b) => {
      const start = new Date(b.start_date);
      const end = new Date(b.end_date);
      const days = differenceInDays(end, start) + 1;
      return sum + (b.status === 'completed' || b.status === 'active' ? days : 0);
    }, 0);
    const occupancyRate = (bookedNights / daysMap[timeRange]) * 100;

    return {
      currentRevenue,
      revenueChange,
      avgBookingValue,
      activeDogs,
      newDogsThisMonth,
      occupancyRate,
      completedCount: completedBookings.length,
    };
  }, [bookings, dogs, timeRange, startDate]);

  const timeRanges: { value: TimeRange; label: string }[] = [
    { value: '30', label: '30 Days' },
    { value: '90', label: '90 Days' },
    { value: 'ytd', label: 'Year to Date' },
  ];

  return (
    <div className="flex flex-col gap-4 pb-20">
      <div className="flex flex-col px-1 pt-2">
        <h1 className="text-3xl font-black text-bark tracking-tight leading-none">Metrics</h1>
        <p className="text-[10px] font-black text-bark-light/40 uppercase tracking-[0.2em] mt-1">
          {format(today, 'MMMM yyyy')}
        </p>
      </div>

      <div className="flex gap-2 px-1">
        {timeRanges.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setTimeRange(value)}
            className={`flex-1 py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
              timeRange === value
                ? 'bg-sage text-white shadow-md'
                : 'bg-cream text-bark-light border border-pebble'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          title="Revenue"
          value={formatCurrency(metrics.currentRevenue)}
          subtitle={timeRange === 'ytd' ? 'YTD' : `Last ${timeRange} days`}
          trend={metrics.revenueChange}
          icon={<CurrencyDollar size={18} weight="fill" />}
          color="sage"
        />
        <OccupancyGauge rate={metrics.occupancyRate} />
        <MetricCard
          title="Avg. Booking"
          value={formatCurrency(metrics.avgBookingValue)}
          subtitle={`${metrics.completedCount} completed`}
          icon={<ChartLine size={18} weight="fill" />}
          color="sky"
        />
        <MetricCard
          title="Active Dogs"
          value={metrics.activeDogs.toString()}
          subtitle={`${metrics.newDogsThisMonth} new this month`}
          icon={<Dog size={18} weight="fill" />}
          color="terracotta"
        />
      </div>

      <TopDogsLeaderboard dogs={dogs} bookings={bookings} />
    </div>
  );
}
