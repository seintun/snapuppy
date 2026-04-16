import { useEffect, useState } from 'react';

type AppLoadingAnimationSize = 'sm' | 'md' | 'lg';

interface AppLoadingAnimationProps {
  size?: AppLoadingAnimationSize;
  label?: string;
  className?: string;
}

export function AppLoadingAnimation({
  size = 'md',
  label = 'Loading...',
  className,
}: AppLoadingAnimationProps) {
  const [isPaused, setIsPaused] = useState(() => document.visibilityState === 'hidden');

  useEffect(() => {
    const handleVisibility = () => {
      setIsPaused(document.visibilityState === 'hidden');
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return (
    <div
      className={['app-loader', `app-loader--${size}`, className].filter(Boolean).join(' ')}
      data-paused={isPaused}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <svg className="app-loader__scene" viewBox="0 0 180 96" aria-hidden="true">
        <ellipse className="app-loader__shadow" cx="88" cy="84" rx="56" ry="8" />

        <g className="app-loader__ball" transform="translate(130,42)">
          <circle r="11" className="app-loader__ball-fill" />
          <path d="M-7 -2 C-2 6 5 6 9 -1" className="app-loader__ball-line" />
          <path d="M-2 -8 C4 -4 5 2 1 7" className="app-loader__ball-line" />
        </g>

        <g className="app-loader__dog" transform="translate(72,48)">
          <ellipse cx="8" cy="16" rx="31" ry="18" className="app-loader__dog-body" />
          <circle cx="-20" cy="5" r="14" className="app-loader__dog-head" />
          <ellipse cx="-30" cy="-5" rx="6" ry="10" className="app-loader__dog-ear" />
          <circle cx="-24" cy="3" r="1.8" className="app-loader__dog-eye" />
          <circle cx="-31" cy="8" r="2.2" className="app-loader__dog-nose" />
          <rect x="-9" y="27" width="8" height="18" rx="3" className="app-loader__dog-leg" />
          <rect x="14" y="27" width="8" height="18" rx="3" className="app-loader__dog-leg" />
          <path d="M36 11 C47 4 47 23 35 20" className="app-loader__dog-tail" />
        </g>
      </svg>
      <span className="app-loader__label">{label}</span>
    </div>
  );
}
