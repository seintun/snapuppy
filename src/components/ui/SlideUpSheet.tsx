import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { useSwipeToDismiss } from '@/hooks/useSwipeToDismiss';

interface SlideUpSheetProps extends PropsWithChildren {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export function SlideUpSheet({ isOpen, onClose, title, children }: SlideUpSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const { offset, isDragging, handlers } = useSwipeToDismiss(onClose);
  const [isVisible, setIsVisible] = useState(false);
  const draggingTransform = isDragging || offset > 0 ? `translateY(${offset}px)` : undefined;

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    } else {
      setIsVisible(false);
    }
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

  if (!isVisible && !isOpen) return null;

  return (
    <div
      className={`sheet-backdrop ${isVisible ? 'visible' : ''}`}
      onClick={onClose}
      role="presentation"
      aria-hidden="true"
    >
      <div
        ref={sheetRef}
        className={`sheet ${isVisible ? 'sheet--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Sheet'}
        onClick={(e) => e.stopPropagation()}
        style={{
          ...(draggingTransform ? { transform: draggingTransform } : {}),
          transition: isDragging ? 'none' : undefined,
          cursor: isDragging ? 'grabbing' : undefined,
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
