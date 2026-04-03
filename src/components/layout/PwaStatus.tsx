import { useEffect, useState } from 'react';
import { DownloadSimple, WifiSlash, X, CloudArrowUp, CheckCircle } from '@phosphor-icons/react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { usePwaInstall } from '@/hooks/usePwaInstall';

export function PwaStatus() {
  const { canInstall, install, dismissInstallPrompt } = usePwaInstall();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const [showSyncSuccess, setShowSyncStatus] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Show "Sync Success" briefly after all background activities finish
  const isSyncing = isFetching > 0 || isMutating > 0;
  useEffect(() => {
    if (isSyncing) {
      setShowSyncStatus(true);
    } else {
      const timer = setTimeout(() => setShowSyncStatus(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSyncing]);

  return (
    <>
      {/* Network/Sync Status Banner */}
      {!isOnline || (showSyncSuccess && isOnline) ? (
        <div 
          className={`fixed top-3 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-2 rounded-full border shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
            !isOnline 
              ? 'bg-blush border-terracotta text-terracotta' 
              : isSyncing 
                ? 'bg-sky/10 border-sky text-sky' 
                : 'bg-sage-light border-sage text-sage'
          }`}
          role="status" 
          aria-live="polite"
        >
          {!isOnline ? (
            <>
              <WifiSlash size={18} weight="bold" />
              <span className="text-[13px] font-bold">Offline Mode</span>
            </>
          ) : isSyncing ? (
            <>
              <CloudArrowUp size={18} weight="bold" className="animate-bounce" />
              <span className="text-[13px] font-bold">Syncing...</span>
            </>
          ) : (
            <>
              <CheckCircle size={18} weight="bold" />
              <span className="text-[13px] font-bold">All synced!</span>
            </>
          )}
        </div>
      ) : null}

      {/* PWA Install Prompt */}
      {canInstall ? (
        <div 
          className="fixed left-1/2 -translate-x-1/2 bottom-[calc(84px+env(safe-area-inset-bottom))] w-[min(480px,calc(100%-24px))] z-[35] bg-cream border border-pebble rounded-2xl shadow-xl p-3.5 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4" 
          role="status" 
          aria-live="polite"
        >
          <div className="flex flex-col gap-0.5 min-w-0">
            <strong className="text-sm text-bark font-extrabold">Install Snapuppy</strong>
            <span className="text-xs text-bark-light truncate">Quick access from your home screen.</span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button 
              type="button" 
              className="h-10 bg-sage text-white font-bold text-sm rounded-xl px-4 flex items-center gap-2 shadow-sm active:scale-95 transition-transform" 
              onClick={() => void install()}
            >
              <DownloadSimple size={18} weight="bold" />
              Install
            </button>
            <button
              type="button"
              className="w-10 h-10 border border-pebble rounded-xl text-bark-light flex items-center justify-center active:bg-pebble/20 transition-colors"
              onClick={dismissInstallPrompt}
              aria-label="Dismiss install prompt"
            >
              <X size={16} weight="bold" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
