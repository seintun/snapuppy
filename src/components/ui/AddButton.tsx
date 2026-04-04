import { CalendarBlank, PawPrint, Plus } from '@phosphor-icons/react';

type AddButtonVariant = 'dog' | 'booking' | 'calendar';

interface AddButtonProps {
  onClick: () => void;
  variant: AddButtonVariant;
  isActive?: boolean;
  ariaLabel?: string;
}

const ICON_SIZE = 26;

function getAriaLabel(variant: AddButtonVariant): string {
  if (variant === 'dog') return 'Add dog';
  if (variant === 'booking') return 'Create booking';
  return 'Add calendar item';
}

function getIcon(variant: AddButtonVariant) {
  if (variant === 'dog') return <PawPrint size={ICON_SIZE} weight="fill" />;
  if (variant === 'booking') return <CalendarBlank size={ICON_SIZE} weight="bold" />;
  return <Plus size={ICON_SIZE} weight="bold" />;
}

export function AddButton({ onClick, variant, isActive = false, ariaLabel }: AddButtonProps) {
  return (
    <button
      type="button"
      className="add-button animate-in fade-in zoom-in duration-400"
      aria-label={ariaLabel ?? getAriaLabel(variant)}
      onClick={onClick}
    >
      <span className={`add-button__icon ${isActive ? 'add-button__icon--active' : ''}`}>
        {getIcon(variant)}
      </span>
    </button>
  );
}
