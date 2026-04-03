import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  onAuthStateChange,
  signInWithGoogle,
  signOut as supabaseSignOut,
  supabase,
  signInAnonymously as supabaseSignInAnonymously,
  signInWithPassword as supabaseSignInWithPassword,
  signUpWithPassword as supabaseSignUpWithPassword,
} from '@/lib/supabase';
import { getOrCreateSnapuppyCalendar } from '@/lib/gcal';
import { getProfile, updateProfile } from '@/features/profile/profileService';
import { markProfileAsGuest } from '@/features/guest/guestService';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

export interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signInAnonymously: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function handleSignIn(currentUser: User) {
      try {
        let fetched = await getProfile(currentUser.id);
        if (!mounted) return;
        setProfile(fetched);

        // Check if user is anonymous and mark as guest if needed
        if (currentUser.is_anonymous && !fetched.is_guest) {
          try {
            await markProfileAsGuest(currentUser.id);
            // Refresh the profile to get updated is_guest flag
            const refreshed = await getProfile(currentUser.id);
            if (mounted) setProfile(refreshed);
            fetched = refreshed;
          } catch {
            // If marking as guest fails, continue anyway
          }
        }

        // Skip GCal calendar creation for guest users
        if (!fetched.gcal_calendar_id && !fetched.is_guest) {
          try {
            const {
              data: { session },
            } = await supabase.auth.getSession();
            const accessToken = session?.provider_token;
            if (accessToken) {
              const calendarId = await getOrCreateSnapuppyCalendar(accessToken);
              const updated = await updateProfile(currentUser.id, { gcal_calendar_id: calendarId });
              if (mounted) setProfile(updated);
            }
          } catch {
            // GCal setup failure should not block auth
          }
        }
      } catch {
        if (mounted) setProfile(null);
      }
    }

    const unsubscribe = onAuthStateChange((_sessionEvent, session) => {
      const currentUser = session?.user ?? null;
      if (mounted) setUser(currentUser);

      if (currentUser) {
        handleSignIn(currentUser).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        if (mounted) {
          setProfile(null);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async () => {
    await signInWithGoogle();
  }, []);

  const signInAnonymously = useCallback(async () => {
    await supabaseSignInAnonymously();
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const { error } = await supabaseSignInWithPassword(email, password);
    if (error) throw error;
  }, []);

  const signUpWithPassword = useCallback(async (email: string, password: string) => {
    const { error } = await supabaseSignUpWithPassword(email, password);
    if (error) throw error;
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
    signIn,
    signInAnonymously,
    signInWithPassword,
    signUpWithPassword,
    signOut,
  };
}
