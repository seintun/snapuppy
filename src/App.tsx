import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginScreen, RequireAuth } from '@/features/auth';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ErrorScreen } from '@/components/ui/ErrorScreen';
import { AppLoadingAnimation } from '@/components/ui/AppLoadingAnimation';

const DashboardScreen = lazy(() =>
  import('@/features/dashboard').then((m) => ({ default: m.DashboardScreen })),
);
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
const ClientInvoiceView = lazy(() =>
  import('@/features/invoice').then((m) => ({ default: m.ClientInvoiceView })),
);

function LoadingFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <AppLoadingAnimation size="lg" label="Waking up the pack..." />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route
          path="/invoice/:bookingId"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <ClientInvoiceView />
            </Suspense>
          }
        />

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route
              index
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <Navigate to="/today" replace />
                </Suspense>
              }
            />
            <Route
              path="/today"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <DashboardScreen />
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
