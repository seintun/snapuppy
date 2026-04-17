import type { PropsWithChildren } from 'react';

interface CardProps extends PropsWithChildren {
  className?: string;
  pressable?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = '', pressable, onClick }: CardProps) {
  return (
    <section 
      className={`bg-cream rounded-xl shadow-sm border border-pebble transition-all duration-120 ${
        pressable ? 'cursor-pointer active:scale-[0.98] active:shadow-none' : ''
      } ${className}`} 
      onClick={onClick}
    >
      {children}
    </section>
  );
}
