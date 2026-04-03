import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { onAuthStateChange, signInWithGoogle, signOut as supabaseSignOut, supabase } from '@/lib/supabase';
import { getOrCreateSnapuppyCalendar } from '@/lib/gcal';
import { getProfile, updateProfile } from '@/features/profile/profileService';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

export interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: () => Promise<void>;
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
        const fetched = await getProfile(currentUser.id);
        if (!mounted) return;
        setProfile(fetched);

        if (!fetched.gcal_calendar_id) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
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

  const signOut = useCallback(async () => {
    await supabaseSignOut();
    setUser(null);
    setProfile(null);
  }, []);

  return { user, profile, loading, signIn, signOut };
}
