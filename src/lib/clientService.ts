import { supabase } from '@/lib/supabase';

export async function verifyClientCredentials(input: {
  sitterId: string;
  ownerName: string;
  ownerPhone: string;
}) {
  const normalizedPhone = input.ownerPhone.replace(/\D/g, '');
  const { data, error } = await supabase
    .from('dogs')
    .select('id, owner_name, owner_phone')
    .eq('sitter_id', input.sitterId)
    .ilike('owner_name', input.ownerName.trim())
    .is('archived_at', null)
    .limit(1);

  if (error) throw error;
  const match = data?.find((dog) => (dog.owner_phone ?? '').replace(/\D/g, '') === normalizedPhone);
  return match ?? null;
}
