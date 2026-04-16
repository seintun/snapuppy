import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingReceiptView } from '@/features/invoice/BookingReceiptView';
import { ClientInvoiceView } from '@/features/invoice/ClientInvoiceView';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ bookingId: 'booking-1' }),
  };
});

vi.mock('@/hooks/useBookings', () => ({
  useBooking: () => ({
    isLoading: false,
    data: {
      id: 'booking-1',
      is_paid: true,
      dog: { name: 'Ice', owner_name: 'Nina' },
      start_date: '2026-04-16',
      end_date: '2026-04-18',
      total_amount: 120,
      tip_amount: 10,
      payment_notes: null,
      invoice_overrides: null,
    },
  }),
}));

vi.mock('@/features/invoice/InvoicePreview', () => ({
  InvoicePreview: () => <div>Preview</div>,
}));

describe('invoice and receipt navigation', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('shows a back button on invoice view', async () => {
    render(<ClientInvoiceView />);
    await fireEvent.click(screen.getByRole('button', { name: /back to booking/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/bookings/booking-1');
  });

  it('shows a back button on receipt view', async () => {
    render(<BookingReceiptView />);
    await fireEvent.click(screen.getByRole('button', { name: /back to booking/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/bookings/booking-1');
  });
});
