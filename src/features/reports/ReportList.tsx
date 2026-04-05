import { useMemo, useState } from 'react';
import type { Tables } from '@/types/database';
import { useDeleteReport, useReports } from '@/hooks/useReports';
import { ReportCard } from './ReportCard';
import { ReportSheet } from './ReportSheet';

type DailyReport = Tables<'daily_reports'>;

interface ReportListProps {
  bookingId: string;
  readOnly?: boolean;
}

export function ReportList({ bookingId, readOnly = false }: ReportListProps) {
  const { data: reports = [], isLoading } = useReports(bookingId);
  const { mutateAsync: deleteReport, isPending } = useDeleteReport(bookingId);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selected, setSelected] = useState<DailyReport | null>(null);

  const sortedReports = useMemo(
    () => [...reports].sort((left, right) => right.date.localeCompare(left.date)),
    [reports],
  );

  return (
    <section className="space-y-3">
      {!readOnly ? (
        <button
          type="button"
          className="btn-sage w-full"
          onClick={() => {
            setSelected(null);
            setSheetOpen(true);
          }}
        >
          Add Report
        </button>
      ) : null}

      {isLoading ? <p className="text-xs text-bark-light">Loading reports…</p> : null}

      {sortedReports.length === 0 && !isLoading ? (
        <p className="text-sm text-bark-light">No reports yet.</p>
      ) : null}

      {sortedReports.map((report) => (
        <ReportCard
          key={report.id}
          report={report}
          readOnly={readOnly}
          onEdit={(item) => {
            setSelected(item);
            setSheetOpen(true);
          }}
          onDelete={(reportId) => {
            void deleteReport(reportId);
          }}
        />
      ))}

      {!readOnly ? (
        <ReportSheet
          isOpen={sheetOpen}
          onClose={() => setSheetOpen(false)}
          bookingId={bookingId}
          report={selected}
        />
      ) : null}

      {isPending ? <p className="text-xs text-bark-light">Updating report…</p> : null}
    </section>
  );
}
