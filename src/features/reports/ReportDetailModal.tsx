import type { Tables } from '@/types/database';
import { SlideUpSheet } from '@/components/ui/SlideUpSheet';

type DailyReport = Tables<'daily_reports'>;

interface ReportDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: DailyReport | null;
}

export function ReportDetailModal({ isOpen, onClose, report }: ReportDetailModalProps) {
  return (
    <SlideUpSheet isOpen={isOpen} onClose={onClose} title="Report Details">
      {!report ? <p className="text-sm text-bark-light">No report selected.</p> : null}
      {report ? (
        <div className="space-y-2 text-sm text-bark">
          <p>Date: {report.date}</p>
          {report.notes ? <p>{report.notes}</p> : null}
          {report.behavior ? <p>Behavior: {report.behavior}</p> : null}
          {report.medications_given ? <p>Medications: {report.medications_given}</p> : null}
        </div>
      ) : null}
    </SlideUpSheet>
  );
}
