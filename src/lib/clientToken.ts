import { supabase } from '@/lib/supabase';

const TOKEN_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function generateClientToken(length = 24): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (value) => TOKEN_CHARS[value % TOKEN_CHARS.length]).join('');
}

export async function validateToken(token: string): Promise<{ sitterId: string } | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, client_token, client_token_expires')
    .eq('client_token', token)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const expires = data.client_token_expires ? new Date(data.client_token_expires).getTime() : null;
  if (expires && expires < Date.now()) {
    return null;
  }

  return { sitterId: data.id };
}
