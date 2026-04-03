import type { PropsWithChildren } from 'react';

interface CardProps extends PropsWithChildren {
  className?: string;
  pressable?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, pressable, onClick }: CardProps) {
  const classes = [
    'surface-card',
    pressable ? 'surface-card--pressable' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={classes} onClick={onClick}>
      {children}
    </section>
  );
}
