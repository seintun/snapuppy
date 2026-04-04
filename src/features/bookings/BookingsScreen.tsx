import { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { DogAvatar } from '@/components/ui/DogAvatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { type BookingStatus } from '@/lib/bookingService';
import { useBookings } from '@/hooks/useBookings';
import { useVirtualList } from '@/hooks/useVirtualList';
import { CreateBookingSheet } from './CreateBookingSheet';
import { Fab } from '@/components/layout/FAB';
import {
  bookingStatusOptions,
  formatBookingRange,
  formatCurrency,
  getStatusLabel,
  getStatusVariant,
} from './bookingUi';

const ITEM_HEIGHT = 88;

export function BookingsScreen() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(400);
  const navigate = useNavigate();

  const { data: bookings = [], isLoading, isError, error } = useBookings();
  const [filter, setFilter] = useState<BookingStatus>('active');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const filteredBookings = useMemo(
    () => bookings.filter((booking) => booking.status === filter),
    [bookings, filter],
  );

  const { virtualItems, totalHeight, onScroll } = useVirtualList({
    items: filteredBookings,
    itemHeight: ITEM_HEIGHT,
    overscan: 3,
    containerHeight,
  });

  return (
    <>
      <div className="mb-4">
        <h1 className="page-title !mb-2">Bookings</h1>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 flex rounded-xl bg-cream border border-pebble p-1">
            {bookingStatusOptions.map((status) => (
              <button
                key={status}
                type="button"
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
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
        <p className="text-bark-light text-center py-8">Loading bookings...</p>
      ) : null}
      {isError ? (
        <p className="text-terracotta text-center py-8">
          {error instanceof Error ? error.message : 'Failed to load bookings'}
        </p>
      ) : null}

      {!isLoading && !isError ? (
        filteredBookings.length ? (
          <div
            ref={containerRef}
            onScroll={onScroll}
            className="h-[calc(100vh-220px)] overflow-auto -mx-4 px-4"
          >
            <div className="relative" style={{ height: totalHeight }}>
              {virtualItems.map(({ item: booking, offsetTop }) => (
                <div
                  key={booking.id}
                  className="absolute left-0 right-0"
                  style={{
                    top: offsetTop,
                    height: ITEM_HEIGHT,
                  }}
                >
                  <Card
                    className="h-full px-4 py-3"
                    pressable
                    onClick={() => navigate(`/bookings/${booking.id}`)}
                  >
                    <div className="flex items-center gap-3 h-full">
                      <DogAvatar
                        name={booking.dog?.name ?? 'Dog'}
                        src={booking.dog?.photo_url}
                        size="lg"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center gap-2">
                          <span className="font-bold text-bark truncate">
                            {booking.dog?.name ?? 'Unknown dog'}
                          </span>
                          <Badge variant={getStatusVariant(booking.status)}>
                            {getStatusLabel(booking.status)}
                          </Badge>
                        </div>

                        <p className="text-xs text-bark-light mt-0.5 truncate">
                          {formatBookingRange(booking)}
                        </p>
                        <p className="text-sm font-semibold text-bark mt-1">
                          {booking.days.length} day{booking.days.length === 1 ? '' : 's'} ·{' '}
                          <span className="text-terracotta">
                            {formatCurrency(booking.total_amount)}
                          </span>
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            title={`No ${getStatusLabel(filter).toLowerCase()} bookings`}
            description="Tap the + button above to create your first booking."
          />
        )
      ) : null}

      <CreateBookingSheet isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      <Fab onClick={() => setIsCreateOpen(true)} />
    </>
  );
}
