import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CaretLeft } from '@phosphor-icons/react';
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
    <div className="min-h-dvh bg-warm-beige p-4 pt-2">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-bark/5 text-bark/50 transition-all hover:bg-bark/10 hover:text-bark active:scale-90"
          aria-label="Go Back"
        >
          <CaretLeft size={20} weight="bold" />
        </button>
        <div className="text-right">
          <h1 className="text-base font-black text-bark leading-none">Receipt</h1>
          <p className="text-[11px] font-bold text-bark-light uppercase tracking-widest leading-tight">PAID</p>
        </div>
      </div>
      <InvoicePreview
        invoice={buildBookingInvoiceInput(booking, profile, {
          lineItems: overrides?.lineItems,
          adjustments: overrides?.adjustments,
          creditAmount: overrides?.creditAmount,
          documentLabel: 'Receipt',
          isPaid: true,
        })}
        downloadName={`receipt-${booking.id}.png`}
      />
    </div>
  );
}
