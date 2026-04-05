import type { Tables } from '@/types/database';
import { format } from 'date-fns';

type DailyReport = Tables<'daily_reports'>;

interface ReportCardProps {
  report: DailyReport;
  onEdit?: (report: DailyReport) => void;
  onDelete?: (reportId: string) => void;
  readOnly?: boolean;
}

export function ReportCard({ report, onEdit, onDelete, readOnly = false }: ReportCardProps) {
  return (
    <article className="surface-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-bark">{format(new Date(report.date), 'EEE, MMM d')}</h4>
          {report.potty_status ? (
            <p className="text-xs text-bark-light mt-0.5 capitalize">Potty: {report.potty_status}</p>
          ) : null}
        </div>
        {!readOnly ? (
          <div className="flex gap-2">
            <button type="button" className="btn-sage !px-3 !py-1.5 !text-xs" onClick={() => onEdit?.(report)}>
              Edit
            </button>
            <button
              type="button"
              className="btn-danger !px-3 !py-1.5 !text-xs"
              onClick={() => onDelete?.(report.id)}
            >
              Delete
            </button>
          </div>
        ) : null}
      </div>
      {report.notes ? <p className="text-sm text-bark mt-2 whitespace-pre-wrap">{report.notes}</p> : null}
      {report.photos?.length ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {report.photos.map((photo) => (
            <img
              key={photo}
              src={photo}
              alt="Daily report"
              className="h-20 w-full rounded-lg object-cover border border-pebble/40"
              loading="lazy"
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}
