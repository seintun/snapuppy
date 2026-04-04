import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

const PROFILE_SELECT_WITH_BUSINESS_NAME = `
  id,
  email,
  display_name,
  business_name,
  nightly_rate,
  daycare_rate,
  holiday_surcharge,
  cutoff_time,
  is_guest,
  created_at,
  updated_at
`;

const PROFILE_SELECT_FALLBACK = `
  id,
  email,
  display_name,
  nightly_rate,
  daycare_rate,
  holiday_surcharge,
  cutoff_time,
  is_guest,
  created_at,
  updated_at
`;

/**
 * Checks if a Supabase error is specifically about the business_name column being missing.
 * This can happen if the database schema is behind migration 007.
 */
function isMissingBusinessNameError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const maybeError = error as { code?: string; message?: string };
  
  // PGRST204 is the PostgREST error for "column not found"
  return (
    maybeError.code === 'PGRST204' || 
    (typeof maybeError.message === 'string' && maybeError.message.toLowerCase().includes('business_name'))
  );
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT_WITH_BUSINESS_NAME)
    .eq('id', userId)
    .maybeSingle();

  if (!error) {
    return data as Profile | null;
  }

  // Fallback if business_name column is missing
  if (isMissingBusinessNameError(error)) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('profiles')
      .select(PROFILE_SELECT_FALLBACK)
      .eq('id', userId)
      .maybeSingle();

    if (fallbackError) throw fallbackError;
    return fallbackData ? ({ ...fallbackData, business_name: null } as Profile) : null;
  }

  throw error;
}

export async function updateProfile(userId: string, updates: ProfileUpdate): Promise<Profile> {
  // Try with all fields first
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...updates, updated_at: new Date().toISOString() })
    .select(PROFILE_SELECT_WITH_BUSINESS_NAME)
    .single();

  if (!error) {
    return data as Profile;
  }

  // Fallback: Strip business_name and try again
  if (isMissingBusinessNameError(error)) {
    const cleanUpdates = { ...updates };
    delete (cleanUpdates as any).business_name;

    const { data: fallbackData, error: fallbackError } = await supabase
      .from('profiles')
      .upsert({ id: userId, ...cleanUpdates, updated_at: new Date().toISOString() })
      .select(PROFILE_SELECT_FALLBACK)
      .single();

    if (fallbackError) throw fallbackError;
    return { ...fallbackData, business_name: null } as Profile;
  }

  throw error;
}
