import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  createClientRequest as svcCreateClientRequest,
  type CreateClientRequestInput,
} from '@/lib/bookingService';
import { getClientSession } from '@/features/client/clientAuth';
import { logger } from '@/lib/logger';

export function useClientBooking() {
  const session = getClientSession();

  return useMutation({
    mutationFn: async (input: Omit<CreateClientRequestInput, 'sitterId'>) => {
      if (!session?.sitterId) {
        throw new Error('No client session found');
      }

      return svcCreateClientRequest({
        ...input,
        sitterId: session.sitterId,
      });
    },
    onSuccess: () => {
      logger.info('Client booking request created successfully');
      void supabase.from('bookings').select('id');
    },
  });
}
