import { createClient } from '@supabase/supabase-js';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

function requiredEnv(name: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'): string {
  const value = import.meta.env[name];
  const nodeEnv = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env
    ?.NODE_ENV;
  const isTestRuntime = import.meta.env.MODE === 'test' || nodeEnv === 'test';

  if (!value || typeof value !== 'string') {
    if (isTestRuntime) {
      return name === 'VITE_SUPABASE_URL' ? 'http://127.0.0.1:54321' : 'test-anon-key';
    }

    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

const supabaseUrl = requiredEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = requiredEnv('VITE_SUPABASE_ANON_KEY');

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export const sendPasscode = (email: string) =>
  supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      // @ts-expect-error - emailRedirectTo: null forces numeric code
      emailRedirectTo: null,
    },
  });

export const verifyPasscode = (email: string, code: string) =>
  supabase.auth.verifyOtp({
    email,
    token: code,
    type: 'email',
  });

export const signUpWithPassword = (email: string, password: string) =>
  supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });

export const signInWithPassword = (email: string, password: string) =>
  supabase.auth.signInWithPassword({
    email,
    password,
  });

export const signOut = () => supabase.auth.signOut();

export const getSession = async (): Promise<Session | null> => {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
};

export const onAuthStateChange = (
  callback: (event: AuthChangeEvent, session: Session | null) => void,
) => {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(callback);

  return () => subscription.unsubscribe();
};

export async function signInAnonymously(): Promise<void> {
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
}
