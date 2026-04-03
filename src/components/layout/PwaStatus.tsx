import { DownloadSimple, WifiSlash, X } from '@phosphor-icons/react';
import { usePwaInstall } from '@/hooks/usePwaInstall';

export function PwaStatus() {
  const { canInstall, isOffline, install, dismissInstallPrompt } = usePwaInstall();

  return (
    <>
      {isOffline ? (
        <div className="pwa-banner" role="status" aria-live="polite">
          <WifiSlash size={16} />
          You are offline. Showing cached shell.
        </div>
      ) : null}

      {canInstall ? (
        <div className="pwa-install-toast" role="status" aria-live="polite">
          <div className="pwa-install-copy">
            <strong>Install Snapuppy</strong>
            <span>Quick access from your home screen.</span>
          </div>

          <div className="pwa-install-actions">
            <button type="button" className="pwa-install-btn" onClick={() => void install()}>
              <DownloadSimple size={16} />
              Install
            </button>
            <button
              type="button"
              className="pwa-dismiss-btn"
              onClick={dismissInstallPrompt}
              aria-label="Dismiss install prompt"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
