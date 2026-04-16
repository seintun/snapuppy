import { Moon, Sun, Star } from '@phosphor-icons/react';
import type { BookingType } from '@/lib/rate-calculator';

interface BookingTypePillProps {
  type: BookingType;
  isHoliday?: boolean;
  className?: string;
}

const typeConfig = {
  boarding: {
    icon: Moon,
    label: 'Boarding',
    className: 'bg-sky/15 text-[#2a7a96] border border-sky/35',
  },
  daycare: {
    icon: Sun,
    label: 'Daycare',
    className: 'bg-amber/15 text-amber border border-amber/40',
  },
};

export function BookingTypePill({ type, isHoliday = false, className = '' }: BookingTypePillProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${config.className} ${className}`}>
      <Icon size={9} weight="fill" />
      {isHoliday ? (
        <>
          {config.label}
          <Star size={9} weight="fill" className="text-terracotta" />
          <span className="text-terracotta">Holiday</span>
        </>
      ) : config.label}
    </span>
  );
}
