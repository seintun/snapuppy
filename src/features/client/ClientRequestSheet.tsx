import { useForm, useWatch } from 'react-hook-form';
import { SlideUpSheet } from '@/components/ui/SlideUpSheet';
import { useClientBooking } from '@/hooks/useClientBooking';
import { useRecurringPreview } from '@/hooks/useRecurring';

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
  recurring: boolean;
  repeatPattern: 'weekly' | 'biweekly' | 'monthly';
  repeatDays: string;
}

export function ClientRequestSheet({ isOpen, onClose, sitterId, dogId }: ClientRequestSheetProps) {
  const { mutateAsync: createBooking, isPending } = useClientBooking();
  const { register, handleSubmit, reset, control } = useForm<ClientRequestValues>({
    defaultValues: {
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      notes: '',
      recurring: false,
      repeatPattern: 'weekly',
      repeatDays: 'monday,wednesday',
    },
  });

  const recurring = useWatch({ control, name: 'recurring' });
  const repeatPattern = useWatch({ control, name: 'repeatPattern' });
  const repeatDays = useWatch({ control, name: 'repeatDays' });
  const startDate = useWatch({ control, name: 'startDate' });
  const recurringPreview = useRecurringPreview(
    recurring
      ? {
          startDate,
          repeatPattern: repeatPattern ?? 'weekly',
          repeatDays: (repeatDays ?? '')
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean) as Array<
            'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
          >,
          horizonMonths: 3,
        }
      : null,
  );

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
          <input
            className="form-input mt-1"
            type="date"
            {...register('startDate', { required: true })}
          />
        </label>
        <label className="form-label">
          End date
          <input
            className="form-input mt-1"
            type="date"
            {...register('endDate', { required: true })}
          />
        </label>
        <label className="form-label">
          Special requests
          <textarea className="form-input mt-1" {...register('notes')} />
        </label>
        <label className="flex items-center gap-2 text-sm text-bark">
          <input type="checkbox" {...register('recurring')} />
          Recurring request
        </label>
        <label className="form-label">
          Repeat pattern
          <select className="form-input mt-1" {...register('repeatPattern')}>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>
        <label className="form-label">
          Repeat days (comma separated)
          <input className="form-input mt-1" {...register('repeatDays')} />
        </label>
        {recurring ? (
          <p className="text-xs text-bark-light">
            Recurring preview: {recurringPreview.occurrences.length} bookings in next 3 months
          </p>
        ) : null}
        <button type="submit" className="btn-sage w-full" disabled={isPending}>
          {isPending ? 'Sending…' : 'Send Request'}
        </button>
      </form>
    </SlideUpSheet>
  );
}
