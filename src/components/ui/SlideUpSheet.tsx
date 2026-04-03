import { useEffect, useRef, type PropsWithChildren } from 'react';
import { useSwipeToDismiss } from '@/hooks/useSwipeToDismiss';

interface SlideUpSheetProps extends PropsWithChildren {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export function SlideUpSheet({ isOpen, onClose, title, children }: SlideUpSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const { offset, isDragging, handlers } = useSwipeToDismiss(onClose);

  useEffect(() => {
    if (!isOpen) return;
    // Animate in
    const frame = requestAnimationFrame(() => {
      sheetRef.current?.style.setProperty('transform', 'translateY(0)');
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-bark/40 backdrop-blur-[4px] flex items-end justify-center z-50 animate-in fade-in duration-200"
      onClick={onClose}
      role="presentation"
      aria-hidden="true"
    >
      <div
        ref={sheetRef}
        className="w-[min(520px,100%)] bg-cream rounded-t-[18px] px-4 pt-2 pb-[calc(16px+env(safe-area-inset-bottom))] shadow-[0_-4px_24px_rgba(74,55,40,0.12)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] translate-y-full max-h-[90dvh] overflow-y-auto overscroll-contain"
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Sheet'}
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: isDragging || offset > 0 
            ? `translateY(${offset}px)` 
            : undefined,
          transition: isDragging ? 'none' : undefined,
          cursor: isDragging ? 'grabbing' : undefined
        }}
        {...handlers}
      >
        <div className="w-9 h-1 bg-pebble rounded-full mx-auto mb-3 cursor-grab active:cursor-grabbing" aria-hidden="true" />
        {title ? <h3 className="m-0 mb-4 text-[17px] font-extrabold text-bark">{title}</h3> : null}
        {children}
      </div>
    </div>
  );
}
