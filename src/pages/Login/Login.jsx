import { useCallback, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import GoogleSignInButton from '../../components/GoogleSignInButton/GoogleSignInButton';
import { useAuth } from '../../context/AuthContext';
import { loginWithGoogle } from '../../services/authApi';
import './login.css';

export default function LoginPage() {
  const { isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
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
        const { token, user } = await loginWithGoogle(credential);
        signIn(token, user);
        navigate(redirectTo, { replace: true });
      } catch (err) {
        setError(err.name === 'AuthError' ? err.message : 'Something went wrong. Please try again.');
      } finally {
        inFlight.current = false;
        setIsLoading(false);
      }
    },
    [navigate, redirectTo, signIn]
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
