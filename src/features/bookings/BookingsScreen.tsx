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

  const { bookings, loading, error } = useBookings();
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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>
            Bookings
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--bark-light)' }}>
            Track upcoming stays and adjust day-by-day pricing.
          </p>
        </div>

        <button className="btn-secondary" type="button" onClick={() => setIsCreateOpen(true)}>
          + Add booking
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
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

      {loading ? <p>Loading bookings...</p> : null}
      {!loading && error ? <p style={{ color: 'var(--terracotta)' }}>{error}</p> : null}

      {!loading && !error ? (
        filteredBookings.length ? (
          <div
            ref={containerRef}
            onScroll={onScroll}
            style={{ height: '100%', overflow: 'auto', contain: 'strict' }}
          >
            <div style={{ height: totalHeight, position: 'relative' }}>
              {virtualItems.map(({ item: booking, offsetTop }) => (
                <div
                  key={booking.id}
                  style={{
                    position: 'absolute',
                    top: offsetTop,
                    left: 0,
                    right: 0,
                    height: ITEM_HEIGHT,
                  }}
                >
                  <Card
                    className="p-4"
                    pressable
                    onClick={() => navigate(`/bookings/${booking.id}`)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <DogAvatar
                        name={booking.dog?.name ?? 'Dog'}
                        src={booking.dog?.photo_url}
                        size="md"
                      />

                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 12,
                            alignItems: 'center',
                          }}
                        >
                          <strong>{booking.dog?.name ?? 'Unknown dog'}</strong>
                          <Badge variant={getStatusVariant(booking.status)}>
                            {getStatusLabel(booking.status)}
                          </Badge>
                        </div>

                        <p style={{ margin: '4px 0 0', color: 'var(--bark-light)', fontSize: 14 }}>
                          {formatBookingRange(booking)}
                        </p>
                        <p style={{ margin: '4px 0 0', fontSize: 14 }}>
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
