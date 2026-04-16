import { supabase } from '@/lib/supabase';

const TOKEN_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const MAX_UNBIASED_BYTE = Math.floor(256 / TOKEN_CHARS.length) * TOKEN_CHARS.length;

export function generateClientToken(length = 24): string {
  if (!Number.isSafeInteger(length) || length < 1) {
    throw new RangeError('Token length must be a positive safe integer');
  }

  let token = '';

  while (token.length < length) {
    const [value] = crypto.getRandomValues(new Uint8Array(1));

    if (value >= MAX_UNBIASED_BYTE) {
      continue;
    }

    token += TOKEN_CHARS[value % TOKEN_CHARS.length];
  }

  return token;
}

export async function validateToken(token: string): Promise<{ sitterId: string } | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, client_token, client_token_expires')
    .eq('client_token', token)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  if (!data.client_token_expires) {
    return { sitterId: data.id };
  }

  const expires = Date.parse(data.client_token_expires);
  if (!Number.isFinite(expires) || expires <= Date.now()) {
    return null;
  }

  return { sitterId: data.id };
}
