import { useState, useMemo } from 'react';

interface VirtualListOptions<T> {
  items: T[];
  itemHeight: number;
  overscan?: number;
  containerHeight: number;
}

interface VirtualListResult<T> {
  virtualItems: Array<{ item: T; index: number; offsetTop: number }>;
  totalHeight: number;
  startIndex: number;
  endIndex: number;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

export function useVirtualList<T>({
  items,
  itemHeight,
  overscan = 3,
  containerHeight,
}: VirtualListOptions<T>): VirtualListResult<T> {
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = items.length * itemHeight;

  const { startIndex, endIndex } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const end = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan,
    );
    return { startIndex: start, endIndex: end + 1 };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const virtualItems = useMemo(() => {
    const result: Array<{ item: T; index: number; offsetTop: number }> = [];
    for (let i = startIndex; i < endIndex; i++) {
      if (items[i]) {
        result.push({ item: items[i], index: i, offsetTop: i * itemHeight });
      }
    }
    return result;
  }, [items, startIndex, endIndex, itemHeight]);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  return {
    virtualItems,
    totalHeight,
    startIndex,
    endIndex,
    onScroll,
  };
}
