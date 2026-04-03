import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export async function markProfileAsGuest(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_guest: true } as ProfileUpdate)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}