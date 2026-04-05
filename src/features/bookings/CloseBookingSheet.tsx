import { useState } from 'react';
import { SlideUpSheet } from '@/components/ui/SlideUpSheet';
import { useToast } from '@/components/ui/useToast';
import { closeBooking, type BookingRecord } from '@/lib/bookingService';
import { formatCurrency } from '@/features/bookings/bookingUi';

const PAYMENT_METHODS = ['Cash', 'Venmo', 'CashApp', 'Zelle', 'Other'] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

interface CloseBookingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingRecord;
  sitterId: string;
  onSuccess?: () => void;
}

export function CloseBookingSheet({
  isOpen,
  onClose,
  booking,
  sitterId,
  onSuccess,
}: CloseBookingSheetProps) {
  const { addToast } = useToast();
  const [tip, setTip] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [otherMethod, setOtherMethod] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tipAmount = parseFloat(tip) || 0;
  const totalWithTip = booking.total_amount + tipAmount;

  const handleConfirm = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const paymentNotes = paymentMethod === 'Other' ? otherMethod : paymentMethod;

      await closeBooking({
        bookingId: booking.id,
        sitterId,
        tipAmount,
        paymentNotes,
      });

      addToast('Booking completed and marked as paid', 'success');
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error('Failed to close booking:', error);
      addToast('Failed to close booking', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTip('');
    setPaymentMethod('Cash');
    setOtherMethod('');
    onClose();
  };

  return (
    <SlideUpSheet isOpen={isOpen} onClose={handleClose} title="Close Booking">
      <div className="sheet__content">
        <div className="space-y-4">
          <div className="surface-card p-4 rounded-lg">
            <p className="text-sm text-bark/60 mb-1">Booking Total</p>
            <p className="text-xl font-semibold text-bark">
              {formatCurrency(booking.total_amount)}
            </p>
          </div>

          <div>
            <label htmlFor="tip" className="block text-sm font-medium text-bark mb-2">
              Tip (optional)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-bark/50">$</span>
              <input
                id="tip"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={tip}
                onChange={(e) => setTip(e.target.value)}
                className="form-input pl-7 w-full"
              />
            </div>
          </div>

          <div>
            <label htmlFor="paymentMethod" className="block text-sm font-medium text-bark mb-2">
              Payment Method
            </label>
            <select
              id="paymentMethod"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="form-input w-full"
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>

          {paymentMethod === 'Other' && (
            <div>
              <label htmlFor="otherMethod" className="block text-sm font-medium text-bark mb-2">
                Specify Payment Method
              </label>
              <input
                id="otherMethod"
                type="text"
                placeholder="e.g., Check, PayPal"
                value={otherMethod}
                onChange={(e) => setOtherMethod(e.target.value)}
                className="form-input w-full"
              />
            </div>
          )}

          <div className="surface-card p-4 rounded-lg bg-sage/10 border border-sage/30">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-bark">Total with Tip</span>
              <span className="text-xl font-bold text-sage">{formatCurrency(totalWithTip)}</span>
            </div>
          </div>

          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="btn-sage w-full py-3 text-base font-semibold disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Complete Booking'}
          </button>
        </div>
      </div>
    </SlideUpSheet>
  );
}
