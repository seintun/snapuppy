import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createReport as svcCreateReport,
  deleteReport as svcDeleteReport,
  getReportsByBooking,
  updateReport as svcUpdateReport,
  type CreateReportInput,
  type UpdateReportInput,
} from '@/lib/reportService';
import { logger } from '@/lib/logger';

export function useBookingReports(bookingId: string | undefined) {
  return useQuery({
    queryKey: ['reports', bookingId],
    queryFn: () => getReportsByBooking(bookingId!),
    enabled: !!bookingId,
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateReportInput) => svcCreateReport(input),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['reports', variables.bookingId] });
      logger.info('Report created successfully, cache invalidated');
    },
  });
}

export function useUpdateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateReportInput }) =>
      svcUpdateReport(id, input),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['reports', variables.id] });
      logger.info('Report updated successfully, cache invalidated');
    },
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => svcDeleteReport(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
      logger.info('Report deleted successfully, cache invalidated');
    },
  });
}
