import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/features/auth/useAuthContext';
import {
  getDogs,
  getDog,
  createDog as svcCreateDog,
  updateDog as svcUpdateDog,
  deleteDog as svcDeleteDog,
} from '@/features/dogs/dogService';
import type { Database } from '@/types/database';
import { enqueueOfflineMutation } from '@/lib/offlineQueue';

type Dog = Database['public']['Tables']['dogs']['Row'];
type DogInsert = Database['public']['Tables']['dogs']['Insert'];

/**
 * Fetches all dogs for the current sitter.
 */
export function useDogs() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['dogs', user?.id],
    queryFn: () => getDogs(user!.id),
    enabled: !!user?.id,
  });
}

/**
 * Fetches a single dog by ID.
 * Uses cached list data as initial data if available.
 */
export function useDog(dogId?: string) {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['dogs', user?.id, dogId],
    queryFn: () => getDog(dogId!, user!.id),
    enabled: !!user?.id && !!dogId,
    initialData: () => {
      return queryClient
        .getQueryData<Dog[]>(['dogs', user?.id])
        ?.find((d) => d.id === dogId);
    },
  });
}

/**
 * Mutation to create a new dog.
 * Invalidates the dogs query on success.
 */
export function useCreateDog() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dog: Omit<DogInsert, 'sitter_id'>) =>
      svcCreateDog({ ...dog, sitter_id: user!.id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dogs', user?.id] });
      // Also invalidate booking options as they include dogs
      void queryClient.invalidateQueries({ queryKey: ['booking-options', user?.id] });
    },
    onError: async (_, variables) => {
      await enqueueOfflineMutation({
        kind: 'create-dog',
        payload: { entity: 'dog', action: 'create', userId: user?.id, ...variables },
      });
    },
  });
}

/**
 * Mutation to delete a dog.
 * Invalidates the dogs query on success.
 */
export function useDeleteDog() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dogId: string) => svcDeleteDog(dogId, user!.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dogs', user?.id] });
      void queryClient.invalidateQueries({ queryKey: ['booking-options', user?.id] });
    },
    onError: async (_, variables) => {
      await enqueueOfflineMutation({
        kind: 'delete-dog',
        payload: { entity: 'dog', action: 'delete', userId: user?.id, dogId: variables },
      });
    },
  });
}
/**
 * Mutation to update an existing dog.
 * Invalidates the dogs query on success.
 */
export function useUpdateDog() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Database['public']['Tables']['dogs']['Update'] }): Promise<Dog> =>
      svcUpdateDog(id, updates),
    onSuccess: (data: Dog) => {
      void queryClient.invalidateQueries({ queryKey: ['dogs', user?.id] });
      void queryClient.invalidateQueries({ queryKey: ['dogs', user?.id, data.id] });
      void queryClient.invalidateQueries({ queryKey: ['booking-options', user?.id] });
      void queryClient.invalidateQueries({ queryKey: ['bookings', user?.id] });
      void queryClient.invalidateQueries({ queryKey: ['calendar-bookings', user?.id] });
    },
    onError: async (_, variables) => {
      await enqueueOfflineMutation({
        kind: 'update-dog',
        payload: { entity: 'dog', action: 'update', userId: user?.id, ...variables },
      });
    },
  });
}
