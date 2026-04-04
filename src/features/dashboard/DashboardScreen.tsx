import { useCalendarBookings } from '@/hooks/useBookings';
import { format, startOfToday } from 'date-fns';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DogAvatar } from '@/components/ui/DogAvatar';
import { PawPrint, CheckCircle, Clock } from '@phosphor-icons/react';

export function DashboardScreen() {
  const today = startOfToday();
  const todayStr = format(today, 'yyyy-MM-dd');
  const navigate = useNavigate();

  // Fetch current month bookings to identify today's arrivals/departures
  const { data: bookings = [], isLoading } = useCalendarBookings(today);

  const arriving = useMemo(() => 
    bookings.filter((b) => b.start_date === todayStr), 
  [bookings, todayStr]);
  
  const departing = useMemo(() => 
    bookings.filter((b) => b.end_date === todayStr), 
  [bookings, todayStr]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center font-black text-bark-light uppercase tracking-widest animate-pulse">
        Initializing Dashboard...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-24">
      <div className="flex flex-col gap-1">
        <h1 className="page-title !mb-0 transition-all duration-500">Good Morning!</h1>
        <p className="text-sm font-bold text-bark-light/60 uppercase tracking-widest pl-1">
          {format(today, 'EEEE, MMMM do')}
        </p>
      </div>

      <div className="glass-card rounded-[40px] flush-shadow overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="px-8 py-6 border-b border-pebble/20 flex justify-between items-center bg-gradient-to-r from-cream/20 to-transparent">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-bark-light uppercase tracking-[0.25em] mb-1.5 opacity-70">
              Live Status
            </span>
            <h2 className="text-2xl font-black text-bark leading-none tracking-tight">Today's Pups</h2>
          </div>
          <div className="flex items-center gap-2 bg-terracotta/10 text-terracotta px-4 py-2 rounded-full border border-terracotta/20 animate-pulse">
            <div className="w-2 h-2 rounded-full bg-terracotta shadow-[0_0_10px_rgba(212,132,90,0.6)]" />
            <span className="text-[11px] font-black uppercase tracking-widest">Active</span>
          </div>
        </div>

        <div className="p-8 flex flex-col gap-10">
          {/* Dropping Off Section */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-sage flex items-center gap-2">
                <CheckCircle size={18} weight="fill" /> Dropping Off
              </h3>
              <span className="text-[11px] font-black text-bark-light/80 bg-pebble/20 px-3 py-1 rounded-full">
                {arriving.length} dogs
              </span>
            </div>
            {arriving.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                {arriving.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => navigate(`/bookings/${b.id}`)}
                    className="flex flex-col items-center gap-3 group transition-all active:scale-95"
                  >
                    <div className="relative">
                      <DogAvatar 
                        name={b.dogs?.name ?? ''} 
                        src={b.dogs?.photo_url} 
                        size="lg" 
                        className="!w-20 !h-20 !border-[3px] !border-sage/40 !bg-cream/40 p-1 group-hover:!border-sage group-hover:shadow-lg transition-all" 
                      />
                      <div className="absolute -bottom-1 -right-1 bg-sage text-white rounded-full p-1.5 border-[3px] border-cream/90 shadow-sm">
                        <PawPrint size={14} weight="fill" />
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-black text-bark group-hover:text-sage transition-colors leading-none">{b.dogs?.name}</span>
                      <span className="text-[9px] font-black text-bark-light/60 uppercase tracking-tighter mt-1">{b.type}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 glass-card border border-dashed border-pebble/30 rounded-[32px]">
                <p className="text-xs font-black text-bark-light/50 uppercase tracking-[0.1em]">No arrivals today</p>
              </div>
            )}
          </div>

          <div className="h-px bg-pebble/20" />

          {/* Picking Up Section */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-terracotta flex items-center gap-2">
                <Clock size={18} weight="fill" /> Picking Up
              </h3>
              <span className="text-[11px] font-black text-bark-light/80 bg-pebble/20 px-3 py-1 rounded-full">
                {departing.length} dogs
              </span>
            </div>
            {departing.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                {departing.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => navigate(`/bookings/${b.id}`)}
                    className="flex flex-col items-center gap-3 group transition-all active:scale-95"
                  >
                    <div className="relative">
                      <DogAvatar 
                        name={b.dogs?.name ?? ''} 
                        src={b.dogs?.photo_url} 
                        size="lg" 
                        className="!w-20 !h-20 !border-[3px] !border-terracotta/40 !bg-cream/40 p-1 group-hover:!border-terracotta group-hover:shadow-lg transition-all" 
                      />
                      <div className="absolute -bottom-1 -right-1 bg-terracotta text-white rounded-full p-1.5 border-[3px] border-cream/90 shadow-sm">
                        <CheckCircle size={14} weight="fill" />
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-black text-bark group-hover:text-terracotta transition-colors leading-none">{b.dogs?.name}</span>
                      <span className="text-[9px] font-black text-bark-light/60 uppercase tracking-tighter mt-1">{b.type}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 glass-card border border-dashed border-pebble/30 rounded-[32px]">
                <p className="text-xs font-black text-bark-light/50 uppercase tracking-[0.1em]">No departures today</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-cream/30 p-6 flex items-center gap-4 border-t border-pebble/20">
          <div className="w-12 h-12 rounded-2xl bg-sage/10 text-sage flex items-center justify-center flush-shadow">
            <Info size={24} weight="duotone" />
          </div>
          <div>
            <h4 className="text-xs font-black text-bark uppercase">Daily Fact</h4>
            <p className="text-[10px] font-bold text-bark-light opacity-80 leading-relaxed">Most dogs have about 100 different facial expressions, most of them involve the ears!</p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Info } from '@phosphor-icons/react';
