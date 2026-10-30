import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authReducer, initialAuthState } from './authReducer';
import { getAuthErrorMessage, getMe, loginWithGoogle } from '../services/authApi';
import { setUnauthorizedHandler } from '../services/apiClient';
import { tokenStorage } from '../services/tokenStorage';

const AuthContext = createContext(null);

// The guest-cart merge after login is owned by CartContext (it reacts to the identity
// transition), so login itself has no post-success callback.
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, undefined, initialAuthState);
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);
  locationRef.current = location;
  const loginInFlight = useRef(false);

  const logout = useCallback(() => {
    tokenStorage.clear();
    dispatch({ type: 'SIGNED_OUT' });
  }, []);

  // Exchanges a Google credential for an app session. Throws on failure; ignores double submits.
  const login = useCallback(async (credential) => {
    if (loginInFlight.current) return null;
    loginInFlight.current = true;
    try {
      const { token, user } = await loginWithGoogle(credential);
      tokenStorage.set(token);
      dispatch({ type: 'LOGIN_SUCCESS', token, user });
      return user;
    } finally {
      loginInFlight.current = false;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const user = await getMe();
    dispatch({ type: 'USER_LOADED', user });
    return user;
  }, []);

  // Global 401: drop the session and send the user to login, remembering where they were.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
      const { pathname, search } = locationRef.current;
      if (pathname !== '/login') navigate('/login', { replace: true, state: { from: pathname + search } });
    });
    return () => setUnauthorizedHandler(null);
  }, [logout, navigate]);

  // Bootstrap: validate a stored token once on load.
  const bootstrapped = useRef(false);
  useEffect(() => {
    if (bootstrapped.current || !tokenStorage.get()) return;
    bootstrapped.current = true;
    getMe({ silent401: true })
      .then((user) => dispatch({ type: 'USER_LOADED', user }))
      .catch((err) => {
        if (err.status === 401 || err.status === 404) logout();
        else dispatch({ type: 'FAILED', error: getAuthErrorMessage(err) });
      });
  }, [logout]);

  const value = useMemo(
    () => ({
      ...state,
      isAuthenticated: state.status === 'authenticated',
      login,
      logout,
      refreshUser,
    }),
    [state, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
