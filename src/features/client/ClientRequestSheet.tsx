import { useForm } from 'react-hook-form';
import { SlideUpSheet } from '@/components/ui/SlideUpSheet';
import { useClientBooking } from '@/hooks/useClientBooking';

interface ClientRequestSheetProps {
  isOpen: boolean;
  onClose: () => void;
  sitterId: string;
  dogId: string;
}

interface ClientRequestValues {
  startDate: string;
  endDate: string;
  notes: string;
}

export function ClientRequestSheet({ isOpen, onClose, sitterId, dogId }: ClientRequestSheetProps) {
  const { mutateAsync: createBooking, isPending } = useClientBooking();
  const { register, handleSubmit, reset } = useForm<ClientRequestValues>({
    defaultValues: {
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      notes: '',
    },
  });

  const submit = handleSubmit(async (values) => {
    await createBooking({
      sitterId,
      dogId,
      startDate: values.startDate,
      endDate: values.endDate,
    });
    reset();
    onClose();
  });

  return (
    <SlideUpSheet isOpen={isOpen} onClose={onClose} title="Request Booking">
      <form onSubmit={submit} className="space-y-3">
        <label className="form-label">
          Start date
          <input className="form-input mt-1" type="date" {...register('startDate', { required: true })} />
        </label>
        <label className="form-label">
          End date
          <input className="form-input mt-1" type="date" {...register('endDate', { required: true })} />
        </label>
        <label className="form-label">
          Special requests
          <textarea className="form-input mt-1" {...register('notes')} />
        </label>
        <button type="submit" className="btn-sage w-full" disabled={isPending}>
          {isPending ? 'Sending…' : 'Send Request'}
        </button>
      </form>
    </SlideUpSheet>
  );
}
