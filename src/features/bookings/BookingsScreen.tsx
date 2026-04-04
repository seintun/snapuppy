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
    <>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="page-title !mb-1">Bookings</h1>
            <p className="text-sm text-bark-light">
              {filteredBookings.length} {getStatusLabel(filter).toLowerCase()} booking{filteredBookings.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="relative mb-4">
          <MagnifyingGlass 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-bark-light" 
            size={18} 
            weight="bold"
          />
          <input
            type="text"
            placeholder="Search dog or owner..."
            className="form-input !pl-10 !py-2.5 !text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 flex rounded-xl bg-cream border border-pebble p-1 shadow-sm">
            {bookingStatusOptions.map((status) => (
              <button
                key={status}
                type="button"
                className={`flex-1 py-2 px-1 rounded-lg text-xs font-bold transition-all ${
                  filter === status
                    ? 'bg-sage text-white shadow-sm'
                    : 'text-bark-light hover:text-bark'
                }`}
                onClick={() => setFilter(status)}
              >
                {getStatusLabel(status)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading && !bookings.length ? (
        <div className="flex flex-col items-center justify-center h-[40vh] text-sm text-bark-light">
          Loading bookings…
        </div>
      ) : null}
      
      {isError ? (
        <div className="p-6 text-center text-terracotta font-semibold">
          {error instanceof Error ? error.message : 'Failed to load bookings'}
        </div>
      ) : null}

      {!isLoading && !isError ? (
        filteredBookings.length ? (
          <div className="space-y-6 -mx-4 px-4">
            {sortedMonthKeys.map((monthYear) => (
              <div key={monthYear}>
                <h2 className="text-xs font-extrabold uppercase tracking-[0.1em] text-bark-light/70 mb-3 px-1 flex items-center gap-2">
                  <Calendar size={14} weight="bold" />
                  {monthYear}
                </h2>
                <div className="grid gap-3">
                  {groupedBookings[monthYear].map((booking) => (
                    <Card
                      key={booking.id}
                      className="p-4"
                      pressable
                      onClick={() => navigate(`/bookings/${booking.id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <DogAvatar
                            name={booking.dog?.name ?? 'Dog'}
                            src={booking.dog?.photo_url}
                            size="lg"
                          />
                          <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-cream ${booking.type === 'daycare' ? 'bg-sky' : 'bg-sage'}`}>
                            {booking.type === 'daycare' ? (
                              <Sun size={12} weight="fill" className="text-white" />
                            ) : (
                              <Moon size={12} weight="fill" className="text-white" />
                            )}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <h3 className="font-extrabold text-bark truncate text-base leading-tight">
                                {booking.dog?.name ?? 'Unknown dog'}
                              </h3>
                              <p className="text-xs text-bark-light font-bold uppercase tracking-wide opacity-80 mt-0.5">
                                {booking.dog?.owner_name || 'No Owner'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-base font-extrabold text-terracotta leading-tight">
                                {formatCurrency(booking.total_amount)}
                              </p>
                              <p className="text-[10px] font-bold text-bark-light uppercase bg-pebble/30 px-1.5 py-0.5 rounded mt-1 inline-block">
                                {booking.days.length} day{booking.days.length === 1 ? '' : 's'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-pebble/40">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Calendar size={14} weight="bold" className="text-bark-light/60 flex-shrink-0" />
                              <span className="text-xs font-bold text-bark/80 truncate">
                                {formatBookingRange(booking)}
                              </span>
                            </div>
                            <CaretRight size={14} weight="bold" className="text-pebble flex-shrink-0" />
                          </div>
                        </div>
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

      <CreateBookingSheet isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      <AddButton onClick={() => setIsCreateOpen(true)} variant="booking" isActive={isCreateOpen} />
    </>
  );
}
