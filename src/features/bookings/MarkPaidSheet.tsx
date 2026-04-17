import { useState, useMemo } from 'react';
import { SlideUpSheet } from '@/components/ui/SlideUpSheet';
import { useToast } from '@/components/ui/useToast';
import { useCloseBooking } from '@/hooks/useBookings';
import { type BookingRecord } from '@/lib/bookingService';
import { type Tables } from '@/types/database';
import { parsePaymentMethodsJson } from '@/lib/paymentUtils';
import { InvoicePreview } from '@/features/invoice/InvoicePreview';
import { buildBookingInvoiceInput } from '@/features/invoice/invoiceHelpers';
import { parseInvoiceOverrides } from '@/lib/invoiceGenerator';
import { CaretDown, CaretRight } from '@phosphor-icons/react';

function restrictDecimals(e: React.FormEvent<HTMLInputElement>) {
  const input = e.currentTarget;
  const val = input.value;
  const dotIdx = val.indexOf('.');
  if (dotIdx !== -1 && val.length - dotIdx > 3) {
    input.value = val.substring(0, dotIdx + 3);
  }
}

interface MarkPaidSheetProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingRecord;
  profile: Tables<'profiles'> | null | undefined;
  onSuccess?: () => void;
}

export function MarkPaidSheet({ isOpen, onClose, booking, profile, onSuccess }: MarkPaidSheetProps) {
  const { mutateAsync: closeBooking, isPending } = useCloseBooking();
  const { addToast } = useToast();

  const [tipAmount, setTipAmount] = useState<number>(0);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');

  const overrides = useMemo(() => parseInvoiceOverrides(booking.invoice_overrides), [booking.invoice_overrides]);

  const paymentMethods = useMemo(() => {
    const methods: { type: string; handle?: string; label: string }[] = [
      { type: 'cash', label: 'Cash' },
    ];
    if (profile?.payment_instructions) {
      const parsed = parsePaymentMethodsJson(profile.payment_instructions);
      if (parsed) {
        parsed.forEach(m => {
          methods.push({
            type: m.type,
            handle: m.handle,
            label: m.type.charAt(0).toUpperCase() + m.type.slice(1)
          });
        });
      }
    }
    return methods;
  }, [profile?.payment_instructions]);

  const handleMarkPaid = async () => {
    if (!selectedMethod) return;
    try {
      await closeBooking({
        id: booking.id,
        input: {
          tipAmount: tipAmount,
          paymentMethod: selectedMethod,
          paymentNotes: notes || null,
        },
      });
      addToast('Booking marked as paid', 'success');
      if (onSuccess) {
        onSuccess();
      } else {
        onClose();
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to mark as paid', 'error');
    }
  };

  const invoiceInput = buildBookingInvoiceInput(booking, profile, {
    tipAmount,
    paymentNotes: notes,
    lineItems: overrides?.lineItems,
    adjustments: overrides?.adjustments,
    creditAmount: overrides?.creditAmount,
    documentLabel: 'Invoice',
    isPaid: false,
    selectedPaymentMethod: selectedMethod,
  });

  return (
    <SlideUpSheet isOpen={isOpen} onClose={onClose} title="Mark as Paid">
      <div className="space-y-4 pb-4">
        <InvoicePreview 
          invoice={invoiceInput} 
          downloadName={`invoice-${booking.id}.png`} 
        />

        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-wider text-bark-light">
            Tip received
          </label>
          <div className="relative">
            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-xs font-black text-bark-light">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={tipAmount === 0 ? '' : tipAmount}
              onChange={(e) => setTipAmount(parseFloat(e.target.value) || 0)}
              onInput={restrictDecimals}
              className="form-input h-[44px] pl-8 text-right pr-4"
              placeholder="0.00"
              onFocus={(e) => e.target.select()}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-wider text-bark-light">
            Payment Method
          </label>
          <div className="flex flex-wrap gap-2">
            {paymentMethods.map(method => {
              return (
                <button
                  key={method.type}
                  type="button"
                  onClick={() => setSelectedMethod(method.type)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all ${
                    selectedMethod === method.type 
                      ? 'bg-sage text-white shadow-md shadow-sage/20 border-sage' 
                      : 'bg-white border border-pebble/60 text-bark-light hover:border-pebble hover:text-bark'
                  }`}
                >
                  {method.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <button
            type="button"
            className="flex items-center gap-1.5 text-[13px] font-bold text-sage-dark active:scale-95 transition-transform"
            onClick={() => setNotesOpen(!notesOpen)}
          >
            {notesOpen ? <CaretDown size={14} weight="bold" /> : <CaretRight size={14} weight="bold" />}
            Add payment note
          </button>
          
          {notesOpen && (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="form-input min-h-[80px]"
              placeholder="Notes to include on the receipt..."
            />
          )}
        </div>

        <button
          className="btn-danger w-full min-h-[54px] mt-2"
          onClick={handleMarkPaid}
          disabled={isPending || !selectedMethod}
        >
          {isPending ? 'Saving...' : 'Mark as Paid'}
        </button>
      </div>
    </SlideUpSheet>
  );
}
