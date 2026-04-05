import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlass, Calendar, CaretRight, Sun, Moon } from '@phosphor-icons/react';
import { Card } from '@/components/ui/Card';
import { DogAvatar } from '@/components/ui/DogAvatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { AddButton } from '@/components/ui/AddButton';
import { type BookingRecord } from '@/lib/bookingService';
import { useBookings } from '@/hooks/useBookings';
import { CreateBookingSheet } from './CreateBookingSheet';
import { format } from 'date-fns';
import {
  formatBookingRange,
  formatCurrency,
  getStatusLabel,
  getDurationText,
  bookingStatusOptions,
} from './bookingUi';

interface GroupedBookings {
  [key: string]: BookingRecord[];
}

export function BookingsScreen() {
  const navigate = useNavigate();
  const { data: bookings = [], isLoading, isError, error } = useBookings();
  const [filter, setFilter] = useState<string>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const filteredBookings = useMemo(() => {
    let result = bookings;

    if (filter !== 'all') {
      result = bookings.filter((booking) => booking.status === filter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.dog?.name.toLowerCase().includes(query) ||
          b.dog?.owner_name?.toLowerCase().includes(query),
      );
    }

    return result;
  }, [bookings, filter, searchQuery]);

  const groupedBookings = useMemo(() => {
    const groups: GroupedBookings = {};

    const sortedItems = [...filteredBookings].sort((a, b) => {
      const dateA = new Date(a.start_date).getTime();
      const dateB = new Date(b.start_date).getTime();
      return dateA - dateB;
    });

    sortedItems.forEach((booking) => {
      const date = new Date(`${booking.start_date}T00:00:00`);
      const monthYear = format(date, 'MMMM yyyy');
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(booking);
    });

    return groups;
  }, [filteredBookings]);

  const sortedMonthKeys = useMemo(() => {
    return Object.keys(groupedBookings).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateA.getTime() - dateB.getTime();
    });
  }, [groupedBookings]);

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden relative">
      {/* Ultra-Density Header */}
      <div className="sticky top-0 z-20 bg-warm-beige/95 backdrop-blur-md pt-2 pb-3 -mx-4 px-4 border-b border-pebble/10">
        <div className="flex flex-col gap-4 mb-4">
          <div className="px-1 pt-2">
            <h1 className="text-3xl font-black text-bark tracking-tight leading-none mb-1">
              Bookings
            </h1>
            <p className="text-[10px] font-black text-bark-light/40 uppercase tracking-[0.2em]">
              {filteredBookings.length}{' '}
              {getStatusLabel(filter as 'active' | 'pending' | 'completed' | 'cancelled')}
            </p>
          </div>

          {/* Failsafe Compact Filter Bar - Optimized for No Overlap */}
          <div className="flex items-center">
            <div className="inline-flex rounded-full bg-pebble/10 p-0.5 shadow-sm border border-pebble/5">
              {bookingStatusOptions.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`py-1.25 px-3 rounded-full text-[8px] font-black transition-all cursor-pointer ${
                    filter === status
                      ? 'bg-white text-sage shadow-md scale-[1.02]'
                      : 'text-bark-light/40 hover:text-bark'
                  }`}
                  onClick={() => setFilter(status)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="relative group">
          <MagnifyingGlass
            className="absolute left-3 top-1/2 -translate-y-1/2 text-bark-light/20 transition-colors group-focus-within:text-sage"
            size={12}
            weight="bold"
          />
          <input
            type="text"
            placeholder="Search dog or owner..."
            className="form-input !pl-8 !py-1.5 !text-[10px] !rounded-full !bg-white/80 border-pebble/5 focus:ring-sage/20 shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-none pt-4">
        {isLoading && !bookings.length ? (
          <div className="flex flex-col items-center justify-center h-[40vh] text-xs text-bark-light">
            Syncing bookings…
          </div>
        ) : null}

        {isError ? (
          <div className="p-6 text-center text-terracotta text-sm font-black">
            {error instanceof Error ? error.message : 'Sync failed'}
          </div>
        ) : null}

        {!isLoading && !isError ? (
          filteredBookings.length ? (
            <div className="space-y-3 -mx-4 px-4 pb-20">
              {sortedMonthKeys.map((monthYear) => (
                <div key={monthYear}>
                  <div className="flex items-center gap-1.5 px-1.5 mb-2 opacity-50">
                    <Calendar size={11} weight="bold" className="text-bark-light" />
                    <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-bark-light">
                      {monthYear}
                    </h2>
                  </div>
                  <div className="flex flex-col gap-2">
                    {groupedBookings[monthYear].map((booking) => (
                      <div
                        key={booking.id}
                        className="relative pl-3 border-l-[1.5px] border-pebble/20 ml-2"
                      >
                        {/* Timeline Node Connector */}
                        <div className="absolute -left-[5.5px] top-3.5 w-2.5 h-2.5 rounded-full bg-white border-2 border-sage shadow-sm z-10" />

                        <Card
                          className="p-0 border border-pebble/5 overflow-hidden flex flex-col mb-3 shadow-sm"
                          pressable
                          onClick={() => navigate(`/bookings/${booking.id}`)}
                        >
                          {/* Timeline Date Header */}
                          <div className="flex items-center justify-between px-3 py-1.5 bg-pebble/5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[10px] font-black text-bark uppercase tracking-tight truncate">
                                {formatBookingRange(booking)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-sage shadow-sm border border-sage/10 shrink-0">
                              <span className="text-[8px] font-black text-white leading-none uppercase tracking-tighter">
                                {getDurationText(booking)}
                              </span>
                            </div>
                          </div>

                          <div className="h-px bg-pebble/10 w-full" />

                          {/* Info Body */}
                          <div className="flex items-center gap-3 p-2.5 pt-1.5">
                            <div className="relative shrink-0">
                              <DogAvatar
                                name={booking.dog?.name ?? 'Dog'}
                                src={booking.dog?.photo_url}
                                size="md"
                              />
                              <div
                                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm ${booking.type === 'daycare' ? 'bg-sky' : 'bg-sage'}`}
                              >
                                {booking.type === 'daycare' ? (
                                  <Sun size={10} weight="fill" className="text-white" />
                                ) : (
                                  <Moon size={10} weight="fill" className="text-white" />
                                )}
                              </div>
                            </div>

                            <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <h3 className="font-black text-bark truncate text-sm leading-tight">
                                  {booking.dog?.name ?? 'Unknown'}
                                </h3>
                                <p className="text-[9px] font-black text-bark-light/40 uppercase tracking-widest mt-0.5">
                                  {booking.dog?.owner_name || 'Individual'}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-base font-black text-terracotta leading-none">
                                  {formatCurrency(booking.total_amount)}
                                </p>
                              </div>
                            </div>
                            <CaretRight
                              size={14}
                              weight="bold"
                              className="text-pebble/30 shrink-0 ml-1"
                            />
                          </div>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-8">
              <EmptyState
                title={
                  searchQuery
                    ? 'No matches found'
                    : `No ${getStatusLabel(filter as 'active' | 'pending' | 'completed' | 'cancelled').toLowerCase()} bookings`
                }
                description={
                  searchQuery
                    ? 'Try a different dog or owner name.'
                    : 'Tap the + button to create a booking.'
                }
              />
            </div>
          )
        ) : null}
      </div>

      <CreateBookingSheet isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      <AddButton onClick={() => setIsCreateOpen(true)} variant="booking" isActive={isCreateOpen} />
    </div>
  );
}
