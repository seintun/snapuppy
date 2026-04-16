import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

interface LegacyProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
  business_name?: string | null;
  business_logo_url?: string | null;
  payment_instructions?: string | null;
  nightly_rate: number;
  daycare_rate: number;
  holiday_surcharge: number;
  cutoff_time: string;
  is_guest: boolean;
  created_at: string;
  updated_at: string;
}

const PROFILE_SELECT_WITH_BUSINESS_NAME = `
  id,
  email,
  display_name,
  business_name,
  business_logo_url,
  payment_instructions,
  nightly_rate,
  daycare_rate,
  holiday_boarding_rate,
  holiday_daycare_rate,
  cutoff_time,
  is_guest,
  created_at,
  updated_at
`;

const PROFILE_SELECT_WITHOUT_BUSINESS_NAME = `
  id,
  email,
  display_name,
  business_logo_url,
  payment_instructions,
  nightly_rate,
  daycare_rate,
  holiday_boarding_rate,
  holiday_daycare_rate,
  cutoff_time,
  is_guest,
  created_at,
  updated_at
`;

const PROFILE_SELECT_FALLBACK = `
  id,
  email,
  display_name,
  business_name,
  business_logo_url,
  nightly_rate,
  daycare_rate,
  holiday_boarding_rate,
  holiday_daycare_rate,
  cutoff_time,
  is_guest,
  created_at,
  updated_at
`;

const PROFILE_SELECT_LEGACY_WITH_BUSINESS_NAME = `
  id,
  email,
  display_name,
  business_name,
  business_logo_url,
  payment_instructions,
  nightly_rate,
  daycare_rate,
  holiday_surcharge,
  cutoff_time,
  is_guest,
  created_at,
  updated_at
`;

const PROFILE_SELECT_LEGACY_WITHOUT_BUSINESS_NAME = `
  id,
  email,
  display_name,
  business_logo_url,
  payment_instructions,
  nightly_rate,
  daycare_rate,
  holiday_surcharge,
  cutoff_time,
  is_guest,
  created_at,
  updated_at
`;

