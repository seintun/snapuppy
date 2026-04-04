import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  onAuthStateChange,
  sendPasscode,
  verifyPasscode,
  signOut as supabaseSignOut,
  supabase,
  signInAnonymously as supabaseSignInAnonymously,
  signUpWithPassword,
  signInWithPassword as signInWithPasswordFn,
} from '@/lib/supabase';
import { getProfile } from '@/features/profile/profileService';
import { markProfileAsGuest } from '@/features/guest/guestService';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

export interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  sendPasscode: (email: string) => Promise<void>;
  verifyPasscode: (email: string, code: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signInAnonymously: () => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function handlePageShow(e: PageTransitionEvent) {
      if (!e.persisted) return;
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          setUser(null);
          setProfile(null);
        }
      });
    }

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function hydrateProfile(currentUser: User) {
      try {
        const fetched = await getProfile(currentUser.id);
        if (!mounted) return;
        setProfile(fetched);

        if (!fetched) {
          return;
        }

        if (currentUser.is_anonymous && !fetched.is_guest) {
          try {
            await markProfileAsGuest(currentUser.id);
            const refreshed = await getProfile(currentUser.id);
            if (mounted) setProfile(refreshed);
          } catch {
            // Guest-upgrade failure should not block auth.
          }
        }
      } catch {
        if (mounted) setProfile(null);
      }
    }

    const unsubscribe = onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null;

      if (currentUser && event === 'INITIAL_SESSION') {
        supabase.auth.getUser().then(({ error }) => {
          if (!mounted) return;

          if (error) {
            void supabase.auth.signOut({ scope: 'local' });
            setUser(null);
            setProfile(null);
            setLoading(false);
            return;
          }

          setUser(currentUser);
          hydrateProfile(currentUser).finally(() => {
            if (mounted) setLoading(false);
          });
        });
        return;
      }

      if (mounted) setUser(currentUser);

      if (currentUser) {
        hydrateProfile(currentUser).finally(() => {
          if (mounted) setLoading(false);
        });
      } else if (mounted) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const sendPasscodeFn = useCallback(async (email: string) => {
    const { error } = await sendPasscode(email);
    if (error) throw error;
  }, []);

  const verifyPasscodeFn = useCallback(async (email: string, code: string) => {
    const { error, data } = await verifyPasscode(email, code);
    if (error) throw error;
    if (!data.session) throw new Error('Verification failed');
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await signUpWithPassword(email, password);
    if (error) throw error;
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const { error } = await signInWithPasswordFn(email, password);
    if (error) throw error;
  }, []);

  const signInAnonymously = useCallback(async () => {
    await supabaseSignInAnonymously();
  }, []);

  const signOut = useCallback(async () => {
    await supabaseSignOut();
    setUser(null);
    setProfile(null);
  }, []);

  return {
    user,
    profile,
    loading,
    sendPasscode: sendPasscodeFn,
    verifyPasscode: verifyPasscodeFn,
    signUp,
    signInWithPassword,
    signInAnonymously,
    signOut,
  };
}
