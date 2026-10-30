import { useCallback, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import GoogleSignInButton from '../../components/GoogleSignInButton/GoogleSignInButton';
import { useAuth } from '../../context/AuthContext';
import { getAuthErrorMessage } from '../../services/authApi';
import './login.css';

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const inFlight = useRef(false);
  const redirectTo = location.state?.from ?? '/';

  const handleCredential = useCallback(
    async (credential) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setIsLoading(true);
      setError(null);
      try {
        // On success the guard below redirects to the intended page.
        await login(credential);
      } catch (err) {
        setError(getAuthErrorMessage(err));
      } finally {
        inFlight.current = false;
        setIsLoading(false);
      }
    },
    [login]
  );

  if (isAuthenticated) return <Navigate to={redirectTo} replace />;

  return (
    <main className="login-page container">
      <section className="login-card">
        <h1>Sign in</h1>
        <p>Sign in with Google to save your cart and check out.</p>
        <GoogleSignInButton onCredential={handleCredential} onError={setError} disabled={isLoading} />
        {isLoading && <p className="login-status" role="status">Signing you in…</p>}
        {error && <p className="login-error" role="alert">{error}</p>}
      </section>
    </main>
  );
}
