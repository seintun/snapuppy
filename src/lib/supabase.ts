import { createClient } from '@supabase/supabase-js';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

function requiredEnv(name: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'): string {
  const value = import.meta.env[name];

  if (!value || typeof value !== 'string') {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

const supabaseUrl = requiredEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = requiredEnv('VITE_SUPABASE_ANON_KEY');

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: 'openid email profile https://www.googleapis.com/auth/calendar',
      redirectTo: `${window.location.origin}/auth/callback`,
      // Skip the automatic redirect so we can open in a real browser tab.
      // This is required when running as a PWA — Google rejects OAuth from
      // standalone/webview contexts (Error 403: app_domain rejected).
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) throw error ?? new Error('No OAuth URL returned');

  // Open in a new tab to guarantee a full browser context.
  // window.open falls back gracefully if popups are blocked.
  const newTab = window.open(data.url, '_blank', 'noopener,noreferrer');
  if (!newTab) {
    // Popup was blocked — fall back to same-tab redirect.
    window.location.href = data.url;
  }
};

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

export const signInWithPassword = (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email, password });

export const signUpWithPassword = (email: string, password: string) =>
  supabase.auth.signUp({ email, password });
