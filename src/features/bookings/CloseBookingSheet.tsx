import { useForm } from 'react-hook-form';
import { SlideUpSheet } from '@/components/ui/SlideUpSheet';
import { buildPaymentCloseUpdate } from '@/lib/bookingService';
import { supabase } from '@/lib/supabase';

interface CloseBookingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
}

interface CloseBookingValues {
  tipAmount: number;
  paymentNotes: string;
}

export function CloseBookingSheet({ isOpen, onClose, bookingId }: CloseBookingSheetProps) {
  const { register, handleSubmit, formState } = useForm<CloseBookingValues>({
    defaultValues: {
      tipAmount: 0,
      paymentNotes: '',
    },
  });

  const submit = handleSubmit(async (values) => {
    const payload = buildPaymentCloseUpdate({
      tipAmount: values.tipAmount,
      paymentNotes: values.paymentNotes,
    });

    const { error } = await supabase.from('bookings').update(payload).eq('id', bookingId);
    if (error) throw error;
    onClose();
  });

  return (
    <SlideUpSheet isOpen={isOpen} onClose={onClose} title="Close Booking">
      <form className="space-y-3" onSubmit={submit}>
        <label className="form-label">
          Tip amount
          <input className="form-input mt-1" type="number" step="0.01" {...register('tipAmount', { valueAsNumber: true })} />
        </label>
        <label className="form-label">
          Payment notes
          <textarea className="form-input mt-1" {...register('paymentNotes')} />
        </label>
        <button className="btn-sage w-full" type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? 'Closing…' : 'Mark as Paid'}
        </button>
      </form>
    </SlideUpSheet>
  );
}
