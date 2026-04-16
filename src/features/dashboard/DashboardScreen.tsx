import { useCalendarBookings } from '@/hooks/useBookings';
import { format, startOfToday, getHours } from 'date-fns';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DogAvatar } from '@/components/ui/DogAvatar';
import { AppLoadingAnimation } from '@/components/ui/AppLoadingAnimation';
import { PawPrint, CheckCircle, Clock, Info } from '@phosphor-icons/react';
import { MetricsDashboard } from './MetricsDashboard';

export function DashboardScreen() {
  const today = startOfToday();
  const todayStr = format(today, 'yyyy-MM-dd');
  const navigate = useNavigate();
  const currentHour = getHours(new Date());

  const greeting = useMemo(() => {
    if (currentHour >= 5 && currentHour < 12) return 'Good Morning!';
    if (currentHour >= 12 && currentHour < 17) return 'Good Afternoon!';
    if (currentHour >= 17 && currentHour < 21) return 'Good Evening!';
    return 'Good Night!';
  }, [currentHour]);

  // Fetch current month bookings to identify today's arrivals/departures
  const { data: bookings = [], isLoading } = useCalendarBookings(today);
  const [arrivedIds, setArrivedIds] = useState<string[]>([]);

  const arriving = useMemo(
    () => bookings.filter((b) => b.start_date === todayStr),
    [bookings, todayStr],
  );

  const departing = useMemo(
    () => bookings.filter((b) => b.end_date === todayStr),
    [bookings, todayStr],
  );

  const staying = useMemo(
    () => bookings.filter((b) => b.start_date < todayStr && b.end_date > todayStr),
    [bookings, todayStr],
  );

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <AppLoadingAnimation size="lg" label="Initializing dashboard..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-20">
      <div className="flex flex-col px-1 pt-2 mb-6">
        <h1 className="text-3xl font-black text-bark tracking-tight leading-none">{greeting}</h1>
        <p className="text-[10px] font-black text-bark-light/40 uppercase tracking-[0.2em] mt-1">
          {format(today, 'EEEE, MMMM do')}
        </p>
      </div>

      <div className="glass-card rounded-[32px] border border-pebble/60 flush-shadow overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="px-5 py-3 border-b border-pebble/40 flex justify-between items-center bg-gradient-to-r from-cream/30 to-transparent">
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-bark-light uppercase tracking-[0.2em] opacity-80 mb-0.5">
              Live Status
            </span>
            <h2 className="text-lg font-black text-bark leading-none tracking-tight">
              Today's Pups
            </h2>
          </div>
          <div className="flex items-center gap-1.5 bg-sky/10 text-sky px-2.5 py-1 rounded-full border border-sky/20">
            <div className="w-1 h-1 rounded-full bg-sky shadow-[0_0_8px_rgba(126,200,227,0.5)] animate-pulse" />
            <span className="text-[8px] font-black uppercase tracking-widest">Active</span>
          </div>
        </div>

        <div className="p-4 flex flex-col gap-4">
          {/* Arriving Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-sage flex items-center gap-1.5">
                <CheckCircle size={14} weight="fill" /> Arriving
              </h3>
              <span className="text-[8px] font-black text-bark-light bg-pebble/30 border border-pebble/20 px-2 py-0.5 rounded-full">
                {arriving.length} pups
              </span>
            </div>
            {arriving.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {arriving.map((b) => {
                  const isArrived = arrivedIds.includes(b.id);
                  return (
                    <button
                      key={b.id}
                      aria-label={`View booking for ${b.dogs?.name ?? 'dog'}`}
                      onClick={() => navigate(`/bookings/${b.id}`)}
                      className="flex flex-col items-center gap-1 group transition-all active:scale-95"
                    >
                      <div className="relative">
                        <DogAvatar
                          name={b.dogs?.name ?? ''}
                          src={b.dogs?.photo_url}
                          size="md"
                          className="!w-14 !h-14 !border-2 !border-sage/50 !bg-cream p-0.5 group-hover:!border-sage transition-all shadow-sm"
                        />
                        {isArrived ? (
                          <div className="absolute -bottom-0.5 -right-0.5 bg-sage text-white rounded-full p-0.5 border-2 border-cream shadow-sm">
                            <CheckCircle size={8} weight="fill" />
                          </div>
                        ) : (
                          <div className="absolute -bottom-0.5 -right-0.5 bg-sage text-white rounded-full p-0.5 border-2 border-cream shadow-sm">
                            <PawPrint size={8} weight="fill" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-center w-full px-0.5 gap-1">
                        <span className="text-[10px] font-black text-bark leading-tight truncate w-full text-center">
                          {b.dogs?.name}
                        </span>
                        <button
                          type="button"
                          aria-label={
                            isArrived ? `${b.dogs?.name} arrived` : `Mark ${b.dogs?.name} arrived`
                          }
                          aria-pressed={isArrived}
                          disabled={isArrived}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isArrived) return;
                            setArrivedIds((prev) => [...new Set([...prev, b.id])]);
                          }}
                          className={`text-[7px] font-bold uppercase tracking-wider px-1 py-0.5 rounded-md transition-all ${
                            isArrived
                              ? 'text-sage/70 bg-transparent'
                              : 'text-sage bg-sage/10 hover:bg-sage/20 active:scale-95'
                          }`}
                        >
                          {isArrived ? (
                            <CheckCircle size={10} weight="fill" />
                          ) : (
                            <PawPrint size={10} weight="fill" />
                          )}
                        </button>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 border-2 border-dashed border-pebble/40 rounded-[20px] bg-cream/20">
                <p className="text-[9px] font-black text-bark-light/50 uppercase tracking-wider">
                  No arrivals
                </p>
              </div>
            )}
          </div>

          <div className="h-px bg-pebble/30 mx-2" />

          {/* Staying Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-sky flex items-center gap-1.5">
                <PawPrint size={14} weight="fill" /> With Us
              </h3>
              <span className="text-[8px] font-black text-bark-light bg-pebble/30 border border-pebble/20 px-2 py-0.5 rounded-full">
                {staying.length} pups
              </span>
            </div>
            {staying.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {staying.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => navigate(`/bookings/${b.id}`)}
                    className="flex flex-col items-center gap-1.5 group transition-all active:scale-95"
                  >
                    <div className="relative">
                      <DogAvatar
                        name={b.dogs?.name ?? ''}
                        src={b.dogs?.photo_url}
                        size="sm"
                        className="!w-10 !h-10 !border-[1.5px] !border-sky/50 !bg-cream p-0.5 group-hover:!border-sky transition-all shadow-sm"
                      />
                    </div>
                    <div className="flex flex-col items-center w-full px-0.5">
                      <span className="text-[9px] font-black text-bark leading-tight truncate w-full text-center">
                        {b.dogs?.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 border-2 border-dashed border-pebble/40 rounded-[20px] bg-cream/20">
                <p className="text-[9px] font-black text-bark-light/50 uppercase tracking-wider">
                  No pups staying
                </p>
              </div>
            )}
          </div>

          <div className="h-px bg-pebble/30 mx-2" />

          {/* Departing Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-terracotta flex items-center gap-1.5">
                <Clock size={14} weight="fill" /> Departing
              </h3>
              <span className="text-[8px] font-black text-bark-light bg-pebble/30 border border-pebble/20 px-2 py-0.5 rounded-full">
                {departing.length} pups
              </span>
            </div>
            {departing.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {departing.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => navigate(`/bookings/${b.id}`)}
                    className="flex flex-col items-center gap-1.5 group transition-all active:scale-95"
                  >
                    <div className="relative">
                      <DogAvatar
                        name={b.dogs?.name ?? ''}
                        src={b.dogs?.photo_url}
                        size="md"
                        className="!w-14 !h-14 !border-2 !border-terracotta/50 !bg-cream p-0.5 group-hover:!border-terracotta transition-all shadow-sm"
                      />
                      <div className="absolute -bottom-0.5 -right-0.5 bg-terracotta text-white rounded-full p-0.5 border-2 border-cream shadow-sm">
                        <CheckCircle size={8} weight="fill" />
                      </div>
                    </div>
                    <div className="flex flex-col items-center w-full px-0.5">
                      <span className="text-[10px] font-black text-bark leading-tight truncate w-full text-center">
                        {b.dogs?.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 border-2 border-dashed border-pebble/40 rounded-[20px] bg-cream/20">
                <p className="text-[9px] font-black text-bark-light/50 uppercase tracking-wider">
                  No departures
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-cream/70 p-3.5 flex items-center gap-3 border-t border-pebble/60">
          <div className="w-8 h-8 rounded-xl bg-sage/10 text-sage flex items-center justify-center shrink-0 border border-sage/30 shadow-sm">
            <Info size={18} weight="fill" />
          </div>
          <p className="text-[11px] font-bold text-bark-light leading-tight">
            Dogs have about 100 facial expressions, mostly involving their ears!
          </p>
        </div>
      </div>
      <MetricsDashboard />
    </div>
  );
}
