import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { BookingsScreen } from '@/features/bookings';
import { CalendarScreen } from '@/features/calendar';
import { DogsScreen } from '@/features/dogs';
import { ProfileScreen } from '@/features/profile';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/calendar" replace />} />
        <Route path="/calendar" element={<CalendarScreen />} />
        <Route path="/bookings" element={<BookingsScreen />} />
        <Route path="/dogs" element={<DogsScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
      </Route>
    </Routes>
  );
}
