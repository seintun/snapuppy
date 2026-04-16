import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useOfflineSync } from '@/hooks/useOfflineSync';

const onlineState = vi.hoisted(() => ({ value: true }));
const processOfflineQueueMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => onlineState.value,
}));

vi.mock('@/lib/sync', () => ({
  processOfflineQueue: (...args: unknown[]) => processOfflineQueueMock(...args),
}));

describe('useOfflineSync', () => {
  const wrapper = ({ children }: PropsWithChildren) => {
    const queryClient = new QueryClient();
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  beforeEach(() => {
    onlineState.value = true;
    processOfflineQueueMock.mockReset();
  });

  it('processes queue once and returns to idle', async () => {
    processOfflineQueueMock.mockResolvedValue(0);

    const { result } = renderHook(() => useOfflineSync(), { wrapper });

    await waitFor(() => {
      expect(processOfflineQueueMock).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(result.current.isSyncing).toBe(false);
    });
  });

  it('processes queue again after reconnecting', async () => {
    processOfflineQueueMock.mockResolvedValue(0);

    const { rerender, result } = renderHook(() => useOfflineSync(), { wrapper });

    await waitFor(() => {
      expect(processOfflineQueueMock).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(result.current.isSyncing).toBe(false);
    });

    onlineState.value = false;
    rerender();

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(processOfflineQueueMock).toHaveBeenCalledTimes(1);

    onlineState.value = true;
    rerender();

    await waitFor(() => {
      expect(processOfflineQueueMock).toHaveBeenCalledTimes(2);
    });
  });
});
