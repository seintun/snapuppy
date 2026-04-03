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
    // Allow the element to mount at translateY(100%), then add --open to animate in
    const frame = requestAnimationFrame(() => {
      sheetRef.current?.classList.add('sheet--open');
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
      className="sheet-backdrop"
      onClick={onClose}
      role="presentation"
      aria-hidden="true"
    >
      <div
        ref={sheetRef}
        className="sheet"
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
        <div className="sheet__handle" aria-hidden="true" />
        {title ? <h3 className="sheet__title">{title}</h3> : null}
        {children}
      </div>
    </div>
  );
}
