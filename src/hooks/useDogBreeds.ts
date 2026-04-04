import { useQuery } from '@tanstack/react-query';
import { ALL_BREEDS } from '@/lib/breeds';

export function useDogBreeds() {
  return useQuery({
    queryKey: ['dog-breeds'],
    queryFn: async () => ALL_BREEDS, // Resolves immediately from the local ~4kb bundle
    staleTime: Infinity, // Static list never goes stale
    gcTime: Infinity,
  });
}
