import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/features/auth/useAuthContext';
import {
  createRecurringBooking,
  deleteRecurringBooking,
  getRecurringByDog,
  updateRecurringStatus,
  type CreateRecurringInput,
} from '@/lib/recurringService';
import { logger } from '@/lib/logger';
import type { RecurringStatus } from '@/types/database';

export function useRecurringByDog(dogId: string | undefined) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['recurring', 'dog', dogId],
    queryFn: () => getRecurringByDog(dogId!),
    enabled: !!user?.id && !!dogId,
  });
}

export function useCreateRecurring() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Omit<CreateRecurringInput, 'sitterId'>) =>
      createRecurringBooking({ ...input, sitterId: user!.id }),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['recurring', 'dog', variables.dogId] });
      logger.info('Recurring booking created successfully');
    },
  });
}

export function useUpdateRecurringStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: RecurringStatus }) =>
      updateRecurringStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['recurring'] });
      logger.info('Recurring booking status updated');
    },
  });
}

export function useDeleteRecurring() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteRecurringBooking(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['recurring'] });
      logger.info('Recurring booking cancelled');
    },
  });
}
