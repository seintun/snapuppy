import { Navigate, Outlet } from 'react-router-dom';
import { useAuthContext } from './useAuthContext';

export function RequireAuth() {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-sage-light border-t-sage rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
