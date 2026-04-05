import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type Dog = Database['public']['Tables']['dogs']['Row'];

export interface ClientCredentials {
  clientName: string;
  clientPhone: string;
}

export interface VerifiedClient {
  dog: Dog;
  sitterId: string;
}

export async function verifyClientCredentials(
  sitterId: string,
  clientName: string,
  clientPhone: string,
): Promise<VerifiedClient | null> {
  const cleanedPhone = clientPhone.replace(/\D/g, '');

  const { data: dogs, error } = await supabase
    .from('dogs')
    .select('*')
    .eq('sitter_id', sitterId)
    .eq('owner_phone', cleanedPhone)
    .limit(1);

  if (error) throw error;
  if (!dogs || dogs.length === 0) return null;

  const dog = dogs[0];

  const nameMatch = dog.owner_name?.toLowerCase().trim() === clientName.toLowerCase().trim();
  if (!nameMatch && dog.owner_name) return null;

  return {
    dog: dog as Dog,
    sitterId,
  };
}

export async function getDogsForClient(sitterId: string, clientPhone: string): Promise<Dog[]> {
  const cleanedPhone = clientPhone.replace(/\D/g, '');

  const { data, error } = await supabase
    .from('dogs')
    .select('*')
    .eq('sitter_id', sitterId)
    .eq('owner_phone', cleanedPhone);

  if (error) throw error;
  return (data ?? []) as Dog[];
}

export async function getClientBookings(sitterId: string, dogId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select(
      `
      *,
      dog:dogs(*)
    `,
    )
    .eq('sitter_id', sitterId)
    .eq('dog_id', dogId)
    .neq('status', 'cancelled')
    .order('start_date', { ascending: false });

  if (error) throw error;
  return data;
}
