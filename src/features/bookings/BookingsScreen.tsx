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
import {
  bookingStatusOptions,
  formatBookingRange,
  formatCurrency,
  getStatusLabel,
  getStatusVariant,
} from './bookingUi';

const ITEM_HEIGHT = 90;

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
      <div className="flex justify-between items-center gap-3 mb-3">
        <div>
          <h1 className="page-title !m-0">Bookings</h1>
          <p className="m-0 mt-1 text-bark-light">
            Track upcoming stays and adjust day-by-day pricing.
          </p>
        </div>

        <button className="btn-secondary" type="button" onClick={() => setIsCreateOpen(true)}>
          + Add booking
        </button>
      </div>

      <div className="flex gap-2 mb-3 flex-wrap">
        {bookingStatusOptions.map((status) => (
          <button
            key={status}
            type="button"
            className={filter === status ? 'btn-sage' : 'btn-secondary'}
            onClick={() => setFilter(status)}
          >
            {getStatusLabel(status)}
          </button>
        ))}
      </div>

      {isLoading && !bookings.length ? <p className="text-bark-light">Loading bookings...</p> : null}
      {isError ? <p className="text-terracotta">{error instanceof Error ? error.message : 'Failed to load bookings'}</p> : null}

      {!isLoading && !isError ? (
        filteredBookings.length ? (
          <div
            ref={containerRef}
            onScroll={onScroll}
            className="h-full overflow-auto strict-contain"
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
                    className="p-4"
                    pressable
                    onClick={() => navigate(`/bookings/${booking.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <DogAvatar
                        name={booking.dog?.name ?? 'Dog'}
                        src={booking.dog?.photo_url}
                        size="md"
                      />

                      <div className="flex-1">
                        <div className="flex justify-between gap-3 items-center">
                          <strong>{booking.dog?.name ?? 'Unknown dog'}</strong>
                          <Badge variant={getStatusVariant(booking.status)}>
                            {getStatusLabel(booking.status)}
                          </Badge>
                        </div>

                        <p className="m-0 mt-1 text-sm text-bark-light">
                          {formatBookingRange(booking)}
                        </p>
                        <p className="m-0 mt-1 text-sm">
                          {booking.days.length} day{booking.days.length === 1 ? '' : 's'} ·{' '}
                          {formatCurrency(booking.total_amount)}
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
            description="Create a booking to populate your list."
            actionLabel="New Booking"
            onAction={() => setIsCreateOpen(true)}
          />
        )
      ) : null}

      <CreateBookingSheet isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </>
  );
}
