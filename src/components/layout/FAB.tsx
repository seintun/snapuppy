import { Plus } from '@phosphor-icons/react';

interface FabProps {
  onClick: () => void;
}

export function Fab({ onClick }: FabProps) {
  return (
    <button 
      type="button" 
      className="fixed right-4 bottom-[calc(76px+env(safe-area-inset-bottom))] min-w-[56px] min-h-[56px] rounded-full bg-terracotta border-none text-white shadow-[0_4px_16px_rgba(212,132,90,0.45)] flex items-center justify-center cursor-pointer transition-transform duration-200 active:translate-y-px active:scale-95 z-30 animate-in fade-in zoom-in duration-400" 
      aria-label="Create booking" 
      onClick={onClick}
    >
      <Plus size={26} weight="bold" />
    </button>
  );
}
