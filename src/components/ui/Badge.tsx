import type { PropsWithChildren } from 'react';

export type BadgeVariant = 'sage' | 'terracotta' | 'sky' | 'blush' | 'sunshine' | 'amber';

interface BadgeProps extends PropsWithChildren {
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  sage: 'bg-sage-light text-[#3d6b35]',
  terracotta: 'bg-[#fde9de] text-[#a0532d]',
  sky: 'bg-[#d6f0f9] text-[#2a7a96]',
  blush: 'bg-blush text-[#8b4040]',
  sunshine: 'bg-[#fef4c0] text-[#7a6018]',
  amber: 'bg-amber/20 text-amber',
};

export function Badge({ variant = 'sage', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
