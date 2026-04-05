import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createBooking } from '@/lib/bookingService';

export function useClientBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { sitterId: string; dogId: string; startDate: string; endDate: string }) =>
      createBooking({
        sitterId: input.sitterId,
        dogId: input.dogId,
        startDate: input.startDate,
        endDate: input.endDate,
        status: 'pending',
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
