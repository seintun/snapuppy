import { Navigate, Outlet } from 'react-router-dom';
import { AppLoadingAnimation } from '@/components/ui/AppLoadingAnimation';
import { useAuthContext } from './useAuthContext';

export function RequireAuth() {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <AppLoadingAnimation size="md" label="Checking your session..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
