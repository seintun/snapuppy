import { useCallback, useRef } from 'react';

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

interface UseQueryOptions {
  staleTime?: number;
  cacheKey: string;
}

const globalCache = new Map<string, CacheEntry>();
const STALE_TIME = 30_000;

export function useQuery<T>(fetcher: () => Promise<T>, options: UseQueryOptions) {
  const cacheKey = options.cacheKey;
  const staleTime = options.staleTime ?? STALE_TIME;
  const abortRef = useRef<AbortController | null>(null);

  const execute = useCallback(async (): Promise<T> => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    const cached = globalCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < staleTime) {
      return cached.data as T;
    }

    const data = await fetcher();
    globalCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  }, [cacheKey, fetcher, staleTime]);

  const invalidate = useCallback(() => {
    globalCache.delete(cacheKey);
  }, [cacheKey]);

  return { execute, invalidate };
}
