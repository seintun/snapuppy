import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { DogAvatar } from '@/components/ui/DogAvatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { type BookingStatus } from '@/lib/bookingService';
import { useBookings } from '@/hooks/useBookings';
import { BookingCreateSheet } from './BookingCreateSheet';
import { BookingDetailSheet } from './BookingDetailSheet';
import {
  bookingStatusOptions,
  formatBookingRange,
  formatCurrency,
  getStatusLabel,
  getStatusVariant,
} from './bookingUi';

export function BookingsScreen() {
  const {
    bookings,
    dogs,
    profile,
    loading,
    error,
    createBooking,
    saveBookingDays,
    updateBookingStatus,
    deleteBooking,
  } = useBookings();
  const [filter, setFilter] = useState<BookingStatus>('active');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const filteredBookings = useMemo(
    () => bookings.filter((booking) => booking.status === filter),
    [bookings, filter],
  );

  const selectedBooking = useMemo(
    () => bookings.find((booking) => booking.id === selectedBookingId) ?? null,
    [bookings, selectedBookingId],
  );

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredBookings.map((booking) => (
              <Card
                key={booking.id}
                className="p-4"
                pressable
                onClick={() => setSelectedBookingId(booking.id)}
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
            ))}
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

      <BookingCreateSheet
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        dogs={dogs}
        profile={profile}
        onCreate={createBooking}
      />

      <BookingDetailSheet
        booking={selectedBooking}
        isOpen={Boolean(selectedBooking)}
        onClose={() => setSelectedBookingId(null)}
        profile={profile}
        onSaveDays={saveBookingDays}
        onUpdateStatus={updateBookingStatus}
        onDelete={deleteBooking}
      />
    </>
  );
}
