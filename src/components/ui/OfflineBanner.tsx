import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="bg-terracotta text-white text-xs font-bold px-3 py-2 text-center">
      You're offline. Changes will sync when connection returns.
    </div>
  );
}
