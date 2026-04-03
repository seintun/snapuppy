import { Calendar, ListBullets, PawPrint, UserCircle } from '@phosphor-icons/react';
import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/bookings', label: 'Bookings', icon: ListBullets },
  { to: '/dogs', label: 'Dogs', icon: PawPrint },
  { to: '/profile', label: 'Profile', icon: UserCircle },
] as const;

export function BottomTabs() {
  return (
    <nav 
      className="fixed left-1/2 -translate-x-1/2 bottom-0 w-[min(520px,100%)] bg-cream border-t border-pebble grid grid-cols-4 px-2 pt-2 pb-[calc(8px+env(safe-area-inset-bottom))] z-20 backdrop-blur-md bg-cream/90" 
      aria-label="Primary"
    >
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} className="block">
          {({ isActive }) => (
            <div 
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all duration-200 text-xs font-bold relative min-w-[44px] ${
                isActive ? 'text-sage' : 'text-bark-light'
              }`}
            >
              <span className={`transition-transform duration-200 ${isActive ? '-translate-y-0.5' : ''}`}>
                <Icon size={20} weight={isActive ? 'duotone' : 'regular'} />
              </span>
              <span>{label}</span>
              {isActive && (
                <div className="absolute bottom-[-2px] left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-sage" />
              )}
            </div>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
