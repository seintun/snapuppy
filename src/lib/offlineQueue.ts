import { get, set, del } from 'idb-keyval';
import type { Database } from '@/types/database';

const QUEUE_KEY = 'snapuppy-offline-mutation-queue';
const MAX_RETRIES = 3;

type TableName = keyof Database['public']['Tables'];

export interface OfflineMutation<T extends TableName = TableName> {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: T;
  data: Database['public']['Tables'][T]['Insert'] | Database['public']['Tables'][T]['Update'];
  timestamp: number;
  retries: number;
}

async function getQueue(): Promise<OfflineMutation[]> {
  const queue = await get<OfflineMutation[]>(QUEUE_KEY);
  return queue ?? [];
}

async function saveQueue(queue: OfflineMutation[]): Promise<void> {
  await set(QUEUE_KEY, queue);
}

export async function addToQueue(
  mutation: Omit<OfflineMutation, 'id' | 'timestamp' | 'retries'>,
): Promise<void> {
  const queue = await getQueue();
  queue.push({
    ...mutation,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    retries: 0,
  });
  await saveQueue(queue);
}

export async function processQueue(): Promise<{ success: number; failed: number }> {
  const queue = await getQueue();
  if (queue.length === 0) {
    return { success: 0, failed: 0 };
  }

  const results = { success: 0, failed: 0 };
  const remaining: OfflineMutation[] = [];

  for (const mutation of queue) {
    try {
      await executeMutation(mutation);
      results.success++;
    } catch {
      mutation.retries++;
      if (mutation.retries < MAX_RETRIES) {
        const delay = Math.pow(2, mutation.retries) * 1000;
        await sleep(delay);
        try {
          await executeMutation(mutation);
          results.success++;
        } catch {
          remaining.push(mutation);
          results.failed++;
        }
      } else {
        remaining.push(mutation);
        results.failed++;
      }
    }
  }

  await saveQueue(remaining);
  return results;
}

async function executeMutation(mutation: OfflineMutation): Promise<void> {
  const { supabase } = await import('@/lib/supabase');
  const client = supabase;

  switch (mutation.table) {
    case 'dogs': {
      if (mutation.type === 'create') {
        await client
          .from('dogs')
          .insert(mutation.data as Database['public']['Tables']['dogs']['Insert']);
      } else if (mutation.type === 'update') {
        await client
          .from('dogs')
          .update(mutation.data as Database['public']['Tables']['dogs']['Update'])
          .eq('id', (mutation.data as { id: string }).id);
      } else {
        await client
          .from('dogs')
          .delete()
          .eq('id', (mutation.data as { id: string }).id);
      }
      break;
    }
    case 'bookings': {
      if (mutation.type === 'create') {
        await client
          .from('bookings')
          .insert(mutation.data as Database['public']['Tables']['bookings']['Insert']);
      } else if (mutation.type === 'update') {
        await client
          .from('bookings')
          .update(mutation.data as Database['public']['Tables']['bookings']['Update'])
          .eq('id', (mutation.data as { id: string }).id);
      } else {
        await client
          .from('bookings')
          .delete()
          .eq('id', (mutation.data as { id: string }).id);
      }
      break;
    }
    case 'booking_days': {
      if (mutation.type === 'create') {
        await client
          .from('booking_days')
          .insert(mutation.data as Database['public']['Tables']['booking_days']['Insert']);
      } else if (mutation.type === 'update') {
        await client
          .from('booking_days')
          .update(mutation.data as Database['public']['Tables']['booking_days']['Update'])
          .eq('id', (mutation.data as { id: string }).id);
      } else {
        await client
          .from('booking_days')
          .delete()
          .eq('id', (mutation.data as { id: string }).id);
      }
      break;
    }
    case 'daily_reports': {
      if (mutation.type === 'create') {
        await client
          .from('daily_reports')
          .insert(mutation.data as Database['public']['Tables']['daily_reports']['Insert']);
      } else if (mutation.type === 'update') {
        await client
          .from('daily_reports')
          .update(mutation.data as Database['public']['Tables']['daily_reports']['Update'])
          .eq('id', (mutation.data as { id: string }).id);
      } else {
        await client
          .from('daily_reports')
          .delete()
          .eq('id', (mutation.data as { id: string }).id);
      }
      break;
    }
    case 'recurring_bookings': {
      if (mutation.type === 'create') {
        await client
          .from('recurring_bookings')
          .insert(mutation.data as Database['public']['Tables']['recurring_bookings']['Insert']);
      } else if (mutation.type === 'update') {
        await client
          .from('recurring_bookings')
          .update(mutation.data as Database['public']['Tables']['recurring_bookings']['Update'])
          .eq('id', (mutation.data as { id: string }).id);
      } else {
        await client
          .from('recurring_bookings')
          .delete()
          .eq('id', (mutation.data as { id: string }).id);
      }
      break;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function clearQueue(): Promise<void> {
  await del(QUEUE_KEY);
}

export async function getQueueLength(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}
