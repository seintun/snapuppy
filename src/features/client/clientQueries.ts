import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useClientBookings(sitterId?: string, ownerPhone?: string) {
  return useQuery({
    queryKey: ['client-bookings', sitterId, ownerPhone],
    enabled: Boolean(sitterId && ownerPhone),
    queryFn: async () => {
      const normalizedPhone = ownerPhone!.replace(/\D/g, '');
      const { data: dogs, error: dogsError } = await supabase
        .from('dogs')
        .select('id')
        .eq('sitter_id', sitterId!)
        .neq('owner_phone', null);

      if (dogsError) throw dogsError;
      const dogIds = (dogs ?? []).map((dog) => dog.id);
      if (dogIds.length === 0) return [];

      const { data, error } = await supabase
        .from('bookings')
        .select('*, dog:dogs(*)')
        .in('dog_id', dogIds)
        .order('start_date', { ascending: false });

      if (error) throw error;
      return (data ?? []).filter(
        (booking) => (booking.dog?.owner_phone ?? '').replace(/\D/g, '') === normalizedPhone,
      );
    },
  });
}
