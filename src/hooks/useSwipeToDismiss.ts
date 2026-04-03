import { useState, useRef, useCallback, type TouchEvent, type MouseEvent } from 'react';

export function useSwipeToDismiss(
  onDismiss: () => void,
  threshold = 150
) {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const offsetRef = useRef(0);

  const startDrag = useCallback((clientY: number) => {
    startYRef.current = clientY;
    setIsDragging(true);
  }, []);

  const onDrag = useCallback((clientY: number) => {
    if (!isDragging) return;
    const deltaY = clientY - startYRef.current;
    
    if (deltaY > 0) {
      setOffset(deltaY);
      offsetRef.current = deltaY;
    }
  }, [isDragging]);

  const endDrag = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    if (offsetRef.current > threshold) {
      onDismiss();
    }
    
    setOffset(0);
    offsetRef.current = 0;
  }, [isDragging, onDismiss, threshold]);

  return {
    offset,
    isDragging,
    handlers: {
      onTouchStart: (e: TouchEvent) => startDrag(e.touches[0].clientY),
      onTouchMove: (e: TouchEvent) => onDrag(e.touches[0].clientY),
      onTouchEnd: endDrag,
      onMouseDown: (e: MouseEvent) => startDrag(e.clientY),
      onMouseMove: (e: MouseEvent) => onDrag(e.clientY),
      onMouseUp: endDrag,
      onMouseLeave: endDrag,
    }
  };
}
