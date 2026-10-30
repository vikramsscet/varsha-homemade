import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Layout-route guard: <Route element={<RequireAuth />}> ...protected routes... </Route>
export default function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <p className="auth-loading" role="status">Loading…</p>;
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}
