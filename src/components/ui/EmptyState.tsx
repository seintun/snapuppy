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
      <div className="empty-state">
        <div className="empty-state__icon" aria-hidden="true">
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Main paw pad */}
            <ellipse cx="16" cy="20" rx="7" ry="8" fill="#8fb886" />
            {/* Top-left toe */}
            <ellipse cx="8" cy="13" rx="3.5" ry="4.5" fill="#8fb886" />
            {/* Top-right toe */}
            <ellipse cx="24" cy="13" rx="3.5" ry="4.5" fill="#8fb886" />
            {/* Left toe */}
            <ellipse cx="5" cy="19" rx="3" ry="4" fill="#8fb886" />
            {/* Right toe */}
            <ellipse cx="27" cy="19" rx="3" ry="4" fill="#8fb886" />
          </svg>
        </div>
        <p className="empty-state__title">{title}</p>
        <p className="empty-state__subtitle">{description}</p>
        {actionLabel && onAction ? (
          <button type="button" className="empty-state__action" onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
      </div>
    </Card>
  );
}
