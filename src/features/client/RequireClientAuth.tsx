import { Navigate, Outlet, useParams } from 'react-router-dom';
import { getClientSession } from './clientAuth';

export function RequireClientAuth() {
  const { token } = useParams<{ token: string }>();
  const session = getClientSession();

  if (!session || session.token !== token) {
    return <Navigate to={`/client/${token ?? ''}`} replace />;
  }

  return <Outlet />;
}
