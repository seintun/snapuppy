import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

function generateSecureToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function generateClientToken(
  userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSecureToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const { error } = await supabase
    .from('profiles')
    .update({
      client_token: token,
      client_token_expires: expiresAt.toISOString(),
    })
    .eq('id', userId);

  if (error) throw error;

  return { token, expiresAt };
}

export async function validateClientToken(token: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('client_token', token)
    .gte('client_token_expires', new Date().toISOString())
    .maybeSingle();

  if (error) throw error;
  return data as Profile | null;
}

export async function regenerateClientToken(
  userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  return generateClientToken(userId);
}

export async function invalidateClientToken(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      client_token: null,
      client_token_expires: null,
    })
    .eq('id', userId);

  if (error) throw error;
}
