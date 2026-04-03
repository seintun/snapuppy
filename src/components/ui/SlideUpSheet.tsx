import type { PropsWithChildren } from 'react';

interface SlideUpSheetProps extends PropsWithChildren {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export function SlideUpSheet({ isOpen, onClose, title, children }: SlideUpSheetProps) {
  if (!isOpen) return null;

  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div className="sheet" onClick={(event) => event.stopPropagation()}>
        {title ? <h3 style={{ marginTop: 0 }}>{title}</h3> : null}
        {children}
      </div>
    </div>
  );
}
