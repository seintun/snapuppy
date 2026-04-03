import { Plus } from '@phosphor-icons/react';

interface FabProps {
  onClick: () => void;
}

export function Fab({ onClick }: FabProps) {
  return (
    <button type="button" className="fab" aria-label="Create booking" onClick={onClick}>
      <Plus size={26} weight="bold" />
    </button>
  );
}
