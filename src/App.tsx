import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthCallbackScreen, LoginScreen, RequireAuth } from '@/features/auth';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ErrorScreen } from '@/components/ui/ErrorScreen';

const CalendarScreen = lazy(() =>
  import('@/features/calendar').then((m) => ({ default: m.CalendarScreen })),
);
const BookingsScreen = lazy(() =>
  import('@/features/bookings').then((m) => ({ default: m.BookingsScreen })),
);
const BookingDetailScreen = lazy(() =>
  import('@/features/bookings').then((m) => ({ default: m.BookingDetailScreen })),
);
const DogsScreen = lazy(() => import('@/features/dogs').then((m) => ({ default: m.DogsScreen })));
const DogDetailScreen = lazy(() =>
  import('@/features/dogs').then((m) => ({ default: m.DogDetailScreen })),
);
const ProfileScreen = lazy(() =>
  import('@/features/profile').then((m) => ({ default: m.ProfileScreen })),
);

function LoadingFallback() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        color: 'var(--bark-light)',
        fontSize: 14,
      }}
    >
      Loading…
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/auth/callback" element={<AuthCallbackScreen />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route
              index
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <Navigate to="/calendar" replace />
                </Suspense>
              }
            />
            <Route
              path="/calendar"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <CalendarScreen />
                </Suspense>
              }
            />
            <Route
              path="/bookings"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <BookingsScreen />
                </Suspense>
              }
            />
            <Route
              path="/bookings/:id"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <BookingDetailScreen />
                </Suspense>
              }
            />
            <Route
              path="/dogs"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <DogsScreen />
                </Suspense>
              }
            />
            <Route
              path="/dogs/:dogId"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <DogDetailScreen />
                </Suspense>
              }
            />
            <Route
              path="/profile"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <ProfileScreen />
                </Suspense>
              }
            />
          </Route>
        </Route>

        <Route path="*" element={<ErrorScreen error={new Error('Page not found')} />} />
      </Routes>
    </ErrorBoundary>
  );
}
