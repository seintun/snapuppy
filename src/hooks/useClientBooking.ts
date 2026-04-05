import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClientRequest } from '@/lib/bookingService';

export function useClientBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { sitterId: string; dogId: string; startDate: string; endDate: string }) =>
      createClientRequest({
        sitterId: input.sitterId,
        dogId: input.dogId,
        startDate: input.startDate,
        endDate: input.endDate,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
