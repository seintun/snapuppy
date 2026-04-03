import type { PropsWithChildren } from 'react';

type BadgeVariant = 'sage' | 'terracotta' | 'sky' | 'blush' | 'sunshine';

interface BadgeProps extends PropsWithChildren {
  variant?: BadgeVariant;
}

export function Badge({ variant = 'sage', children }: BadgeProps) {
  return <span className={`badge badge--${variant}`}>{children}</span>;
}
