import { type HTMLAttributes } from 'react';

interface LoadingSpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-6 h-9 border-2',
  md: 'w-9 h-9 border-3',
  lg: 'w-10 h-10 border-3',
};

export function LoadingSpinner({ size = 'md', className = '', ...props }: LoadingSpinnerProps) {
  return (
    <div
      className={`rounded-full animate-spin border-sage-light border-t-sage ${sizeClasses[size]} ${className}`}
      {...props}
    />
  );
}
