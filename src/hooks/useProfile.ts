import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { getProfile, updateProfile } from '@/features/profile/profileService';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

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
  });
}
