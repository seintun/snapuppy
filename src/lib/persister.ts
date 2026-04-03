import {
  Persister,
  PersistedClient,
} from '@tanstack/react-query-persist-client';
import { get, set, del } from 'idb-keyval';

/**
 * Creates an IndexedDB persister for TanStack Query.
 * IndexedDB is much more reliable than LocalStorage for larger datasets
 * and avoids blocking the main thread.
 */
export function createPersister(key = 'SNAPUPPY_OFFLINE_CACHE'): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      await set(key, client);
    },
    restoreClient: async () => {
      return await get<PersistedClient>(key);
    },
    removeClient: async () => {
      await del(key);
    },
  };
}
