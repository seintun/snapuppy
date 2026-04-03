import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthCallbackScreen, LoginScreen, RequireAuth } from '@/features/auth';
import { BookingsScreen, BookingDetailScreen } from '@/features/bookings';
import { CalendarScreen } from '@/features/calendar';
import { DogDetailScreen, DogsScreen } from '@/features/dogs';
import { ProfileScreen } from '@/features/profile';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/auth/callback" element={<AuthCallbackScreen />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/calendar" replace />} />
          <Route path="/calendar" element={<CalendarScreen />} />
          <Route path="/bookings" element={<BookingsScreen />} />
          <Route path="/bookings/:id" element={<BookingDetailScreen />} />
          <Route path="/dogs" element={<DogsScreen />} />
          <Route path="/dogs/:dogId" element={<DogDetailScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
        </Route>
      </Route>
    </Routes>
  );
}
