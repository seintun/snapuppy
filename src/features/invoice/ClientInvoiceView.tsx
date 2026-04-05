import { useParams } from 'react-router-dom';
import { useBooking } from '@/hooks/useBookings';
import { InvoicePreview } from './InvoicePreview';

export function ClientInvoiceView() {
  const { bookingId = '' } = useParams<{ bookingId: string }>();
  const { data: booking, isLoading } = useBooking(bookingId);

  if (isLoading) return <p className="p-4 text-sm text-bark-light">Loading invoice…</p>;
  if (!booking) return <p className="p-4 text-sm text-terracotta">Invoice not found.</p>;

  return (
    <div className="min-h-dvh bg-warm-beige p-4">
      <div className="mb-3">
        <h1 className="text-xl font-black text-bark">Invoice</h1>
        <p className="text-sm text-bark-light">{booking.is_paid ? 'PAID' : 'Payment Due'}</p>
      </div>
      <InvoicePreview
        bookingId={booking.id}
        invoice={{
          sitterName: 'Snapuppy Sitter',
          clientName: booking.dog?.owner_name ?? 'Client',
          dogName: booking.dog?.name ?? 'Dog',
          startDate: booking.start_date,
          endDate: booking.end_date,
          subtotal: booking.total_amount,
          tipAmount: booking.tip_amount ?? 0,
          paymentNotes: booking.payment_notes,
          isPaid: booking.is_paid ?? false,
        }}
      />
    </div>
  );
}
