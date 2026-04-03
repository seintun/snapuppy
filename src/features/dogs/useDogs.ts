import { useCallback, useEffect, useState } from 'react';
import { useAuthContext } from '@/features/auth/useAuthContext';
import type { Database } from '@/types/database';
import {
  getDogs,
  createDog as svcCreateDog,
  updateDog as svcUpdateDog,
  deleteDog as svcDeleteDog,
} from './dogService';

type Dog = Database['public']['Tables']['dogs']['Row'];
type DogInsert = Database['public']['Tables']['dogs']['Insert'];
type DogUpdate = Database['public']['Tables']['dogs']['Update'];

interface UseDogsResult {
  dogs: Dog[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  createDog: (dog: DogInsert) => Promise<Dog>;
  updateDog: (id: string, updates: DogUpdate) => Promise<Dog>;
  deleteDog: (id: string) => Promise<void>;
}

export function useDogs(): UseDogsResult {
  const { user } = useAuthContext();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!user) {
      setDogs([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getDogs(user.id)
      .then((data) => {
        if (!cancelled) {
          setDogs(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dogs');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user, tick]);

  const createDog = useCallback(async (dog: DogInsert): Promise<Dog> => {
    const created = await svcCreateDog(dog);
    refresh();
    return created;
  }, [refresh]);

  const updateDog = useCallback(async (id: string, updates: DogUpdate): Promise<Dog> => {
    const updated = await svcUpdateDog(id, updates);
    refresh();
    return updated;
  }, [refresh]);

  const deleteDog = useCallback(async (id: string): Promise<void> => {
    await svcDeleteDog(id);
    refresh();
  }, [refresh]);

  return { dogs, loading, error, refresh, createDog, updateDog, deleteDog };
}