const PROFILE_SELECT_LEGACY_FALLBACK = `
  id,
  email,
  display_name,
  business_name,
  business_logo_url,
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

  if (maybeError.code !== 'PGRST204') return false;
  return (maybeError.message ?? '').toLowerCase().includes('business_name');
}

function isMissingPaymentInstructionsError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const maybeError = error as { code?: string; message?: string };

  if (maybeError.code !== 'PGRST204') return false;
  return (maybeError.message ?? '').toLowerCase().includes('payment_instructions');
}

function isMissingHolidayRateColumnsError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const maybeError = error as { code?: string; message?: string };
  if (maybeError.code !== 'PGRST204') return false;
  const message = (maybeError.message ?? '').toLowerCase();
  return message.includes('holiday_boarding_rate') || message.includes('holiday_daycare_rate');
}

function mapLegacyProfileToCurrent(
  profile: LegacyProfileRow | null,
): Profile | null {
  if (!profile) return null;

  return {
    id: profile.id,
    email: profile.email,
    display_name: profile.display_name,
    business_name: profile.business_name ?? null,
    business_logo_url: profile.business_logo_url ?? null,
    payment_instructions: profile.payment_instructions ?? null,
    client_token: null,
    client_token_expires: null,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
    cutoff_time: profile.cutoff_time,
    nightly_rate: profile.nightly_rate,
    daycare_rate: profile.daycare_rate,
    is_guest: profile.is_guest,
    holiday_boarding_rate: profile.nightly_rate + profile.holiday_surcharge,
    holiday_daycare_rate: profile.daycare_rate + profile.holiday_surcharge,
  };
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

  // Fallback for old schema before holiday-rate migration
  if (isMissingHolidayRateColumnsError(error)) {
    const { data: legacyData, error: legacyError } = await supabase
      .from('profiles')
      .select(PROFILE_SELECT_LEGACY_WITH_BUSINESS_NAME)
      .eq('id', userId)
      .maybeSingle();

    if (!legacyError) {
      return mapLegacyProfileToCurrent(legacyData as unknown as LegacyProfileRow | null);
    }

    if (isMissingBusinessNameError(legacyError) && !isMissingPaymentInstructionsError(legacyError)) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('profiles')
        .select(PROFILE_SELECT_LEGACY_WITHOUT_BUSINESS_NAME)
        .eq('id', userId)
        .maybeSingle();

      if (fallbackError) throw fallbackError;
      return mapLegacyProfileToCurrent(
        fallbackData
          ? ({
              ...(fallbackData as unknown as LegacyProfileRow),
              business_name: null,
            } as LegacyProfileRow)
          : null,
      );
    }

    if (isMissingPaymentInstructionsError(legacyError) && !isMissingBusinessNameError(legacyError)) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('profiles')
        .select(PROFILE_SELECT_LEGACY_FALLBACK)
        .eq('id', userId)
        .maybeSingle();

      if (fallbackError) throw fallbackError;
      return mapLegacyProfileToCurrent(
        fallbackData
          ? ({
              ...(fallbackData as unknown as LegacyProfileRow),
              payment_instructions: null,
            } as LegacyProfileRow)
          : null,
      );
    }

    if (isMissingBusinessNameError(legacyError) && isMissingPaymentInstructionsError(legacyError)) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('profiles')
        .select(PROFILE_SELECT_LEGACY_FALLBACK)
        .eq('id', userId)
        .maybeSingle();

      if (fallbackError) throw fallbackError;
      return mapLegacyProfileToCurrent(
        fallbackData
          ? ({
              ...(fallbackData as unknown as LegacyProfileRow),
              business_name: null,
              payment_instructions: null,
            } as LegacyProfileRow)
          : null,
      );
    }

    throw legacyError;
  }

  // Fallback if business_name column is missing
  if (isMissingBusinessNameError(error) && !isMissingPaymentInstructionsError(error)) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('profiles')
      .select(PROFILE_SELECT_WITHOUT_BUSINESS_NAME)
      .eq('id', userId)
      .maybeSingle();

    if (fallbackError) throw fallbackError;
    return fallbackData ? ({ ...fallbackData, business_name: null } as Profile) : null;
  }

  // Fallback if payment_instructions column is missing
  if (isMissingPaymentInstructionsError(error) && !isMissingBusinessNameError(error)) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('profiles')
      .select(PROFILE_SELECT_FALLBACK)
      .eq('id', userId)
      .maybeSingle();

    if (fallbackError) throw fallbackError;
    return fallbackData ? ({ ...fallbackData, payment_instructions: null } as Profile) : null;
  }

  // Fallback if both optional columns are missing
  if (isMissingBusinessNameError(error) && isMissingPaymentInstructionsError(error)) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('profiles')
      .select(PROFILE_SELECT_FALLBACK)
      .eq('id', userId)
      .maybeSingle();

    if (fallbackError) throw fallbackError;
    return fallbackData
      ? ({ ...fallbackData, business_name: null, payment_instructions: null } as Profile)
      : null;
  }

  throw error;
}

export async function updateProfile(userId: string, updates: ProfileUpdate): Promise<Profile> {
  // Never write business_name going forward
  const safeUpdates = { ...updates };
  delete safeUpdates.business_name;

  // Try with all fields first
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...safeUpdates, updated_at: new Date().toISOString() })
    .select(PROFILE_SELECT_WITHOUT_BUSINESS_NAME)
    .single();

  if (!error) {
    return { ...data, business_name: null } as Profile;
  }

  // Fallback for old schema before holiday-rate migration
  if (isMissingHolidayRateColumnsError(error)) {
    const legacyUpdates = { ...safeUpdates } as Record<string, unknown>;
    delete legacyUpdates.holiday_boarding_rate;
    delete legacyUpdates.holiday_daycare_rate;

    const nightlyRate = typeof updates.nightly_rate === 'number' ? updates.nightly_rate : 0;
    const daycareRate = typeof updates.daycare_rate === 'number' ? updates.daycare_rate : 0;
    const holidayBoardingRate =
      typeof updates.holiday_boarding_rate === 'number' ? updates.holiday_boarding_rate : null;
    const holidayDaycareRate =
      typeof updates.holiday_daycare_rate === 'number' ? updates.holiday_daycare_rate : null;

    if (holidayBoardingRate !== null || holidayDaycareRate !== null) {
      const boardingDelta = holidayBoardingRate !== null ? holidayBoardingRate - nightlyRate : 0;
      const daycareDelta = holidayDaycareRate !== null ? holidayDaycareRate - daycareRate : 0;
      const surcharge = Math.max(0, boardingDelta, daycareDelta);
      legacyUpdates.holiday_surcharge = surcharge;
    }

    const { data: legacyData, error: legacyError } = await supabase
      .from('profiles')
      .upsert({ id: userId, ...legacyUpdates, updated_at: new Date().toISOString() })
      .select(PROFILE_SELECT_LEGACY_WITHOUT_BUSINESS_NAME)
      .single();

    if (!legacyError) {
      return mapLegacyProfileToCurrent(
        legacyData as unknown as LegacyProfileRow,
      ) as Profile;
    }

    throw legacyError;
  }

  // Fallback: Strip payment_instructions and try again
  if (isMissingPaymentInstructionsError(error)) {
    const cleanUpdates = { ...safeUpdates };
    delete cleanUpdates.payment_instructions;

    const { data: fallbackData, error: fallbackError } = await supabase
      .from('profiles')
      .upsert({ id: userId, ...cleanUpdates, updated_at: new Date().toISOString() })
      .select(PROFILE_SELECT_FALLBACK)
      .single();

    if (fallbackError) throw fallbackError;
    return { ...fallbackData, business_name: null, payment_instructions: null } as Profile;
  }

  throw error;
}

export async function updateClientToken(userId: string, token: string): Promise<void> {
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from('profiles')
    .update({
      client_token: token,
      client_token_expires: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (error) throw error;
}
