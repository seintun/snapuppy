import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { BookingsScreen } from '@/features/bookings';
import { CalendarScreen } from '@/features/calendar';
import { DogsScreen } from '@/features/dogs';
import { ProfileScreen } from '@/features/profile';
import { AuthProvider, LoginScreen, RequireAuth } from '@/features/auth';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/calendar" replace />} />
            <Route path="/calendar" element={<CalendarScreen />} />
            <Route path="/bookings" element={<BookingsScreen />} />
            <Route path="/dogs" element={<DogsScreen />} />
            <Route path="/profile" element={<ProfileScreen />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}
