import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { DogAvatar } from '@/components/ui/DogAvatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { useBookings } from '@/hooks/useBookings';
import { CreateBookingSheet } from './CreateBookingSheet';
import type { BookingStatus } from '@/lib/bookingService';

const FILTER_TABS: { label: string; value: BookingStatus }[] = [
  { label: '🐾 Active', value: 'active' },
  { label: '✅ Completed', value: 'completed' },
  { label: '✖ Cancelled', value: 'cancelled' },
];

export function BookingsListScreen() {
  const { bookings, loading, error } = useBookings();
  const [filter, setFilter] = useState<BookingStatus>('active');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const filtered = bookings.filter((b) => b.status === filter);

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 16px 16px' }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: 'var(--bark)', letterSpacing: '-0.03em' }}>
          Bookings
        </h1>
        <button id="bookings-new-btn" onClick={() => setIsCreateOpen(true)} className="btn-sage" style={{ padding: '8px 16px', fontSize: 13 }}>
          + New
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, padding: '0 16px 16px', overflowX: 'auto' }}>
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            id={`bookings-filter-${tab.value}`}
            onClick={() => setFilter(tab.value)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 14px', borderRadius: 99, border: 'none',
              fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
              background: filter === tab.value ? 'var(--sage)' : 'var(--cream)',
              color: filter === tab.value ? 'white' : 'var(--bark-light)',
              transition: 'all 150ms ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '0 16px' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--bark-light)', fontSize: 13 }}>
            Loading bookings…
          </div>
        ) : error ? (
          <p style={{ color: 'var(--terracotta)', fontSize: 13 }}>{error}</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={`No ${filter} bookings`}
            description={filter === 'active' ? 'Tap + New to schedule a dog sitting session!' : `${filter.charAt(0).toUpperCase() + filter.slice(1)} bookings will appear here.`}
            actionLabel={filter === 'active' ? 'New Booking' : undefined}
            onAction={filter === 'active' ? () => setIsCreateOpen(true) : undefined}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((booking) => {
              const dog = booking.dog;
              const statusColors: Record<string, string> = {
                active: 'var(--sage)', completed: 'var(--bark-light)', cancelled: 'var(--terracotta)',
              };

              return (
                <Link
                  key={booking.id}
                  to={`/bookings/${booking.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: 'var(--cream)', borderRadius: 14, padding: '12px 14px',
                    textDecoration: 'none', boxShadow: '0 2px 8px rgba(74,55,40,0.08)',
                    transition: 'transform 120ms ease',
                  }}
                >
                  {dog ? (
                    <DogAvatar name={dog.name} photoUrl={dog.photo_url} size="md" />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: 999, background: 'var(--sage-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🐶</div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--bark)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {dog?.name ?? 'Unknown Dog'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--bark-light)' }}>
                      {format(parseISO(booking.start_date), 'MMM d')} → {format(parseISO(booking.end_date), 'MMM d, yyyy')}
                    </div>
                    <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', background: 'var(--sage-light)', color: 'var(--sage)', borderRadius: 99, padding: '2px 7px' }}>
                        {booking.type}
                      </span>
                      {booking.is_holiday && (
                        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', background: 'var(--blush)', color: 'var(--terracotta)', borderRadius: 99, padding: '2px 7px' }}>
                          Holiday
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--terracotta)', letterSpacing: '-0.03em' }}>
                      ${booking.total_amount.toFixed(2)}
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: statusColors[booking.status] ?? 'var(--bark-light)' }}>
                      ● {booking.status}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <CreateBookingSheet
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => setIsCreateOpen(false)}
      />
    </div>
  );
}
