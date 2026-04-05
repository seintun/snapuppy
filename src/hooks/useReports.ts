import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteDailyReport,
  getBookingReports,
  saveDailyReport,
  type SaveDailyReportInput,
} from '@/lib/reportService';

export function useReports(bookingId?: string) {
  return useQuery({
    queryKey: ['daily-reports', bookingId],
    queryFn: () => getBookingReports(bookingId!),
    enabled: Boolean(bookingId),
  });
}

export function useSaveReport(bookingId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveDailyReportInput) => saveDailyReport(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['daily-reports', bookingId] });
    },
  });
}

export function useDeleteReport(bookingId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reportId: string) => deleteDailyReport(reportId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['daily-reports', bookingId] });
    },
  });
}
