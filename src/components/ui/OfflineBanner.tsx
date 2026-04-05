import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function OfflineBanner() {
  const { isOnline } = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="bg-terracotta text-cream text-center text-sm font-semibold py-2 px-4 sticky top-0 z-50">
      You're offline
    </div>
  );
}
