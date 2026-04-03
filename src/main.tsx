import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createPersister } from '@/lib/persister';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import App from './App';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { ToastProvider } from '@/components/ui/ToastProvider';
import './styles.css';

// 1. Configure the Query Client for high-performance and offline-first
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data stays stale (doesn't refetch) for 5 minutes by default
      staleTime: 1000 * 60 * 5,
      // Keep unused data in the cache for 24 hours
      gcTime: 1000 * 60 * 60 * 24,
      // Retry failed requests up to 3 times with exponential backoff
      retry: (failureCount, error) => {
        if (error instanceof Error && error.message.includes('404')) return false;
        return failureCount < 3;
      },
      // Refetch when the window regains focus (great for mobile/PWA)
      refetchOnWindowFocus: true,
    },
  },
});

// 2. Initialize the IndexedDB persister
const persister = createPersister();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js');
  });
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }}
    >
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </PersistQueryClientProvider>
  </StrictMode>,
);
