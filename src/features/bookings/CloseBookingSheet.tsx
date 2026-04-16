import { useForm } from 'react-hook-form';
import { SlideUpSheet } from '@/components/ui/SlideUpSheet';
import { useCloseBooking } from '@/hooks/useBookings';

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
  const { mutateAsync: closeBooking, isPending } = useCloseBooking();
  const { register, handleSubmit, formState } = useForm<CloseBookingValues>({
    defaultValues: {
      tipAmount: 0,
      paymentNotes: '',
    },
  });

  const submit = handleSubmit(async (values) => {
    await closeBooking({
      id: bookingId,
      input: {
        tipAmount: values.tipAmount,
        paymentNotes: values.paymentNotes,
      },
    });
    onClose();
  });

  return (
    <SlideUpSheet isOpen={isOpen} onClose={onClose} title="Mark as Paid">
      <form className="space-y-3" onSubmit={submit}>
        <label className="form-label">
          Tip amount
          <input className="form-input mt-1" type="number" step="0.01" {...register('tipAmount', { valueAsNumber: true })} />
        </label>
        <label className="form-label">
          Payment notes
          <textarea className="form-input mt-1" {...register('paymentNotes')} />
        </label>
        <button className="btn-sage w-full" type="submit" disabled={formState.isSubmitting || isPending}>
          {formState.isSubmitting || isPending ? 'Saving…' : 'Mark as Paid'}
        </button>
      </form>
    </SlideUpSheet>
  );
}
