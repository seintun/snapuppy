import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { useBookingReports } from '@/hooks/useReports';
import { CheckCircle, Warning, Clock } from '@phosphor-icons/react';

interface ReportListProps {
  bookingId: string;
  onEditReport: (reportId: string) => void;
  onViewReport: (reportId: string) => void;
}

export function ReportList({ bookingId, onEditReport, onViewReport }: ReportListProps) {
  const { data: reports = [], isLoading } = useBookingReports(bookingId);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, typeof reports> = {};
    reports.forEach((report) => {
      if (!groups[report.date]) {
        groups[report.date] = [];
      }
      groups[report.date].push(report);
    });
    return groups;
  }, [reports]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));
  }, [groupedByDate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-sage border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-bark-light text-sm">No daily reports yet</p>
        <p className="text-bark-light text-xs mt-1">Tap the + button to add a report</p>
      </div>
    );
  }

  const getPottyIcon = (status: string | null) => {
    if (status === 'good') return <CheckCircle size={16} weight="fill" className="text-sage" />;
    if (status === 'accident')
      return <Warning size={16} weight="fill" className="text-terracotta" />;
    return <Clock size={16} weight="fill" className="text-sky" />;
  };

  return (
    <div className="flex flex-col gap-3 pb-20">
      {sortedDates.map((date) => (
        <Card
          key={date}
          className="p-4"
          pressable
          onClick={() => onViewReport(groupedByDate[date][0].id)}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-bark">
              {format(parseISO(date), 'EEEE, MMM d')}
            </span>
            <span className="text-xs text-bark-light uppercase">
              {format(parseISO(date), 'h:mm a')}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {getPottyIcon(groupedByDate[date][0].potty_status)}

            {groupedByDate[date][0].photos && groupedByDate[date][0].photos!.length > 0 && (
              <div className="flex gap-1">
                {groupedByDate[date][0].photos!.slice(0, 3).map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt="Report"
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                ))}
                {groupedByDate[date][0].photos!.length > 3 && (
                  <div className="w-10 h-10 rounded-lg bg-pebble/30 flex items-center justify-center text-xs text-bark-light">
                    +{groupedByDate[date][0].photos!.length - 3}
                  </div>
                )}
              </div>
            )}

            {groupedByDate[date][0].behavior && (
              <span className="text-xs text-bark-light truncate flex-1">
                {groupedByDate[date][0].behavior}
              </span>
            )}
          </div>

          {groupedByDate[date][0].notes && (
            <p className="text-xs text-bark-light mt-2 line-clamp-2">
              {groupedByDate[date][0].notes}
            </p>
          )}

          <button
            type="button"
            className="mt-2 text-xs text-sage font-bold"
            onClick={(e) => {
              e.stopPropagation();
              onEditReport(groupedByDate[date][0].id);
            }}
          >
            Edit Report
          </button>
        </Card>
      ))}
    </div>
  );
}
