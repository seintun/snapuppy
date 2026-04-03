import { format } from 'date-fns';
import type { BookingRecord, BookingStatus } from '@/lib/bookingService';

export const bookingStatusOptions: BookingStatus[] = ['active', 'completed', 'cancelled'];

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatBookingRange(
  booking: Pick<BookingRecord, 'start_date' | 'end_date' | 'type'>,
): string {
  const start = new Date(`${booking.start_date}T00:00:00`);
  const end = new Date(`${booking.end_date}T00:00:00`);

  if (booking.type === 'daycare') {
    return `${format(start, 'MMM d, yyyy')} · Daycare`;
  }

  return `${format(start, 'MMM d')} → ${format(end, 'MMM d, yyyy')}`;
}

export function formatBookingDay(date: string): string {
  return format(new Date(`${date}T00:00:00`), 'EEE, MMM d');
}

export function getStatusLabel(status: BookingStatus): string {
  if (status === 'completed') return 'Completed';
  if (status === 'cancelled') return 'Cancelled';
  return 'Active';
}

export function getStatusVariant(status: BookingStatus): 'sage' | 'sky' | 'terracotta' {
  if (status === 'completed') return 'sky';
  if (status === 'cancelled') return 'terracotta';
  return 'sage';
}
