import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlass, Calendar, CaretRight, Sun, Moon } from '@phosphor-icons/react';
import { Card } from '@/components/ui/Card';
import { DogAvatar } from '@/components/ui/DogAvatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { AddButton } from '@/components/ui/AddButton';
import { type BookingStatus, type BookingRecord } from '@/lib/bookingService';
import { useBookings } from '@/hooks/useBookings';
import { CreateBookingSheet } from './CreateBookingSheet';
import { format } from 'date-fns';
import {
  bookingStatusOptions,
  formatBookingRange,
  formatCurrency,
  getStatusLabel,
} from './bookingUi';

interface GroupedBookings {
  [key: string]: BookingRecord[];
}

export function BookingsScreen() {
  const navigate = useNavigate();
  const { data: bookings = [], isLoading, isError, error } = useBookings();
  const [filter, setFilter] = useState<BookingStatus>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const filteredBookings = useMemo(() => {
    let result = bookings.filter((booking) => booking.status === filter);
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.dog?.name.toLowerCase().includes(query) ||
          b.dog?.owner_name?.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [bookings, filter, searchQuery]);

  const groupedBookings = useMemo(() => {
    const groups: GroupedBookings = {};
    
    // Create a copy and sort internal items first
    const sortedItems = [...filteredBookings].sort((a, b) => {
      const dateA = new Date(a.start_date).getTime();
      const dateB = new Date(b.start_date).getTime();
      return filter === 'active' ? dateA - dateB : dateB - dateA;
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
  }, [filteredBookings, filter]);

  const sortedMonthKeys = useMemo(() => {
    return Object.keys(groupedBookings).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      
      if (filter === 'active') {
        return dateA.getTime() - dateB.getTime();
      }
      return dateB.getTime() - dateA.getTime();
    });
  }, [groupedBookings, filter]);

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden relative">
      {/* Ultra-Density Header */}
      <div className="sticky top-0 z-20 bg-warm-beige/95 backdrop-blur-md pt-2 pb-3 -mx-4 px-4 border-b border-pebble/10">
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-black text-bark tracking-tight leading-none">Bookings</h1>
            <p className="text-[9px] font-black text-bark-light/40 uppercase tracking-[0.2em] mt-1.5">
              {filteredBookings.length} {getStatusLabel(filter)}
            </p>
          </div>
          
          {/* Top-Right Mini Filters */}
          <div className="flex rounded-full bg-pebble/10 p-0.5 shadow-inner mt-1">
            {bookingStatusOptions.map((status) => (
              <button
                key={status}
                type="button"
                className={`py-1 px-2 rounded-full text-[7.5px] font-black uppercase tracking-widest transition-all ${
                  filter === status
                    ? 'bg-white text-sage shadow-sm scale-[1.05]'
                    : 'text-bark-light/40 hover:text-bark'
                }`}
                onClick={() => setFilter(status)}
              >
                {getStatusLabel(status)}
              </button>
            ))}
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
                      <Card
                        key={booking.id}
                        className="p-3 border border-pebble/5"
                        pressable
                        onClick={() => navigate(`/bookings/${booking.id}`)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative shrink-0">
                            <DogAvatar name={booking.dog?.name ?? 'Dog'} src={booking.dog?.photo_url} size="md" />
                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm ${booking.type === 'daycare' ? 'bg-sky' : 'bg-sage'}`}>
                              {booking.type === 'daycare' ? <Sun size={10} weight="fill" className="text-white" /> : <Moon size={10} weight="fill" className="text-white" />}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="font-black text-bark truncate text-sm leading-tight mb-1">
                                {booking.dog?.name ?? 'Unknown'}
                              </h3>
                              <p className="text-[10px] font-black text-bark/70 uppercase tracking-tighter">
                                {formatBookingRange(booking)}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-black text-terracotta leading-none mb-1.5">
                                {formatCurrency(booking.total_amount)}
                              </p>
                              <span className="text-[8px] font-black bg-sage/10 text-sage px-2 py-0.5 rounded-full shadow-sm border border-sage/5 tracking-widest">
                                {booking.days.length} DAYS
                              </span>
                            </div>
                          </div>
                          <CaretRight size={14} weight="bold" className="text-pebble/30 shrink-0 ml-1" />
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
        ) : (
          <div className="mt-8">
            <EmptyState
              title={searchQuery ? "No matches found" : `No ${getStatusLabel(filter).toLowerCase()} bookings`}
              description={searchQuery ? "Try a different dog or owner name." : "Tap the + button to create a booking."}
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
