import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLoadingAnimation } from '@/components/ui/AppLoadingAnimation';
import { useBooking } from '@/hooks/useBookings';
import { useProfile } from '@/hooks/useProfile';
import { parseInvoiceOverrides } from '@/lib/invoiceGenerator';
import { buildBookingInvoiceInput } from './invoiceHelpers';
import { InvoicePreview } from './InvoicePreview';

export function BookingReceiptView() {
  const { bookingId = '' } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { data: booking, isLoading } = useBooking(bookingId);
  const { data: profile } = useProfile();

  useEffect(() => {
    if (isLoading || !booking) return;
    if (!booking.is_paid) {
      navigate(`/bookings/${booking.id}`, { replace: true });
    }
  }, [booking, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <AppLoadingAnimation size="md" label="Loading receipt..." />
      </div>
    );
  }

  if (!booking) {
    return <p className="p-4 text-sm text-terracotta">Receipt not found.</p>;
  }

  if (!booking.is_paid) {
    return null;
  }

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
        <h1 className="text-xl font-black text-bark">Receipt</h1>
        <p className="text-sm text-bark-light">PAID</p>
      </div>
      <InvoicePreview
        invoice={buildBookingInvoiceInput(booking, profile, {
          lineItems: overrides?.lineItems,
          creditAmount: overrides?.creditAmount,
          documentLabel: 'Receipt',
          isPaid: true,
        })}
        downloadName={`receipt-${booking.id}.png`}
      />
    </div>
  );
}
