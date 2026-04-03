import { Card } from './Card';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <Card>
      <div className="text-center py-7 px-5 animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sage-light mb-4" aria-hidden="true">
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Main paw pad */}
            <ellipse cx="16" cy="20" rx="7" ry="8" fill="var(--sage)" />
            {/* Top-left toe */}
            <ellipse cx="8" cy="13" rx="3.5" ry="4.5" fill="var(--sage)" />
            {/* Top-right toe */}
            <ellipse cx="24" cy="13" rx="3.5" ry="4.5" fill="var(--sage)" />
            {/* Left toe */}
            <ellipse cx="5" cy="19" rx="3" ry="4" fill="var(--sage)" />
            {/* Right toe */}
            <ellipse cx="27" cy="19" rx="3" ry="4" fill="var(--sage)" />
          </svg>
        </div>
        <h3 className="m-0 mb-1.5 text-[17px] font-extrabold text-bark">{title}</h3>
        <p className="m-0 mb-5 text-sm text-bark-light leading-relaxed">{description}</p>
        {actionLabel && onAction ? (
          <button 
            type="button" 
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-terracotta text-white font-bold text-sm active:scale-[0.97] transition-transform" 
            onClick={onAction}
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </Card>
  );
}
