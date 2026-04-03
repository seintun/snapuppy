import { useCallback, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { CheckCircle, WarningCircle, XCircle } from '@phosphor-icons/react';
import { ToastContext, type ToastContextValue, type ToastTone } from './ToastContext';

interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, tone }]);

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 2600);
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ addToast }), [addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.tone}`}>
            {toast.tone === 'success' ? (
              <CheckCircle size={16} />
            ) : toast.tone === 'error' ? (
              <XCircle size={16} />
            ) : (
              <WarningCircle size={16} />
            )}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
