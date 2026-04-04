interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  variant?: 'danger' | 'primary';
  loading?: boolean;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  variant = 'danger',
  loading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-bark/60 backdrop-blur-sm transition-opacity duration-300" 
        onClick={onCancel} 
      />
      <div className="relative bg-cream rounded-3xl p-6 w-full max-w-sm shadow-2xl scale-in-center border border-pebble/10">
        <h3 className="font-black text-bark text-xl mb-2 tracking-tight">{title}</h3>
        <p className="text-bark-light/80 text-sm mb-8 leading-relaxed font-bold">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest text-bark bg-pebble/10 hover:bg-pebble/20 transition-all border border-pebble/5 active:scale-95 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => void onConfirm()}
            disabled={loading}
            className={`flex-1 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white transition-all shadow-lg shadow-terracotta/20 active:scale-95 disabled:opacity-50 ${
              variant === 'danger' ? 'bg-terracotta hover:bg-terracotta/90' : 'bg-sage hover:bg-sage/90'
            }`}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
