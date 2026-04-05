import { SlideUpSheet } from '@/components/ui/SlideUpSheet';

interface RecurringSeriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPause: () => void;
  onCancel: () => void;
}

export function RecurringSeriesModal({
  isOpen,
  onClose,
  onPause,
  onCancel,
}: RecurringSeriesModalProps) {
  return (
    <SlideUpSheet isOpen={isOpen} onClose={onClose} title="Recurring Series">
      <div className="space-y-3">
        <p className="text-sm text-bark">Manage this recurring booking series.</p>
        <button type="button" className="btn-sage w-full" onClick={onPause}>
          Pause Series
        </button>
        <button type="button" className="btn-danger w-full" onClick={onCancel}>
          Cancel Series
        </button>
      </div>
    </SlideUpSheet>
  );
}
