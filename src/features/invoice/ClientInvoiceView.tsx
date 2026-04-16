import { useNavigate, useParams } from 'react-router-dom';
import { AppLoadingAnimation } from '@/components/ui/AppLoadingAnimation';
import { useBooking } from '@/hooks/useBookings';
import { parseInvoiceOverrides } from '@/lib/invoiceGenerator';
import { InvoicePreview } from './InvoicePreview';

export function ClientInvoiceView() {
  const { bookingId = '' } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { data: booking, isLoading } = useBooking(bookingId);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <AppLoadingAnimation size="md" label="Loading invoice..." />
      </div>
    );
  }
  if (!booking) return <p className="p-4 text-sm text-terracotta">Invoice not found.</p>;

  const overrides = parseInvoiceOverrides(booking.invoice_overrides);

  return (
    <div className="min-h-dvh bg-warm-beige p-4">
      <div className="mb-3">
        <button
          type="button"
          className="btn-secondary mb-3"
          onClick={() => navigate(`/bookings/${booking.id}`)}
        >
          Back to Booking
        </button>
        <h1 className="text-xl font-black text-bark">Invoice</h1>
        <p className="text-sm text-bark-light">{booking.is_paid ? 'PAID' : 'Payment Due'}</p>
      </div>
      <InvoicePreview
        invoice={{
          sitterName: 'Snapuppy Sitter',
          clientName: booking.dog?.owner_name ?? 'Client',
          dogName: booking.dog?.name ?? 'Dog',
          startDate: booking.start_date,
          endDate: booking.end_date,
          subtotal: booking.total_amount,
          lineItems: overrides?.lineItems,
          creditAmount: overrides?.creditAmount,
          tipAmount: 0,
          paymentNotes: booking.payment_notes,
          documentLabel: 'Invoice',
          isPaid: booking.is_paid ?? false,
        }}
        downloadName={`invoice-${booking.id}.png`}
      />
    </div>
  );
}
