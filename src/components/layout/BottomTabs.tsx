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
    <nav className="bottom-tabs" aria-label="Primary">
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} className="bottom-tab-link">
          {({ isActive }) => (
            <div className="bottom-tab" data-active={isActive}>
              <Icon size={20} weight={isActive ? 'duotone' : 'regular'} />
              <span>{label}</span>
            </div>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
