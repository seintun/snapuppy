import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { getProfile, updateProfile } from '@/features/profile/profileService';
import type { Database } from '@/types/database';
import type { PaymentMethod } from '@/lib/schemas';
import { enqueueOfflineMutation } from '@/lib/offlineQueue';

type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export function parsePaymentMethods(raw: string | null | undefined): PaymentMethod[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as PaymentMethod[];
  } catch {
    // Legacy free text — not valid JSON, return empty (handled in UI)
    return [];
  }
}

export function isLegacyPaymentInstructions(raw: string | null | undefined): boolean {
  if (!raw) return false;
  try {
    JSON.parse(raw);
    return false;
  } catch {
    return true;
  }
}

export function serializePaymentMethods(methods: PaymentMethod[]): string | null {
  if (methods.length === 0) return null;
  return JSON.stringify(methods);
}

/**
 * Fetches the current user's profile.
 */
export function useProfile() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => getProfile(user!.id),
    enabled: !!user?.id,
  });
}

/**
 * Mutation to update the user's profile.
 * Invalidates the profile query on success to refresh the UI.
 */
export function useUpdateProfile() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: ProfileUpdate) => updateProfile(user!.id, updates),
    onSuccess: (updated) => {
      queryClient.setQueryData(['profile', user?.id], updated);
      void queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      // Also invalidate booking options since they contain the profile
      void queryClient.invalidateQueries({ queryKey: ['booking-options', user?.id] });
    },
    onError: async (_, variables) => {
      await enqueueOfflineMutation({
        kind: 'update-profile',
        payload: { userId: user?.id, ...variables },
      });
    },
  });
}
