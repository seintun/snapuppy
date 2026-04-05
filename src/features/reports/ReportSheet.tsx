import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { SlideUpSheet } from '@/components/ui/SlideUpSheet';
import { useSaveReport } from '@/hooks/useReports';
import type { SaveDailyReportInput } from '@/lib/reportService';
import type { Tables } from '@/types/database';

type DailyReport = Tables<'daily_reports'>;

interface ReportSheetProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  report?: DailyReport | null;
}

interface ReportFormValues {
  date: string;
  notes: string;
  pottyStatus: '' | 'good' | 'accident' | 'none_out';
  mealsGiven: string;
  behavior: string;
  medicationsGiven: string;
}

export function ReportSheet({ isOpen, onClose, bookingId, report }: ReportSheetProps) {
  const { mutateAsync: saveReport, isPending } = useSaveReport(bookingId);
  const { register, handleSubmit, reset } = useForm<ReportFormValues>({
    defaultValues: {
      date: report?.date ?? new Date().toISOString().slice(0, 10),
      notes: report?.notes ?? '',
      pottyStatus: (report?.potty_status as ReportFormValues['pottyStatus']) ?? '',
      mealsGiven: report?.meals_given?.join(', ') ?? '',
      behavior: report?.behavior ?? '',
      medicationsGiven: report?.medications_given ?? '',
    },
  });

  useEffect(() => {
    reset({
      date: report?.date ?? new Date().toISOString().slice(0, 10),
      notes: report?.notes ?? '',
      pottyStatus: (report?.potty_status as ReportFormValues['pottyStatus']) ?? '',
      mealsGiven: report?.meals_given?.join(', ') ?? '',
      behavior: report?.behavior ?? '',
      medicationsGiven: report?.medications_given ?? '',
    });
  }, [report, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const payload: SaveDailyReportInput = {
      id: report?.id,
      bookingId,
      date: values.date,
      notes: values.notes,
      pottyStatus: values.pottyStatus || null,
      mealsGiven: values.mealsGiven
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      behavior: values.behavior,
      medicationsGiven: values.medicationsGiven,
      existingPhotos: report?.photos ?? [],
      newPhotos: [],
    };

    await saveReport(payload);
    onClose();
  });

  return (
    <SlideUpSheet isOpen={isOpen} onClose={onClose} title={report ? 'Edit Daily Report' : 'Add Daily Report'}>
      <form className="space-y-3 pb-2" onSubmit={onSubmit}>
        <label className="form-label">
          Date
          <input type="date" className="form-input mt-1" {...register('date', { required: true })} />
        </label>

        <label className="form-label">
          Notes
          <textarea className="form-input mt-1 min-h-[84px]" {...register('notes')} />
        </label>

        <label className="form-label">
          Potty Status
          <select className="form-input mt-1" {...register('pottyStatus')}>
            <option value="">Select status</option>
            <option value="good">Good</option>
            <option value="accident">Accident</option>
            <option value="none_out">None out</option>
          </select>
        </label>

        <label className="form-label">
          Meals Given (comma separated)
          <input className="form-input mt-1" {...register('mealsGiven')} />
        </label>

        <label className="form-label">
          Behavior
          <input className="form-input mt-1" {...register('behavior')} />
        </label>

        <label className="form-label">
          Medications
          <input className="form-input mt-1" {...register('medicationsGiven')} />
        </label>

        <button type="submit" className="btn-sage w-full" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save Report'}
        </button>
      </form>
    </SlideUpSheet>
  );
}
