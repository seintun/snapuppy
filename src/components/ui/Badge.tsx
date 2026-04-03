import type { PropsWithChildren } from 'react';

type BadgeTone = 'default' | 'holiday';

interface BadgeProps extends PropsWithChildren {
  tone?: BadgeTone;
}

export function Badge({ tone = 'default', children }: BadgeProps) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}
