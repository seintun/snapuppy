export type OfflineMutationKind =
  | 'create-booking'
  | 'update-booking'
  | 'close-booking'
  | 'create-report'
  | 'update-report'
  | 'create-dog'
  | 'update-dog'
  | 'delete-dog'
  | 'update-profile';

export interface OfflineMutation<T = Record<string, unknown>> {
  id: string;
  kind: OfflineMutationKind;
  payload: T;
  createdAt: string;
}

const STORAGE_KEY = 'snapuppy:offline-queue';
let memoryStore = '[]';

type StorageAdapter = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

function getStorage(): StorageAdapter {
  const candidate = globalThis.localStorage as unknown;
  if (
    candidate &&
    typeof candidate === 'object' &&
    'getItem' in candidate &&
    'setItem' in candidate &&
    typeof (candidate as { getItem: unknown }).getItem === 'function' &&
    typeof (candidate as { setItem: unknown }).setItem === 'function'
  ) {
    return candidate as StorageAdapter;
  }
  return {
    getItem: (key: string) => {
      void key;
      return memoryStore;
    },
    setItem: (_key: string, value: string) => {
      memoryStore = value;
    },
  };
}

function readQueue(): OfflineMutation[] {
  const raw = getStorage().getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as OfflineMutation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: OfflineMutation[]) {
  getStorage().setItem(STORAGE_KEY, JSON.stringify(queue));
}

function createMutationId() {
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function enqueueOfflineMutation<T = Record<string, unknown>>(input: {
  kind: OfflineMutationKind;
  payload: T;
}): Promise<OfflineMutation<T>> {
  const queue = readQueue();
  const mutation: OfflineMutation<T> = {
    id: createMutationId(),
    kind: input.kind,
    payload: input.payload,
    createdAt: new Date().toISOString(),
  };

  writeQueue([...queue, mutation as OfflineMutation]);
  return mutation;
}

export async function dequeueOfflineMutation(): Promise<OfflineMutation | null> {
  const queue = readQueue();
  const [head, ...rest] = queue;
  if (!head) return null;
  writeQueue(rest);
  return head;
}

export async function listOfflineMutations(): Promise<OfflineMutation[]> {
  return readQueue();
}

export async function clearOfflineQueue(): Promise<void> {
  writeQueue([]);
}
