import { PawPrint } from '@phosphor-icons/react';
import { Card } from './Card';

interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <Card>
      <div className="empty-state">
        <PawPrint size={32} weight="duotone" style={{ color: 'var(--terracotta)' }} />
        <h3 style={{ marginBottom: 4 }}>{title}</h3>
        <p style={{ margin: 0, color: 'var(--bark-light)' }}>{description}</p>
      </div>
    </Card>
  );
}
